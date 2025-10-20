import { World } from './world.js'
import { Grid } from './grid.js'

export class Datas {
	tile
	_relation
	path
	datas
	_name

	constructor(datas, tile) {
		//if(datas.name) this.name = datas.name
		this.tile = tile
		this.load(datas)
	}

	//renvoyer le nom de la tile
	get name() {
		return (this._name) ? this._name : 'tile (' + this.tile.x + ', ' + this.tile.y + ')'
	}

	//attribuer un nom à la tile
	set name(value) {
		this._name = (value != 'tile (' + this.tile.x + ', ' + this.tile.y + ')') ? value : ''
	}

	//renvoyer la tile de la relation
	get relation() {
		if(!this._relation || this._relation == '') return

		const r = this._relation.split(',')
		if(r.length != 2) return
		const x = Number(r[0])
		const y = Number(r[1])
		return this.tile.layer.findTileAt(x, y) 
		
	}
	
	//attribuer la relation selon la tile
	set relation(value) {
		this._relation = (value) ? value.x + ',' + value.y : ''
	}

	//creer le html dans le parent
	createHTML() {
		//clone
		let $c = Datas.$containers
		World.cloneEl([$c.infos.container, $c.relation.container, $c.path.container, $c.datas.container])
		
		//infos
		$c = Datas.$containers.infos
		$c.name.value = this.name
		$c.name.addEventListener('change', evt => {
			this.name = evt.target.value
		})

		$c.x.innerHTML = this.tile.x
		$c.y.innerHTML = this.tile.y

		$c.ref.value = this.tile.ref
		$c.ref.addEventListener('change', evt => {
			this.tile.ref = evt.target.value
			this.tile.layer.refreshTile(this.tile)
			Grid.getInstance().draw()
		})

		$c.delete.addEventListener('click', evt => {
			this.tile.layer.removeDatas(this.tile)
			Grid.getInstance().draw()
		})

		//relation
		$c = Datas.$containers.relation
		$c.name.innerHTML = (this.relation) ? this.relation.name : ''
		$c.select.addEventListener('click', evt => {
			const $canvas = Grid.$containers.canvas
			$canvas.addEventListener('paintAction', selectRelation, {capture : true})
			const data = this

			//event once
			function selectRelation(e) {
				e.stopImmediatePropagation()
				const tile = (e.detail.tiles.selected.length > 0) ? e.detail.tiles.selected[0] : null
				if(tile) {
					data.setRelation(tile)
					Datas.$containers.relation.name.innerHTML = tile.name
				}

				$canvas.removeEventListener('paintAction', selectRelation, {capture : true})
			}
		})
		$c.goto.addEventListener('click', evt => {
			if(this.relation) {
				this.relation.setDatasHTML()
				const grid = Grid.getInstance()
				grid.selectedTiles = [this.relation]
				grid.draw()
			}
		})
		$c.delete.addEventListener('click', evt => {
			this.setRelation(null)
			Datas.$containers.relation.name.innerHTML = ''	
			Grid.getInstance().draw()
		})

		//path
		$c = Datas.$containers.path
		$c.ul.innerHTML = ''
		if(this.path) {
			this.path.forEach(point => {
				this.addPoint(point.x, point.y)
				Grid.getInstance().draw()
			});
		}

		$c.delete.addEventListener('click', evt => {
			delete this.path
			this.tile.layer.removePath(this.tile)
			Datas.$containers.path.ul.innerHTML = ''
			Grid.getInstance().draw()
		})

		$c.new.x.value = ''
		$c.new.y.value = ''
		$c.new.form.addEventListener('submit', evt => {
			evt.preventDefault()
			if(!this.path) this.path = []
			
			const x = Datas.$containers.path.new.x.value
			const y = Datas.$containers.path.new.y.value
			if(x === '' || y === '') return
			this.path.push({x, y})
			this.addPoint(x, y)
			this.tile.layer.addPath(this.tile, this.path)
			Grid.getInstance().draw()
		})

		//datas
		$c = Datas.$containers.datas
		$c.ul.innerHTML = ''
		Object.entries(this.datas).forEach(([k, v])  => {
			switch(k) {
				case 'relation' : 
				case 'path' :
					break

				default : 
					this.addData(k, v)
					break
			}

		})

		$c.new.key.value = ''
		$c.new.val.value = ''
		$c.new.form.addEventListener('submit', evt => {
			evt.preventDefault()
			const k = Datas.$containers.datas.new.key.value
			const v = Datas.$containers.datas.new.val.value
			if(k === '' || v === '') return
			this.datas[k] = v
			this.addData(k, v)
		})
	}
	
	//ajouter un point
	addPoint(x, y) {
		const $ul = Datas.$containers.path.ul

		const $li = document.createElement('li')
		$li.classList.add('line')

		const $ix = document.createElement('input')
		const $iy = document.createElement('input')

		$ix.type ='number'
		$ix.name = 'x'
		$ix.placeholder = 'x'
		$ix.value = x
		$ix.addEventListener('change', evt => {
			const i = this.path.findIndex(p => (p.x == x && p.y == y))
			if(i >= 0) this.path[i].x = $ix.value
			x = $ix.value
			this.tile.layer.addPath(this.tile, this.path)
			Grid.getInstance().draw()
		})
		
		$iy.type ='number'
		$iy.name = 'y'
		$iy.placeholder = 'y'
		$iy.value = y
		$iy.addEventListener('change', evt => {
			const i = this.path.findIndex(p => (p.x == x && p.y == y))
			if(i) this.path[i].y = $iy.value
			y = $iy.value
			this.tile.layer.addPath(this.tile, this.path)
			Grid.getInstance().draw()
		})

		const $del = document.createElement('button')
		$del.dataset.action = 'delete'
		$del.innerHTML = 'supprimer'
		$del.addEventListener('click', evt => {
			const i = this.path.findIndex(p => (p.x == x && p.y == y))
			if(i >= 0) {
				this.path.splice(i, 1)
				$ul.removeChild($li)
				this.tile.layer.addPath(this.tile, this.path)
				Grid.getInstance().draw()
			}
		})

		$li.appendChild($ix)
		$li.appendChild($iy)
		$li.appendChild($del)
		$ul.appendChild($li)
	}
	
	//ajouter une data
	addData(k, v) {
		const $ul = Datas.$containers.datas.ul

		const $li = document.createElement('li')
		$li.classList.add('line')


		const $ik = document.createElement('input')
		const $iv = document.createElement('input')	//creation anticipée pour recuperer dans le listener

		$ik.type ='text'
		$ik.name = 'key'
		$ik.placeholder = 'key'
		$ik.value = k
		$ik.addEventListener('change', evt => {
			const data = this.datas[k]
			if(data)  {
				delete this.datas[k]
				k = $ik.value
			}
			this.datas[k] == $iv.value
		})
		
		$iv.type ='text'
		$iv.name = 'val'
		$iv.placeholder = 'value'
		$iv.value = v
		$iv.addEventListener('change', evt => {
			this.datas[k] == $iv.value
		})
		
		const $del = document.createElement('button')
		$del.dataset.action = 'delete'
		$del.innerHTML = 'supprimer'
		$del.addEventListener('click', evt => {
			delete this.datas[k]
			$ul.removeChild($li)
		})

		$li.appendChild($ik)
		$li.appendChild($iv)
		$li.appendChild($del)
		$ul.appendChild($li)
	}

	//definir une relation
	setRelation(tile) {
		if(this.relation) this.relation.datas.relation = null
		if(tile && tile.datas.relation) tile.datas.relation.datas.relation = null

		this.relation = tile
		if(tile) {
			tile.datas.relation = this.tile
			this.tile.layer.addRelation(this.tile, tile)
		} else {
			this.tile.layer.removeRelation(this.tile)
		}
	}
	
	//vider les contenu html
	static clearHTML() {
		//clone
		let $c = Datas.$containers
		World.cloneEl([$c.infos.container, $c.relation.container, $c.path.container, $c.datas.container])
		
		//infos
		$c = Datas.$containers.infos
		$c.name.value = ''
		$c.x.innerHTML = ''
		$c.y.innerHTML = ''
		$c.ref.value = ''

		//relation
		$c = Datas.$containers.relation
		$c.name.innerHTML = ''

		//path
		$c = Datas.$containers.path
		$c.ul.innerHTML = ''
		$c.new.x.value = ''
		$c.new.y.value = ''
		$c.new.form.addEventListener('submit', evt => { evt.preventDefault() })

		//datas
		$c = Datas.$containers.datas
		$c.ul.innerHTML = ''
		$c.new.key.value = ''
		$c.new.val.value = ''
		$c.new.form.addEventListener('submit', evt => { evt.preventDefault() })
	}
	
	//convertir en tableau json
	toJSON() {
		//contruire le tableau des datas
		const json = {}

		if(this.path && this.path.length > 0) json.path = this.path
		if(this.relation) json.relation = this._relation

		Object.entries(this.datas).forEach(([k, v]) => {
			switch(k) {
				default :
					json[k] = v
					break
			}
		})
		if(this._name != '') json.name = this._name


		return json
	}
		
	//parser les datas depuis le json en datas pour la tile
	load(datas = {}) {
		//contruire le tableau des datas
		this.datas = {}
		Object.entries(datas).forEach(([k, v]) => {
			switch(k) {
				case 'relation' :
					this._relation = v
					break
					
				case 'path' :
					this.path = v
					//if(v && v.length > 0) datas[k] = v.map(p => p.x + ',' + p.y) 
					break

				case 'name' :
					this.name = v 
					break

				default :
					this.datas[k] = v
					break
			}
		})
	}
	
	//ajouter une option au selecteur de reference
	static appendModel(model) {
		const $select = Datas.$containers.infos.ref

		let $option = [...$select.querySelectorAll('option')].find(o => o.value == model.slug)
		if($option) return

		$option = document.createElement('option')
		$option.value = model.slug
		$option.innerHTML = model.name
		$select.appendChild($option)
	}
	
	//supprimer une option au selecteur de reference
	static removeModel(model) {
		const $select = Datas.$containers.infos.ref

		let $option = [...$select.querySelectorAll('option')].find(o => o.value == model.slug)
		if(!$option) return
		$select.removeChild($option)
	}
	
	//containers html
	static get $containers() {
		//infos
		const $infos = document.querySelector('#tile-infos')
		if(!$infos) throw new Error('pas de container pour les infos de la tile')
		const $iname = $infos.querySelector('input[name=tile-name]')
		const $ix = $infos.querySelector('.pos-x span')
		const $iy = $infos.querySelector('.pos-y span')
		const $idelete = $infos.querySelector('button[data-action=delete]')
		const $iref = $infos.querySelector('select[name=reference]')
		if(!$iname || !$ix || !$iy || !$idelete || !$iref) throw new Error('le containers #tile-infos ne comporte pas les elements adequats')
			
		//relation
		const $relation = document.querySelector('#tile-relation')
		if(!$relation) throw new Error('pas de container pour les relations de la tile')
		const $rname = $relation.querySelector('.relation-name span')
		const $bselect = $relation.querySelector('button[data-action=select]')
		const $bgoto = $relation.querySelector('button[data-action=goto]')
		const $bdelete = $relation.querySelector('button[data-action=delete]')
		if(!$rname || !$bselect || !$bgoto || !$bdelete) throw new Error('le containers #tile-relation ne comporte pas les elements adequats')
			
		//path
		const $path = document.querySelector('#tile-path')
		if(!$path) throw new Error('pas de container pour le chemin de la tile')
		const $pul = $path.querySelector(':scope > ul')
		const $pdelete = $path.querySelector(':scope > button[data-action=delete]')
		const $pform = $path.querySelector('#new-point')
		if(!$pul || !$pform || !$pdelete) throw new Error('le containers #tile-path ne comporte pas les elements adequats')
		const $pfx = $pform.querySelector('input[name=x]')
		const $pfy = $pform.querySelector('input[name=y]')
		if(!$pfx || !$pfy) throw new Error('le containers #new-point ne comporte pas les elements adequats')

		//datas
		const $datas = document.querySelector('#tile-datas')
		if(!$datas) throw new Error('pas de container pour les datas de la tile')
		const $dul = $datas.querySelector(':scope > ul')
		const $dform = $datas.querySelector('#new-data')
		if(!$dul || !$dform) throw new Error('le containers #tile-datas ne comporte pas les elements adequats')
		const $dfk = $dform.querySelector('input[name=key]')
		const $dfv = $dform.querySelector('input[name=val]')
		if(!$dfk || !$dfv) throw new Error('le containers #new-data ne comporte pas les elements adequats')
		
		return {
			infos 		: {
				container	: $infos,
				name 		: $iname,
				x 			: $ix,
				y 			: $iy,
				delete 		: $idelete,
				ref 		: $iref
			},
			relation	: {
				container	: $relation,
				name 		: $rname,
				select		: $bselect,
				goto		: $bgoto,
				delete		: $bdelete
			},
			path 		: {
				container	: $path,
				ul			: $pul,
				delete		: $pdelete,
				new			: {
					form			: $pform,
					x				: $pfx,
					y				: $pfy
				}
			},
			datas 		: {
				container 	: $datas,
				ul			: $dul,
				new			: {
					form			: $dform,
					key				: $dfk,
					val				: $dfv
				}
			}
		}
	}
}