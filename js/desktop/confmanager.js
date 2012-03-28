/*
	Fetches a conference ID.
*/
(function () {
	function ConferenceManager (clikDesktop) {
		this.eventBus = new clik._EventBus(clikDesktop.eventBus);
	}

	ConferenceManager.prototype.getConference = function (cb) {
		var self = this,
			started = false,
			looksManaged = false,
			options = getConferenceOptions();

		if (clik.utils.url.query.conf) {
			looksManaged = true;
			clik.log('Trying to parse conference data.');

			try {
				var confData = JSON.parse( atob(clik.utils.url.query.conf) );

				setConfData(confData);

				confData.ws = options.ws;
				confData.xd = options.xd;

				clik._desktop.eventBus.bind('conference.firstjoin', function () {
					clik._desktop.eventBus.trigger('clik.unlock');
				});

				cb(confData);

				self.eventBus.trigger('confmanager.success');
				started = true;
			}

			catch (err) {
				clik.log('Unable to parse conference data.');
				// No biggie.
			}
		}

		if ( !started ) {
			options.url = clik.utils.url.dir();

			clik._desktop.ui.setStateLoading();

			clik.log('Requesting stream from conference master. Options:' + JSON.stringify(options));

			clik.utils.jsonp({
				url: clik.utils.ctrlRoot + 'srv/v2/conference/jsonp',
				data: options,
				timeout: 5000,
				callback: function (confData) {
					setConfData(confData);

					confData.ws = options.ws;
					confData.xd = options.xd;

					if (looksManaged) {
						// For dev mode: update the address bar so we can find this new conference.
						window.location.href = clik.utils.url.updateQuery({
							conf: btoa( JSON.stringify( confData ) ),
							____: '____'
						});
						return;
					}

					cb(confData);
					self.eventBus.trigger('confmanager.success');
				},
				error: function () {
					self.eventBus.trigger('confmanager.error');
				}
			});
		}
	};

	ConferenceManager.prototype.getConferenceForApp = function (params, cb) {
		clik.utils.jsonp({
			url: clik.utils.ctrlRoot + 'srv/v2/conference/jsonp',
			data: params,
			timeout: 5000,
			callback: cb
		});
	};


	function getConferenceOptions () {
		var options = {};

		if (clik.utils.url.query.xd) {
			options.xd = (clik.utils.url.query.xd === 'true');
			options.xdForce = true;
		}

		else if (navigator.userAgent.indexOf(/firefox\/3/i) !== -1) {
			options.xd = false;
			options.xdForce = true;
		}

		else if (navigator.userAgent.indexOf(/msie [6-9]/i) !== -1) {
			options.xd = false;
			options.xdForce = true;
		}

		else {
			options.xd = (('withCredentials' in (new XMLHttpRequest())) || (typeof XDomainRequest !== 'undefined'));
		}


		if (clik.utils.url.query.ws) {
			options.ws = (clik.utils.url.query.ws === 'true');
			options.wsForce = true;
		}

		else if (window.WebSocket || window.MozWebSocket) {
			options.ws = true;
			if (window.WebSocket && (typeof window.WebSocket.__error !== 'undefined')) {
				options.wsFlash = true;
			}
		}

		return options;
	}

	var setConfData = function () {
		var _lastSet;

		return function (newConfData) {
			try {
				function performSet () {
					var elID   = 'clikConferenceData__so_uniq',
						confEl = document.getElementById(elID);

					if (confEl && (document.body.nodeName != 'INPUT')) {
						confEl.parentNode.removeChild(confEl);
						confEl = null;
					}

					if ( !confEl ) {
						confEl = document.createElement('input');
						confEl.type = 'hidden';
						confEl.id = elID;

						document.body.appendChild(confEl);
					}

					confEl.value = JSON.stringify(newConfData);

					// Fire special event for chrome extension
					var evt = document.createEvent('Event');
					evt.initEvent(elID, false, false);
					document.dispatchEvent(evt);
				}

				_lastSet = performSet;

				window.addEventListener('load', function () {
					if (_lastSet === performSet) {
						performSet();
					}
				}, false);
			}
			catch (err) {}
		};
	}();

	clik._ConferenceManager = ConferenceManager;
})();
