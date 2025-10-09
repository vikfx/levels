<?php

//enregistrer les routes
//authentification
rest_route('authenticate', 'GET', 'check_authentification');

// CRUD projet
rest_route('project/(\w+)', 'POST', 'save_project_request');		// création/update
rest_route('project/(\w+)', 'GET',  'get_project_request');			// lecture
//rest_route('project/(\w+)', 'PUT',  'save_project_request');		// mise à jour
rest_route('project/(\w+)', 'DELETE', 'delete_project');			// suppression

//update pour les palettes / models
rest_route('project/(\w+)/palette/(w+)', 'PUT', 'save_palette_request');
rest_route('project/(\w+)/palette/(\w+)/model/(\w+)', 'PUT', 'save_model_request');

// Liste des projets
//rest_route('list', 'GET', 'list_projects');

// Uploads
//rest_route('img/(\w+)', 'POST', 'upload_image');
//rest_route('json/(\w+)', 'POST', 'upload_json');

// Import/Export projet
//rest_route('export/(\w+)', 'GET', 'export_project');
//rest_route('import/(\w+)', 'POST', 'import_project');


//////////////////////////  CALLBACK REQUESTS
//authentification
function check_authentification() {
	if (($_SESSION['api_key'] ?? '') === API_KEY) {
		rest_response(['response'=>'authentification réussie']);
	} else {
		rest_response(['error'=>'non authorisé'], 401);
	}
}

//reponse de la requete GET project
function get_project_request($params) {
	$project = $params['project'] ?? null;

	if (!$project) {
		rest_response(['error' => 'Paramètre project manquant'], 400);
	}

	$json = get_project($project);

	if ($json === null) {
		rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);
	}

	// Réponse structurée
	rest_response([
		'action'  => 'get_project',
		'project' => $project,
		'datas'   => $json
	]);
}

//update du projet
function save_project_request($params, $body) {
	$project = $params['project'] ?? null;

	if (!$project) {
		rest_response(['error' => 'Paramètre project manquant'], 400);
	}

	//sauver les datas
	$old = get_project($project);
	$new = parse_level($body);
	if(!$old) $old = [];
	$success = save_project($project, merge_datas($old, $new));

	if(!$success) {
		rest_response(['error' => 'Erreur lors de la sauvegarde du json'], 500);
	}
	
	//recuperer le nouveau json
	$json = get_project($project);
	if ($json === null) {
		rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);
	}
	
	rest_response([
		'action'  => 'save_project',
		'project' => $project,
		'datas'   => $json
	]);
}

//update de la palette
function save_palette_request($params, $body) {
	$project = $params['project'] ?? null;

	if (!$project) {
		rest_response(['error' => 'Paramètre project manquant'], 400);
	}

	//definir les nouvelles datas selon le contexte
	$palette = $params['palette'] ?? null;
	if(!$palette) {
		rest_response(['error' => 'Paramètre palette manquant'], 400);
	}
	
	//sauver les datas
	$old = get_project($project) ?? [];
	$new = parse_palette($palette, $body['palette-name']);
	$success = save_project($project, merge_datas($old, $new));

	if(!$success) {
		rest_response(['error' => 'Erreur lors de la sauvegarde du json'], 500);
	}
	
	//recuperer le nouveau json
	$json = get_project($project);
	if ($json === null) {
		rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);
	}
	
	rest_response([
		'action'  => 'save_project',
		'project' => $project,
		'datas'   => $json
	]);
}

//update du model
function save_model_request($params, $body) {
	$project = $params['project'] ?? null;

	if (!$project) {
		$response = ['error' => 'Paramètre project manquant'];
		rest_response($response, 400);
	}

	//definir les nouvelles datas selon le contexte
	$palette = $params['palette'] ?? null;
	if(!$palette) {
		rest_response(['error' => 'Paramètre palette manquant'], 400);
	}
	if(!$palette) {
		rest_response(['error' => 'Paramètre palette manquant'], 400);
	}
	
	$model = $params['model'] ?? null;
	if(!$model) {
		rest_response(['error' => 'Paramètre model manquant'], 400);
	}

	$new = parse_model($model, $body['model-name'], $body['model-image'], $palette, $project);
	if(isset($new['error'])) rest_response($new, 500);
	
	//sauver les datas
	$old = get_project($project) ?? [];
	$success = save_project($project, merge_datas($old, $new));

	if(!$success) {
		rest_response(['error' => 'Erreur lors de la sauvegarde du json'], 500);
	}
	
	//recuperer le nouveau json
	$json = get_project($project);
	if ($json === null) {
		rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);
	}
	
	rest_response([
		'action'  => 'save_project',
		'project' => $project,
		'datas'   => $json
	]);
}

////////////////////////// ACTIONS SUR LE JSON
//renvoyer un projet existant
function get_project($project) {
	//ouvrir le dossier
	$project_dir =  UPLOAD_FOLDER . $project;
	$json_file = $project_dir . '/' . FILE_JSON;

	if (!is_dir($project_dir) || !file_exists($json_file)) {
		return;
	}

	//recuperer le contenu du json
	$json_content = file_get_contents($json_file);
	return json_decode($json_content, true);
}

//creation du dossier et du json sur le serveur
function save_project($project_name, $datas = []) {
	//recuperer les chemins
	$project_dir =  UPLOAD_FOLDER . $project_name;
	$json_file = $project_dir . '/' . FILE_JSON;

	//creer le dossier s'il n'existe pas
	if (!is_dir($project_dir)) {
		if(!mkdir($project_dir, 0770, true)) return false;
	}

	//ecrire le json
	if(empty($datas)) $datas = parse_level();

	$json = json_encode($datas, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

	return file_put_contents($json_file, $json);
}


//envoyer une image dans le projet
function upload_image($img, $project) {
	if (!isset($img)) {
		return ['error' => 'Aucun fichier envoyé'];
	}

	$file = $img;

	// Vérification du MIME
	$allowed = ['image/png', 'image/jpeg', 'image/gif'];
	if (!in_array($file['type'], $allowed)) {
		return ['error' => 'Type de fichier non autorisé'];
	}

	$project_dir =  UPLOAD_FOLDER . $project;

	// Créer le dossier si nécessaire
	if (!is_dir($project_dir)) {
		return ['error' => 'Le projet n\'existe pas'];
	}

	$filename = basename($file['name']);
	$targetPath = $project_dir . '/' . $filename;

	if(file_exists($targetPath)) {
		return ['error' => 'une image du même nom existe déjà'];
	}

	if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
		return ['error' => 'Impossible de déplacer le fichier'];
	}

	return ['success' => true, 'path' => $targetPath];
}

//retrouver une entrée par son slug dans un tableau
function find_by_slug($arr, $slug) {
	foreach ($arr as $key => $val) {
		if ($val['slug'] === $slug) {
			return $key;
		}
	}
	return false;
}

//mettre à jour un tableau
function update_arr($old, $new, $children = []) {
	foreach($new as $n) {
		$k = find_by_slug($old, $n['slug']);

		if($k !== false) {
			if(!empty($children)) {
				$child = array_shift($children);
				if (isset($n[$child]) && isset($old[$k][$child])) {
					$old[$k][$child] = update_arr($old[$k][$child], $n[$child], $children);
					unset($n[$child]);
				}
			}
			$old[$k] = array_merge($old[$k], $n);
			if(isset($old[$k]['delete'])) unset($old[$k]);
		} else {
			$old[] = $n;
		}
	}

	return $old;
}

//formater les données du model pour sauvegarde dans le json
function parse_model($slug, $name, $img, $palette, $project) {
	$upload_status = upload_image($img, $project);
	if(isset($upload_status['success']) && $upload_status['success'] === true) {
		return [
			'settings' => [
				'palettes' => [
					[
						'slug' 		=> $palette,
						'models' 	=> [
							[
								'slug' 	=> $slug,
								'name' 	=> $name,
								'img' 	=> $upload_status['path']
							]
						]
					]
				]
			]
		];
	} else {
		//erreur dans l'uploda
		return $upload_status;
	}
}

//formater les données de la palette
function parse_palette($slug, $name) {
	return [
		'settings' => [
			'palettes' => [
				[
					'name' 		=> ($name != null) ? $name : $slug,
					'slug' 		=> $slug,
					'models' 	=> []
				]
			]
		]
	];
}

//formater le modele pour le json
function parse_level($body = []) {
	return merge_datas([], $body);
}

//mise à jour des données
function merge_datas($old, $new = []) {
	if(!is_array($old)) {
		$old = [];
	}

	//ajouter les settings si besoin
	if(!isset($old['settings'])) {
		$old['settings'] = [
			'palettes' => []	
		];
	}

	//ajouter la map si besoin
	if(!isset($old['world'])) {
		$old['world'] = [
			'width' => 0,
			'height' => 0,
			'levels' => []
		];
	}

	//update des settings
	if(isset($new['settings']) && isset($new['settings']['palettes'])) {
		$old['settings']['palettes'] = update_arr($old['settings']['palettes'], $new['settings']['palettes'], ['models']);
	}

	//update du monde
	if(isset($new['world'])) {
		if(isset($new['world']['width'])) {
			$old['world']['width'] = $new['world']['width'];
		}
		
		if(isset($new['world']['height'])) {
			$old['world']['height'] = $new['world']['height'];
		}
		
		//update des zones
		if(isset($new['world']['levels'])) {
			$old['world']['levels'] = update_arr($old['world']['levels'], $new['world']['levels'], ['layers']);
		}
	}


	return $old;
}

////////////////////////// HELPERS
//formater une reponse de l'api
function rest_response($datas, $status = 200) {
	//statut
	if($status != 200) {
		http_response_code(500);
	}

	//header
	header('Content-Type: application/json');

	//response
	echo json_encode($datas);
	exit;
}

?>