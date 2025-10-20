<?php

//enregistrer les routes
//authentification
rest_route('authenticate', 'GET', 'check_authentication');

// CRUD projet
rest_route('project/(\w+)', 'POST', 'save_project_request');		// création/update
rest_route('project/(\w+)', 'GET',  'get_project_request');			// lecture
//rest_route('project/(\w+)', 'DELETE', 'delete_project');			// suppression

//update pour les palettes / models
rest_route('project/(\w+)/palette/(\w+)', 'POST', 'save_palette_request');
rest_route('project/(\w+)/palette/(\w+)', 'DELETE', 'delete_palette_request');
rest_route('project/(\w+)/palette/(\w+)/model/(\w+)', 'POST', 'save_model_request');
rest_route('project/(\w+)/palette/(\w+)/model/(\w+)', 'DELETE', 'delete_model_request');

//get/update levels
rest_route('project/(\w+)/level/(\w+)', 'GET', 'get_level_request');
rest_route('project/(\w+)/level/(\w+)', 'POST', 'save_level_request');
//rest_route('project/(\w+)/level/(\w+)', 'DELETE', 'delete_level_request');


// Liste des projets
//rest_route('list', 'GET', 'list_projects');

//////////////////////////  CALLBACK REQUESTS
//authentification
function check_authentication() {
	if (($_SESSION['api_key'] ?? '') === API_KEY) {
		rest_response(['response'=>'authentification réussie']);
	} else {
		rest_response(['error'=>'non authorisé'], 401);
	}
}

//reponse de la requete GET project
function get_project_request($params) {
	//verifier les parametres
	$project = $params['project'] ?? null;
	if (!$project) rest_response(['error' => 'Paramètre project manquant'], 400);

	//recuperer les datas
	$json = get_project($project);

	//verification
	if ($json === null) rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);

	//reponse
	rest_response([
		'action'  => 'get_project',
		'project' => $project,
		'datas'   => $json
	]);
}

//update du projet
function save_project_request($params, $body) {
	//verifier les parametres
	$project = $params['project'] ?? null;
	if (!$project) 
		rest_response(['error' => 'Paramètre project manquant'], 400);

	//sauver les datas
	$old = get_project($project) ?? [];
	$new = parse_project($body);

	//delete levels
	if(isset($new['world']['levels']) && isset($old['world']['levels'])) {
		$levels = $old['world']['levels'];
		foreach($levels as $level){
			if(!in_array($level, $new['world']['levels'])) {
				$delete = delete_level($project, $level, $old['world']['levels']);
				if(isset($delete['error'])) return $delete;
				$old['world']['levels'] = $delete;
			}
		}
	}

	//save project
	$success = save_project($project, merge_project_datas($old, $new));
	if(!$success) rest_response(['error' => 'Erreur lors de la sauvegarde du json'], 500);
	
	//verification de l'execution
	$json = get_project($project);
	if ($json === null) rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);
	
	//reponse
	rest_response([
		'action'  	=> 'save_project',
		'project' 	=> $project,
		'success'	=> true
		//'datas'   	=> $json
	]);
}

//reponse de la requete GET level
function get_level_request($params) {
	//verifier les parametres
	$project = $params['project'] ?? null;
	if (!$project) rest_response(['error' => 'Paramètre project manquant'], 400);
	
	$level = $params['level'] ?? null;
	if (!$level) rest_response(['error' => 'Paramètre level manquant'], 400);

	//recuperer les datas
	$json = get_level($project, $level, false);

	//verification
	if ($json === null) rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);

	//reponse
	rest_response([
		'action'  	=> 'get_level',
		'project' 	=> $project,
		'level' 	=> $level,
		'datas'   	=> $json
	]);
}

//update du level
function save_level_request($params, $body) {
	//verifier les parametres
	$project = $params['project'] ?? null;
	if (!$project) rest_response(['error' => 'Paramètre project manquant'], 400);

	$level = $params['level'] ?? null;
	if(!$level) rest_response(['error' => 'Paramètre level manquant'], 400);

	//sauver les datas
	$success = save_level($project, $level, $body, true);
	if(!$success) rest_response(['error' => 'Erreur lors de la sauvegarde du json'], 500);
	
	//verification
	$json = get_level($project, $level, false);
	if ($json === null) rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);
	
	//reponse
	rest_response([
		'action'  	=> 'save_level',
		'project' 	=> $project,
		'level' 	=> $level,
		'success'	=> $success
	]);
}

//update de la palette
function save_palette_request($params, $body) {
	//verifier les parametres
	$project = $params['project'] ?? null;
	if (!$project) rest_response(['error' => 'Paramètre project manquant'], 400);

	$palette = $params['palette'] ?? null;
	if(!$palette) rest_response(['error' => 'Paramètre palette manquant'], 400);
	
	//sauver les datas
	$old = get_project($project) ?? [];
	if(get_palette($old, $palette)) rest_response(['error' => 'La palette existe déjà'], 400);

	$new = parse_palette($palette, $body['palette-name']);
	
	$success = save_project($project, merge_project_datas($old, $new));
	if(!$success) rest_response(['error' => 'Erreur lors de la sauvegarde du json'], 500);
	
	//verification
	$json = get_project($project);
	if ($json === null) rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);
	
	//reponse
	rest_response([
		'action'  	=> 'save_palette',
		'project' 	=> $project,
		'palette'   => get_palette($json, $palette)
	]);
}

//suppression de la palette
function delete_palette_request($params, $body) {
	//verifier les parametres
	$project = $params['project'] ?? null;
	if (!$project) rest_response(['error' => 'Paramètre project manquant'], 400);

	$palette = $params['palette'] ?? null;
	if(!$palette) rest_response(['error' => 'Paramètre palette manquant'], 400);
	
	//suppression
	$new = delete_palette($project, $palette);
	if($new === false) rest_response(['error' => 'La palette n\'existe pas'], 400);
	if(isset($new['error'])) rest_response([$new], 500);
	
	//sauver les datas
	$success = save_project($project, $new);
	if(!$success) rest_response(['error' => 'Erreur lors de la sauvegarde du json'], 500);
	
	//verification
	$json = get_project($project);
	if ($json === null) rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);
	if(get_palette($json, $palette)) rest_response(['error' => 'une erreur s\'est produite lors de la suppression de la palette'], 500);
	
	//reponse
	rest_response([
		'action'  	=> 'delete_palette',
		'project' 	=> $project,
		'palette'   => $palette
	]);
}

//update du model
function save_model_request($params, $body) {
	//verifier les parametres
	$project = $params['project'] ?? null;
	if (!$project) rest_response(['error' => 'Paramètre project manquant'], 400);

	$palette = $params['palette'] ?? null;
	if(!$palette) rest_response(['error' => 'Paramètre palette manquant'], 400);
	
	$model = $params['model'] ?? null;
	if(!$model) rest_response(['error' => 'Paramètre model manquant'], 400);
	
	//sauver les datas
	$old = get_project($project) ?? [];
	if(!get_palette($old, $palette)) rest_response(['error' => 'La palette n\'existe pas'], 400);

	$new = parse_model($model, $body['model-name'], $body['model-image'], $palette, $project);
	if(isset($new['error'])) rest_response([$new], 500);
	
	$success = save_project($project, merge_project_datas($old, $new));
	if(!$success) rest_response(['error' => 'Erreur lors de la sauvegarde du json'], 500);
	
	//verification
	$json = get_project($project);
	if ($json === null) rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);
	
	//reponse
	rest_response([
		'action'  	=> 'save_model',
		'project' 	=> $project,
		'palette'	=> $new['settings']['palettes'][0]['slug'],
		'model'   	=> $new['settings']['palettes'][0]['models'][0]
	]);
}

//suppression du model
function delete_model_request($params, $body) {
	//verifier les parametres
	$project = $params['project'] ?? null;
	if (!$project) rest_response(['error' => 'Paramètre project manquant'], 400);

	$palette = $params['palette'] ?? null;
	if(!$palette) rest_response(['error' => 'Paramètre palette manquant'], 400);
	
	$model = $params['model'] ?? null;
	if(!$model) rest_response(['error' => 'Paramètre model manquant'], 400);

	//suppression
	$new = delete_model($project, $palette, $model);
	if($new === false) rest_response(['error' => 'Le model n\'existe pas'], 400);
	if(isset($new['error'])) rest_response([$new], 500);

	//sauver les datas
	$success = save_project($project, $new);
	if(!$success) rest_response(['error' => 'Erreur lors de la sauvegarde du json'], 500);
	
	//verification
	$json = get_project($project);
	if ($json === null) rest_response(['error' => 'Impossible de lire le fichier JSON'], 500);
	
	if(get_model($json, $palette, $model)) rest_response(['error' => 'une erreur s\'est produite lors de la suppression du model'], 500);
	
	//reponse
	rest_response([
		'action'  	=> 'save_model',
		'project' 	=> $project,
		'palette'	=> $palette,
		'model'		=> $model
	]);
}

////////////////////////// ACTIONS SUR LE JSON
///// PROJECT
//renvoyer un projet existant
function get_project($project) {
	//ouvrir le dossier
	$project_dir =  UPLOAD_FOLDER . $project;
	$json_file = $project_dir . '/' . FILE_JSON;

	if (!is_dir($project_dir) || !file_exists($json_file)) return;

	//recuperer le contenu du json
	$json_content = file_get_contents($json_file);
	return json_decode($json_content, true);
}

//creation du dossier et du json sur le serveur
function save_project($project, $datas = []) {
	//recuperer les chemins
	$project_dir =  UPLOAD_FOLDER . $project;
	$json_file = $project_dir . '/' . FILE_JSON;

	//creer le dossier s'il n'existe pas
	if (!is_dir($project_dir)) {
		if(!mkdir($project_dir, DIR_PERMISSIONS, true)) return false;
		chmod($project_dir, DIR_PERMISSIONS); //override umask
	}

	//ecrire le json
	if(empty($datas)) $datas= [];
	$datas = parse_project($datas);
	$json = json_encode($datas, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

	$success = file_put_contents($json_file, $json);
	chmod($json_file, FILE_PERMISSIONS);
	return $success;
}

//formater le modele pour le json
function parse_project($body = []) {
	return merge_project_datas([], $body);
}

//mise à jour des données
function merge_project_datas($old, $new = []) {
	if(!is_array($old)) $old = [];

	//ajouter les settings si besoin
	if(!isset($old['settings'])) $old['settings'] = [];
	if(!isset($old['settings']['palettes'])) $old['settings']['palettes'] = [];

	//ajouter la map si besoin
	if(!isset($old['world'])) $old['world'] = [];
	$old['world']['width'] = (isset($old['world']['width'])) ? intval($old['world']['width']) : 0;
	$old['world']['height'] = (isset($old['world']['height'])) ? intval($old['world']['height']) : 0;
	if(!isset($old['world']['levels'])) $old['world']['levels'] = [];

	//update des settings
	if(isset($new['settings']) && isset($new['settings']['palettes'])) {
		$old['settings']['palettes'] = update_arr($old['settings']['palettes'], $new['settings']['palettes'], ['models']);
	}

	//update du monde
	if(isset($new['world'])) {
		if(isset($new['world']['width'])) {
			$old['world']['width'] = intval($new['world']['width']);
		}
		
		if(isset($new['world']['height'])) {
			$old['world']['height'] = intval($new['world']['height']);
		}
		
		//update des zones
		if(isset($new['world']['levels'])) {
			//$old['world']['levels'] = update_arr($old['world']['levels'], $new['world']['levels'], ['layers']);
			
			
			$old['world']['levels'] = array_values(array_unique(array_merge($old['world']['levels'], $new['world']['levels'])));
			//$old['world']['levels'] = array_values(array_unique($new['world']['levels']));
		}
	}

	return $old;
}


///// LEVEL
//recuperer un level
function get_level($project, $level, $decode = true) {
	//ouvrir le dossier
	$project_dir =  UPLOAD_FOLDER . $project;
	$json_file = $project_dir . '/' . LEVEL_PREFIX . $level . '.json';

	if (!is_dir($project_dir) || !file_exists($json_file)) return;

	//recuperer le contenu du json
	$json_content = file_get_contents($json_file);
	return ($decode) ? json_decode($json_content, true) : $json_content;
}

//sauver un level
function save_level($project, $level, $datas, $save_project = true) {
	//recuperer les chemins
	$project_dir =  UPLOAD_FOLDER . $project;
	$json_file = $project_dir . '/' . LEVEL_PREFIX . $level . '.json';

	//le dossier n'existe pas
	if (!is_dir($project_dir)) return false;
	
	//save du json general
	if($save_project){
		$old = get_project($project);
		$new = ['world' => ['levels' => [$level]]];
		$saved_project = save_project($project, merge_project_datas($old, $new));
		if(!$saved_project) return false;
	}

	//ecrire le json
	if(empty($datas)) $datas = ['slug' => $level];
	//$json = json_encode($datas, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

	$tab = '    ';

	$tmp = $json_file . 'tmp';
	$fp = fopen($tmp, 'w');
	if(!$fp) return false;


	fwrite($fp, "{\n");
	
	$start = "";
	$entries = parse_level($datas);
	foreach($entries as $key => $val) {
		if(!empty($start)) fwrite($fp, $start);
		switch($key) {
			case 'layers' : 
				fwrite($fp, $tab . "\"" . $key . "\": [");
				$start = "\n";
				foreach($val as $layer) {
					if(!empty($start)) fwrite($fp, $start);
					fwrite($fp, $tab . $tab . "{\n");
					fwrite($fp, $tab . $tab . $tab . "\"name\": \"" . $layer['name'] . "\",\n");
					fwrite($fp, $tab . $tab . $tab . "\"slug\": \"" . $layer['slug'] . "\",\n");
					fwrite($fp, $tab . $tab . $tab . "\"tiles\": [\n");
					$start = '';
					foreach($layer['tiles'] as $tile) {
						if(!empty($start)) fwrite($fp, $start);
						fwrite($fp, $tab . $tab . $tab . $tab . json_encode($tile, JSON_UNESCAPED_UNICODE));
						$start = ",\n";
					}	
					fwrite($fp, "\n" . $tab . $tab . $tab . "]");
					fwrite($fp, "\n" . $tab . $tab . "}");
					$start = ",\n";
				}
				if(count($val) > 0) fwrite($fp, "\n" . $tab);
				fwrite($fp, "]");
				$start = ",\n";
				break;
				
			case 'bounds' : 
				fwrite($fp, $tab . "\"" . $key . "\": ");
				fwrite($fp, json_encode($val, JSON_UNESCAPED_UNICODE));
				break;

			default : 
				fwrite($fp, $tab . "\"" . $key . "\": \"" . $datas[$key] . "\"");
				break;
		}
		$start = ",\n";
	}

	fwrite($fp, "\n}");
	fclose($fp);

	rename($tmp, $json_file);
	//$success = file_put_contents($json_file, $json);
	chmod($json_file, FILE_PERMISSIONS);
	return true;
}

//parser le level
function parse_level($datas) {
	if(!isset($datas['slug'])) return false;
	return [
		'name' 		=> (isset($datas['name'])) ? $datas['name'] : $datas['slug'],
		'slug'		=> $datas['slug'],
		'parent'	=> (isset($datas['parent'])) ? $datas['parent'] : '',
		'bounds'	=> [
			'top'			=> (isset($datas['bounds']['top'])) ? intval($datas['bounds']['top']) : 0,
			'bottom'		=> (isset($datas['bounds']['bottom'])) ? intval($datas['bounds']['bottom']) : 0,
			'left'			=> (isset($datas['bounds']['left'])) ? intval($datas['bounds']['left']) : 0,
			'right'			=> (isset($datas['bounds']['right'])) ? intval($datas['bounds']['right']) : 0
		],
		'layers'=> (is_array($datas['layers'])) ? $datas['layers'] : []
	];
}

//supprimer un level
function delete_level($project, $level, $levels) {
	//supprimer l'image
	$project_dir =  UPLOAD_FOLDER . $project;
	$json_file = $project_dir . '/' . LEVEL_PREFIX . $level . '.json';

	$deleted = false;
	if(file_exists($json_file)) $deleted = unlink($json_file);
	else return ['error' => 'fichier introuvable : ' . $json_file];
	if(!$deleted) return ['error' => 'impossible de supprimer le fichier ' . $json_file];

	//supprimer l'entree du json
	$k = array_search($level, $levels);
	if($k !== false) unset($levels[$k]);
	else return ['error' => 'level introuvable : ' . $level];
	return $levels;
}


///// MODEL
//retrouver un model dans la palette du projet
function get_model($project, $palette_slug, $model_slug){
	$palette = get_palette($project, $palette_slug);
	if(!$palette) return false;
	return find_by_slug($palette['models'], $model_slug);
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
		//erreur dans l'upload
		return $upload_status;
	}
}

//enlever un model du projet
function delete_model($project, $palette_slug, $model_slug) {
	if(empty($project)) return ['error' => 'projet introuvable'];
	if(!is_array($project)) $project = get_project($project);

	//chercher le modele
	$pk = find_by_slug($project['settings']['palettes'], $palette_slug, 'key'); 
	if($pk === false) return ['error' => 'impossible de trouver la palette ' . $palette_slug];
	$mk = find_by_slug($project['settings']['palettes'][$pk]['models'], $model_slug, 'key');
	if($mk === false) return ['error' => 'impossible de trouver le model ' . $model_slug];

	//supprimer l'image
	$img = $project['settings']['palettes'][$pk]['models'][$mk]['img'];
	$deleted = false;
	if(file_exists($img)) $deleted = unlink($img);
	else return ['error' => 'fichier introuvable : ' . $img];
	if(!$deleted) return ['error' => 'impossible de supprimer le fichier ' . $img];

	//supprimer l'entree du json
	unset($project['settings']['palettes'][$pk]['models'][$mk]);
	return $project;
}


///// PALETTE
//retrouver une palette dans le projet
function get_palette($project, $slug) {
	if(empty($project)) return false;
	if(!is_array($project)) $project = get_project($project);

	return find_by_slug($project['settings']['palettes'], $slug);
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

//enlever une palette du projet
function delete_palette($project, $slug) {
	if(empty($project)) return ['error' => 'projet introuvable'];
	if(!is_array($project)) $project = get_project($project);

	$k = find_by_slug($project['settings']['palettes'], $slug, 'key');
	if($k === false) return ['error' => 'impossible de trouver la palette ' . $slug];

	$palette = $project['settings']['palettes'][$k];
	foreach($palette['models'] as $model) {
		$project = delete_model($project, $palette['slug'], $model['slug']);
		if(isset($project['error'])) return $project;
	}
	unset($project['settings']['palettes'][$k]);
	return $project;
}



////////////////////////// HELPERS
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
	chmod($targetPath, FILE_PERMISSIONS);
	
	//chemin relatif
	$targetPath = str_replace(__DIR__, '.', $targetPath);
	return ['success' => true, 'path' => $targetPath];
}

//retrouver une entrée par son slug dans un tableau
function find_by_slug($arr, $slug, $return = 'value') {
	foreach ($arr as $key => $val) {
		if ($val['slug'] === $slug) {
			return ($return == 'key') ? $key : $val;
		}
	}
	return false;
}

//mettre à jour un tableau
function update_arr($old, $new, $children = []) {
	foreach($new as $n) {
		$k = find_by_slug($old, $n['slug'], 'key');

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


?>