<?php
//init la session
session_set_cookie_params([
	'lifetime' => 86400,	// 1 jour
	'path' => '/',
	'secure' => true,
	'httponly' => true
]);
session_start();

//recupererla clé api
$dotenv = parse_ini_file(__DIR__.'/.env');
define('API_KEY', $dotenv['API_KEY']);

//definir les chemins pour le json
define('FILE_JSON' , 'level.json');
define('UPLOAD_FOLDER' , __DIR__ . "/uploads/");

//init les routes
$routes = [];

/**
 * Déclare une route REST
 * $pattern : regex pour le path (ex: "create/(\w+)")
 * $method : "GET" ou "POST"
 * $callback : nom de la fonction callback sous forme de string
 */
function rest_route($pattern, $method, $callback) {
	global $routes;
	$routes[] = [
		"pattern" => $pattern,
		"method" => strtoupper($method),
		"callback" => $callback
	];
}

/**
 * Dispatcher la requête
 * Récupère $_GET['route'], $_SERVER['REQUEST_METHOD']
 * et exécute le callback correspondant
 */
function dispatch_request() {
	global $routes;
	$route = $_GET['route'] ?? "";
	$method = $_SERVER['REQUEST_METHOD'];
	$found = false;

	foreach($routes as $r) {
		if ($r["method"] !== $method) continue;

		if (preg_match("#^{$r['pattern']}$#", trim($route, "/"), $matches)) {
			$found = true;

			// PARSE ROUTE → clé/val
			$params = parse_route($route);

			// GET BODY DATA
			$body = null;
			if (in_array($method, ["POST", "PUT", "PATCH"])) {
				if (strpos($_SERVER["CONTENT_TYPE"], "application/json") !== false) {
					$body = json_decode(file_get_contents("php://input"), true);
				} else {
					$body = array_merge($_POST, $_FILES);
				}
			}

			//callback
			$callback = $r["callback"];
			if (function_exists($callback)) {
				$result = $callback($params, $body);
				header("Content-Type: application/json");
				echo json_encode($result);
			} else {
				http_response_code(500);
				echo json_encode(["error"=>"Callback '$callback' not found"]);
			}
			break;
		}
	}

	if (!$found) {
		http_response_code(404);
		echo json_encode(["error"=>"Route not found"]);
	}
}

/**
 * authentifiaction et creation du cookie du token
 */
function authenticate() {
	$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? null;

	if ($apiKey === API_KEY) {
		$_SESSION['api_key'] = $apiKey;
	}

	if (($_SESSION['api_key'] ?? '') !== API_KEY) {
		http_response_code(401);
		echo json_encode(["error"=>"Unauthorized"]);
		exit;
	}
}

/**
 * sanitize des noms pour le html, les injections XSS et le path traversal
 */
function sanitize_name(string $name): string {
    // Supprime les caractères dangereux pour le HTML
    $name = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');

    // Ne garde que les caractères alphanumériques, "_" et "-"
    $name = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $name);

    return $name;
}


/**
 * Liste des MIME types autorisés pour l’upload
 * (on vérifie l’extension dans la fonction d’upload)
 */
function check_mime_type($file) {
	$allowed_mime_types = [
		'image/png',
		'image/jpeg',
		'image/gif',
		'application/json'
	];

	if (!in_array($_FILES[$file]['type'], $allowed_mime_types)) {
		http_response_code(400);
		echo json_encode(["error"=>"MIME type non autorisé"]);
		exit;
	}
}

/**
 * Parser la route en clé/valeur
 */
function parse_route($route) {
	$route = trim($route, "/"); 
	$parts = explode("/", $route);
	$params = [];

	for ($i = 0; $i < count($parts); $i += 2) {
		$key = isset($parts[$i]) ? sanitize_name($parts[$i]) : null;
		$val = isset($parts[$i+1]) ? sanitize_name($parts[$i+1]) : '';

		if ($key !== null && $key !== "") {
			$params[$key] = $val;
		}
	}

	// Merge avec query string et sanitize
	if (!empty($_GET)) {
		foreach ($_GET as $k => $v) {
			if ($k === "route") continue; 
			$params[sanitize_name($k)] = sanitize_name($v);
		}
	}

	return $params;
}

//inclure le routage
include('routes.php');

//authentification et dispatch
authenticate();
dispatch_request();

?>