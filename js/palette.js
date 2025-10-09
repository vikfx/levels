import { Settings } from './settings.js'
import { Model } from './model.js'

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
		
		models.forEach(model => {
			this.addModel(model)
		})
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

		// //palette déjà existante
		// if(
		// 	$nav.querySelector('a[href="#palette-' + this.slug + '"]')
		// 	|| $ul.querySelector('#palette-' + this.slug)
		// ) {
		// 	this.$el = $ul.querySelector('#palette-' + this.slug)
		// 	console.log('la palette ' + this.slug + ' existe déjà')
		// 	return
		// }

		//creer le html du bouton
		const $a = document.createElement('a')
		$a.href = '#palette-' + this.slug
		$a.innerHTML = this.name
		$a.addEventListener('click', (evt) => {
			evt.preventDefault()
			if(this.$el) this.setActive()
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

		//$li.dispatchEvent( new Event())
	}

	//ajouter un model
	addModel(model) {
		if(this.models.find(m => m.slug == model.slug)) {
			throw new Error('un model avec le slug ' + model.slug + ' existe déjà')
		}

		this.models.push(new Model(model.name, model.slug, model.img, this))
	}

	//supprimer un model
	removeModel(model) {
		if(!model) return

		const i = this.models.indexOf(model)
		
		if(i >= 0) {
			model.clear()
			this.models.splice(i, 1)
		}
	}
}