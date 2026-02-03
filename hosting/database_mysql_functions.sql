-- =====================================================
-- VIETOOL DATABASE - STORED PROCEDURES & TRIGGERS
-- Run this file SEPARATELY after importing database_mysql.sql
-- In phpMyAdmin: Go to SQL tab and paste each block one by one
-- =====================================================

-- =====================================================
-- STEP 1: Generate topup code function
-- Copy and run this block:
-- =====================================================
DELIMITER //
CREATE FUNCTION generate_topup_code() 
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
  DECLARE chars VARCHAR(36) DEFAULT 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  DECLARE result VARCHAR(20) DEFAULT 'NAP';
  DECLARE i INT DEFAULT 1;
  
  WHILE i <= 6 DO
    SET result = CONCAT(result, SUBSTRING(chars, FLOOR(1 + RAND() * 36), 1));
    SET i = i + 1;
  END WHILE;
  
  RETURN result;
END//
DELIMITER ;

-- =====================================================
-- STEP 2: Trigger to auto-generate topup code
-- Copy and run this block:
-- =====================================================
DELIMITER //
CREATE TRIGGER tr_set_topup_code
BEFORE INSERT ON topup_requests
FOR EACH ROW
BEGIN
  IF NEW.topup_code IS NULL THEN
    SET NEW.topup_code = generate_topup_code();
  END IF;
END//
DELIMITER ;

-- =====================================================
-- STEP 3: Trigger to create wallet on user registration
-- Copy and run this block:
-- =====================================================
DELIMITER //
CREATE TRIGGER tr_create_wallet_on_user
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0);
END//
DELIMITER ;
