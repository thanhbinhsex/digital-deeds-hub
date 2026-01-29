<?php
/**
 * Blog Endpoints
 */

function handleBlog(string $method, ?string $id, array $input): void {
    switch ($method) {
        case 'GET':
            if ($id) {
                getBlogPost($id);
            } else {
                getBlogPosts($input);
            }
            break;
            
        case 'POST':
            createBlogPost($input);
            break;
            
        case 'PUT':
            if (!$id) Response::error('Post ID required');
            updateBlogPost($id, $input);
            break;
            
        case 'DELETE':
            if (!$id) Response::error('Post ID required');
            deleteBlogPost($id);
            break;
            
        default:
            Response::error('Method not allowed', 405);
    }
}

function getBlogPosts(array $input): void {
    $db = Database::getInstance();
    
    $page = max(1, (int)($input['page'] ?? 1));
    $perPage = min(100, max(1, (int)($input['limit'] ?? 10)));
    $offset = ($page - 1) * $perPage;
    
    $user = JWT::getUserFromToken();
    $isAdmin = $user && $user['role'] === 'admin';
    
    if ($isAdmin && !empty($input['all'])) {
        $where = "1=1";
    } else {
        $where = "b.status = 'published'";
    }
    
    $params = [];
    
    $total = $db->fetch("SELECT COUNT(*) as total FROM blog_posts b WHERE $where", $params)['total'];
    
    $sql = "SELECT b.id, b.title, b.title_vi, b.slug, b.excerpt, b.excerpt_vi, 
                   b.image_url, b.status, b.published_at, b.created_at,
                   u.full_name as author_name
            FROM blog_posts b
            LEFT JOIN users u ON b.author_id = u.id
            WHERE $where 
            ORDER BY b.published_at DESC, b.created_at DESC
            LIMIT $perPage OFFSET $offset";
    
    $posts = $db->fetchAll($sql, $params);
    
    Response::paginated($posts, $total, $page, $perPage);
}

function getBlogPost(string $id): void {
    $db = Database::getInstance();
    
    // Check if it's a slug or UUID
    $isSlug = !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id);
    
    $user = JWT::getUserFromToken();
    $isAdmin = $user && $user['role'] === 'admin';
    
    $where = $isSlug ? "b.slug = ?" : "b.id = ?";
    if (!$isAdmin) {
        $where .= " AND b.status = 'published'";
    }
    
    $sql = "SELECT b.*, u.full_name as author_name
            FROM blog_posts b
            LEFT JOIN users u ON b.author_id = u.id
            WHERE $where";
    
    $post = $db->fetch($sql, [$id]);
    
    if (!$post) {
        Response::notFound('Blog post not found');
    }
    
    Response::success($post);
}

function createBlogPost(array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    $errors = [];
    if (empty($input['title'])) $errors['title'] = 'Title is required';
    if (empty($input['slug'])) $errors['slug'] = 'Slug is required';
    
    if (!empty($errors)) {
        Response::validationError($errors);
    }
    
    $db = Database::getInstance();
    
    // Check slug uniqueness
    $existing = $db->fetch("SELECT id FROM blog_posts WHERE slug = ?", [$input['slug']]);
    if ($existing) {
        Response::error('Slug already exists', 409);
    }
    
    $postId = generateUUID();
    
    $data = [
        'id' => $postId,
        'title' => $input['title'],
        'title_vi' => $input['title_vi'] ?? null,
        'slug' => $input['slug'],
        'content' => $input['content'] ?? null,
        'content_vi' => $input['content_vi'] ?? null,
        'excerpt' => $input['excerpt'] ?? null,
        'excerpt_vi' => $input['excerpt_vi'] ?? null,
        'image_url' => $input['image_url'] ?? null,
        'author_id' => $user['id'],
        'status' => $input['status'] ?? 'draft',
        'published_at' => ($input['status'] ?? 'draft') === 'published' ? date('Y-m-d H:i:s') : null
    ];
    
    $db->insert('blog_posts', $data);
    
    $post = $db->fetch("SELECT * FROM blog_posts WHERE id = ?", [$postId]);
    
    Response::success($post, 'Blog post created');
}

function updateBlogPost(string $id, array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    $db = Database::getInstance();
    
    $existing = $db->fetch("SELECT * FROM blog_posts WHERE id = ?", [$id]);
    if (!$existing) {
        Response::notFound('Blog post not found');
    }
    
    $allowedFields = ['title', 'title_vi', 'slug', 'content', 'content_vi', 'excerpt', 'excerpt_vi', 'image_url', 'status'];
    $updates = [];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates[$field] = $input[$field];
        }
    }
    
    // Set published_at if publishing for first time
    if (isset($updates['status']) && $updates['status'] === 'published' && $existing['status'] !== 'published') {
        $updates['published_at'] = date('Y-m-d H:i:s');
    }
    
    if (empty($updates)) {
        Response::error('No valid fields to update');
    }
    
    // Check slug uniqueness
    if (isset($updates['slug'])) {
        $slugCheck = $db->fetch("SELECT id FROM blog_posts WHERE slug = ? AND id != ?", [$updates['slug'], $id]);
        if ($slugCheck) {
            Response::error('Slug already exists', 409);
        }
    }
    
    $db->update('blog_posts', $updates, 'id = ?', [$id]);
    
    $post = $db->fetch("SELECT * FROM blog_posts WHERE id = ?", [$id]);
    
    Response::success($post, 'Blog post updated');
}

function deleteBlogPost(string $id): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    $db = Database::getInstance();
    
    $existing = $db->fetch("SELECT id FROM blog_posts WHERE id = ?", [$id]);
    if (!$existing) {
        Response::notFound('Blog post not found');
    }
    
    $db->delete('blog_posts', 'id = ?', [$id]);
    
    Response::success(null, 'Blog post deleted');
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
