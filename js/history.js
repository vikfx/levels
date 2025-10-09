export class TileHistory {
	actions
	current
	maxHistory = 20

	constructor() {
		this.reset()
	}

	//reinitialiser l'historique
	reset() {
		this.actions = []
		this.current = 0
	}

	//ajouter une action dans l'historique
	push(action) {
		this.actions = this.actions.slice(0, this.current + 1)
		this.actions.push(action)
		if(this.actions.length > this.maxHistory) 
			this.actions = this.actions.slice(this.actions.length - this.maxHistory)
		this.current = Math.max(this.actions.length - 1, 0)
	}

	//revenir en arrière
	prev() {
		if(this.actions.length < 1 || this.current <= 0) return
		const action = this.actions[this.current]
		this.current = Math.max(this.current - 1, 0)
		return action
	}
	
	//aller en avant
	next() {
		if(this.actions.length < 1 || this.current + 1 >= this.actions.length) return
		this.current = Math.min(this.current + 1, this.actions.length - 1)
		const action = this.actions[this.current]
		return action
	}
}