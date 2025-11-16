import { Datas } from './datas.js'
import { ModalBox } from './modalbox.js'
import { Model } from './model.js'


export class Tile {
	x				//coordonnee x de la tile
	y				//coordonnee y de la tile
	ref				//le model de la tile
	datas			//les datas supplémentaires
	$el				//l'element html
	layer			//le layer parent de la tile
	//_name			//nom de la tile

	constructor(x, y, ref, layer, datas = {}) {
		this.layer = layer

		this.position = {x, y}

		this.ref = ref

		this.datas = new Datas(datas, this)
	}

	//renvoyer le nom de la tile
	get name() {
		return this.datas.name
	}

	//attribuer un nom à la tile
	set name(value) {
		this.datas.name = value
	}

	//renvoyer la position de la tile en {x, y} dans le monde
	get position() {
		return {
			x : this.x + this.layer.level.bounds.left, 
			y : this.y + this.layer.level.bounds.top
		}
	}

	//attribuer la position {x, y} de la tile dans le monde
	set position(value) {
		this.x = value.x - this.layer.level.bounds.left
		this.y = value.y - this.layer.level.bounds.top
	}
	
	//attribuer la position {x, y} de la tile dans le monde
	setPosition(x, y) {
		this.x = x - this.layer.level.bounds.left
		this.y = y - this.layer.level.bounds.top
	}

	//supprimer le html
	clear() {
		if(!this.$el) return
		this.$el.parentNode.removeChild(this.$el)
		this.$el = null
	}

	//creer le html dans le parent
	createHTML($parent) {
		const $li = document.createElement('li')
		$li.classList.add('tile')
		$li.dataset.x = this.position.x
		$li.dataset.y = this.position.y
		$li.dataset.ref = this.ref
		
		const $img = document.createElement('img')
		if(this.model) $img.setAttribute('src', this.model.src)

		const $h = document.createElement('h5')
		if(this.model) $h.innerHTML = 'tile (' + this.position.x + ',' + this.position.y + ')'

		const $select = document.createElement('button')
		$select.dataset.action = 'select'
		$select.innerHTML = 'select'
		$select.addEventListener('click', evt => {
			console.log('todo select tile')
		})
		
		const $delete = document.createElement('button')
		$delete.dataset.action = 'delete'
		$delete.innerHTML = 'delete'
		$delete.addEventListener('click', async evt => {
			console.log('todo delete tile')

			const ok = await ModalBox.confirm('vous êtes sur le point de supprimer cette tile. Êtes-vous sûr?')
			if(ok) this.layer.removeTile(this)
		})

		$li.appendChild($img)
		$li.appendChild($h)
		$li.appendChild($select)
		$li.appendChild($delete)

		$parent.appendChild($li)
		this.$el = $li
	}

	//rentrer les données de la tile dans l'onglet des datas
	setDatasHTML() {
		this.datas.createHTML()
	}

	//convertir en tableau json
	toJSON() {
		return {
			x 		: this.x,
			y 		: this.y,
			model 	: this.ref,
			datas 	: this.datas.toJSON()
		}
	}

	//renvoyer l'image lié à la tile
	get model() {
		if(!Model.getModelBySlug(this.ref)) return
		return Model.getModelBySlug(this.ref).$img
	}
}