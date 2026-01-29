<?php
/**
 * Categories Endpoints
 */

function handleCategories(string $method, ?string $id, array $input): void {
    switch ($method) {
        case 'GET':
            if ($id) {
                getCategory($id);
            } else {
                getCategories($input);
            }
            break;
            
        case 'POST':
            createCategory($input);
            break;
            
        case 'PUT':
            if (!$id) Response::error('Category ID required');
            updateCategory($id, $input);
            break;
            
        case 'DELETE':
            if (!$id) Response::error('Category ID required');
            deleteCategory($id);
            break;
            
        default:
            Response::error('Method not allowed', 405);
    }
}

function getCategories(array $input): void {
    $db = Database::getInstance();
    
    $sql = "SELECT id, name, name_vi, slug, description, icon, sort_order, created_at, updated_at 
            FROM categories 
            ORDER BY sort_order ASC, name ASC";
    
    $categories = $db->fetchAll($sql);
    
    Response::success($categories);
}

function getCategory(string $id): void {
    $db = Database::getInstance();
    
    // Check if it's a slug or UUID
    $isSlug = !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id);
    
    $sql = "SELECT * FROM categories WHERE " . ($isSlug ? "slug = ?" : "id = ?");
    $category = $db->fetch($sql, [$id]);
    
    if (!$category) {
        Response::notFound('Category not found');
    }
    
    Response::success($category);
}

function createCategory(array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    $errors = [];
    if (empty($input['name'])) $errors['name'] = 'Name is required';
    if (empty($input['slug'])) $errors['slug'] = 'Slug is required';
    
    if (!empty($errors)) {
        Response::validationError($errors);
    }
    
    $db = Database::getInstance();
    
    // Check slug uniqueness
    $existing = $db->fetch("SELECT id FROM categories WHERE slug = ?", [$input['slug']]);
    if ($existing) {
        Response::error('Slug already exists', 409);
    }
    
    $categoryId = generateUUID();
    
    $data = [
        'id' => $categoryId,
        'name' => $input['name'],
        'name_vi' => $input['name_vi'] ?? null,
        'slug' => $input['slug'],
        'description' => $input['description'] ?? null,
        'icon' => $input['icon'] ?? null,
        'sort_order' => (int)($input['sort_order'] ?? 0)
    ];
    
    $db->insert('categories', $data);
    
    $category = $db->fetch("SELECT * FROM categories WHERE id = ?", [$categoryId]);
    
    Response::success($category, 'Category created');
}

function updateCategory(string $id, array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    $db = Database::getInstance();
    
    $existing = $db->fetch("SELECT id FROM categories WHERE id = ?", [$id]);
    if (!$existing) {
        Response::notFound('Category not found');
    }
    
    $allowedFields = ['name', 'name_vi', 'slug', 'description', 'icon', 'sort_order'];
    $updates = [];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            if ($field === 'sort_order') {
                $updates[$field] = (int)$input[$field];
            } else {
                $updates[$field] = $input[$field];
            }
        }
    }
    
    if (empty($updates)) {
        Response::error('No valid fields to update');
    }
    
    // Check slug uniqueness
    if (isset($updates['slug'])) {
        $slugCheck = $db->fetch("SELECT id FROM categories WHERE slug = ? AND id != ?", [$updates['slug'], $id]);
        if ($slugCheck) {
            Response::error('Slug already exists', 409);
        }
    }
    
    $db->update('categories', $updates, 'id = ?', [$id]);
    
    $category = $db->fetch("SELECT * FROM categories WHERE id = ?", [$id]);
    
    Response::success($category, 'Category updated');
}

function deleteCategory(string $id): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    $db = Database::getInstance();
    
    $existing = $db->fetch("SELECT id FROM categories WHERE id = ?", [$id]);
    if (!$existing) {
        Response::notFound('Category not found');
    }
    
    // Check if category has products
    $productCount = $db->fetch("SELECT COUNT(*) as count FROM products WHERE category_id = ?", [$id]);
    if ($productCount['count'] > 0) {
        Response::error('Cannot delete category with products', 400);
    }
    
    $db->delete('categories', 'id = ?', [$id]);
    
    Response::success(null, 'Category deleted');
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
