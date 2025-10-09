import { Tile } from './tile.js'
import { World } from './world.js'
import { Grid } from './grid.js'
import { Chunks } from './chunks.js'

export class Layer {
	slug				//le slug du layer
	name				//le nom du layer
	chunks				//le mapping des tiles
	$el					//l'element html
	$tileContainer		//le ul container des tiles
	visible				//le calque est visible ou non
	locked				//le calque est verrouillé ou non
	level				//le level parent
	
	constructor(slug, name, tiles = [], level) {
		if(!slug) throw new Error('slug invalide')
		this.slug = slug
		this.name = name ?? slug
		this.visible = true
		this.locked = false
		this.chunks = new Chunks(Grid.chunkSize, Grid.bitmapZooms) //new Map()
		this.level = level
		tiles.forEach(t => {
			return this.addTile(t.x, t.y, t.model)
		})
	}

	//vider le layer et supprimer le html
	clear() {
		//supprimer les tiles
		if(this.chunks)
			this.chunks.forEachTiles(tile => { tile.clear() })
		
		this.chunks = new Chunks(Grid.chunkSize, Grid.bitmapZooms) //new Map()

		//supprimmer le html
		const $layers = World.$containers.layers 
		if(this.$el && $layers.contains(this.$el)) $layers.removeChild(this.$el)
		this.$el = null
	}

	//creer le HTML pour le mode palette
	createHTML() {
		const $li = document.createElement('li')
		$li.classList.add('layer')
		$li.dataset.layerId = this.slug

		const $h = document.createElement('h4')

		//nom
		const $input = document.createElement('input')
		$input.type = 'text'
		$input.value = this.name
		$input.addEventListener('click', evt => {
			this.setActive()
		})

		//bouton visibilité
		const $visible = document.createElement('button')
		$visible.classList.add('on')
		$visible.dataset.action = 'visible'
		$visible.innerHTML = "masquer"
		$visible.addEventListener('click', evt => {
			this.visible = !this.visible
			if(this.visible) {
				$visible.classList.add('on')
				$visible.innerHTML = 'masquer'
			} else {
				$visible.classList.remove('on')
				$visible.innerHTML = 'afficher'
			}

			Grid.getInstance().draw()
		})
		
		//bouton verrouillage
		const $locked = document.createElement('button')
		$locked.dataset.action = 'locked'
		$locked.innerHTML = "verrouiller"
		$locked.addEventListener('click', evt => {
			this.locked = !this.locked
			if(this.locked) {
				$locked.classList.add('on')
				$locked.innerHTML = 'deverrouiller'
			} else {
				$locked.classList.remove('on')
				$locked.innerHTML = 'verrouiller'
			}
		})

		//bouton toggle tiles
		const $toggle = document.createElement('button')
		$toggle.dataset.action = 'toggle'
		$toggle.innerHTML = "replier"
		$toggle.addEventListener('click', evt => {
			this.$tileContainer.hidden = !this.$tileContainer.hidden
			$toggle.innerHTML = (this.$tileContainer.hidden) ? 'deplier' : 'replier'
		})
		
		//bouton toggle tiles
		const $delete = document.createElement('button')
		$delete.dataset.action = 'delete'
		$delete.innerHTML = "supprimer"
		$delete.addEventListener('click', evt => {
			const ok = confirm('vous êtes sur le point de supprimer ce calque. Êtes-vous sûr?')
			if(ok) this.level.removeLayer(this)
		})

		//tiles
		const $ul = document.createElement('ul')
		$ul.classList.add('tiles')
		this.$tileContainer = $ul

		if(Grid.getInstance().tileHTML) {
			this.forEachTiles(tile => {
				tile.createHTML()
			})
		}

		//montage html
		$h.appendChild($visible)
		$h.appendChild($locked)
		$h.appendChild($input)
		$h.appendChild($toggle)
		$h.appendChild($delete)
		$li.appendChild($h)
		$li.appendChild($ul)

		World.$containers.layers.appendChild($li)
		this.$el = $li
	}

	//activer le layer
	setActive() {
		World.$containers.layers.querySelectorAll(':scope > li').forEach($li => {
			if($li == this.$el) $li.classList.add('on')
			else $li.classList.remove('on')
		})
	}

	//renvoyer les tiles en tableau plat
	get tiles() {
		if(!this.chunks) return []
		return this.chunks.tiles
	}

	//ajouter une tile
	addTile(x, y, model = false, html = false) {
		let tile
		if (x instanceof Tile) {
			tile = x
			x = tile.x
			y = tile.y
			tile.layer = this
		} else {
			if(isNaN(x) || isNaN(y) || !model) return false
			tile = new Tile(x, y, model, this)
		}

		if(this.findTileAt(x, y))
			throw new Error('il y a déjà une tile à cet emplacement (' + x + ', ' + y + ')')

		if(!Grid.inBounds({x, y}, this.level.bounds))
			throw new Error('coordonnées en dehors des limites')

		this.chunks.push(tile)
		
		if(html) tile.createHTML()
		
		return tile
	}

	//supprimer une tile
	removeTile(tile) {
		const i = this.chunks.pop(tile)
		if(i >= 0) {
			tile.clear()
		}
	}

	//retrouver une tile aux coordonnées
	findTileAt(x, y) {
		if(!this.chunks) return
		return this.chunks.findTileAt(x, y)
	}

	//dessiner le canvas
	draw(bounds, dz, ctx) {
		this.chunks.draw(bounds, dz, ctx)
	}	
}