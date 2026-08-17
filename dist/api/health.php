<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
echo json_encode(['ok' => true, 'service' => 'ses-moscow'], JSON_UNESCAPED_UNICODE);
