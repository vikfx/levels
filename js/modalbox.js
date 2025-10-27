import { World } from './world.js'

export class ModalBox {
	//alert
	static alert(msg) {
		let $c = ModalBox.$containers.alert
		World.cloneEl([$c.box])
		
		$c = ModalBox.$containers.alert
		$c.content.innerHTML = msg
		$c.box.classList.add('on')

		$c.close.addEventListener('click', evt => {
			evt.preventDefault()
			$c.box.classList.remove('on')
		})
	}

	//confirm
	static async confirm(msg) {
		return new Promise(resolve => {
			let $c = ModalBox.$containers.confirm
			World.cloneEl([$c.box])
			
			$c = ModalBox.$containers.confirm
			$c.box.classList.add('on')
			$c.content.innerHTML = msg
			
			const clear = () => {
				$c.box.classList.remove('on')
				
				$c.close.removeEventListener('click', onCancel)
				$c.ok.removeEventListener('click', onOk)
			}
			
			const onOk = (evt) => {
				evt.preventDefault()
				clear()
				resolve(true)
			}
			
			const onCancel = (evt) => {
				evt.preventDefault()
				clear()
				resolve(false)
			}

			$c.close.addEventListener('click', onCancel)
			$c.ok.addEventListener('click', onOk)
		})
	}

	//conteneurs html
	static get $containers() {
		const $alert = document.querySelector('#alert')
		if(!$alert) throw new Error('box #alert manquante')
		const $aclose = $alert.querySelector(".close")
		const $acontent = $alert.querySelector(".content")
		if(!$acontent || !$aclose) throw new Error('la box #alert ne contient pas les elements adequats')
		
		const $confirm = document.querySelector('#confirm')
		if(!$confirm) throw new Error('box #confirm manquante')
		const $cclose = $confirm.querySelector(".close")
		const $cok = $confirm.querySelector(".ok")
		const $ccontent = $confirm.querySelector(".content")
		if(!$ccontent || !$cclose || !$cok) throw new Error('la box #confirm ne contient pas les elements adequats')

		return {
			alert 	: {
				box 		: $alert,
				content 	: $acontent,
				close 		: $aclose
			},
			confirm 	: {
				box 		: $confirm,
				content 	: $ccontent,
				close 		: $cclose,
				ok			: $cok
			}

		}
	}
} 