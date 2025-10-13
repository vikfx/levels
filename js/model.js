import { FetchAPI } from './fetchAPI.js'
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
		let longclick = false
		let timer		
		$li.addEventListener('pointerdown', (evt) => {
			evt.preventDefault()
					
			longclick = false
			if(timer) clearTimeout(timer)
			timer = setTimeout(() => { longclick = true }, 800)
		})
				
		$li.addEventListener('pointerup', (evt) => {
			evt.preventDefault()
					
			//rendre actif
			this.setActive()
						
			//supprimer le bouton
			if(timer) clearTimeout(timer)
			if(longclick) {
				const ok = confirm('Voulez-vous supprimer ce model?')
				if(ok) {
					const pname = localStorage.getItem('projectName')
					const url = FetchAPI.apiURL + 'project/' + pname + '/palette/' + this.palette.slug + '/model/' + this.slug
			
					FetchAPI.fetch(url, 'DELETE', {}, output => {
						console.log(output)
			
						const pslug = output.palette
						const mslug = output.model
						const settings = Settings.getInstance() 
						const palette = settings.palettes.find(p => p.slug == pslug)
						if(!palette) throw new Error('la palette ' + pslug + 'n\'existe pas')
					
						const model = palette.models.find(m => m.slug == mslug)
						if(!model) throw new Error('le model ' + mslug + ' n\'existe pas')

						palette.removeModel(model)
					})
				}
			}
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