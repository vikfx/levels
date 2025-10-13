import { Settings } from './settings.js'
import { World } from './world.js'
import { Grid } from './grid.js'
import { FetchAPI } from './fetchAPI.js'

// const settings = new Settings();

let levelDesign

document.addEventListener('DOMContentLoaded', (evt) => {
	console.log('hello main')

	//loadEruda()
	initCanvas()

	authenticate()
	projectRequest()
	manageTabs()
})

//init le resize des canvas
function initCanvas() {
	resizeCanvas()
	window.addEventListener("resize", resizeCanvas)

	function resizeCanvas() {
		console.log('resize')
		const $canvases = document.querySelectorAll('#main-content canvas')
		$canvases.forEach($canvas => {
			//pour forcer le retrecissement du parent
			$canvas.width = 0
			$canvas.height = 0

			const $parent = $canvas.parentElement
			$canvas.width = $parent.clientWidth
			$canvas.height = $parent.clientHeight

			const detail = { width : $canvas.width, height: $canvas.height }
			$canvas.dispatchEvent(new CustomEvent('canvasResized', { detail: detail }))
		})

	}
}

//authentification
function authenticate() {
	const $form = document.querySelector('form#login')
	if(!$form) return

	const $api = $form.querySelector('input[name="api-key"]')
	if(!$api) return

	//rechercher la clé dans le localstorage et le coller dans l'input
	if(localStorage.getItem('apiKey'))
		$api.value = localStorage.getItem('apiKey')

	//requete d'authentification
	$form.addEventListener('submit', (evt) => {
		evt.preventDefault();

		const apiKey = $api.value

		if(apiKey) {
			// fetch('api/authenticate', {
			// 	method: 'GET',
			// 	headers: { 'X-API-KEY': apiKey},
			// 	credentials: 'same-origin' // pour accepter le cookie
			// })
			// .then(res => res.json())
			// .then((output) => {
			// 	if(output['response']) {
			// 		localStorage.setItem('apiKey', apiKey)
			// 		alert(output['response'])
			// 		console.log(output['response'])

			// 		if($form.dataset.redirect)
			// 			location.href = $form.dataset.redirect
			// 	}
			// });
			FetchAPI.fetchAuth(apiKey, (output) => {
				alert(output['response'])
				console.log(output['response'])

				if($form.dataset.redirect)
					location.href = $form.dataset.redirect
			})
		}
	})

}

//requete sur le json
function projectRequest() {
	const $forms = document.querySelectorAll("form.project")

	$forms.forEach($form => {
		if(!$form) return
		const $pname = $form.querySelector('input[name="project-name"]')
		if(!$pname) return

		//nom du dernier projet
		if(localStorage.getItem('projectName'))
			$pname.value = localStorage.getItem('projectName')

		$form.addEventListener('submit', (evt) => {
			evt.preventDefault()

			if($pname.value == "") return

			let action = evt.submitter.formAction
			const method = evt.submitter.formMethod.toUpperCase() ?? $form.method.toUpperCase() ?? 'GET'

			if(action.endsWith("/")) action = action.slice(0, -1)
			const actionName = action.split('/').pop()

			let isOk;
			let body = false;
			switch(actionName) {
				//exporter le json (/!\ le dernier sauvegardé)
				case "export" :
					//alerter sur le json
					isOk = confirm('Récupere le dernier json sauvegardé. Pensez à sauvegarder avant l\'export')
					break

				//importer un json
				case "import" :
					isOk = confirm('vous allez ecraser le json existant. Êtes-vous sûr?')
					body = new FormData($form)
					break

				//save/get le projet
				case "project" :
					if((method == 'POST' || method == 'PUT')) {
						const world = levelDesign.world.toJSON()
						body = {world}
						console.log(body)
						isOk = confirm('vous allez ecraser le dernier json sauvegardé. Êtes-vous sûr?')
					} else {
						isOk = confirm('vous allez ecraser le level en cours. Êtes-vous sûr?')
					}
					break

				default :
					isOk = false
					break
			}

			//envoi de la requete
			if(isOk) {
				const url = action + '/' + $pname.value

				FetchAPI.fetch(url, method, body, (output) => {
					switch(output.action) {
						//recuperer le json
						case 'get_project' :
							localStorage.setItem('projectName', output.project)
							document.querySelectorAll('input[name="project-name"]').forEach($i => {
								$i.value = output.project
							})

							loadJson(output.datas)
							break

						//json sauvé
						case 'save_project' :
							loadJson(output.datas)
							break;
					}
				})
			}
		})
	})
}


//generer le json pour l'envoi
// function generateJson() {
// 	console.log('todo generer le json')
// }

//charger un level
function loadJson(json) {
	console.log('load level')
	//console.log(json)

	//charger dans le window
	levelDesign = {
		settings : 		new Settings(json.settings),
		world : 		new World(json.world),
		grid : 			new Grid()
	}
	window.levelDesign = levelDesign

	console.log(levelDesign)
}

//gerer les onglets
function manageTabs() {
	const $btns = document.querySelectorAll('#tabs-nav a')
	$btns.forEach($btn => {
		$btn.addEventListener('click', (evt) => {
			evt.preventDefault()
			const url = new URL($btn.href)
			const id = url.hash.replace('#', '')

			console.log('open tab ' + id)
			$btns.forEach($b => {
				if($b == $btn)
					$b.classList.add('on')
				else
					$b.classList.remove('on')
			})

			document.querySelectorAll('#tabs .tab').forEach($tab => {
				if($tab.id == id + '-mode')
					$tab.classList.add('on')
				else
					$tab.classList.remove('on')
			})

			document.querySelectorAll('#main-content canvas').forEach($canvas => {
				if($canvas.id == id + '-map')
					$canvas.classList.add('on')
				else
					$canvas.classList.remove('on')
			})


		})
	})
}

//masquer la modale
function hideWelcome() {
	const $welcome = document.querySelector('#welcome')
	if($welcome) $welcome.classList.remove('on')
}


//loader les dev tools pour mobile
function loadEruda() {
	var script = document.createElement('script')
	console.log('loading eruda')

	script.onload = function () {
		console.log('eruda loaded')
		eruda.init()
	}

	script.src = "https://cdn.jsdelivr.net/npm/eruda"
	document.body.appendChild(script)
}


