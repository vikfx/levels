import { Palette } from './palette.js'

export class Settings {
	static instance			//instance du singleton
	palettes				//la liste des palettes
	
	//init
	constructor(settings) {
		if(Settings.instance) {
			Settings.instance.clear()
		} else {
			this.initTools()
		}
		
		this.palettes = []
		this.load(settings)
		
		Settings.instance = this
	}

	//ajouter les listeners sur les tools
	initTools() {
		Settings.$containers.tools.forEach($tool => {
			$tool.addEventListener('click', evt => {
				Settings.$containers.tools.forEach($t => {
					if($t == $tool)
						$t.classList.add('on')
					else
						$t.classList.remove('on')
				})
			})
		})

		Settings.$containers.tools[0].classList.add('on')
	}

	//vider les settings
	clear() {
		//const settings = Settings.instance
		if(this.palettes)
			[...this.palettes].forEach(palette => {this.removePalette(palette)}) 	//[...] force à reevaluer apres le splice
	}

	//charger les settings
	load(settings) {
		settings.palettes.forEach(p => {
			this.addPalette(p)
		})
		this.palettes[0].setActive()
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
		return this.currentPalette.models.find(m => {
			return m.$el.classList.contains('on')
		})
	}

	//renvoyer l'outil courant
	get currentTool() {
		const $tool = [...Settings.$containers.tools].find($t => {
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
		const $tools = $toolsContainer.querySelectorAll(':scope > li')
	
		//history
		const $historyContainer = document.querySelector('#history-tools')
		if(!$historyContainer) throw new Error('impossible de trouver #history-tools')
		const $historyTools = $historyContainer.querySelectorAll(':scope > li')

		//palette
		const $palettesContainer = document.querySelector('#palettes')
		if(!$palettesContainer) throw new Error('impossible de trouver #palettes')

		const $nav = $palettesContainer.querySelector(':scope > nav')
		const $ul = $palettesContainer.querySelector(':scope > ul')
		if(!$nav || !$ul) throw new Error('la palette doit contenir un <nav> et un <ul>')

		return {
			palette : {
				parent : $palettesContainer,
				nav : $nav,
				ul : $ul
			},
			tools : $tools,
			history : $historyTools
		}
	}
}