export class Chunks {
	map								//le mapping des tiles
	chunkSize = 36					//la taille des chunks en largeur / hauteur
	bitmapZooms = [10, 50, 100]		//les niveau de zooms pour la creation des bitmaps

	//init
	constructor() {
		//this.chunkSize = size
		this.map = new Map()
	}

	//renvoyer toutes les tiles des chunks
	get tiles() {
		if(!this.map) return []
		return [...this.map.values()].flatMap(c => c.tiles)
	}

	//renvoyer toutes les tiles formatée pour le JSON
	get tilesJSON() {
		if(!this.map) return []
		return [...this.map.values()].flatMap(c => c.tiles.map(t => t.toJSON()))
	}

	//recuperer le zoom adapté au zoom reel
	getZoom(dz) {
		return this.bitmapZooms.find(z => z >= dz) ?? this.bitmapZooms[this.bitmapZooms.length - 1 ] ?? 1
	}

	//convertir les coordonnées x/y en l/c
	XYtoLC(x, y) {
		const l = Math.floor(y / this.chunkSize)
		const c = Math.floor(x / this.chunkSize)
		const key = 'l' + l + 'c' + c
		return { l, c, key } 
	}

	//convertir les coordonnées en local du chunk depuis les coordonnées dans le level
	worldToChunk(x, y) {
		const pos = this.XYtoLC(x, y)

		return {
			x: x - pos.c * this.chunkSize,
			y: y - pos.l * this.chunkSize
		}
	}

	//renvoyer un chunk depuis les coordonnées du monde x/y
	getChunkAt(x, y) {
		const pos = this.XYtoLC(x, y)
		return this.getChunk(pos.l, pos.c)
	}

	//renvoyer un chunk depuis sa position l/c
	getChunk(l, c) {
		const key = 'l' + l + 'c' + c
		let value = this.map.get(key)

		return value
	}

	//ajouter une tile au tableau des tiles
	push(tile) {
		let chunk = this.getChunkAt(tile.x, tile.y)

		if(!chunk) {
			const pos = this.XYtoLC(tile.x, tile.y)
			
			this.map.set(pos.key, {
				key : pos.key,
				tiles :  [], 
				bitmaps :  [], 
				needsUpdate : false, 
				bitmapPending : false
			})
			
			chunk = this.getChunk(pos.l, pos.c)
		}

		chunk.tiles.push(tile)
		chunk.needsUpdate = false
		chunk.bitmapPending = false
		this.clearBitmaps(chunk)
	}

	//enlever une tile du tableau des tiles
	pop(tile) {
		const chunk = this.getChunkAt(tile.x, tile.y)

		if(!chunk) return -1
		
		const i = chunk.tiles.indexOf(tile)
		if(i >= 0) {
			chunk.tiles.splice(i, 1)
			chunk.needsUpdate = false
			chunk.bitmapPending = false
			this.clearBitmaps(chunk)
		}

		if(chunk.tiles.length <= 0) {
			const pos = this.XYtoLC(tile.x, tile.y)
			this.map.delete(pos.key)
		}

		return i
	}

	//retrouver une tile aux coordonnées
	findTileAt(x, y) {
		const chunk = this.getChunkAt(x, y)
		if(!chunk || !chunk.tiles) return

		return chunk.tiles.find(tile => {
			return tile.x == x && tile.y == y
		})
	}

	//faire un foreach sur les tiles en utilisant le chunk
	forEachTiles(callback) {
		this.map.forEach((chunk, key) => {
			chunk.tiles.forEach(tile => {
				callback(tile, chunk, key)
			})
		})
	}

	//creation du bitmap du chunk
	updateBitmapAsync(l, c, z) {
		const chunk = this.getChunk(l, c)
		if(!chunk) return false
		
		const $canvas = this.drawChunk(chunk, z)

		if (chunk.bitmapPending) {
			chunk.needsUpdate = true
			return $canvas
		}
		chunk.bitmapPending = true

		createImageBitmap($canvas).then(bitmap => {
			const i = this.bitmapZooms.indexOf(z)
			if(i >= 0) {
				if (chunk.bitmaps[i]) chunk.bitmaps[i].close?.()  //vider le GPU
				chunk.bitmaps[i] = bitmap
			}
			chunk.bitmapPending = false
			if (chunk.needsUpdate) {
				chunk.needsUpdate = false
				this.updateBitmapAsync(l, c, z)
			}
		})

		return $canvas
	}

	//vider les bitmaps du chunk
	clearBitmaps(chunk) {
		if(!chunk || ! chunk.bitmaps) return
		chunk.bitmaps.forEach(bmp => bmp.close?.())
		chunk.bitmaps = []
	}

	//dessiner une tile
	drawTile(tile, z, ctx) {
		const pos = this.worldToChunk(tile.x, tile.y)
		if (pos.x >= this.chunkSize || pos.y >= this.chunkSize) {
			console.log('les coordonnées de la tile sont en dehors des limites')
			return
		}

		if (tile.model)
			ctx.drawImage(tile.model, pos.x * z, pos.y * z, z, z)
	}

	//dessiner un chunk
	drawChunk(chunk, z) {
		const size = this.chunkSize * z
		
		const $canvas = new OffscreenCanvas(size, size)
		const ctx = $canvas.getContext('2d')
		chunk.tiles.forEach(tile => this.drawTile(tile, z, ctx))

		return $canvas
	}

	//dessiner les chunks
	draw(bounds, dz, ctx) {		
		const sz = this.getZoom(dz)
		const ch = this.chunkSize

		const lmin = Math.floor(bounds.top / ch)
		const lmax = Math.ceil(bounds.bottom / ch)
		const cmin = Math.floor(bounds.left / ch)
		const cmax = Math.ceil(bounds.right / ch)

		for (let l = lmin; l < lmax; l++) {
			for (let c = cmin; c < cmax; c++) {
				const chunk = this.getChunk(l, c)
				if (!chunk || !chunk.tiles || chunk.tiles.length <= 0) continue
				
				const i = Math.max(this.bitmapZooms.indexOf(sz), 0)
				const src = chunk.bitmaps[i] || this.updateBitmapAsync(l, c, sz)

				const o = {x : bounds.left, y : bounds.top}
				const sx = Math.max(o.x - c * ch, 0) * sz
				const sy = Math.max(o.y - l * ch, 0) * sz
				const dx = Math.max(c * ch - o.x, 0) * dz
				const dy = Math.max(l * ch - o.y, 0) * dz
				const w = Math.min((c + 1) * ch - o.x, ch)
				const h = Math.min((l + 1) * ch - o.y, ch)
				const sw = w * sz
				const sh = h * sz
				const dw = w * dz
				const dh = h * dz

				ctx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh)
			}
		}
	}
}