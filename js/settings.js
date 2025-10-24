import { FetchAPI } from './fetchAPI.js'
import { Palette } from './palette.js'
import { Datas } from './datas.js'
import { World } from './world.js'

export class Settings {
	static instance			//instance du singleton
	palettes				//la liste des palettes
	
	//init
	constructor(settings) {
		if(Settings.instance) {
			Settings.instance.clear()
		}
		
		this.addListeners()
		this.palettes = []
		Datas.clearHTML()
		this.load(settings)
		
		Settings.instance = this
	}

	//ajouter les listeners sur les tools
	addListeners() {
		World.cloneEl([...Settings.$containers.tools.btns])
		World.cloneEl([Settings.$containers.forms.model, Settings.$containers.forms.palette])

		//tools
		Settings.$containers.tools.btns.forEach(($tool, i) => {
			$tool.addEventListener('click', evt => {
				Settings.$containers.tools.btns.forEach($t => {
					if($t == $tool)
						$t.classList.add('on')
					else
						$t.classList.remove('on')
				})
			})

			if(i == 0) $tool.classList.add('on')
			else $tool.classList.remove('on')
		})

		//form model
		const $mForm = Settings.$containers.forms.model
		$mForm.addEventListener('submit', evt => {
			evt.preventDefault()
			const pname = localStorage.getItem('projectName')
	
			const body = new FormData($mForm)
			const model = body.get('model-slug')
			const palette = Settings.getInstance().currentPalette.slug
			const url = FetchAPI.apiURL + 'project/' + pname + '/palette/' + palette + '/model/' + model
			console.log(url)
	
			FetchAPI.fetch(url, 'POST', body, output => {
				console.log(output)

				const pslug = output.palette
				const model = output.model
				const palette = this.palettes.find(p => p.slug == pslug)
				
				if(!palette) throw new Error('la palette ' + pslug + ' n\'existe pas')
				if(!model) throw new Error('impossible de creer le model')
				
				palette.addModel(model)
			})
		})

		//form palette
		const $pForm = Settings.$containers.forms.palette
		$pForm.addEventListener('submit', evt => {
			evt.preventDefault()
			
			const body = new FormData($pForm)
			const palette = body.get('palette-slug')
			const pname = localStorage.getItem('projectName')
			const url = FetchAPI.apiURL + 'project/' + pname + '/palette/' + palette
			
			FetchAPI.fetch(url, 'POST', body, output => {
				console.log(output)

				const pslug = output.palette.slug
				const palette = this.palettes.find(p => p.slug == pslug)
				
				if(palette) throw new Error('la palette ' + pslug + ' existe déjà')

				this.addPalette(output.palette)
			})
		})
	}

	//vider les settings
	clear() {
		//const settings = Settings.instance
		if(this.palettes)
			[...this.palettes].forEach(palette => {this.removePalette(palette)}) 	//[...] force à reevaluer apres le splice
	}

	//charger les settings
	load(settings) {
		settings.palettes.forEach(p => this.addPalette(p) )
		if(this.palettes.length > 0) this.palettes[0].setActive()
	}

	//ajouter une palette
	addPalette(palette) {
		if(this.palettes.find(p => p.slug == palette.slug)) {
			throw new Error('une palette avec le slug ' + palette.slug + ' existe déjà')
		}
		this.palettes.push(new Palette(palette.name, palette.slug, palette.models))
	}

	//supprimer une palette
	removePalette(palette) {
		if(!palette) return
		
		const i = this.palettes.indexOf(palette)
		
		if(i >= 0) {
			palette.clear()
			this.palettes.splice(i, 1)
		}
	}

	//renvoyer la palette courante
	get currentPalette() {
		return this.palettes.find(p => {
			return p.$el.classList.contains('on')
		})
	}

	//renvoyer le modele courant
	get currentModel() {
		return this.currentPalette.models.find(m => m.$el.classList.contains('on'))
	}

	//renvoyer l'outil courant
	get currentTool() {
		const $tool = [...Settings.$containers.tools.btns].find($t => {
			return $t.classList.contains('on')
		})

		if(!$tool) return
		return $tool.dataset.action
	}

	//recuperer l'instance du singleton
	static getInstance() {
		if (!Settings.instance) throw new Error('la classe settings doit être initialisée')
		return Settings.instance
	}

	//containers html
	static get $containers() {
		//tools
		const $toolsContainer = document.querySelector('#palette-tools')
		if(!$toolsContainer) throw new Error('impossible de trouver #palette-tools')
		const $tools = $toolsContainer.querySelectorAll(':scope > .button')
	
		//history
		const $historyContainer = document.querySelector('#history-tools')
		if(!$historyContainer) throw new Error('impossible de trouver #history-tools')
		const $historyTools = $historyContainer.querySelectorAll(':scope > .button')

		//copy
		const $copyContainer = document.querySelector('#copy-tools')
		if(!$copyContainer) throw new Error('impossible de trouver #copy-tools')
		const $copyTools = $copyContainer.querySelectorAll(':scope > .button')
		const $copyReturn = $copyContainer.querySelector(':scope > .return')
		if(!$copyReturn) throw new Error('le #copy-tools ne contient pas de .return')
	
		//palette
		const $palettesContainer = document.querySelector('#palettes')
		if(!$palettesContainer) throw new Error('impossible de trouver #palettes')
		
		const $nav = $palettesContainer.querySelector(':scope > nav')
		const $ul = $palettesContainer.querySelector(':scope > ul')
		if(!$nav || !$ul) throw new Error('la palette doit contenir un <nav> et un <ul>')
			
		const $modelForm = $palettesContainer.querySelector('#add-model')
		if(!$modelForm) throw new Error('la palette doit contenir un formulaire #add-model')
		
		const $paletteForm = $palettesContainer.querySelector('#add-palette')
		if(!$paletteForm) throw new Error('la palette doit contenir un formulaire #add-palette')
		
		return {
			palette 	: {
				parent 		: $palettesContainer,
				nav 		: $nav,
				ul 			: $ul
			},
			forms 		: {
				model 		: $modelForm,
				palette 	: $paletteForm
			},
			tools 		: {
				btns 		:$tools
			},
			history 	: {
				btns		:$historyTools
			},
			copy 		: {
				btns		: $copyTools,
				return		:$copyReturn
			}
		}
	}
}