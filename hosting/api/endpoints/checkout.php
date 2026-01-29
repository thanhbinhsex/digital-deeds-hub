<?php
/**
 * Checkout Endpoint
 * Process wallet payment and create order
 */

function handleCheckout(string $method, array $input): void {
    if ($method !== 'POST') {
        Response::error('Method not allowed', 405);
    }
    
    processCheckout($input);
}

function processCheckout(array $input): void {
    $user = JWT::getUserFromToken();
    
    if (!$user) {
        Response::unauthorized();
    }
    
    // Validate input
    if (empty($input['items']) || !is_array($input['items'])) {
        Response::validationError(['items' => 'Items are required']);
    }
    
    $db = Database::getInstance();
    $db->beginTransaction();
    
    try {
        // Get wallet balance
        $wallet = $db->fetch("SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE", [$user['id']]);
        
        if (!$wallet) {
            throw new Exception('Wallet not found');
        }
        
        $balance = (int)$wallet['balance'];
        $totalAmount = 0;
        $discountAmount = (int)($input['discountAmount'] ?? 0);
        $orderItems = [];
        
        // Validate items and calculate total
        foreach ($input['items'] as $item) {
            $productId = $item['productId'] ?? null;
            $price = (int)($item['price'] ?? 0);
            $quantity = max(1, (int)($item['quantity'] ?? 1));
            
            if (!$productId) {
                throw new Exception('Product ID is required');
            }
            
            // Get product from database to verify price
            $product = $db->fetch(
                "SELECT id, name, name_vi, price, status FROM products WHERE id = ? AND status = 'published'",
                [$productId]
            );
            
            if (!$product) {
                throw new Exception('Product not found: ' . $productId);
            }
            
            // Verify price matches (allow client price if equal or higher)
            if ($price < $product['price']) {
                $price = $product['price'];
            }
            
            // Check if user already owns this product
            $existingEntitlement = $db->fetch(
                "SELECT id FROM entitlements WHERE user_id = ? AND product_id = ?",
                [$user['id'], $productId]
            );
            
            if ($existingEntitlement) {
                throw new Exception('You already own this product: ' . $product['name']);
            }
            
            $totalAmount += $price * $quantity;
            
            $orderItems[] = [
                'product_id' => $productId,
                'product_name' => $product['name'],
                'quantity' => $quantity,
                'unit_price' => $price
            ];
        }
        
        // Apply discount
        $finalAmount = max(0, $totalAmount - $discountAmount);
        
        // Check balance
        if ($balance < $finalAmount) {
            throw new Exception('Insufficient balance. Required: ' . number_format($finalAmount) . ' VND, Available: ' . number_format($balance) . ' VND');
        }
        
        // Create order
        $orderId = generateUUID();
        $db->insert('orders', [
            'id' => $orderId,
            'user_id' => $user['id'],
            'status' => 'completed',
            'total_amount' => $totalAmount,
            'discount_amount' => $discountAmount,
            'currency' => 'VND',
            'payment_method' => 'wallet',
            'coupon_id' => $input['couponId'] ?? null
        ]);
        
        // Create order items and entitlements
        foreach ($orderItems as $item) {
            $db->insert('order_items', [
                'id' => generateUUID(),
                'order_id' => $orderId,
                'product_id' => $item['product_id'],
                'product_name' => $item['product_name'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price']
            ]);
            
            // Create entitlement
            $db->query(
                "INSERT INTO entitlements (id, user_id, product_id, order_id) 
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE order_id = VALUES(order_id), granted_at = NOW()",
                [generateUUID(), $user['id'], $item['product_id'], $orderId]
            );
        }
        
        // Debit wallet
        $newBalance = $balance - $finalAmount;
        $db->update('wallets', ['balance' => $newBalance], 'user_id = ?', [$user['id']]);
        
        // Record transaction
        $db->insert('wallet_transactions', [
            'id' => generateUUID(),
            'user_id' => $user['id'],
            'type' => 'debit',
            'amount' => $finalAmount,
            'balance_before' => $balance,
            'balance_after' => $newBalance,
            'ref_type' => 'order',
            'ref_id' => $orderId,
            'note' => 'Payment for order #' . substr($orderId, 0, 8)
        ]);
        
        // Update coupon usage if applicable
        if (!empty($input['couponId'])) {
            $db->query(
                "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?",
                [$input['couponId']]
            );
            
            $db->insert('coupon_usages', [
                'id' => generateUUID(),
                'coupon_id' => $input['couponId'],
                'user_id' => $user['id'],
                'order_id' => $orderId
            ]);
        }
        
        $db->commit();
        
        Response::success([
            'order_id' => $orderId,
            'total_amount' => $totalAmount,
            'discount_amount' => $discountAmount,
            'final_amount' => $finalAmount,
            'new_balance' => $newBalance
        ], 'Payment successful');
        
    } catch (Exception $e) {
        $db->rollback();
        Response::error($e->getMessage(), 400);
    }
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
