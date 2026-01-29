<?php
/**
 * Orders Endpoints
 */

function handleOrders(string $method, ?string $id, array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    switch ($method) {
        case 'GET':
            if ($id) {
                getOrder($user, $id);
            } else {
                getOrders($user, $input);
            }
            break;
            
        default:
            Response::error('Method not allowed', 405);
    }
}

function getOrders(array $user, array $input): void {
    $db = Database::getInstance();
    
    $page = max(1, (int)($input['page'] ?? 1));
    $perPage = min(100, max(1, (int)($input['limit'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    
    // Admin can see all, users see only their own
    if ($user['role'] === 'admin' && !empty($input['all'])) {
        $where = "1=1";
        $params = [];
    } else {
        $where = "o.user_id = ?";
        $params = [$user['id']];
    }
    
    // Status filter
    if (!empty($input['status'])) {
        $where .= " AND o.status = ?";
        $params[] = $input['status'];
    }
    
    $total = $db->fetch("SELECT COUNT(*) as total FROM orders o WHERE $where", $params)['total'];
    
    $sql = "SELECT o.*, u.email as user_email, u.full_name as user_name
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE $where 
            ORDER BY o.created_at DESC 
            LIMIT $perPage OFFSET $offset";
    
    $orders = $db->fetchAll($sql, $params);
    
    // Get order items for each order
    foreach ($orders as &$order) {
        $order['items'] = $db->fetchAll(
            "SELECT oi.*, p.image_url, p.slug as product_slug
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?",
            [$order['id']]
        );
    }
    
    Response::paginated($orders, $total, $page, $perPage);
}

function getOrder(array $user, string $id): void {
    $db = Database::getInstance();
    
    $order = $db->fetch(
        "SELECT o.*, u.email as user_email, u.full_name as user_name
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = ?",
        [$id]
    );
    
    if (!$order) {
        Response::notFound('Order not found');
    }
    
    // Check access
    if ($order['user_id'] !== $user['id'] && $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    // Get order items
    $order['items'] = $db->fetchAll(
        "SELECT oi.*, p.image_url, p.slug as product_slug
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?",
        [$id]
    );
    
    Response::success($order);
}
