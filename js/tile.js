import { Model } from './model.js'

export class Tile {
	x				//coordonnee x de la tile
	y				//coordonnee y de la tile
	ref				//le model de la tile
	datas			//les datas supplémentaires
	$el				//l'element html
	layer			//le layer parent de la tile

	constructor(x, y, model, layer) {
		this.x = x
		this.y = y
		this.ref = model
		this.layer = layer
		this.datas = {}
	}

	//supprimer le html
	clear() {
		const $parent = this.layer.$tileContainer
		if(this.$el && $parent.contains(this.$el)) $parent.removeChild(this.$el)
		this.$el = null
	}

	//creer le html dans le parent
	createHTML() {
		const $parent = this.layer.$tileContainer

		const $li = document.createElement('li')
		$li.classList.add('tile')
		$li.dataset.x = this.x
		$li.dataset.y = this.y
		$li.dataset.ref = this.ref
		
		const $img = document.createElement('img')
		if(this.model) $img.setAttribute('src', this.model.src)

		const $h = document.createElement('h5')
		if(this.model) $h.innerHTML = 'tile (' + this.x + ',' + this.y + ')'

		const $select = document.createElement('button')
		$select.dataset.action = 'select'
		$select.innerHTML = 'select'
		$select.addEventListener('click', evt => {
			console.log('todo select tile')
		})
		
		const $delete = document.createElement('button')
		$delete.dataset.action = 'delete'
		$delete.innerHTML = 'delete'
		$delete.addEventListener('click', evt => {
			console.log('todo delete tile')

			const ok = confirm('vous êtes sur le point de supprimer cette tile. Êtes-vous sûr?')
			if(ok) this.layer.removeTile(this)
		})

		$li.appendChild($img)
		$li.appendChild($h)
		$li.appendChild($select)
		$li.appendChild($delete)

		$parent.appendChild($li)
		this.$el = $li
	}

	//convertir en tableau json
	toJSON() {
		return {
			x 		: this.x,
			y 		: this.y,
			model 	: this.ref,
			datas 	: this.datas
		}
	}

	//renvoyer l'image lié à la tile
	get model() {
		if(!Model.getModelBySlug(this.ref)) return
		return Model.getModelBySlug(this.ref).$img
	}
}