<?php
//Added on December 24, 2025
// Izinkan akses dari mana saja (untuk development), saat production sebaiknya diset ke domain spesifik
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Konfigurasi Database
// Sesuuaikan dengan detail server hosting Anda
$host = 'localhost';
$db_name = 'karyapdn_dbQuality'; // Nama database sesuai screenshot
$username = 'karyapdn_quality'; // Ganti dengan username database server Anda
$password = 'Quality@Kapede888'; // Ganti dengan password database server Anda

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// Mengambil data input
// Mendukung JSON body
$data = json_decode(file_get_contents("php://input"), true);

$inputUsername = '';
$inputPassword = '';

if (isset($data['username']) && isset($data['password'])) {
    $inputUsername = $data['username'];
    $inputPassword = $data['password'];
} elseif (isset($_POST['username']) && isset($_POST['password'])) {
    // Mendukung Form Data standard
    $inputUsername = $_POST['username'];
    $inputPassword = $_POST['password'];
} else {
    echo json_encode(['success' => false, 'message' => 'Username and password required']);
    exit();
}

// Query User
try {
    // Mencari user berdasarkan username
    $stmt = $conn->prepare("SELECT * FROM user WHERE username = :username LIMIT 1");
    $stmt->bindParam(':username', $inputUsername);
    $stmt->execute();

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {


        // Karena password sudah di enkripsi di database, gunakan password_verify()
        // Kita gunakan OR untuk mendukung kedua kemungkinan: Hash (seharusnya) atau Plain Text (legacy/error)
        if (password_verify($inputPassword, $user['password']) || $inputPassword == $user['password']) {

            // Batasi Hak Akses: Hanya Top Admin atau Manager
            $userRole = isset($user['role']) ? trim($user['role']) : '';

            if ($userRole !== 'Top Admin' && $userRole !== 'Manager') {
                echo json_encode([
                    'success' => false,
                    'message' => 'Anda tidak mendapatkan hak Akses. Silahkan hubungi Administrator. (Your Role: ' . $userRole . ')'
                ]);
                exit();
            }
            
            // ✅ === CATAT LOGIN KE LOG_BOOK 28 Jan 2026 ===
            try {
                // Ambil IP Address
                $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';

                // Ambil User-Agent (browser/device)
                $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';

                // Nama aplikasi 
                $appName = "DataCleanerPro"; 

                // Insert ke log_login
                $logStmt = $conn->prepare("
                    INSERT INTO log_login (username, app_name, ip_address, user_agent)
                    VALUES (:username, :app_name, :ip, :user_agent)
                ");
                $logStmt->bindParam(':username', $inputUsername);
                $logStmt->bindParam(':app_name', $appName);
                $logStmt->bindParam(':ip', $ip);
                $logStmt->bindParam(':user_agent', $userAgent);
                $logStmt->execute();

            } catch (Exception $logErr) {
                // Opsional: log error ke file, tapi jangan tampilkan ke user
                error_log("Log login gagal: " . $logErr->getMessage());
                // Lanjutkan meski logging gagal — jangan hentikan login
            }

            // Login Berhasil
            // Hapus password dari object user sebelum dikirim kembali ke client
            unset($user['password']);

            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => $user
            ]);
        } else {
            // Password Salah
            echo json_encode(['success' => false, 'message' => 'Invalid password']);
        }
    } else {
        // User Tidak Ditemukan
        echo json_encode(['success' => false, 'message' => 'User not found']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>