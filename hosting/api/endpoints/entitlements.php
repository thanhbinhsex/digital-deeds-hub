<?php
/**
 * Entitlements Endpoints
 */

function handleEntitlements(string $method, ?string $id, array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    switch ($method) {
        case 'GET':
            if ($id) {
                getEntitlement($user, $id);
            } else {
                getEntitlements($user, $input);
            }
            break;
            
        default:
            Response::error('Method not allowed', 405);
    }
}

function getEntitlements(array $user, array $input): void {
    $db = Database::getInstance();
    
    $page = max(1, (int)($input['page'] ?? 1));
    $perPage = min(100, max(1, (int)($input['limit'] ?? 20)));
    $offset = ($page - 1) * $perPage;
    
    // Admin can see all, users see only their own
    if ($user['role'] === 'admin' && !empty($input['all'])) {
        $where = "1=1";
        $params = [];
    } else {
        $where = "e.user_id = ?";
        $params = [$user['id']];
    }
    
    $total = $db->fetch("SELECT COUNT(*) as total FROM entitlements e WHERE $where", $params)['total'];
    
    $sql = "SELECT e.*, 
                   p.name as product_name, p.name_vi as product_name_vi, 
                   p.slug as product_slug, p.image_url as product_image
            FROM entitlements e
            LEFT JOIN products p ON e.product_id = p.id
            WHERE $where 
            ORDER BY e.granted_at DESC 
            LIMIT $perPage OFFSET $offset";
    
    $entitlements = $db->fetchAll($sql, $params);
    
    // Format response
    foreach ($entitlements as &$ent) {
        $ent['product'] = [
            'name' => $ent['product_name'],
            'name_vi' => $ent['product_name_vi'],
            'slug' => $ent['product_slug'],
            'image_url' => $ent['product_image']
        ];
        unset($ent['product_name'], $ent['product_name_vi'], $ent['product_slug'], $ent['product_image']);
    }
    
    Response::paginated($entitlements, $total, $page, $perPage);
}

function getEntitlement(array $user, string $id): void {
    $db = Database::getInstance();
    
    // ID can be entitlement ID or product ID
    $entitlement = $db->fetch(
        "SELECT e.*, 
                p.name as product_name, p.name_vi as product_name_vi, 
                p.slug as product_slug, p.image_url as product_image
         FROM entitlements e
         LEFT JOIN products p ON e.product_id = p.id
         WHERE (e.id = ? OR e.product_id = ?) AND e.user_id = ?",
        [$id, $id, $user['id']]
    );
    
    // Admin can view any entitlement
    if (!$entitlement && $user['role'] === 'admin') {
        $entitlement = $db->fetch(
            "SELECT e.*, 
                    p.name as product_name, p.name_vi as product_name_vi, 
                    p.slug as product_slug, p.image_url as product_image
             FROM entitlements e
             LEFT JOIN products p ON e.product_id = p.id
             WHERE e.id = ? OR e.product_id = ?",
            [$id, $id]
        );
    }
    
    if (!$entitlement) {
        Response::notFound('Entitlement not found');
    }
    
    // Get product assets
    $assets = $db->fetchAll(
        "SELECT id, name, type, storage_path, link_url, key_value, metadata 
         FROM product_assets 
         WHERE product_id = ?",
        [$entitlement['product_id']]
    );
    
    foreach ($assets as &$asset) {
        $asset['metadata'] = json_decode($asset['metadata'], true) ?? [];
    }
    
    // Update download count
    $db->query(
        "UPDATE entitlements SET download_count = download_count + 1, last_download_at = NOW() WHERE id = ?",
        [$entitlement['id']]
    );
    
    $entitlement['product'] = [
        'name' => $entitlement['product_name'],
        'name_vi' => $entitlement['product_name_vi'],
        'slug' => $entitlement['product_slug'],
        'image_url' => $entitlement['product_image']
    ];
    $entitlement['assets'] = $assets;
    
    unset($entitlement['product_name'], $entitlement['product_name_vi'], $entitlement['product_slug'], $entitlement['product_image']);
    
    Response::success($entitlement);
}
