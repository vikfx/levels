import { Settings } from './settings.js'
import { World } from './world.js'
import { History } from './history.js'
import { Datas } from './datas.js'

export class Grid {
	static instance			//instance du singleton

	zoom					//niveau de zoom
	zoomMin = 1				//zoom minimum
	zoomMax = 100			//zoom maximum
	offset					//coordonnées x/y de la position du coin supérieur gauche du canvas dans la grille
	currentPos				//position x/y de la souris dans la grille
	selection				//positions de la grille selectionnées
	selectedTiles			//les tiles selectionnées
	multiTouch = false		//si plusieurs touches sont enregistrées
	history					//l'historique du paint

	//init
	constructor() {
		this.offset = {x: 0, y: 0}
		this.setZoom(10)
		this.addListeners()
		this.history = new History()

		Grid.instance = this
	}

	//ajouter les events listener sur le canvas
	addListeners() {
		//clonage pour eviter le double listener
		World.cloneEl([Grid.$containers.canvas])
		World.cloneEl([...Settings.$containers.history])

		let $canvas = Grid.$containers.canvas
		$canvas.getContext('2d').imageSmoothingEnabled = false

		//resize du canvas
		$canvas.addEventListener('canvasResized', evt => {
			if(!this.level) return

			this.draw()
		})

		//supprimer les comportements natifs
		$canvas.addEventListener('touchmove', evt => { evt.preventDefault() }, { passive: false }) // Empêcher zoom/scroll natif de la page
		$canvas.addEventListener('contextmenu', evt => evt.preventDefault()) // désactive menu contextuel


		//ajouter les listener
		this.addSelectionListeners($canvas)
		this.addPanZoomListeners($canvas)
		this.addHistoryListeners(Settings.$containers.history)
	}

	//gestion des events de navigation dans l'historique
	addHistoryListeners($btns) {
		$btns.forEach($btn => {
			$btn.addEventListener('click', evt => {
				const action = $btn.dataset.action
				console.log('history action : ' + action)
				if(!action) return

				let tiles = false
				let toAdd = []
				let toRemove = []
				switch(action) {
					//undo
					case 'undo' :
						tiles = this.history.prev()
						toAdd = (tiles) ? tiles.removed : []
						toRemove = (tiles) ? tiles.added : []
						break

					//redo
					case 'redo' :
						tiles = this.history.next()
						toAdd = (tiles) ? tiles.added : []
						toRemove = (tiles) ? tiles.removed : []
						break
				}

				console.log('history i : ' + this.history.current)
				console.log({toRemove, toAdd})

				if(!tiles) return

				//supprimer les tiles
				toRemove.forEach(tile => {
					tile.layer.removeTile(tile)
				})

				//ajouter les tiles
				toAdd.forEach(tile => {
					tile.layer.addTile(tile)
				})

				this.level.edited = true
				this.draw()
			})
		})
	}

	//gestion d'event survol / selection
	addSelectionListeners($canvas) {
		//debut de survol
		$canvas.addEventListener('pointerdown', evt => {
			if(!this.level || this.multiTouch) return

			if ((evt.button === 0 && evt.pointerType !== "touch") || (evt.pointerType === "touch" && evt.isPrimary)) {
				this.selection = {}
				this.selection.start = this.pixelToGrid(evt.offsetX, evt.offsetY)
			}
		})

		//fin de survol
		$canvas.addEventListener('pointerup', evt => {
			if(!this.level || this.multiTouch) return

			if(this.selection) {
				const sel = this.parseSelection()

				let action = {
					name : Settings.getInstance().currentTool,
					layer : this.level.currentLayer,
					model : Settings.getInstance().currentModel
				}

				const tiles = this.paintAction(sel, action)
				this.history.push(tiles)
				this.selection = false

				const detail = { tiles, action }
				$canvas.dispatchEvent(new CustomEvent('paintAction', { detail: detail }))
			}
		})

		//survol
		$canvas.addEventListener('pointermove', evt => {
			if(!this.level || this.multiTouch) return

			//position courante
			this.setCurrentPos(this.pixelToGrid(evt.offsetX, evt.offsetY))

			//cadre de selection
			if (this.selection) {
				this.selection.end = this.pixelToGrid(evt.offsetX, evt.offsetY)
			}

			this.draw()
		})

		//sortie
		$canvas.addEventListener('pointerleave', (evt) => {
			this.currentPos = false
			this.selection = false
			this.draw()
		})


		//$canvas = Grid.$containers.canvas
		$canvas.addEventListener('paintAction', evt => {
			//selection
			console.log('paint ' + evt.detail.action.name)
			console.log(evt.detail.tiles)
			this.selectedTiles = evt.detail.tiles.selected
			if(this.selectedTiles.length > 0) {
				const tile = this.selectedTiles[0]
				tile.setDatasHTML()
			} else {
				Datas.clearHTML()
			}
		})
	}

	//gestion d'event pour le pan/zoom
	addPanZoomListeners($canvas) {
		let lastDist = null
		let lastPos = null

		////touches
		//entrée de drag
		$canvas.addEventListener('touchstart', evt => {
			this.multiTouch = evt.touches.length > 1

			if(evt.touches.length === 2) {
				// reset
				lastDist = null
				lastPos = null
			}
		}, { passive: false })

		//sortie de drag
		$canvas.addEventListener('touchend', evt => {
			this.multiTouch = evt.touches.length > 1

			if(evt.touches.length < 2) {
				lastDist = null
				lastPos = null
			}
		}, { passive: false })

		//drag
		$canvas.addEventListener('touchmove', evt => {
			if(!this.level || !this.multiTouch) return

			const [t1, t2] = evt.touches

			// distance actuelle (pour zoom)
			const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

			// milieu des doigts (pour pan)
			const pos = {
				x: (t1.clientX + t2.clientX) / 2,
				y: (t1.clientY + t2.clientY) / 2
			}

			// zoom
			if(lastDist) {
				if((Math.abs(dist - lastDist) > 5)) {
					const scale = (dist / lastDist > 1) ? 1 : -1
					this.setZoom(this.zoom + scale)

					//recentrer la vue sur la position courante
					if(this.currentPos) {
						const pos = {x : this.currentPos.x, y : this.currentPos.y}
						const b = this.bounds
						pos.x -= Math.floor((b.right - b.left) / 2)
						pos.y -= Math.floor((b.bottom - b.top) / 2)

						this.offset = this.level.clampPos(pos.x, pos.y)
					}

					lastDist = dist
				}
			} else {
				lastDist = dist
			}

			// pan
			if(lastPos) {
				const delta = {}
				delta.x = lastPos.x - pos.x
				delta.y = lastPos.y - pos.y

				const incX = delta.x / this.zoom
				const incY = delta.y / this.zoom
				if(Math.abs(incX) >= 1 || Math.abs(incY) >= 1) {
					this.offset = this.level.clampPos(this.offset.x + incX, this.offset.y + incY)
					lastPos = pos
				}
			} else {
				lastPos = pos
			}

			//redessiner les canvas
			this.draw()
		}, { passive: false })

		////mouse
		//entrée de drag pan
		let mouseR
		$canvas.addEventListener('pointerdown', evt => {
			if(evt.pointerType === 'mouse' && evt.button === 2) {
				mouseR = true
				lastPos = { x: evt.clientX, y: evt.clientY }
			}
		})

		//drag pan
		$canvas.addEventListener('pointermove', evt => {
			if(mouseR) {
				const delta = {}
				delta.x = lastPos.x - evt.clientX
				delta.y = lastPos.y - evt.clientY

				const incX = delta.x / this.zoom
				const incY = delta.y / this.zoom
				if(Math.abs(incX) >= 1 || Math.abs(incY) >= 1) {
					this.offset = this.level.clampPos(this.offset.x + incX, this.offset.y + incY)
					lastPos = { x: evt.clientX, y: evt.clientY }
				}

				this.draw()
			}
		})

		//sortie de drag pan
		$canvas.addEventListener('pointerup', () => mouseR = false)

		//molette zoom
		$canvas.addEventListener("wheel", evt => {
			if(!this.level) return
			const scale = (evt.deltaY < 0) ? -1 : 1
			this.setZoom(this.zoom + scale)

			//recentrer la vue sur la position courante
			if(this.currentPos) {
				const pos = {x : this.currentPos.x, y : this.currentPos.y}
				const b = this.bounds
				pos.x -= Math.floor((b.right - b.left) / 2)
				pos.y -= Math.floor((b.bottom - b.top) / 2)

				this.offset = this.level.clampPos(pos.x, pos.y)
			}

			this.draw()
		}, { passive: false })
	}

	//appliquer l'action en sortie de selection
	paintAction(sel, action) {
		if(!action.layer) {
			alert('aucun calque selectionné')
			return
		}
		if(action.layer.locked || !action.layer.visible) {
			alert('le calque est verrouillé ou masqué')
			return
		}

		const removed = []
		const added = []
		const selected = []

		for(let l = sel.y; l < sel.y + sel.h; l++) {
			for(let c = sel.x; c < sel.x + sel.w; c++) {
				let tile
				let founds
				switch(action.name) {
					//peindre
					case 'paint' :
						let noTile = true
						founds = this.level.layers.map(ly => ly.findTileAt(c, l))
						founds.forEach(tile => {
							if(tile) {
								if(!tile.layer.locked && tile.layer.visible) {
									//supprimer la tile existante
									tile.layer.removeTile(tile)
									removed.push(tile)
									noTile = true
								} else {
									noTile = false
								}
							}
						})

						//ajouter la tile
						if(noTile) {
							tile = action.layer.addTile(c, l, action.model.slug)
							added.push(tile)
						}
						break

					//gommer
					case 'erase' :
						founds = this.level.layers.map(ly => ly.findTileAt(c, l))
						founds.forEach(tile => {
							if(tile) {
								if(!tile.layer.locked && tile.layer.visible) {
									//supprimer la tile existante
									tile.layer.removeTile(tile)
									removed.push(tile)
								}
							}
						})
						break

					//selectionner
					case 'select' :
						tile = action.layer.findTileAt(c, l)
						if(tile) {
							selected.push(tile)
						}
						break

					//defaut
					default :
						break
				}
			}
		}

		this.level.edited = true
		this.draw()

		const tiles = {
			removed,
			added,
			selected
		}

		return tiles
	}

	//definir la position courante
	setCurrentPos(pos) {
		this.currentPos = pos

		if(pos) {
			World.$containers.coords.x.innerHTML = 'x ' + pos.x.toString().padStart(4, "0")
			World.$containers.coords.y.innerHTML = 'y ' + pos.y.toString().padStart(4, "0")
		}
	}

	//parser la selection
	parseSelection() {
		if(!this.selection) return
		const s = this.selection.start
		const e = (this.selection.end) ? this.selection.end : this.selection.start
		const x = (s.x > e.x) ? e.x : s.x
		const y = (s.y > e.y) ? e.y : s.y

		const w = Math.abs(s.x - e.x) + 1
		const h = Math.abs(s.y - e.y) + 1

		return {
			x,
			y,
			w,
			h
		}
	}

	//recuperer le level en cours
	get level() {
		return World.getInstance().currentLevel
	}

	//attribuer le level en cours
	set level(level) {
		console.log(level)
		World.getInstance().currentLevel = level
		Datas.clearHTML()

		if(level) {
			this.history.reset()
			this.setZoom(10)
			this.offset = level.clampPos(0, 0)
		}

		this.draw()
	}

	//attribuer le zoom
	setZoom(z) {
		z = Math.floor(z)
		if(z <= this.zoomMin) z = this.zoomMin
		if(z >= this.zoomMax) z = this.zoomMax
		this.zoom = z
	}

	//convertir des coordonnées x/y dans le monde en position dans la grille
	pixelToGrid(x, y) {
		if(!this.level) return {x : 0, y: 0}
		let px = Math.floor(x / this.zoom) + this.offset.x
		let py = Math.floor(y / this.zoom) + this.offset.y

		return this.level.clampPos(px, py)
	}

	//convertir la position x/y de la grille en coordonnées dans le monde
	gridToPixel(x, y, tileSize) {
		if(!this.level) return {x : 0, y: 0}

		let px = (x - this.offset.x) * tileSize
		let py = (y - this.offset.y) * tileSize

		return {
			x : px,
			y : py
		}
	}

	//renvoyer les limites de la grille à afficher dans le canvas
	get bounds() {
		const $canvas = Grid.$containers.canvas
		const br = this.pixelToGrid($canvas.offsetWidth, $canvas.offsetHeight)

		return {
			left: this.offset.x,
			right : br.x,
			top : this.offset.y,
			bottom : br.y
		}
	}

	//recuperer le contexte
	static get ctx() {
		return Grid.$containers.canvas.getContext('2d')
	}

	//effacer un canvas
	clearCanvas($canvas) {
		const ctx = $canvas.getContext('2d')
		ctx.clearRect(0, 0, $canvas.width, $canvas.height)
	}

	//dessiner le canvas
	draw() {
		//clear
		this.clearCanvas(Grid.$containers.canvas)

		if(!this.level) return

		//dessiner le calque enregistré
		this.level.layers.forEach(layer => {
			if(!layer.visible) return
			layer.draw(this.bounds, this.zoom, Grid.ctx)

			layer.relations.forEach(r => this.drawRelation(r))
			layer.pathes.forEach(p => this.drawPath(p))
		})

		//dessiner la bordure du niveau
		this.drawBorders()

		//dessiner les curseurs
		this.drawCursors()

		//dessiner la tile selectionnée
		this.drawSelected()
	}

	//dessiner la bordure du level
	drawBorders() {
		const ctx = Grid.ctx
		const bo = this.bounds
		const z = this.zoom

		ctx.strokeStyle = Grid.styles.border.color
		ctx.lineWidth = Grid.styles.border.width
		ctx.strokeRect(0, 0, (bo.right - bo.left + 1) * z, (bo.bottom - bo.top + 1) * z)
	}

	//dessiner le curseur
	drawCursors() {
		const ctx = Grid.ctx
		const z = this.zoom

		if(this.selection) {
			const s = this.parseSelection()
			const origin = this.gridToPixel(s.x, s.y, z)

			ctx.fillStyle = Grid.styles.cursor.color
			ctx.fillRect(origin.x, origin.y, s.w * z, s.h * z)
		} else if(this.currentPos) {
			ctx.strokeStyle = Grid.styles.cursor.color
			ctx.lineWidth = Grid.styles.cursor.width
			const pos = this.gridToPixel(this.currentPos.x, this.currentPos.y, z)
			ctx.strokeRect(pos.x, pos.y, z, z)
		}
	}

	//dessiner la premiere tile selectionnée
	drawSelected() {
		const ctx = Grid.ctx
		const z = this.zoom

		if(!ctx) ctx = Grid.ctx
		if(this.selectedTiles && this.selectedTiles.length > 0) {
			const t = this.selectedTiles[0]

			ctx.strokeStyle = Grid.styles.selected.color
			ctx.lineWidth = Grid.styles.selected.width
			const pos = this.gridToPixel(t.x, t.y, z)
			ctx.strokeRect(pos.x, pos.y, z, z)
		}
	}

	//dessiner une relation
	drawRelation(relation) {
		const ctx = Grid.ctx
		const bo = this.bounds
		const z = this.zoom
		
		const ta = relation[0]
		const tb = relation[1]
		
		if(!Grid.inBounds(ta.position, bo) && !Grid.inBounds(tb.position, bo)) return
		
		const a = this.gridToPixel(ta.x, ta.y, z)
		const b = this.gridToPixel(tb.x, tb.y, z)
		a.x += z/2
		a.y += z/2
		b.x += z/2
		b.y += z/2
		
		ctx.strokeStyle = Grid.styles.relation.color
		ctx.lineWidth = Grid.styles.relation.width * (z / this.zoomMax)
		ctx.beginPath()
		ctx.moveTo(a.x, a.y)
		ctx.lineTo(b.x, a.y)
		ctx.lineTo(b.x, b.y)
		ctx.stroke()

		ctx.fillStyle = Grid.styles.relation.color
		const s = z * Grid.styles.relation.square		//demi largeur du carre d'extremité
		ctx.fillRect(a.x - s, a.y - s, s * 2, s * 2)
		ctx.fillRect(b.x - s, b.y - s, s * 2, s * 2)
	}

	//dessiner un path
	drawPath(path) {
		const ctx = Grid.ctx
		const bo = this.bounds
		const z = this.zoom

		if(!Grid.inBounds(path.tile, bo)) return
		
		ctx.strokeStyle = Grid.styles.path.color
		ctx.lineWidth = Grid.styles.path.width * (z / this.zoomMax)
		ctx.beginPath()
		path.path.forEach((point, i) => {
			const pos = this.gridToPixel(point.x, point.y, z)
			pos.x += z/2
			pos.y += z/2
			if(i == 0) ctx.moveTo(pos.x, pos.y)
			else ctx.lineTo(pos.x, pos.y)
		})
		ctx.stroke()

		let p = path.path[0]
		const a = this.gridToPixel(p.x, p.y, z)
		p = path.path[path.path.length - 1]
		const b = this.gridToPixel(p.x, p.y, z)
		a.x += z/2
		a.y += z/2
		b.x += z/2
		b.y += z/2
		ctx.fillStyle = Grid.styles.path.color
		const s = z * Grid.styles.path.square		//demi largeur du carre d'extremité

		ctx.beginPath();
		ctx.ellipse(a.x, a.y, s, s, 0, 0, 2 * Math.PI);
		ctx.fill()
		
		ctx.beginPath();
		ctx.ellipse(b.x, b.y, s, s, 0, 0, 2 * Math.PI);
		ctx.fill()
	}

	//verifier que les coordonnées x/y sont dans le bounds
	static inBounds(pos, bounds) {
		return (
			pos.x >= bounds.left
			&& pos.x <= bounds.right
			&& pos.y >= bounds.top
			&& pos.y <= bounds.bottom
		)
	}

	//styles deselements dans le canvas
	static get styles() {
		return {
			background	: {
				color		: '#FF0000'
			},
			border 		: {
				color 		: '#CCCC00',
				width 		: 5
			},
			cursor 		: {
				color 		: '#DD0066',
				width 		: 3
			},
			selected 	: {
				color 		: '#22DD00',
				width 		: 3
			},
			relation 	: {
				color 		: '#CCCC00',
				width 		: 3,
				square 		: .1	
			},
			path 		: {
				color 		: '#00CCCC',
				width 		: 3,
				square 		: .05
			}
		}
	}

	//recuperer l'instance du singleton
	static getInstance() {
		if (!Grid.instance) throw new Error('la classe map doit être initialisée')
		return Grid.instance
	}

	//les conteneur html
	static get $containers() {
		const $canvas = document.querySelector('#level-map')
		if(!$canvas) throw new Error('impossible de charger le canvas')

		return {
			canvas : $canvas,
		}
	}
}