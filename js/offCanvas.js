import { Grid } from './grid.js'

export class OffCanvas {
	chunks					// Map : clé = lXcYzZ → { canvas, bitmap, bitmapPending }
	chunkSize = 36			//taille des chunks
	$render					//canvas de rendu 
	width					//nombre de tiles en largeur
	height					//nombre de tiles en hauteur
	zooms = [10, 50]
	batchSize = 5

	//init
	constructor(cols, lines) {
		this.chunks = new Map()
		this.setSize(cols, lines)
	
		this.$render = new OffscreenCanvas(0, 0)
		this.$render.getContext('2d').imageSmoothingEnabled = false
	}

	//changer la taille du canvas
	setSize(cols, lines) {
		this.width = cols
		this.height = lines
	}

	get zoomMax() {
		const l = this.zooms.length
		return (l > 0) ? this.zooms[l - 1] : 0
	}

	//recuperer le chunk selon sa position
	getChunk(l, c) {
		const key = 'l' + l + 'c' + c
		let entry = this.chunks.get(key)
		return entry
	}

	//creer le chunk selon sa position si inexistant
	createChunk(l, c) {
		const key = 'l' + l + 'c' + c
		let entry = this.chunks.get(key)
		if (!entry) {
			const size = this.chunkSize * this.zoomMax
			const $canvas = new OffscreenCanvas(size, size)
			$canvas.getContext('2d').imageSmoothingEnabled = false
			entry = { canvas: $canvas, bitmap: this.zooms.map(z => null), bitmapPending: false }
			this.chunks.set(key, entry)
		}
		return entry
	}

	//supprimer un chunk
	deleteChunk(l, c) {
		this.chunks.delete('l' + l + 'c'+ c)
	}

	//creation du bitmap du chunk
	updateBitmapAsync(l, c) {
		const entry = this.getChunk(l, c)
		if (!entry || entry.bitmapPending) {
			entry.needsUpdate = true
			return
		}
		entry.bitmapPending = true
		this.zooms.forEach(z => {
			const size = this.chunkSize * z
			createImageBitmap(entry.canvas, {resizeWidth : size, resizeHeight : size}).then(bitmap => {
				const i = this.zooms.indexOf(z)
				if(i >= 0) entry.bitmap[i] = bitmap
				entry.bitmapPending = false
				if (entry.needsUpdate) {
					entry.needsUpdate = false
					this.updateBitmapAsync(l, c)
				}
			})
		})
	}	

	//dessiner une tile
	drawTile(tile) {
		const pos = this.worldToLocal(tile.x, tile.y)
		if (pos.x > this.width || pos.y > this.height)
			throw new Error('les coordonnées de la tile sont en dehors des limites')

		const c = Math.floor(pos.x / this.chunkSize)
		const l = Math.floor(pos.y / this.chunkSize)

		const entry = this.createChunk(l, c)
		const ctx = entry.canvas.getContext('2d')
		const x = pos.x - c * this.chunkSize
		const y = pos.y - l * this.chunkSize

		const zm = this.zoomMax
		if (tile.model) ctx.drawImage(tile.model, x * zm, y * zm, zm, zm)
		this.updateBitmapAsync(l, c)
	}

	//effacer une tile
	eraseTile(tile) {
		const pos = this.worldToLocal(tile.x, tile.y)
		if (pos.x > this.width || pos.y > this.height)
			throw new Error('les coordonnées de la tile sont en dehors des limites')

		const c = Math.floor(pos.x / this.chunkSize)
		const l = Math.floor(pos.y / this.chunkSize)

		const entry = this.getChunk(l, c)
		if (!entry) return

		const zm = this.zoomMax
		const ctx = entry.canvas.getContext('2d')
		const x = pos.x - c * this.chunkSize
		const y = pos.y - l * this.chunkSize

		ctx.clearRect(x * zm, y * zm, zm, zm)
		this.updateBitmapAsync(l, c)
	}

	//clear des chunks et du canvas
	clear() {
		this.chunks.clear()
		const ctx = this.$render.getContext('2d')
		ctx.clearRect(0, 0, this.$render.width, this.$render.height)
		console.log('clear offcanvas')
	}

	//dessiner le canvas
	draw(bounds, dz) {
		const o = this.worldToLocal(bounds.left, bounds.top)
		const ow = this.worldToLocal(bounds.right, bounds.bottom)
		ow.x -= o.x
		ow.y -= o.y
		
		const ctx = this.$render.getContext('2d')
		this.$render.width = ow.x * dz
		this.$render.height = ow.y * dz

		ctx.clearRect(0, 0, this.$render.width, this.$render.height)

		const sz = this.zooms.find(z => z >= dz) ?? this.zoomMax
		if(!sz) return
		const ch = this.chunkSize

		const lmin = Math.floor(o.y / ch)
		const lmax = Math.ceil((o.y + ow.y) / ch)
		const cmin = Math.floor(o.x / ch)
		const cmax = Math.ceil((o.x + ow.x) / ch)

		for (let l = lmin; l < lmax; l++) {
			for (let c = cmin; c < cmax; c++) {
				const entry = this.getChunk(l, c)
				if (!entry) continue

				const i = Math.max(this.zooms.indexOf(sz), 0)
				const src = entry.bitmap[i] || entry.canvas
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

	//convertir les coordonnées en local depuis les coordonnées dans le level
	worldToLocal(x, y) {
		const grid = Grid.getInstance()
		if (!grid.level) return false
		return {
			x: x - grid.level.bounds.left,
			y: y - grid.level.bounds.top
		}
	}
}
