import { Layer } from './layer.js'
import { World } from './world.js'
import { Grid } from './grid.js'
import { ModalBox } from './modalbox.js'

export class Level {
	name										//nom du level
	slug										//slug du level
	width										//largeur en tile du level
	height										//hauteur en tile du level
	startX										//les coordonnées reelles du point à gauche
	startY										//les coordonnées reelles du point en haut
	layers										//les layers du level
	parent										//slug du level parent
	$el											//l'element html dans la tab monde
	minimap										//l'image du level
	edited = false								//si le level a été modifié après son dernier enregistrement

	//init
	constructor(name, slug, parent = '', bounds = {}, layers = []) {
		this.slug = slug
		this.name = name ?? slug
		this.parent = parent ?? ''
		this.bounds = bounds
		
		this.layers = []
		if(layers && layers.length > 0) {
			layers.forEach(l => {
				this.addLayer(l)
			})
		}
		
		this.createHTML()
	}

	//vider le level et supprimer le html
	clear() {
		//supprimer les layers
		if(this.layers)
			[...this.layers].forEach(layer => {this.removeLayer(layer)})		//[...] force à reevaluer apres le splice

		//supprimer le html
		if(this.$el && World.$containers.levels.contains(this.$el))
			World.$containers.levels.removeChild(this.$el)

		this.layers = []
		this.$el = null
	}

	//creer le html pour l'element dans le mode monde
	createHTML() {
		const $li = document.createElement('li')
		$li.classList.add('level')
		$li.dataset.levelId = this.slug

		//title
		const $h = document.createElement('h4')
		
		const $input = document.createElement('input')
		$input.type = 'text'
		$input.value = this.name
		$input.addEventListener('change', evt => {
			this.name = $input.value
			World.getInstance().draw()
		})
		
		//edit
		const $edit = document.createElement('button')
		$edit.dataset.action = 'edit'
		$edit.innerHTML = 'edit'
		$edit.addEventListener('click', evt => {
			evt.preventDefault()
			this.setActive()
		})
		
		//delete
		const $delete = document.createElement('button')
		$delete.dataset.action = 'delete'
		$delete.innerHTML = 'delete'
		$delete.addEventListener('click', async evt => {
			evt.preventDefault()

			const ok = await ModalBox.confirm('vous êtes sur le point de supprimer ce level. Êtes-vous sûr?')
			if(ok) World.getInstance().removeLevel(this)
		})
		
		//dessiner
		const $draw = document.createElement('button')
		$draw.dataset.action = 'draw'
		$draw.innerHTML = 'draw'
		$draw.addEventListener('click', evt => {
			evt.preventDefault()

			World.getInstance().drawLevel(this)
		})

		//bounds
		const $ul = document.createElement('ul')
		$ul.classList.add('bounds')
		for(let k in this.bounds) {
			const $lib = document.createElement('li')

			const $lb = document.createElement('label')
			$lb.innerHTML = k

			const $ib = document.createElement('input')
			$ib.type = 'number'
			$ib.name = k
			$ib.value = this.bounds[k]
			$ib.addEventListener('change', evt => {
				const $i = evt.currentTarget
				const b = this.bounds
				b[$i.name] = Number($i.value)
				this.bounds = b

				this.edited = true
				World.getInstance().draw()
			})

			$lib.appendChild($lb)
			$lib.appendChild($ib)
			$ul.appendChild($lib)
		}
		
		//montage html
		$h.appendChild($input)
		$li.appendChild($h)
		$li.appendChild($edit)
		$li.appendChild($draw)
		$li.appendChild($delete)
		$li.appendChild($ul)

		World.$containers.levels.appendChild($li)
		this.$el = $li
	}

	//convertir en tableau json
	toJSON() {
		return {
			name 	: this.name,
			slug 	: this.slug,
			parent 	: this.parent,
			bounds 	: this.bounds,
			layers 	: this.layers.map(ly => ly.toJSON())
		}
	}

	//definir comme level à editer
	setActive() {
		//title
		World.$containers.title.innerHTML = this.name

		//layers
		const $layers = World.$containers.layers
		$layers.querySelectorAll('.layer')
			.forEach($child => { $child.remove() })

		this.layers.forEach(layer => {
			layer.createHTML()
		})
		if(this.layers.length > 0) this.layers[0].setActive()
		
		const grid = Grid.getInstance()
		grid.level = this
	}

	//clamper une coordonnée au level
	clampPos(x, y) {
		let px = Math.floor(x)
		let py = Math.floor(y)

		if(px < this.bounds.left) px = this.bounds.left
		if(px > this.bounds.right) px = this.bounds.right
		if(py > this.bounds.bottom) py = this.bounds.bottom
		if(py < this.bounds.top) py = this.bounds.top

		return {
			x : px,
			y : py
		}
	}

	//ajouter un layer au level
	addLayer(ly, html = false) {
		if(!ly.slug) return

		if(this.layers.find(layer => layer.slug == ly.slug)) {
			throw new Error('un layer avec le slug ' + ly.slug + ' existe déjà')
		} else {
			const layer = new Layer(ly.slug, ly.name, ly.tiles, this)
			this.layers.push(layer)
			if(html) layer.createHTML()
		}

	}

	//supprimer un layer sur le level
	removeLayer(layer) {
		if(!layer) return
		const i = this.layers.indexOf(layer)

		if(i >= 0) {
			layer.clear()
			this.layers.splice(i, 1)
			if(this.currentLayer == layer) {
				this.currentLayer = null
				if(this.layers.length > 0) this.currentLayer = this.layers[0]
			}
			const grid = Grid.getInstance()
			if(grid.level == this) grid.draw()
		}
	}

	//renvoyer toutes les tiles du level sans distinction de layers
	get tiles() {
		return this.layers.flatMap(layer => layer.tiles)
	}

	//renvoyer le bounds calculé dynamiquement
	get bounds() {
		return {
			top : this.startY,
			bottom : this.startY + this.height,
			left : this.startX,
			right : this.startX + this.width
		}
	}

	//definir le bounds et par extension la largeur/hauteur et les coordonnées d'origine
	set bounds(value) {
		if(!value) value = {}
		value.top = (value.top != undefined) ? Number(value.top) : 0
		value.bottom = (value.bottom != undefined) ? Number(value.bottom) : 0
		value.left = (value.left != undefined) ? Number(value.left) : 0
		value.right = (value.right != undefined) ? Number(value.right) : 0
		
		const w = value.right - value.left
		const h = value.bottom - value.top
		
		if(w <= 0 || h <=  0) throw new Error('bounds non valide, left >= right ou bottom >= top')
		this.width = w
		this.height = h
		this.startX = value.left
		this.startY = value.top
	}

	//renvoyer le layer courant
	get currentLayer() {
		return this.layers.find(layer => {
			if(!layer.$el) return false
			return layer.$el.classList.contains('on')
		})
	}

	//definir le layer courant
	set currentLayer(layer) {
		if(this.layers.indexOf(layer) < 0) return
		layer.setActive()

	}
}