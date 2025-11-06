export class Path {
	color       //couleur du chemin
	tile        // tile liée au chemin
	points      // liste des points

	//init
	constructor(tile, points = [], color) {
		this.tile = tile
		this.points = []
		points.forEach(p => this.addPoint(p.x, p.y))
		this.color = color
	}

	//ajouter un point
	addPoint(x, y) {
		if(!this.points) this.points = []

		const point = {x, y}

		this.points.push(point)
		return point
	}

	//enlever un point
	removePoint(point) {
		const i = this.points.indexOf(point)
		if(i >= 0) this.points.splice(i, 1)

		return i
	}

	//tourner le chemin d'un quart de tour
	rotate(cw = true) {
		const a = (cw) ? - Math.PI / 2: Math.PI / 2

		this.points.forEach(p => {
			let x = p.x * Math.cos(a) + p.y * Math.sin(a)
			let y = - p.x * Math.sin(a) + p.y * Math.cos(a)

			p.x = Math.round(x)
			p.y = Math.round(y)
		})
	}

	//convertir en format json
	toJSON() {
		return {
			color 	: this.color,
			points 	: this.points 
		}
	}
}