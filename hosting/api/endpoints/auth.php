<?php
/**
 * Authentication Endpoints
 * Login, Register, Profile management
 */

function handleAuth(string $method, ?string $action, array $input): void {
    switch ($action) {
        case 'login':
            if ($method !== 'POST') {
                Response::error('Method not allowed', 405);
            }
            login($input);
            break;
            
        case 'register':
            if ($method !== 'POST') {
                Response::error('Method not allowed', 405);
            }
            register($input);
            break;
            
        case 'me':
            if ($method === 'GET') {
                getProfile();
            } elseif ($method === 'PUT') {
                updateProfile($input);
            } else {
                Response::error('Method not allowed', 405);
            }
            break;
            
        case 'logout':
            if ($method !== 'POST') {
                Response::error('Method not allowed', 405);
            }
            logout();
            break;
            
        case 'change-password':
            if ($method !== 'POST') {
                Response::error('Method not allowed', 405);
            }
            changePassword($input);
            break;
            
        default:
            Response::notFound('Action not found');
    }
}

function login(array $input): void {
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    
    if (empty($email) || empty($password)) {
        Response::validationError(['email' => 'Email and password are required']);
    }
    
    $db = Database::getInstance();
    $user = $db->fetch(
        "SELECT * FROM users WHERE email = ?",
        [$email]
    );
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        Response::error('Invalid credentials', 401);
    }
    
    if ($user['status'] !== 'active') {
        Response::error('Account is ' . $user['status'], 403);
    }
    
    // Generate JWT token
    $token = JWT::encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role']
    ]);
    
    // Remove sensitive data
    unset($user['password_hash']);
    
    // Get wallet balance
    $wallet = $db->fetch("SELECT balance FROM wallets WHERE user_id = ?", [$user['id']]);
    $user['wallet_balance'] = $wallet['balance'] ?? 0;
    
    Response::success([
        'user' => $user,
        'access_token' => $token,
        'token_type' => 'bearer',
        'expires_in' => JWT_EXPIRY
    ], 'Login successful');
}

function register(array $input): void {
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $fullName = trim($input['full_name'] ?? '');
    $username = trim($input['username'] ?? '');
    
    // Validation
    $errors = [];
    
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Valid email is required';
    }
    
    if (strlen($password) < 6) {
        $errors['password'] = 'Password must be at least 6 characters';
    }
    
    if (empty($fullName)) {
        $errors['full_name'] = 'Full name is required';
    }
    
    if (!empty($username)) {
        if (strlen($username) < 3 || strlen($username) > 20) {
            $errors['username'] = 'Username must be 3-20 characters';
        }
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            $errors['username'] = 'Username can only contain letters, numbers and underscores';
        }
    }
    
    if (!empty($errors)) {
        Response::validationError($errors);
    }
    
    $db = Database::getInstance();
    
    // Check if email exists
    $existing = $db->fetch("SELECT id FROM users WHERE email = ?", [$email]);
    if ($existing) {
        Response::error('Email already registered', 409);
    }
    
    // Check if username exists
    if (!empty($username)) {
        $existingUsername = $db->fetch("SELECT id FROM users WHERE username = ?", [$username]);
        if ($existingUsername) {
            Response::error('Username already taken', 409);
        }
    }
    
    // Create user
    $userId = generateUUID();
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    $db->beginTransaction();
    
    try {
        $db->query(
            "INSERT INTO users (id, email, password_hash, full_name, username, role, status, email_verified_at) 
             VALUES (?, ?, ?, ?, ?, 'user', 'active', NOW())",
            [$userId, $email, $passwordHash, $fullName, $username ?: null]
        );
        
        // Wallet is created by trigger, but let's ensure it exists
        $wallet = $db->fetch("SELECT user_id FROM wallets WHERE user_id = ?", [$userId]);
        if (!$wallet) {
            $db->query("INSERT INTO wallets (user_id, balance) VALUES (?, 0)", [$userId]);
        }
        
        $db->commit();
        
        // Generate token
        $token = JWT::encode([
            'user_id' => $userId,
            'email' => $email,
            'role' => 'user'
        ]);
        
        Response::success([
            'user' => [
                'id' => $userId,
                'email' => $email,
                'full_name' => $fullName,
                'username' => $username,
                'role' => 'user',
                'status' => 'active',
                'wallet_balance' => 0
            ],
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => JWT_EXPIRY
        ], 'Registration successful');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
}

function getProfile(): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    $db = Database::getInstance();
    $wallet = $db->fetch("SELECT balance FROM wallets WHERE user_id = ?", [$user['id']]);
    $user['wallet_balance'] = $wallet['balance'] ?? 0;
    
    Response::success($user);
}

function updateProfile(array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    $allowedFields = ['full_name', 'username', 'phone', 'avatar_url'];
    $updates = [];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates[$field] = trim($input[$field]);
        }
    }
    
    if (empty($updates)) {
        Response::error('No valid fields to update');
    }
    
    // Validate username if provided
    if (isset($updates['username']) && !empty($updates['username'])) {
        $username = $updates['username'];
        if (strlen($username) < 3 || strlen($username) > 20) {
            Response::validationError(['username' => 'Username must be 3-20 characters']);
        }
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
            Response::validationError(['username' => 'Username can only contain letters, numbers and underscores']);
        }
        
        $db = Database::getInstance();
        $existing = $db->fetch("SELECT id FROM users WHERE username = ? AND id != ?", [$username, $user['id']]);
        if ($existing) {
            Response::error('Username already taken', 409);
        }
    }
    
    $db = Database::getInstance();
    $db->update('users', $updates, 'id = ?', [$user['id']]);
    
    // Get updated profile
    $updatedUser = $db->fetch(
        "SELECT id, email, full_name, username, avatar_url, phone, role, status FROM users WHERE id = ?",
        [$user['id']]
    );
    
    Response::success($updatedUser, 'Profile updated');
}

function logout(): void {
    // For JWT, client just discards the token
    // Optionally, we could blacklist tokens
    Response::success(null, 'Logged out successfully');
}

function changePassword(array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    $currentPassword = $input['current_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';
    
    if (empty($currentPassword) || empty($newPassword)) {
        Response::validationError(['password' => 'Current and new password are required']);
    }
    
    if (strlen($newPassword) < 6) {
        Response::validationError(['new_password' => 'Password must be at least 6 characters']);
    }
    
    $db = Database::getInstance();
    $userData = $db->fetch("SELECT password_hash FROM users WHERE id = ?", [$user['id']]);
    
    if (!password_verify($currentPassword, $userData['password_hash'])) {
        Response::error('Current password is incorrect', 400);
    }
    
    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $db->update('users', ['password_hash' => $newHash], 'id = ?', [$user['id']]);
    
    Response::success(null, 'Password changed successfully');
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
