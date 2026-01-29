<?php
/**
 * Topup Endpoints
 */

function handleTopup(string $method, ?string $id, ?string $action, array $input): void {
    switch ($method) {
        case 'GET':
            if ($id) {
                getTopupRequest($id);
            } else {
                getTopupRequests($input);
            }
            break;
            
        case 'POST':
            if ($action === 'verify' && $id) {
                verifyTopup($id);
            } else {
                createTopupRequest($input);
            }
            break;
            
        default:
            Response::error('Method not allowed', 405);
    }
}

function getTopupRequests(array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    $db = Database::getInstance();
    
    $page = max(1, (int)($input['page'] ?? 1));
    $perPage = min(100, max(1, (int)($input['limit'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    
    // Admin can see all, users see only their own
    if ($user['role'] === 'admin' && !empty($input['all'])) {
        $where = "1=1";
        $params = [];
    } else {
        $where = "user_id = ?";
        $params = [$user['id']];
    }
    
    // Status filter
    if (!empty($input['status']) && in_array($input['status'], ['pending', 'approved', 'denied'])) {
        $where .= " AND status = ?";
        $params[] = $input['status'];
    }
    
    $total = $db->fetch("SELECT COUNT(*) as total FROM topup_requests WHERE $where", $params)['total'];
    
    $sql = "SELECT t.*, u.email as user_email, u.full_name as user_name
            FROM topup_requests t
            LEFT JOIN users u ON t.user_id = u.id
            WHERE $where 
            ORDER BY t.created_at DESC 
            LIMIT $perPage OFFSET $offset";
    
    $requests = $db->fetchAll($sql, $params);
    
    Response::paginated($requests, $total, $page, $perPage);
}

function getTopupRequest(string $id): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    $db = Database::getInstance();
    
    $request = $db->fetch(
        "SELECT t.*, u.email as user_email, u.full_name as user_name
         FROM topup_requests t
         LEFT JOIN users u ON t.user_id = u.id
         WHERE t.id = ?",
        [$id]
    );
    
    if (!$request) {
        Response::notFound('Topup request not found');
    }
    
    // Check access
    if ($request['user_id'] !== $user['id'] && $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    Response::success($request);
}

function createTopupRequest(array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    $amount = (int)($input['amount'] ?? 0);
    $method = trim($input['method'] ?? 'bank_transfer');
    
    if ($amount < 10000) {
        Response::validationError(['amount' => 'Minimum topup amount is 10,000 VND']);
    }
    
    $db = Database::getInstance();
    
    // Check for pending requests
    $pending = $db->fetch(
        "SELECT id FROM topup_requests WHERE user_id = ? AND status = 'pending' AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)",
        [$user['id']]
    );
    
    if ($pending) {
        Response::error('You already have a pending topup request', 400);
    }
    
    $requestId = generateUUID();
    
    // Generate topup code (trigger does this, but let's do it manually for safety)
    $topupCode = generateTopupCode();
    
    $db->insert('topup_requests', [
        'id' => $requestId,
        'user_id' => $user['id'],
        'amount' => $amount,
        'method' => $method,
        'status' => 'pending',
        'topup_code' => $topupCode,
        'note' => $input['note'] ?? null
    ]);
    
    $request = $db->fetch("SELECT * FROM topup_requests WHERE id = ?", [$requestId]);
    
    Response::success($request, 'Topup request created');
}

function verifyTopup(string $id): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    $db = Database::getInstance();
    
    $request = $db->fetch(
        "SELECT * FROM topup_requests WHERE id = ? AND user_id = ? AND status = 'pending'",
        [$id, $user['id']]
    );
    
    if (!$request) {
        Response::notFound('Pending topup request not found');
    }
    
    // Try to verify via bank API
    $verified = checkBankTransaction($request);
    
    if ($verified) {
        // Approve the topup
        $db->beginTransaction();
        
        try {
            // Get current wallet balance
            $wallet = $db->fetch("SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE", [$user['id']]);
            $currentBalance = (int)($wallet['balance'] ?? 0);
            
            // Calculate bonus
            $bonus = calculateTopupBonus($request['amount']);
            $totalCredit = $request['amount'] + $bonus;
            $newBalance = $currentBalance + $totalCredit;
            
            // Update wallet
            $db->update('wallets', ['balance' => $newBalance], 'user_id = ?', [$user['id']]);
            
            // Record transaction
            $db->insert('wallet_transactions', [
                'id' => generateUUID(),
                'user_id' => $user['id'],
                'type' => 'credit',
                'amount' => $totalCredit,
                'balance_before' => $currentBalance,
                'balance_after' => $newBalance,
                'ref_type' => 'topup',
                'ref_id' => $id,
                'note' => 'Topup ' . number_format($request['amount']) . ' VND' . ($bonus > 0 ? ' + bonus ' . number_format($bonus) . ' VND' : '')
            ]);
            
            // Update topup request
            $db->update('topup_requests', [
                'status' => 'approved',
                'decided_at' => date('Y-m-d H:i:s')
            ], 'id = ?', [$id]);
            
            $db->commit();
            
            Response::success([
                'verified' => true,
                'amount' => $request['amount'],
                'bonus' => $bonus,
                'new_balance' => $newBalance
            ], 'Topup verified and approved');
            
        } catch (Exception $e) {
            $db->rollback();
            throw $e;
        }
    } else {
        Response::success([
            'verified' => false,
            'message' => 'Transaction not found yet. Please try again in a few minutes.'
        ]);
    }
}

function checkBankTransaction(array $request): bool {
    if (empty(BANK_API_TOKEN)) {
        return false;
    }
    
    // Call bank API to check transaction
    $url = BANK_API_URL . '/transactions/check';
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'amount' => $request['amount'],
            'code' => $request['topup_code']
        ]),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . BANK_API_TOKEN
        ],
        CURLOPT_TIMEOUT => 30
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        return !empty($data['found']);
    }
    
    return false;
}

function calculateTopupBonus(int $amount): int {
    // Get promotion settings
    $db = Database::getInstance();
    $settings = $db->fetch("SELECT value FROM site_settings WHERE `key` = 'topup_promotion'");
    
    if (!$settings) {
        return 0;
    }
    
    $promotions = json_decode($settings['value'], true)['promotions'] ?? [];
    
    foreach ($promotions as $promo) {
        if (($promo['enabled'] ?? false) && $amount >= ($promo['min_amount'] ?? 0)) {
            $bonusPercent = (int)($promo['bonus_percent'] ?? 0);
            return (int)($amount * $bonusPercent / 100);
        }
    }
    
    return 0;
}

function generateTopupCode(): string {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $code = 'NAP';
    for ($i = 0; $i < 6; $i++) {
        $code .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $code;
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
