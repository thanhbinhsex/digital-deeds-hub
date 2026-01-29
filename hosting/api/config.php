<?php
/**
 * VieTool API Configuration
 * Cấu hình kết nối database và settings
 */

// Prevent direct access
if (!defined('VIETOOL_API')) {
    die('Direct access not permitted');
}

// Database Configuration
define('DB_HOST', 'localhost');          // Thường là localhost trên cPanel
define('DB_NAME', 'vietool_db');         // Tên database bạn tạo trên cPanel
define('DB_USER', 'vietool_user');       // Username database
define('DB_PASS', 'your_password_here'); // Password database
define('DB_CHARSET', 'utf8mb4');

// JWT Configuration
define('JWT_SECRET', 'your-super-secret-key-change-this-in-production');
define('JWT_EXPIRY', 3600); // 1 hour in seconds

// CORS Configuration
define('ALLOWED_ORIGINS', [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-domain.com',
    'https://id-preview--cd7e3aaa-5159-4b21-9c3e-7a72ac81af89.lovable.app'
]);

// API Configuration
define('API_VERSION', '1.0.0');
define('DEBUG_MODE', false); // Set to false in production

// File Upload Configuration
define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('UPLOAD_PATH', __DIR__ . '/../uploads/');

// Telegram Configuration (for notifications)
define('TELEGRAM_BOT_TOKEN', '');
define('TELEGRAM_CHAT_ID', '');

// Bank API Configuration (for auto topup verification)
define('BANK_API_TOKEN', '');
define('BANK_API_URL', 'https://apibank.thueapibank.vn');

// Error reporting
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Timezone
date_default_timezone_set('Asia/Ho_Chi_Minh');
