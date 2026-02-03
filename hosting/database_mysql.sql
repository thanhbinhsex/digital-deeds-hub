-- =====================================================
-- VIETOOL DATABASE SCHEMA - MySQL Compatible
-- For cPanel Hosting
-- Export date: 2026-01-29
-- Compatible with: MySQL 5.7+ / MariaDB 10.3+
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- =====================================================
-- TABLES
-- =====================================================

-- Users table (replaces Supabase auth.users)
CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) DEFAULT NULL,
  `username` VARCHAR(50) DEFAULT NULL UNIQUE,
  `avatar_url` TEXT DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  `status` ENUM('active', 'suspended', 'banned') NOT NULL DEFAULT 'active',
  `email_verified_at` DATETIME DEFAULT NULL,
  `remember_token` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_username` (`username`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories table
CREATE TABLE `categories` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `name_vi` VARCHAR(255) DEFAULT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `icon` TEXT DEFAULT NULL,
  `sort_order` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
CREATE TABLE `products` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `category_id` CHAR(36) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `name_vi` VARCHAR(255) DEFAULT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `description_vi` TEXT DEFAULT NULL,
  `short_description` TEXT DEFAULT NULL,
  `price` INT NOT NULL DEFAULT 0,
  `original_price` INT DEFAULT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  `featured` TINYINT(1) DEFAULT 0,
  `image_url` TEXT DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  `nhhtool_id` VARCHAR(50) DEFAULT NULL,
  `view_count` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_category_id` (`category_id`),
  KEY `idx_products_slug` (`slug`),
  KEY `idx_products_status` (`status`),
  KEY `idx_products_nhhtool_id` (`nhhtool_id`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product assets table
CREATE TABLE `product_assets` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `product_id` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('file', 'key', 'link') NOT NULL,
  `storage_path` TEXT DEFAULT NULL,
  `link_url` TEXT DEFAULT NULL,
  `key_value` TEXT DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_assets_product_id` (`product_id`),
  CONSTRAINT `fk_product_assets_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallets table
CREATE TABLE `wallets` (
  `user_id` CHAR(36) NOT NULL,
  `balance` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_wallets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet transactions table
CREATE TABLE `wallet_transactions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `type` ENUM('credit', 'debit') NOT NULL,
  `amount` INT NOT NULL,
  `balance_before` INT NOT NULL,
  `balance_after` INT NOT NULL,
  `ref_type` VARCHAR(50) DEFAULT NULL,
  `ref_id` CHAR(36) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wallet_tx_user_id` (`user_id`),
  KEY `idx_wallet_tx_created_at` (`created_at`),
  CONSTRAINT `fk_wallet_tx_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Topup requests table
CREATE TABLE `topup_requests` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `amount` INT NOT NULL,
  `method` VARCHAR(50) NOT NULL,
  `status` ENUM('pending', 'approved', 'denied') NOT NULL DEFAULT 'pending',
  `topup_code` VARCHAR(20) DEFAULT NULL,
  `reference` VARCHAR(255) DEFAULT NULL,
  `bank_transaction_id` VARCHAR(255) DEFAULT NULL,
  `proof_url` TEXT DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `admin_id` CHAR(36) DEFAULT NULL,
  `admin_note` TEXT DEFAULT NULL,
  `decided_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_topup_requests_user_id` (`user_id`),
  KEY `idx_topup_requests_status` (`status`),
  KEY `idx_topup_requests_topup_code` (`topup_code`),
  CONSTRAINT `fk_topup_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table
CREATE TABLE `orders` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `status` ENUM('pending', 'paid', 'completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  `total_amount` INT NOT NULL DEFAULT 0,
  `discount_amount` INT DEFAULT 0,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'VND',
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `coupon_id` CHAR(36) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id` (`user_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_created_at` (`created_at`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order items table
CREATE TABLE `order_items` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `order_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) DEFAULT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments table
CREATE TABLE `payments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `order_id` CHAR(36) NOT NULL,
  `provider` VARCHAR(50) NOT NULL,
  `provider_ref` VARCHAR(255) DEFAULT NULL,
  `amount` INT NOT NULL,
  `status` ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `metadata` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payments_order_id` (`order_id`),
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Entitlements table
CREATE TABLE `entitlements` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) DEFAULT NULL,
  `granted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME DEFAULT NULL,
  `download_count` INT DEFAULT 0,
  `last_download_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_product` (`user_id`, `product_id`),
  KEY `idx_entitlements_user_id` (`user_id`),
  KEY `idx_entitlements_product_id` (`product_id`),
  CONSTRAINT `fk_entitlements_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_entitlements_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_entitlements_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Coupons table
CREATE TABLE `coupons` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `discount_type` ENUM('percent', 'fixed') NOT NULL,
  `discount_value` INT NOT NULL,
  `min_order_amount` INT DEFAULT 0,
  `max_discount` INT DEFAULT NULL,
  `usage_limit` INT DEFAULT NULL,
  `used_count` INT DEFAULT 0,
  `valid_from` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `valid_until` DATETIME DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_coupons_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Coupon usages table
CREATE TABLE `coupon_usages` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `coupon_id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) DEFAULT NULL,
  `used_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_coupon_usages_coupon_id` (`coupon_id`),
  KEY `idx_coupon_usages_user_id` (`user_id`),
  CONSTRAINT `fk_coupon_usages_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_coupon_usages_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blog posts table
CREATE TABLE `blog_posts` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `title` VARCHAR(255) NOT NULL,
  `title_vi` VARCHAR(255) DEFAULT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `content` LONGTEXT DEFAULT NULL,
  `content_vi` LONGTEXT DEFAULT NULL,
  `excerpt` TEXT DEFAULT NULL,
  `excerpt_vi` TEXT DEFAULT NULL,
  `image_url` TEXT DEFAULT NULL,
  `author_id` CHAR(36) NOT NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `published_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_blog_posts_slug` (`slug`),
  KEY `idx_blog_posts_status` (`status`),
  CONSTRAINT `fk_blog_posts_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Site settings table
CREATE TABLE `site_settings` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` JSON NOT NULL,
  `description` TEXT DEFAULT NULL,
  `updated_by` CHAR(36) DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_site_settings_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin audit logs table
CREATE TABLE `admin_audit_logs` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `admin_id` CHAR(36) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `entity_id` CHAR(36) DEFAULT NULL,
  `before_data` JSON DEFAULT NULL,
  `after_data` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_admin_id` (`admin_id`),
  KEY `idx_audit_logs_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User sessions table (for JWT token management)
CREATE TABLE `user_sessions` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `token` VARCHAR(500) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sessions_user_id` (`user_id`),
  KEY `idx_sessions_token` (`token`(255)),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================
-- NOTE: Run these statements SEPARATELY in phpMyAdmin SQL tab
-- or use the "Run SQL file statement by statement" option

-- First, drop existing function if exists
DROP FUNCTION IF EXISTS generate_topup_code;
DROP TRIGGER IF EXISTS tr_set_topup_code;
DROP TRIGGER IF EXISTS tr_create_wallet_on_user;

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default site settings
INSERT INTO `site_settings` (`id`, `key`, `value`, `description`) VALUES
(UUID(), 'general', '{"site_name": "VieTool", "site_description": "Phần mềm bản quyền chất lượng", "contact_email": "", "contact_phone": ""}', 'Cài đặt chung'),
(UUID(), 'payment', '{"bank_name": "Vietcombank", "bank_account": "1042986008", "bank_owner": "PHAM THANH BINH", "min_topup": 10000}', 'Cài đặt thanh toán'),
(UUID(), 'notification', '{"telegram_enabled": false, "notify_on_order": true, "notify_on_topup": true}', 'Cài đặt thông báo'),
(UUID(), 'contact', '{"telegram_url": "", "zalo_url": "", "facebook_url": ""}', 'Thông tin liên hệ'),
(UUID(), 'banner', '{"title": "Welcome to VieTool", "title_vi": "Chào mừng đến với VieTool", "description": "", "description_vi": "", "button_text": "View Products", "button_text_vi": "Xem sản phẩm", "button_link": "/products"}', 'Banner trang chủ'),
(UUID(), 'seo', '{"meta_title": "VieTool", "meta_description": "", "meta_keywords": "", "og_image": "", "favicon_url": ""}', 'Cài đặt SEO'),
(UUID(), 'topup_promotion', '{"promotions": []}', 'Khuyến mãi nạp tiền');

-- Insert default admin user (password: admin123 - CHANGE THIS!)
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `username`, `role`, `status`, `email_verified_at`) VALUES
(UUID(), 'admin@vietool.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'admin', 'admin', 'active', NOW());

COMMIT;

-- =====================================================
-- NOTES FOR INSTALLATION
-- =====================================================
-- 
-- 1. Login to cPanel -> phpMyAdmin
-- 2. Create a new database (e.g., vietool_db)
-- 3. Select the database and go to "Import" tab
-- 4. Upload this SQL file and click "Go"
-- 5. Update the config.php file with your database credentials
--
-- Default admin login:
-- Email: admin@vietool.com
-- Password: admin123 (CHANGE THIS IMMEDIATELY!)
--
-- =====================================================
