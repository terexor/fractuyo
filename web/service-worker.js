self.addEventListener("install", (event) => {
	console.log('👷', 'instalar', event)
	self.skipWaiting()
})

self.addEventListener("activate", (event) => {
	console.log('👷', 'activo', event)
	return self.clients.claim()
})

self.addEventListener("fetch", function(event) {
	console.log('👷', 'fetch', event)
	event.respondWith(fetch(event.request))
})
