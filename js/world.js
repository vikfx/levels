import { Level } from './level.js'
import { Grid } from './grid.js'


export class World {
	static instance			//instance du singleton
	levels					//liste des levels
	width					//largeur du monde
	height					//hauteur du monde
	currentLevel			//level en cours

	constructor(mapJson) {
		if(World.instance) {
			World.instance.clear()
		}
		
		this.levels = []
		this.currentLevel = null
		this.load(mapJson)
		this.draw()
		this.addListeners()
		
		World.instance = this
	}

	//vider le monde
	clear() {
		if(this.levels)
			[...this.levels].forEach(level => {this.removeLevel(level)})	//[...] force à reevaluer apres le splice
	}

	//charger depuis le json
	load(map) {
		//this.clear()

		//dimensions du monde
		this.setSize(map.width, map.height)

		//charger les levels
		map.levels.forEach(lvl => {
			this.addLevel(lvl)
		})
	}

	//definir la taille du monde
	setSize(w, h) {
		this.width = Number(w)
		this.height = Number(h)

		const $w = World.$containers.size.w
		const $h = World.$containers.size.h
		$w.value = w
		$h.value = h
	}

	//init le html du monde
	addListeners() {
		let $c = World.$containers
		World.cloneEl([$c.size.w, $c.size.h, $c.forms.level, $c.forms.layer, $c.drawBtn])		//cloner pour eviter les doubles listeners
		$c = World.$containers

		//taille du monde
		const $w = $c.size.w
		$w.addEventListener('change', evt => {
			this.setSize($w.value, this.height)
			this.draw()
		})
		
		const $h = $c.size.h
		$h.addEventListener('change', evt => {
			this.setSize(this.width, $h.value)
			this.draw()
		})

		//bouton dessin
		const $draw = $c.drawBtn
		$draw.addEventListener('click', evt => {
			this.draw()
			
			this.levels.forEach(level => {
				this.drawLevel(level)
			})
		})

		//ajouter/modifier un level
		const $flevel = $c.forms.level
		$flevel.addEventListener('submit', evt => {
			evt.preventDefault()

			const form = new FormData($flevel)
			const datas = {
				name : form.get('lvl-name'),
				slug : form.get('lvl-slug'),
				parent : '',
				bounds : {
					top : Number(form.get('lvl-bounds[top]')),
					bottom : Number(form.get('lvl-bounds[bottom]')),
					left : Number(form.get('lvl-bounds[left]')),
					right : Number(form.get('lvl-bounds[right]'))
				}
			}
			
			if(datas.slug == '')
				alert('le level doit avoir un slug')
			else if (this.levels.findIndex(lvl => lvl.slug == datas.slug) >= 0)
				alert('un level avec ce slug existe déjà')
			else
				this.addLevel(datas)
		})

		//ajouter/modifier un layer
		const $fLayer = $c.forms.layer
		$fLayer.addEventListener('submit', evt => {
			evt.preventDefault()

			if(!this.currentLevel) return

			const form = new FormData($fLayer)
			const datas = {
				name : form.get('layer-name'),
				slug : form.get('layer-slug')
			}
			
			if(datas.slug == '')
				alert('le layer doit avoir un slug')
			else if (this.currentLevel.layers.findIndex(l => l.slug == datas.slug) >= 0)
				alert('un layer avec ce slug existe déjà dans ce level')
			else
				this.currentLevel.addLayer(datas, true)
		})
	}

	//ajouter un level dans la map
	addLevel(lvl) {
		//verifier que le level est dans les limites du monde
		if(
			lvl.bounds.top < 0
			|| lvl.bounds.top >= this.height
			|| lvl.bounds.bottom < 0
			|| lvl.bounds.bottom >= this.height
			|| lvl.bounds.left < 0
			|| lvl.bounds.left >= this.width
			|| lvl.bounds.right < 0
			|| lvl.bounds.right >= this.width
		) {
			throw new Error('le level est en dehors des limites du monde')
		}

		console.log(lvl)
		if(this.levels.find(level => level.slug == lvl.slug)) {
			throw new Error('un level avec le slug ' + lvl.slug + ' existe déjà')
		} else {
			const level = new Level(lvl.name, lvl.slug, lvl.parent, lvl.bounds, lvl.layers)
			this.levels.push(level)
			this.draw()
		}

	}

	//supprimer un level
	removeLevel(level) {
		if(!level) return

		const i = this.levels.indexOf(level)

		if(i >= 0) {
			level.clear()
			this.levels.splice(i, 1)
			const grid = Grid.getInstance()
			if(grid.level == level) {
				grid.level = null
				grid.draw()
				this.draw()
			}
		}
	}

	//dessiner dans le canvas monde
	draw() {
		if(!this.width || !this.height) return
		
		const $canvas = World.$containers.canvas
		const ctx = $canvas.getContext('2d')

		//calculer la taille de l'unité
		const size = ($canvas.width / this.width < $canvas.height / this.height) 
		? $canvas.width / this.width
		: $canvas.height / this.height

		//clear
		ctx.clearRect(0, 0, $canvas.width, $canvas.height)

		//dessiner les levels
		ctx.strokeStyle = '#CCCC00'
		ctx.fillStyle = '#CCCC00'
		ctx.lineWidth = 3
		ctx.font = '16px content';
		this.levels.forEach(level => {
			const x = level.startX * size
			const y = level.startY * size
			const w = level.width * size
			const h = level.height * size

			//minimap
			const mm = level.minimap
			if(mm) {
				ctx.drawImage(mm, 0, 0, mm.width, mm.height, x, y, w, h)
			}

			//contour + txt
			ctx.strokeRect(x, y, w, h)
			ctx.fillText(level.name, x + 15, y + 15)
		})
	}

	//dessiner le level
	drawLevel(level) {
		if(!level) return
		if(level.minimap) level.minimap.close?.()
		
		let $canvas = World.$containers.canvas
		
		//calculer la taille de l'unité
		const size = ($canvas.width / this.width < $canvas.height / this.height) 
		? $canvas.width / this.width
		: $canvas.height / this.height

		$canvas = new OffscreenCanvas(level.width * size, level.height * size)
		const ctx = $canvas.getContext('2d')
		
		level.layers.forEach(layer => {
			layer.draw(level.bounds, size, ctx)
		})
		
		createImageBitmap($canvas).then(bitmap => {
			level.minimap = bitmap
			this.draw()
		})
	}

	//convertir en tableau json
	toJSON() {
		return {
			width 	: this.width,
			height 	: this.height,
			levels 	: this.levels.map(lvl => lvl.toJSON())
		}
	}

	//clone des elements
	static cloneEl($els) {
		$els.forEach($el => {
			const clone = $el.cloneNode(true)
			$el.parentNode.replaceChild(clone, $el)
		})
	}

	//recuperer l'instance du singleton
	static getInstance() {
		if (!World.instance) throw new Error('la classe map doit être initialisée')
		return World.instance
	}

	//recuperer les containers du monde
	static get $containers() {
		//taille du monde
		const $fSize = document.querySelector('#world-size')
		if(!$fSize) throw new Error('pas de container pour la taille du monde')
		const $w = $fSize.querySelector('input[name=grid-width]')
		const $h = $fSize.querySelector('input[name=grid-height]')
		if(!$w || !$h) throw new Error('pas d\'input valide pour la taille du monde')

		//bouton dessin du monde
		const $draw = document.querySelector('#draw-world')
		if(!$draw) throw new Error('pas de bouton pour dessiner le monde')
	
		//title
		const $title = document.querySelector('#current-level')
		if(!$title) throw new Error('container du titre manquant')
		
		//coordonnées
		const $tx = document.querySelector('#tile-x')
		const $ty = document.querySelector('#tile-y')
		if(!$tx || !$ty) throw new Error('pas de container pour afficher les coordonnées')
		
		//formulaire level
		const $flevel = document.querySelector('#add-level')
		if(!$flevel) throw new Error('pas de formulaire pour ajouter des levels')
		
		//formulaire layer
		const $fLayer = document.querySelector('#add-layer')
		if(!$fLayer) throw new Error('pas de formulaire pour ajouter des layers')

		//containers
		const $levels = document.querySelector('#levels > ul')
		const $layers = document.querySelector('#layers > ul')
		if(!$levels) throw new Error('container level manquant')
		if(!$layers) throw new Error('container des layers manquant')
			
		//canvas du monde
		const $canvas =  document.querySelector('#world-map')
		if(!$canvas) throw new Error('canvas monde manquant')
	
		return {
			size : {
				w : $w,
				h : $h,
			},
			coords : {
				x : $tx,
				y : $ty
			},
			forms : {
				level : $flevel,
				layer : $fLayer
			},
			levels : $levels,
			title : $title,
			layers : $layers,
			canvas : $canvas,
			drawBtn : $draw
		}
	}

	
}