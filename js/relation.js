import { Tile } from './tile.js'

export class Relation {
	tileA		//la premiere tile de la relation
	tileB		//la seconde tile de la relation
	
	//init
	constructor(tileA, tileB) {
		if(!(tileA instanceof Tile) || !(tileB instanceof Tile)) throw new Error('l\'un des elements de la relation n\'est pas une tile')
		this.tileA = tileA
		this.tileB = tileB
	}

	//tableau des tiles
	get tiles() {
		return [this.tileA, this.tileB]
	}

	//le tableau des coordonnées
	get coords() {
		return [this.coordA, this.coordB]
	}

	//les coordonnées de la tile A en string
	get coordA() {
		return this.tileA.x + ',' + this.tileA.y
	}
	
	//les coordonnées de la tile B en string
	get coordB() {
		return this.tileB.x + ',' + this.tileB.y
	}

	//renvoi la tile liée
	other(tile) {
		if(tile == this.tileA) return this.tileB 
		if(tile == this.tileB) return this.tileA
		return false
	}

	//renvoi les coordonnées de la tile liée
	otherCoords(tile) {
		if(tile == this.tileA) return this.coordB 
		if(tile == this.tileB) return this.coordA
		return '' 
	}

	//renvoi la relation tileA/tileB dans un tableau de relations
	static findRelation(relations, tileA, tileB) {
		return relations.find(r => {
			if(!(r instanceof Relation)) return
			return r.tiles.includes(tileA) && r.tiles.includes(tileB)
		})
	}
	
	
	//renvoi l'index de la relation tileA/tileB dans un tableau de relations
	static findRelationIndex(relations, tileA, tileB) {
		return relations.findIndex(r => {
			if(!(r instanceof Relation)) return
			return r.tiles.includes(tileA) && r.tiles.includes(tileB)
		})
	}

	//renvopi toutes les relations de la tile dans un tableau
	static filterTileRelations(relations, tile) {
		return relations.filter(r => {
			if(!(r instanceof Relation)) return
			return r.tiles.includes(tile)
		})
	}
}