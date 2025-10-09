import { Settings } from './settings.js'

export class Model {
	name								//nicename du model
	slug								//identifiant du model 
	src									//source image du model
	$img								//l'image préloadée
	$el									//l'element html
	palette								//la palette parente
	isActive							//le model est actif

	//init
	constructor(name, slug, src, palette) {
		this.name = name
		this.slug = slug
		this.src = src

		this.$img = new Image()
		this.$img.src = src

		this.palette = palette

		this.createHTML()
	}

	//suppression du html
	clear() {
		const $parent = this.palette.$el.querySelector('.models')
		if($parent.contains(this.$el)) $parent.removeChild(this.$el)
		
		this.$el = null
	}

	//creation du html
	createHTML() {
		const $parent = this.palette.$el.querySelector('.models')
		if(!$parent) throw new Error('parent non défini')
		
		if($parent.querySelector('#' + this.slug)) {
			console.log('le model ' + this.slug + ' existe déjà')
			this.$el = $parent.querySelector('#' + this.slug)
			return
		}

		const $li = document.createElement('li')
		$li.id = this.slug
		$li.addEventListener('click', (evt) => {
			this.setActive()
		})

		const $h = document.createElement('h5')
		$h.innerHTML = this.name

		const $img = document.createElement('img')
		$img.setAttribute('src', this.src)

		$li.appendChild($h)
		$li.appendChild($img)
		$parent.appendChild($li)

		this.$el = $li
	}

	//definir la palette comme active
	setActive() {
		const $ul = this.palette.$el.querySelector('.models')
		if(!$ul) return
		
		$ul.querySelectorAll(':scope > li').forEach($oli => {
			if($oli == this.$el) $oli.classList.add('on')
			else $oli.classList.remove('on')
		})
	}

	//renvoyer le model depuis son slug
	static getModelBySlug(slug) {
		return Settings.getInstance().palettes.flatMap(palette => {
			return palette.models
		}).find(m => {
			return m.slug == slug 
		})

	}
}