import { Settings } from './settings.js'
import { World } from './world.js'
import { Grid } from './grid.js'
import { ModalBox } from './modalbox.js'
import { FetchAPI } from './fetchAPI.js'

// const settings = new Settings();

let levelDesign

document.addEventListener('DOMContentLoaded', (evt) => {
	console.log('hello main')

	initFullScreen()
	initCanvas()

	authenticate()
	projectRequest()
	manageTabs()
})

//init le bouton fullscreen
function initFullScreen() {
	const $btn = document.querySelector('#fullscreen')

	if(!$btn) return
	$btn.addEventListener('click', evt => {
		evt.preventDefault()
  		if (!document.fullscreenElement) 
			document.documentElement.requestFullscreen()
  		else
    		document.exitFullscreen()
	})
}

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
			FetchAPI.fetchAuth(apiKey, (output) => {
				ModalBox.alert(output['response'])
				console.log(output['response'])

				if($form.dataset.redirect)
					location.href = $form.dataset.redirect
			})
		}
	})

}

//requete sur le json
function projectRequest() {
	const msg = {
		export 			: 'Récupere le dernier json sauvegardé. Pensez à sauvegarder avant l\'export',
		import 			: 'Vous allez ecraser le level en cours. Êtes-vous sûr?',
		projectGET		: 'Vous allez ecraser le level en cours. Êtes-vous sûr?',
		projectSAVE		: 'Vous allez ecraser la dernière sauvegarde. Êtes-vous sûr?'
	}

	FetchAPI.$loader.hidden = true

	const $forms = document.querySelectorAll("form.project")
	$forms.forEach($form => {
		if(!$form) return
		const $pname = $form.querySelector('input[name="project-name"]')
		if(!$pname) return

		//nom du dernier projet
		if(localStorage.getItem('projectName')) $pname.value = localStorage.getItem('projectName')

		$form.addEventListener('submit', async (evt) => {
			evt.preventDefault()
			
			if($pname.value == "") return
			
			let action = evt.submitter.dataset.action
			switch(action) {
				//exporter le json en cours
				case "export" :
					break

				//importer un json
				case "import" :
					break

				//recuperer le projet
				case "projectGET" :
					if(await ModalBox.confirm(msg[action])) loadJSON($pname.value)
					break

				//sauver le projet
				case "projectSAVE" : 
					if(await ModalBox.confirm(msg[action])) saveJSON($pname.value)
					break

				default :
					break
			}
		})
	})
}

//recuperer le json
function loadJSON(project) {
	const url = FetchAPI.apiURL + 'project/' + project
	FetchAPI.$loader.hidden = false
	FetchAPI.fetch(url, 'GET', null, (output) => {
		localStorage.setItem('projectName', output.project)
		document.querySelectorAll('input[name="project-name"]').forEach($i => {
			$i.value = output.project
		})
		
		//loadJson(output)
		if(output.datas.world.levels) {
			Promise.all(
				output.datas.world.levels.map((level) => {
					const lurl = FetchAPI.apiURL + 'project/' + output.project + '/level/' + level
					return FetchAPI.fetch(lurl, 'GET', false)
				})
			).then(outputs => {
				FetchAPI.$loader.hidden = true
				output.datas.world.levels = outputs.map(o => JSON.parse(o.datas) )
				initMap(output.datas)
			})
		}
	})
}

//sauver le json
function saveJSON(project) {
	//project
	let numOfReq = 1
	FetchAPI.$loader.hidden = false
	let url = FetchAPI.apiURL + 'project/' + project
	let datas = levelDesign.world.toJSON()
	FetchAPI.fetch(url, 'POST', {world : datas}, (output) => {
		console.log(output)
		numOfReq--
		if(numOfReq <= 0) FetchAPI.$loader.hidden = true
	})

	//levels
	levelDesign.world.levels.forEach(level => {
		if(!level.edited) return

		numOfReq++
		url = FetchAPI.apiURL + 'project/' + project + '/level/' + level.slug
		datas = level.toJSON()
		FetchAPI.fetch(url, 'POST', datas, (output) => {
			numOfReq--
			if(numOfReq <= 0) FetchAPI.$loader.hidden = true
			console.log(output)
			if(output.success) level.edited = false
		})
	})
}

//charger un level
function initMap(json) {
	console.log(json)

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
				if(!document.querySelector('#main-content canvas#' + id + '-map')) return
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


