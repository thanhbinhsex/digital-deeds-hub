<?php
/**
 * File Upload Endpoint
 * POST /api/upload - Upload a file (products/blog images)
 */

function handleUpload($method, $input) {
    if ($method !== 'POST') {
        Response::error('Method not allowed', 405);
        return;
    }

    // Require authentication
    $token = JWT::getFromHeader();
    if (!$token) {
        Response::unauthorized();
        return;
    }

    $payload = JWT::verify($token);
    if (!$payload) {
        Response::unauthorized('Invalid token');
        return;
    }

    // Only admin can upload files
    if ($payload['role'] !== 'admin') {
        Response::forbidden('Admin access required');
        return;
    }

    // Check for file upload
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension',
        ];
        $errorCode = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
        Response::error($errorMessages[$errorCode] ?? 'Upload failed', 400);
        return;
    }

    $file = $_FILES['file'];
    $type = $_POST['type'] ?? 'general'; // products, blog, general

    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes)) {
        Response::error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP', 400);
        return;
    }

    // Validate file size (max 5MB)
    $maxSize = defined('UPLOAD_MAX_SIZE') ? UPLOAD_MAX_SIZE : 5 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        Response::error('File too large. Maximum size: 5MB', 400);
        return;
    }

    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . strtolower($extension);

    // Determine upload directory based on type
    $uploadSubDir = match($type) {
        'products' => 'products/',
        'blog' => 'blog/',
        default => 'general/',
    };

    // Create directory if not exists
    $baseUploadDir = defined('UPLOAD_PATH') ? UPLOAD_PATH : dirname(__DIR__, 2) . '/uploads/';
    $fullUploadDir = $baseUploadDir . $uploadSubDir;
    
    if (!is_dir($fullUploadDir)) {
        mkdir($fullUploadDir, 0755, true);
    }

    // Move uploaded file
    $targetPath = $fullUploadDir . $filename;
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        Response::serverError('Failed to save file');
        return;
    }

    // Generate public URL
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $publicUrl = $protocol . '://' . $host . '/uploads/' . $uploadSubDir . $filename;

    Response::success([
        'url' => $publicUrl,
        'filename' => $filename,
        'size' => $file['size'],
        'type' => $mimeType,
    ], 'File uploaded successfully');
}
