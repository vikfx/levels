import { World } from './world.js'
import { Grid } from './grid.js'
import { ModalBox } from './modalbox.js'
import { Relation } from './relation.js'

export class Datas {
	tile				//tile rattaché aux datas
	_name				//nom en local
	path				//chemin
	datas				//le tableau des autres datas

	//init
	constructor(datas, tile) {
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

	//revoyer la liste des relations
	get relations() {
		return Relation.filterTileRelations(this.tile.layer.relations, this.tile)
	}

	//renvoyer la liste des tiles en relation
	get related() {
		return this.relations.map(r => r.other(this.tile))
	}

	//creer le html dans le parent
	createHTML() {
		//clone
		let $c = Datas.$containers
		World.cloneEl([$c.selection.container, $c.infos.container, $c.relation.container, $c.path.container, $c.datas.container])
		
		//selection
		$c = Datas.$containers.selection
		$c.qty.innerHTML = Grid.getInstance().selection.tiles.length
		$c.prev.addEventListener('click', evt => {
			const sel = Grid.getInstance().selection
			if(sel.tiles.length <= 0) return
			let i = sel.tiles.indexOf(sel.current)
			i = (i <= 0) ? sel.tiles.length - 1 : i - 1
			sel.current = sel.tiles[i]
			sel.current.setDatasHTML()
			Grid.getInstance().draw()
		}) 
		$c.next.addEventListener('click', evt => {
			const sel = Grid.getInstance().selection
			if(sel.tiles.length <= 0) return
			let i = sel.tiles.indexOf(sel.current)
			i = (i >= sel.tiles.length - 1) ? 0 : i + 1
			sel.current = sel.tiles[i]
			sel.current.setDatasHTML()
			Grid.getInstance().draw()
		})

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
			this.tile.layer.removeTile(this.tile)

			const tiles = {
				removed : [this.tile],
				added : [],
				selected : []
			}
			Grid.getInstance().history.push(tiles)
			
			Grid.getInstance().draw()
		})

		//relations
		$c = Datas.$containers.relation
		$c.ul.innerHTML = ''
		this.related.forEach(t => this.addRelation(t))
		$c.add.addEventListener('click', evt => {
			const $canvas = Grid.$containers.canvas
			$canvas.removeEventListener('paint', selectRelation, {capture : true})
			$canvas.addEventListener('paint', selectRelation, {capture : true})
			const data = this
	
			//event once
			function selectRelation(e) {
				e.stopImmediatePropagation()
				const t = (e.detail.result.tiles.selected.length > 0) ? e.detail.result.tiles.selected[0] : null
				if(t) {
					const rel = data.tile.layer.addRelation(data.tile, t)
					if(rel) data.addRelation(t)
				}
	
				$canvas.removeEventListener('paint', selectRelation, {capture : true})
			}

		})

		//path
		$c = Datas.$containers.path
		$c.color.value = (this.path && this.path.color) ? this.path.color : Grid.styles.path.color
		$c.color.addEventListener('change', evt => {
			this.path.color = evt.target.value
			if(this.path.points.length > 0) {
				this.tile.layer.addPath(this.tile, this.path)
				Grid.getInstance().draw()
			}
		})

		$c.ul.innerHTML = ''
		if(this.path && this.path.points) {
			this.path.points.forEach(point => {
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
			if(!this.path) this.path = {color : Grid.styles.path.color, points : []}
			if(!this.path.points) this.path.points = []
			
			const x = Datas.$containers.path.new.x.value
			const y = Datas.$containers.path.new.y.value
			if(x === '' || y === '') return
			this.path.points.push({x, y})
			this.addPoint(x, y)
			this.tile.layer.addPath(this.tile, this.path)
			Grid.getInstance().draw()
		})

		//datas
		$c = Datas.$containers.datas
		$c.ul.innerHTML = ''
		Object.entries(this.datas).forEach(([k, v])  => {
			switch(k) {
				case 'relations' : 
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
			if(k == 'path' || k == 'relation' || k == 'relations') {
				ModalBox.alert('la clé ' + k + ' est reservée')
				return
			}
			this.datas[k] = v
			this.addData(k, v)
		})
	}

	//vider les contenu html
	static clearHTML() {
		//clone
		let $c = Datas.$containers
		World.cloneEl([$c.selection.container, $c.infos.container, $c.relation.container, $c.path.container, $c.datas.container])
		
		//selection
		$c = Datas.$containers.selection
		$c.qty.innerHTML = 0

		//infos
		$c = Datas.$containers.infos
		$c.name.value = ''
		$c.x.innerHTML = ''
		$c.y.innerHTML = ''
		$c.ref.value = ''

		//relation
		$c = Datas.$containers.relation
		$c.ul.innerHTML = ''

		//path
		$c = Datas.$containers.path
		$c.color.value = ''
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

	//ajouter une relation
	addRelation(tile) {
		const $ul = Datas.$containers.relation.ul

		const $li = document.createElement('li')
		$li.classList.add('line')

		//titre
		const $h = document.createElement('h4')
		$h.innerHTML = tile.name

		//bouton go to
		const $goto = document.createElement('button')
		$goto.dataset.action = 'goto'
		$goto.innerHTML = 'go to'
		$goto.addEventListener('click', evt => {
			const grid = Grid.getInstance()
			if(grid.selection.tiles.indexOf(tile) < 0) {
				grid.selection.tiles = [tile]
				grid.selection.selection = {
					x: tile.x, 
					y: tile.y,
					w: 1,
					h: 1
				}
			}
			
			grid.selection.current = tile
			tile.setDatasHTML()
			grid.draw()
		})
		
		//bouton suppr
		const $del = document.createElement('button')
		$del.dataset.action = 'delete'
		$del.innerHTML = 'supprimer'
		$del.addEventListener('click', evt => {
			$ul.removeChild($li)
			this.tile.layer.removeRelation(this.tile, tile)
			Grid.getInstance().draw()
		})

		$li.appendChild($h)
		$li.appendChild($goto)
		$li.appendChild($del)
		$ul.appendChild($li)
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
			const i = this.path.points.findIndex(p => (p.x == x && p.y == y))
			if(i >= 0) this.path.points[i].x = $ix.value
			x = $ix.value
			this.tile.layer.addPath(this.tile, this.path)
			Grid.getInstance().draw()
		})
		
		$iy.type ='number'
		$iy.name = 'y'
		$iy.placeholder = 'y'
		$iy.value = y
		$iy.addEventListener('change', evt => {
			const i = this.path.points.findIndex(p => (p.x == x && p.y == y))
			if(i >= 0) this.path.points[i].y = $iy.value
			y = $iy.value
			this.tile.layer.addPath(this.tile, this.path)
			Grid.getInstance().draw()
		})

		const $del = document.createElement('button')
		$del.dataset.action = 'delete'
		$del.innerHTML = 'supprimer'
		$del.addEventListener('click', evt => {
			const i = this.path.points.findIndex(p => (p.x == x && p.y == y))
			if(i >= 0) {
				this.path.points.splice(i, 1)
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
			if(this.datas[k]) delete this.datas[k]
			k = $ik.value
			this.datas[k] = $iv.value
		})
		
		$iv.type ='text'
		$iv.name = 'val'
		$iv.placeholder = 'value'
		$iv.value = v
		$iv.addEventListener('change', evt => {
			v = $iv.value
			this.datas[k] = $iv.value
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

	//convertir en tableau json
	toJSON() {
		//contruire le tableau des datas
		const json = {}

		//path
		if(this.path && (this.path.points.length > 0 || this.path.color)) json.path = this.path

		//relation
		if(this.relations.length > 0) json.relations = this.relations.map(r => r.otherCoords(this.tile))


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
				case 'relations' :
					v.forEach(relation => {
						const ly = this.tile.layer
						const r = relation.split(',')
						if(r.length != 2) return
						const x = Number(r[0])
						const y = Number(r[1])
						const tb = ly.findTileAt(x, y)
						if(tb) ly.addRelation(this.tile, tb)
					})
					break
					
				case 'path' :
					this.path = v
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
		//selection
		const $selection = document.querySelector('#tile-selection')
		if(!$selection) throw new Error('pas de container pour la selection des tiles')
		const $qty = $selection.querySelector('p span')
		const $bprev = $selection.querySelector('button[data-action=prev]')
		const $bnext = $selection.querySelector('button[data-action=next]')
		if(!$qty || !$bnext || !$bprev) throw new Error('le containers #tile-selection ne contient pas les elements adequats')


		//infos
		const $infos = document.querySelector('#tile-infos')
		if(!$infos) throw new Error('pas de container pour les infos de la tile')
		const $iname = $infos.querySelector('input[name=tile-name]')
		const $ix = $infos.querySelector('.pos-x span')
		const $iy = $infos.querySelector('.pos-y span')
		const $idelete = $infos.querySelector('button[data-action=delete]')
		const $iref = $infos.querySelector('select[name=reference]')
		if(!$iname || !$ix || !$iy || !$idelete || !$iref) throw new Error('le containers #tile-infos ne contient pas les elements adequats')
			
		//relation
		const $relation = document.querySelector('#tile-relation')
		if(!$relation) throw new Error('pas de container pour les relations de la tile')
		const $rul = $relation.querySelector(':scope > ul')
		const $radd = $relation.querySelector('button[data-action=add]')
		if(!$radd || !$rul) throw new Error('le containers #tile-relation ne contient pas les elements adequats')
			
		//path
		const $path = document.querySelector('#tile-path')
		if(!$path) throw new Error('pas de container pour le chemin de la tile')
		const $pul = $path.querySelector(':scope > ul')
		const $pcolor = $path.querySelector(':scope > input[name=color]')
		const $pdelete = $path.querySelector(':scope > button[data-action=delete]')
		const $pform = $path.querySelector('#new-point')
		if(!$pul || !$pcolor || !$pform || !$pdelete) throw new Error('le containers #tile-path ne contient pas les elements adequats')
		const $pfx = $pform.querySelector('input[name=x]')
		const $pfy = $pform.querySelector('input[name=y]')
		if(!$pfx || !$pfy) throw new Error('le containers #new-point ne contient pas les elements adequats')

		//datas
		const $datas = document.querySelector('#tile-datas')
		if(!$datas) throw new Error('pas de container pour les datas de la tile')
		const $dul = $datas.querySelector(':scope > ul')
		const $dform = $datas.querySelector('#new-data')
		if(!$dul || !$dform) throw new Error('le containers #tile-datas ne contient pas les elements adequats')
		const $dfk = $dform.querySelector('input[name=key]')
		const $dfv = $dform.querySelector('input[name=val]')
		if(!$dfk || !$dfv) throw new Error('le containers #new-data ne contient pas les elements adequats')
		
		return {
			selection 		: {
				container	: $selection,
				qty 		: $qty,
				prev 		: $bprev,
				next 		: $bnext
			},
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
				add			: $radd,
				ul			: $rul
			},
			path 		: {
				container	: $path,
				ul			: $pul,
				color		: $pcolor,
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