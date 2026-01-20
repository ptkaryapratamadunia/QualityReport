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
        if ($inputPassword == $user['password']) {
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