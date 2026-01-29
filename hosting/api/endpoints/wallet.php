<?php
/**
 * Wallet Endpoints
 */

function handleWallet(string $method, ?string $action, array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    switch ($action) {
        case 'balance':
            if ($method !== 'GET') Response::error('Method not allowed', 405);
            getBalance($user);
            break;
            
        case 'transactions':
            if ($method !== 'GET') Response::error('Method not allowed', 405);
            getTransactions($user, $input);
            break;
            
        default:
            if ($method === 'GET' && !$action) {
                getBalance($user);
            } else {
                Response::notFound('Action not found');
            }
    }
}

function getBalance(array $user): void {
    $db = Database::getInstance();
    
    $wallet = $db->fetch("SELECT balance, created_at, updated_at FROM wallets WHERE user_id = ?", [$user['id']]);
    
    if (!$wallet) {
        // Create wallet if doesn't exist
        $db->insert('wallets', ['user_id' => $user['id'], 'balance' => 0]);
        $wallet = ['balance' => 0, 'created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')];
    }
    
    Response::success([
        'balance' => (int)$wallet['balance'],
        'created_at' => $wallet['created_at'],
        'updated_at' => $wallet['updated_at']
    ]);
}

function getTransactions(array $user, array $input): void {
    $db = Database::getInstance();
    
    $page = max(1, (int)($input['page'] ?? 1));
    $perPage = min(100, max(1, (int)($input['limit'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    
    $where = "user_id = ?";
    $params = [$user['id']];
    
    // Type filter
    if (!empty($input['type']) && in_array($input['type'], ['credit', 'debit'])) {
        $where .= " AND type = ?";
        $params[] = $input['type'];
    }
    
    // Get total count
    $total = $db->fetch("SELECT COUNT(*) as total FROM wallet_transactions WHERE $where", $params)['total'];
    
    // Get transactions
    $sql = "SELECT * FROM wallet_transactions WHERE $where ORDER BY created_at DESC LIMIT $perPage OFFSET $offset";
    $transactions = $db->fetchAll($sql, $params);
    
    Response::paginated($transactions, $total, $page, $perPage);
}
