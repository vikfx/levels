import { Settings } from './settings.js'
import { Model } from './model.js'
import { FetchAPI } from './fetchAPI.js'
import { Datas } from './datas.js'

export class Palette {
	name								//nicename de la palette
	slug								//identifiant de la palette 
	models								//le tableau des modeles
	$el									//l'element html

	//init
	constructor(name, slug, models) {
		this.name = name
		this.slug = slug
		this.models = []
		
		this.createHTML()
		
		models.forEach(model => this.addModel(model))
		if(this.models.length > 0) this.models[0].setActive()
	}

	//vider la palette
	clear() {
		//supprimer les models
		if(this.models)
			[...this.models].forEach(model => {this.removeModel(model)})	//[...] force à reevaluer apres le splice
		this.models = []
		
		//supprimer le html de la nav et du ul
		const $nav = Settings.$containers.palette.nav
		const $a = $nav.querySelector('a[href="#palette-' + this.slug + '"]')
		if($a) $nav.removeChild($a)
			
		const $ul = Settings.$containers.palette.ul
		if($ul.contains(this.$el)) $ul.removeChild(this.$el)
		
		this.$el = null
	}

	//generer le html
	createHTML() {
		const $containers = Settings.$containers.palette
		const $nav = $containers.nav
		const $ul = $containers.ul
		if(!$nav || !$ul) return

		//creer le html du bouton
		const $a = document.createElement('a')
		$a.href = '#palette-' + this.slug
		$a.innerHTML = this.name
		
		let longclick = false
		let timer
		$a.addEventListener('click', (evt) => {evt.preventDefault()})
		
		$a.addEventListener('pointerdown', (evt) => {
			evt.preventDefault()
			
			longclick = false
			if(timer) clearTimeout(timer)
			timer = setTimeout(() => { longclick = true }, 800)
		})
		
		$a.addEventListener('pointerup', (evt) => {
			evt.preventDefault()
			
			//rendre actif
			if(this.$el) this.setActive()
				
			//supprimer le bouton
			if(timer) clearTimeout(timer)
			if(longclick) {
				const ok = confirm('Voulez-vous supprimer cette palette ?')
				if(ok) {
					const pname = localStorage.getItem('projectName')
					const url = FetchAPI.apiURL + 'project/' + pname + '/palette/' + this.slug

					FetchAPI.fetch(url, 'DELETE', {}, output => {
						console.log(output)

						const pslug = output.palette
						const settings = Settings.getInstance() 
						const palette = settings.palettes.find(p => p.slug == pslug)
						if(!palette) throw new Error('la palette ' + pslug + 'n\'existe pas')
		
						settings.removePalette(palette)
					})
				}
			}
		})

		//creer le html de la palette
		const $li = document.createElement('li')
		$li.classList.add('palette')
		$li.id = 'palette-' + this.slug

		//creer le html des models
		const $ulm = document.createElement('ul')
		$ulm.classList.add('models')

		//imbriquer les elements
		$nav.appendChild($a)
		$li.appendChild($ulm)
		$ul.appendChild($li)

		this.$el = $li
	}

	//definir la palette comme active
	setActive() {
		const $containers = Settings.$containers.palette
		const $nav = $containers.nav
		const $ul = $containers.ul
		if(!$nav || !$ul) return

		const $a = $nav.querySelector('a[href="#palette-' + this.slug + '"]')
		$nav.querySelectorAll('a').forEach($oa => {
			if($oa == $a) $oa.classList.add('on')
				else $oa.classList.remove('on')
		})
		
		const $li = $ul.querySelector('#palette-' + this.slug)
		$ul.querySelectorAll(':scope > li').forEach($oli => {
			if($oli == $li) $oli.classList.add('on')
			else $oli.classList.remove('on')
		})
	}

	//ajouter un model
	addModel(model) {
		if(this.models.find(m => m.slug == model.slug)) {
			throw new Error('un model avec le slug ' + model.slug + ' existe déjà')
		}

		const m = new Model(model.name, model.slug, model.img, this)
		Datas.appendModel(m)
		this.models.push(m)
	}

	//supprimer un model
	removeModel(model) {
		if(!model) return

		const i = this.models.indexOf(model)
		
		if(i >= 0) {
			Datas.removeModel(model)
			model.clear()
			this.models.splice(i, 1)
		}
	}
}