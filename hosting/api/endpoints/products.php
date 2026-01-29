<?php
/**
 * Products Endpoints
 */

function handleProducts(string $method, ?string $id, ?string $action, array $input): void {
    switch ($method) {
        case 'GET':
            if ($id) {
                if ($action === 'assets') {
                    getProductAssets($id);
                } else {
                    getProduct($id);
                }
            } else {
                getProducts($input);
            }
            break;
            
        case 'POST':
            createProduct($input);
            break;
            
        case 'PUT':
            if (!$id) Response::error('Product ID required');
            updateProduct($id, $input);
            break;
            
        case 'DELETE':
            if (!$id) Response::error('Product ID required');
            deleteProduct($id);
            break;
            
        default:
            Response::error('Method not allowed', 405);
    }
}

function getProducts(array $input): void {
    $db = Database::getInstance();
    
    $page = max(1, (int)($input['page'] ?? 1));
    $perPage = min(100, max(1, (int)($input['limit'] ?? 12)));
    $offset = ($page - 1) * $perPage;
    
    $where = ["p.status = 'published'"];
    $params = [];
    
    // Category filter
    if (!empty($input['category_id'])) {
        $where[] = "p.category_id = ?";
        $params[] = $input['category_id'];
    }
    
    // Search
    if (!empty($input['search'])) {
        $search = '%' . $input['search'] . '%';
        $where[] = "(p.name LIKE ? OR p.name_vi LIKE ? OR p.description LIKE ?)";
        $params[] = $search;
        $params[] = $search;
        $params[] = $search;
    }
    
    // Featured filter
    if (isset($input['featured']) && $input['featured'] === 'true') {
        $where[] = "p.featured = 1";
    }
    
    $whereClause = implode(' AND ', $where);
    
    // Get total count
    $countSql = "SELECT COUNT(*) as total FROM products p WHERE $whereClause";
    $total = $db->fetch($countSql, $params)['total'];
    
    // Get products with category
    $sql = "SELECT p.*, c.name as category_name, c.name_vi as category_name_vi
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE $whereClause
            ORDER BY p.created_at DESC
            LIMIT $perPage OFFSET $offset";
    
    $products = $db->fetchAll($sql, $params);
    
    // Format response
    foreach ($products as &$product) {
        $product['category'] = [
            'name' => $product['category_name'],
            'name_vi' => $product['category_name_vi']
        ];
        unset($product['category_name'], $product['category_name_vi']);
        $product['metadata'] = json_decode($product['metadata'], true) ?? [];
        $product['featured'] = (bool)$product['featured'];
    }
    
    Response::paginated($products, $total, $page, $perPage);
}

function getProduct(string $id): void {
    $db = Database::getInstance();
    
    // Check if it's a slug or UUID
    $isSlug = !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id);
    
    $sql = "SELECT p.*, c.name as category_name, c.name_vi as category_name_vi, c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE " . ($isSlug ? "p.slug = ?" : "p.id = ?");
    
    $product = $db->fetch($sql, [$id]);
    
    if (!$product) {
        Response::notFound('Product not found');
    }
    
    // Increment view count
    $db->query("UPDATE products SET view_count = view_count + 1 WHERE id = ?", [$product['id']]);
    
    $product['category'] = [
        'name' => $product['category_name'],
        'name_vi' => $product['category_name_vi'],
        'slug' => $product['category_slug']
    ];
    unset($product['category_name'], $product['category_name_vi'], $product['category_slug']);
    $product['metadata'] = json_decode($product['metadata'], true) ?? [];
    $product['featured'] = (bool)$product['featured'];
    $product['view_count'] = (int)$product['view_count'] + 1;
    
    Response::success($product);
}

function getProductAssets(string $productId): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    $db = Database::getInstance();
    
    // Check if user has entitlement
    $entitlement = $db->fetch(
        "SELECT id FROM entitlements WHERE user_id = ? AND product_id = ?",
        [$user['id'], $productId]
    );
    
    // Allow admin or entitled users
    if (!$entitlement && $user['role'] !== 'admin') {
        Response::forbidden('You do not have access to this product');
    }
    
    $assets = $db->fetchAll(
        "SELECT id, name, type, storage_path, link_url, key_value, metadata FROM product_assets WHERE product_id = ?",
        [$productId]
    );
    
    foreach ($assets as &$asset) {
        $asset['metadata'] = json_decode($asset['metadata'], true) ?? [];
    }
    
    Response::success($assets);
}

function createProduct(array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    // Validation
    $errors = [];
    if (empty($input['name'])) $errors['name'] = 'Name is required';
    if (empty($input['slug'])) $errors['slug'] = 'Slug is required';
    if (!isset($input['price']) || $input['price'] < 0) $errors['price'] = 'Valid price is required';
    
    if (!empty($errors)) {
        Response::validationError($errors);
    }
    
    $db = Database::getInstance();
    
    // Check slug uniqueness
    $existing = $db->fetch("SELECT id FROM products WHERE slug = ?", [$input['slug']]);
    if ($existing) {
        Response::error('Slug already exists', 409);
    }
    
    $productId = generateUUID();
    
    $data = [
        'id' => $productId,
        'category_id' => $input['category_id'] ?? null,
        'name' => $input['name'],
        'name_vi' => $input['name_vi'] ?? null,
        'slug' => $input['slug'],
        'description' => $input['description'] ?? null,
        'description_vi' => $input['description_vi'] ?? null,
        'short_description' => $input['short_description'] ?? null,
        'price' => (int)$input['price'],
        'original_price' => isset($input['original_price']) ? (int)$input['original_price'] : null,
        'currency' => $input['currency'] ?? 'VND',
        'status' => $input['status'] ?? 'draft',
        'featured' => !empty($input['featured']) ? 1 : 0,
        'image_url' => $input['image_url'] ?? null,
        'metadata' => json_encode($input['metadata'] ?? []),
        'nhhtool_id' => $input['nhhtool_id'] ?? null
    ];
    
    $db->insert('products', $data);
    
    $product = $db->fetch("SELECT * FROM products WHERE id = ?", [$productId]);
    $product['metadata'] = json_decode($product['metadata'], true) ?? [];
    $product['featured'] = (bool)$product['featured'];
    
    Response::success($product, 'Product created');
}

function updateProduct(string $id, array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    $db = Database::getInstance();
    
    $existing = $db->fetch("SELECT id FROM products WHERE id = ?", [$id]);
    if (!$existing) {
        Response::notFound('Product not found');
    }
    
    $allowedFields = [
        'category_id', 'name', 'name_vi', 'slug', 'description', 'description_vi',
        'short_description', 'price', 'original_price', 'currency', 'status',
        'featured', 'image_url', 'metadata', 'nhhtool_id'
    ];
    
    $updates = [];
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            if ($field === 'metadata') {
                $updates[$field] = json_encode($input[$field]);
            } elseif ($field === 'featured') {
                $updates[$field] = !empty($input[$field]) ? 1 : 0;
            } elseif (in_array($field, ['price', 'original_price'])) {
                $updates[$field] = (int)$input[$field];
            } else {
                $updates[$field] = $input[$field];
            }
        }
    }
    
    if (empty($updates)) {
        Response::error('No valid fields to update');
    }
    
    // Check slug uniqueness if updating
    if (isset($updates['slug'])) {
        $slugCheck = $db->fetch("SELECT id FROM products WHERE slug = ? AND id != ?", [$updates['slug'], $id]);
        if ($slugCheck) {
            Response::error('Slug already exists', 409);
        }
    }
    
    $db->update('products', $updates, 'id = ?', [$id]);
    
    $product = $db->fetch("SELECT * FROM products WHERE id = ?", [$id]);
    $product['metadata'] = json_decode($product['metadata'], true) ?? [];
    $product['featured'] = (bool)$product['featured'];
    
    Response::success($product, 'Product updated');
}

function deleteProduct(string $id): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    $db = Database::getInstance();
    
    $existing = $db->fetch("SELECT id FROM products WHERE id = ?", [$id]);
    if (!$existing) {
        Response::notFound('Product not found');
    }
    
    $db->delete('products', 'id = ?', [$id]);
    
    Response::success(null, 'Product deleted');
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
