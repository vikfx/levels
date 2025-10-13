export class FetchAPI {
	static apiURL = '/api/'

	//envoyer une requete sur l'api
	static fetch(url, method, body, callback, error) {
		const datas = {
			method : method
		}
		
		if(body) {
			if(!(body instanceof FormData)) {
				datas.headers = {'Content-Type' : 'application/json'}
				if(body instanceof Object) body = JSON.stringify(body)
			}
			datas.body = body
		}

		if(!FetchAPI.isValidURL(url)) {
			console.log('le format de route n\'est pas valide')
			console.log(url)
			return
		}

		fetch(url, datas)
		.then(res => res.json())
		.then((output) => {
			if(output.error) {
				if(output.error == 'Unauthorized') {
					//location.href = './index.html'
					alert('erreur de connexion, reconnectez-vous')
					//hideWelcome()
				} else {
					alert(output.error)
					throw new Error(output.error)
				}

				if (typeof error === "function") {
					error(output)
				}
			}

			if(!output.action) {
				console.log('aucune action dans la reponse')
				return
			} else {
				//masquer la popup d'entrée
				//hideWelcome()
				if (typeof callback === "function") {
					callback(output)
				}
			}

		})
	}

	//requete d'authentification
	static fetchAuth(apiKey, callback) {
		fetch('api/authenticate', {
			method: 'GET',
			headers: { 'X-API-KEY': apiKey},
			credentials: 'same-origin' // pour accepter le cookie
		})
		.then(res => res.json())
		.then((output) => {
			if(output['response']) {
				localStorage.setItem('apiKey', apiKey)
				if (typeof callback === "function") {
					callback(output)
				}
			}
		});
	}

	//verifier si l'url est valide
	static isValidURL(url) {
		const path = new URL(url, 'http://dummy').pathname
		const regex = /^[a-zA-Z0-9_:/?&=]+$/;
		return regex.test(path);
	}
}