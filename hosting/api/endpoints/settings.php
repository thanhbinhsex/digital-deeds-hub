<?php
/**
 * Site Settings Endpoints
 */

function handleSettings(string $method, ?string $key, array $input): void {
    switch ($method) {
        case 'GET':
            if ($key) {
                getSetting($key);
            } else {
                getSettings($input);
            }
            break;
            
        case 'PUT':
            if (!$key) Response::error('Setting key required');
            updateSetting($key, $input);
            break;
            
        default:
            Response::error('Method not allowed', 405);
    }
}

function getSettings(array $input): void {
    $db = Database::getInstance();
    
    // Public settings that anyone can view
    $publicKeys = ['general', 'banner', 'seo', 'topup_promotion', 'contact'];
    
    $user = JWT::getUserFromToken();
    $isAdmin = $user && $user['role'] === 'admin';
    
    if ($isAdmin) {
        // Admin can see all settings
        $settings = $db->fetchAll("SELECT * FROM site_settings");
    } else {
        // Public users only see public settings
        $placeholders = implode(',', array_fill(0, count($publicKeys), '?'));
        $settings = $db->fetchAll(
            "SELECT * FROM site_settings WHERE `key` IN ($placeholders)",
            $publicKeys
        );
    }
    
    // Format as key-value object
    $result = [];
    foreach ($settings as $setting) {
        $result[$setting['key']] = [
            'id' => $setting['id'],
            'key' => $setting['key'],
            'value' => json_decode($setting['value'], true),
            'description' => $setting['description'],
            'updated_at' => $setting['updated_at']
        ];
    }
    
    Response::success($result);
}

function getSetting(string $key): void {
    $db = Database::getInstance();
    
    $publicKeys = ['general', 'banner', 'seo', 'topup_promotion', 'contact'];
    
    $user = JWT::getUserFromToken();
    $isAdmin = $user && $user['role'] === 'admin';
    
    // Check if user has access
    if (!$isAdmin && !in_array($key, $publicKeys)) {
        Response::forbidden();
    }
    
    $setting = $db->fetch("SELECT * FROM site_settings WHERE `key` = ?", [$key]);
    
    if (!$setting) {
        Response::notFound('Setting not found');
    }
    
    $setting['value'] = json_decode($setting['value'], true);
    
    Response::success($setting);
}

function updateSetting(string $key, array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user || $user['role'] !== 'admin') {
        Response::forbidden();
    }
    
    if (!isset($input['value'])) {
        Response::validationError(['value' => 'Value is required']);
    }
    
    $db = Database::getInstance();
    
    $existing = $db->fetch("SELECT id FROM site_settings WHERE `key` = ?", [$key]);
    
    if ($existing) {
        $db->update('site_settings', [
            'value' => json_encode($input['value']),
            'updated_by' => $user['id']
        ], '`key` = ?', [$key]);
    } else {
        $db->insert('site_settings', [
            'id' => generateUUID(),
            'key' => $key,
            'value' => json_encode($input['value']),
            'description' => $input['description'] ?? null,
            'updated_by' => $user['id']
        ]);
    }
    
    $setting = $db->fetch("SELECT * FROM site_settings WHERE `key` = ?", [$key]);
    $setting['value'] = json_decode($setting['value'], true);
    
    Response::success($setting, 'Setting updated');
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
