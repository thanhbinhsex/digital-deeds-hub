<?php
/**
 * Simple JWT Handler
 * For authentication tokens
 */

class JWT {
    
    public static function encode(array $payload): string {
        $header = self::base64UrlEncode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]));
        
        $payload['iat'] = time();
        $payload['exp'] = time() + JWT_EXPIRY;
        
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));
        
        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payloadEncoded", JWT_SECRET, true)
        );
        
        return "$header.$payloadEncoded.$signature";
    }
    
    public static function decode(string $token): ?array {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return null;
        }
        
        list($header, $payload, $signature) = $parts;
        
        // Verify signature
        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
        );
        
        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }
        
        $payloadDecoded = json_decode(self::base64UrlDecode($payload), true);
        
        if (!$payloadDecoded) {
            return null;
        }
        
        // Check expiration
        if (isset($payloadDecoded['exp']) && $payloadDecoded['exp'] < time()) {
            return null;
        }
        
        return $payloadDecoded;
    }
    
    public static function getTokenFromHeader(): ?string {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
    
    public static function getUserFromToken(): ?array {
        $token = self::getTokenFromHeader();
        
        if (!$token) {
            return null;
        }
        
        $payload = self::decode($token);
        
        if (!$payload || !isset($payload['user_id'])) {
            return null;
        }
        
        // Get fresh user data from database
        $db = Database::getInstance();
        return $db->fetch(
            "SELECT id, email, full_name, username, avatar_url, phone, role, status 
             FROM users WHERE id = ? AND status = 'active'",
            [$payload['user_id']]
        );
    }
    
    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
