<?php
/**
 * VieTool API Router
 * Main entry point for all API requests
 */

define('VIETOOL_API', true);

// Load configuration
require_once __DIR__ . '/config.php';

// CORS Headers
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS)) {
    header("Access-Control-Allow-Origin: $origin");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Load core classes
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/JWT.php';
require_once __DIR__ . '/Response.php';

// Parse request
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = dirname($_SERVER['SCRIPT_NAME']);
$path = substr($requestUri, strlen($basePath));
$path = parse_url($path, PHP_URL_PATH);
$path = trim($path, '/');
$segments = explode('/', $path);

$endpoint = $segments[0] ?? '';
$id = $segments[1] ?? null;
$action = $segments[2] ?? null;

$method = $_SERVER['REQUEST_METHOD'];

// Get request body for POST/PUT
$input = [];
if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?? [];
}

// Merge with query params
$input = array_merge($_GET, $input);

try {
    // Route to appropriate handler
    switch ($endpoint) {
        case 'auth':
            require_once __DIR__ . '/endpoints/auth.php';
            handleAuth($method, $id, $input);
            break;
            
        case 'products':
            require_once __DIR__ . '/endpoints/products.php';
            handleProducts($method, $id, $action, $input);
            break;
            
        case 'categories':
            require_once __DIR__ . '/endpoints/categories.php';
            handleCategories($method, $id, $input);
            break;
            
        case 'settings':
            require_once __DIR__ . '/endpoints/settings.php';
            handleSettings($method, $id, $input);
            break;
            
        case 'wallet':
            require_once __DIR__ . '/endpoints/wallet.php';
            handleWallet($method, $action, $input);
            break;
            
        case 'topup':
            require_once __DIR__ . '/endpoints/topup.php';
            handleTopup($method, $id, $action, $input);
            break;
            
        case 'orders':
            require_once __DIR__ . '/endpoints/orders.php';
            handleOrders($method, $id, $input);
            break;
            
        case 'checkout':
            require_once __DIR__ . '/endpoints/checkout.php';
            handleCheckout($method, $input);
            break;
            
        case 'entitlements':
            require_once __DIR__ . '/endpoints/entitlements.php';
            handleEntitlements($method, $id, $input);
            break;
            
        case 'blog':
            require_once __DIR__ . '/endpoints/blog.php';
            handleBlog($method, $id, $input);
            break;
            
        case 'upload':
            require_once __DIR__ . '/endpoints/upload.php';
            handleUpload($method, $input);
            break;
            
        case 'admin':
            require_once __DIR__ . '/endpoints/admin.php';
            handleAdmin($method, $action, $id, $input);
            break;
            
        case 'health':
            Response::success(['status' => 'ok', 'version' => API_VERSION]);
            break;
            
        default:
            Response::notFound('Endpoint not found');
    }
} catch (Exception $e) {
    if (DEBUG_MODE) {
        Response::serverError($e->getMessage());
    } else {
        Response::serverError('An error occurred');
    }
}
