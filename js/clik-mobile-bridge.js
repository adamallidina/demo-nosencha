(function () {
	clik = window.clik || {};

	clik._mobile = clik._mobile || {};

	clik._mobile.callbacks = {};

	clik._mobile.invokeFunction = function (funcName, args, callback) {
		if (typeof args == 'function') {
			callback = args;
			args = null;
		}

		if ( window.AndroidClikNativeBridge ) {
			var response = AndroidClikNativeBridge.invokeFunction(
					funcName,
					JSON.stringify(args || {})
				),
				result = JSON.parse(response);

			if (callback) {
				callback(result.status, result.data);
			}
		}

		else {
			var callbackID = (Math.random() + '').replace('.', ''),
				url = 'http://js_bridge.clikthis.com/' + funcName + '/' + callbackID + '?args=' + encodeURIComponent( JSON.stringify(args || {}) );

			clik._mobile.callbacks[ callbackID ] = function () {
				delete clik._mobile.callbacks[ callbackID ];

				if (callback) {
					callback.apply(this, arguments);
				}
			};

			if (window.external && window.external.notify) {
				window.external.notify(url);
			}

			else {
				var sendIFrameSignal = function () {
					var iframe = document.createElement('iframe');
					iframe.style.display = 'none';
					iframe.src = url;
					document.body.appendChild(iframe);

					setTimeout(function () {
						try {
							document.body.removeChild(iframe);
						} catch (err) {}
					}, 1);
				};

				if (clik.ready) {
					clik.ready(sendIFrameSignal);
				}
				else {
					sendIFrameSignal();
				}
			}
		}
	};

	clik._mobile.pollForJs = function () {
		if ( window.AndroidClikNativeBridge ) {
			for (var js; (js = AndroidClikNativeBridge.poll()+''); eval(js));
		}
	};

	window.addEventListener('keyup', function (e) {
		if (e.which === 0) {
			clik._mobile.pollForJs();
			return false;
		}
	});
})();
