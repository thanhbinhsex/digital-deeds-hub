<?php
/**
 * Admin Endpoints
 */

function handleAdmin(string $method, ?string $action, ?string $id, array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    switch ($action) {
        case 'users':
            handleAdminUsers($method, $id, $input);
            break;
            
        case 'topups':
            handleAdminTopups($method, $id, $input);
            break;
            
        case 'dashboard':
            if ($method !== 'GET') Response::error('Method not allowed', 405);
            getDashboardStats();
            break;
            
        case 'audit':
            if ($method !== 'GET') Response::error('Method not allowed', 405);
            getAuditLogs($input);
            break;
            
        default:
            Response::notFound('Action not found');
    }
}

function handleAdminUsers(string $method, ?string $id, array $input): void {
    $db = Database::getInstance();
    
    switch ($method) {
        case 'GET':
            if ($id) {
                $user = $db->fetch(
                    "SELECT u.*, w.balance as wallet_balance 
                     FROM users u 
                     LEFT JOIN wallets w ON u.id = w.user_id 
                     WHERE u.id = ?",
                    [$id]
                );
                if (!$user) Response::notFound('User not found');
                unset($user['password_hash']);
                Response::success($user);
            } else {
                $page = max(1, (int)($input['page'] ?? 1));
                $perPage = min(100, max(1, (int)($input['limit'] ?? 20)));
                $offset = ($page - 1) * $perPage;
                
                $where = "1=1";
                $params = [];
                
                if (!empty($input['search'])) {
                    $search = '%' . $input['search'] . '%';
                    $where .= " AND (u.email LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)";
                    $params[] = $search;
                    $params[] = $search;
                    $params[] = $search;
                }
                
                if (!empty($input['status'])) {
                    $where .= " AND u.status = ?";
                    $params[] = $input['status'];
                }
                
                if (!empty($input['role'])) {
                    $where .= " AND u.role = ?";
                    $params[] = $input['role'];
                }
                
                $total = $db->fetch("SELECT COUNT(*) as total FROM users u WHERE $where", $params)['total'];
                
                $sql = "SELECT u.id, u.email, u.full_name, u.username, u.role, u.status, 
                               u.created_at, w.balance as wallet_balance
                        FROM users u
                        LEFT JOIN wallets w ON u.id = w.user_id
                        WHERE $where
                        ORDER BY u.created_at DESC
                        LIMIT $perPage OFFSET $offset";
                
                $users = $db->fetchAll($sql, $params);
                Response::paginated($users, $total, $page, $perPage);
            }
            break;
            
        case 'PUT':
            if (!$id) Response::error('User ID required');
            
            $allowedFields = ['full_name', 'username', 'role', 'status', 'phone'];
            $updates = [];
            
            foreach ($allowedFields as $field) {
                if (isset($input[$field])) {
                    $updates[$field] = $input[$field];
                }
            }
            
            if (empty($updates)) {
                Response::error('No valid fields to update');
            }
            
            $db->update('users', $updates, 'id = ?', [$id]);
            
            $user = $db->fetch("SELECT id, email, full_name, username, role, status FROM users WHERE id = ?", [$id]);
            Response::success($user, 'User updated');
            break;
            
        default:
            Response::error('Method not allowed', 405);
    }
}

function handleAdminTopups(string $method, ?string $id, array $input): void {
    if ($method !== 'PUT' || !$id) {
        Response::error('Method not allowed or ID required', 405);
    }
    
    $action = $input['action'] ?? '';
    
    if (!in_array($action, ['approve', 'deny'])) {
        Response::error('Invalid action. Use approve or deny');
    }
    
    $db = Database::getInstance();
    $adminUser = JWT::getUserFromToken();
    
    $request = $db->fetch("SELECT * FROM topup_requests WHERE id = ? AND status = 'pending'", [$id]);
    
    if (!$request) {
        Response::notFound('Pending topup request not found');
    }
    
    $db->beginTransaction();
    
    try {
        if ($action === 'approve') {
            // Get wallet balance
            $wallet = $db->fetch("SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE", [$request['user_id']]);
            $currentBalance = (int)($wallet['balance'] ?? 0);
            
            // Calculate bonus
            $bonus = calculateTopupBonus($request['amount']);
            $totalCredit = $request['amount'] + $bonus;
            $newBalance = $currentBalance + $totalCredit;
            
            // Update wallet
            $db->update('wallets', ['balance' => $newBalance], 'user_id = ?', [$request['user_id']]);
            
            // Record transaction
            $db->insert('wallet_transactions', [
                'id' => generateUUID(),
                'user_id' => $request['user_id'],
                'type' => 'credit',
                'amount' => $totalCredit,
                'balance_before' => $currentBalance,
                'balance_after' => $newBalance,
                'ref_type' => 'topup',
                'ref_id' => $id,
                'note' => 'Admin approved topup ' . number_format($request['amount']) . ' VND' . ($bonus > 0 ? ' + bonus ' . number_format($bonus) . ' VND' : '')
            ]);
        }
        
        // Update request status
        $db->update('topup_requests', [
            'status' => $action === 'approve' ? 'approved' : 'denied',
            'admin_id' => $adminUser['id'],
            'admin_note' => $input['admin_note'] ?? null,
            'decided_at' => date('Y-m-d H:i:s')
        ], 'id = ?', [$id]);
        
        $db->commit();
        
        $updatedRequest = $db->fetch("SELECT * FROM topup_requests WHERE id = ?", [$id]);
        Response::success($updatedRequest, 'Topup request ' . ($action === 'approve' ? 'approved' : 'denied'));
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

function getDashboardStats(): void {
    $db = Database::getInstance();
    
    // Total users
    $totalUsers = $db->fetch("SELECT COUNT(*) as count FROM users")['count'];
    
    // New users this month
    $newUsers = $db->fetch(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
    )['count'];
    
    // Total orders
    $totalOrders = $db->fetch("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'")['count'];
    
    // Revenue this month
    $revenue = $db->fetch(
        "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders 
         WHERE status = 'completed' AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')"
    )['total'];
    
    // Pending topups
    $pendingTopups = $db->fetch(
        "SELECT COUNT(*) as count FROM topup_requests WHERE status = 'pending'"
    )['count'];
    
    // Total products
    $totalProducts = $db->fetch("SELECT COUNT(*) as count FROM products WHERE status = 'published'")['count'];
    
    // Recent orders
    $recentOrders = $db->fetchAll(
        "SELECT o.id, o.total_amount, o.status, o.created_at, u.email as user_email
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         ORDER BY o.created_at DESC
         LIMIT 5"
    );
    
    // Recent topups
    $recentTopups = $db->fetchAll(
        "SELECT t.id, t.amount, t.status, t.created_at, u.email as user_email
         FROM topup_requests t
         LEFT JOIN users u ON t.user_id = u.id
         ORDER BY t.created_at DESC
         LIMIT 5"
    );
    
    Response::success([
        'stats' => [
            'total_users' => (int)$totalUsers,
            'new_users' => (int)$newUsers,
            'total_orders' => (int)$totalOrders,
            'revenue' => (int)$revenue,
            'pending_topups' => (int)$pendingTopups,
            'total_products' => (int)$totalProducts
        ],
        'recent_orders' => $recentOrders,
        'recent_topups' => $recentTopups
    ]);
}

function getAuditLogs(array $input): void {
    $db = Database::getInstance();
    
    $page = max(1, (int)($input['page'] ?? 1));
    $perPage = min(100, max(1, (int)($input['limit'] ?? 50)));
    $offset = ($page - 1) * $perPage;
    
    $total = $db->fetch("SELECT COUNT(*) as total FROM admin_audit_logs")['total'];
    
    $logs = $db->fetchAll(
        "SELECT a.*, u.email as admin_email
         FROM admin_audit_logs a
         LEFT JOIN users u ON a.admin_id = u.id
         ORDER BY a.created_at DESC
         LIMIT $perPage OFFSET $offset"
    );
    
    foreach ($logs as &$log) {
        $log['before_data'] = json_decode($log['before_data'], true);
        $log['after_data'] = json_decode($log['after_data'], true);
    }
    
    Response::paginated($logs, $total, $page, $perPage);
}

function calculateTopupBonus(int $amount): int {
    $db = Database::getInstance();
    $settings = $db->fetch("SELECT value FROM site_settings WHERE `key` = 'topup_promotion'");
    
    if (!$settings) return 0;
    
    $promotions = json_decode($settings['value'], true)['promotions'] ?? [];
    
    foreach ($promotions as $promo) {
        if (($promo['enabled'] ?? false) && $amount >= ($promo['min_amount'] ?? 0)) {
            return (int)($amount * ($promo['bonus_percent'] ?? 0) / 100);
        }
    }
    
    return 0;
}

function generateUUID(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
