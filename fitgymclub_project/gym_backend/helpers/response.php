<?php
/**
 * FIT GYM CLUB — API Yanıt Yardımcısı
 */

function success(array $data = [], int $code = 200): void
{
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function error(string $message, int $code = 400): void
{
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}
?>