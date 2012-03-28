/** Core desktop object.
 */
(function () {
	function Clik () {
		var self = this;

		this.timeDelta = 0;

		this.qrData = null;
		this.qrRendered = null;
		this.stream = null;

		this.eventBus = new clik._EventBus();

		this.confMan = new clik._ConferenceManager(this);
		this.ui = new clik._ClikOverlay(this);

		this.performingSwitch = false;

		// Fetch/set unique identifer
		this.clientId = clik.utils.cookies.get('__clientId');

		if (this.clientId === null) {
			this.clientId = clik.utils.random.UUID();

			clik.utils.cookies.set(
				'__clientId',
				this.clientId,
				{ expires : (365 * 10), path : '/' }
			);
		}

		this.eventBus.bind('confmanager.error', function () {
			self.ui.reportError({
				text        : 'Oops...',
				description : 'Clik may be experiencing technical difficulties.<br/>I\'ll keep trying.',
				timer       : 10000
			});
		});

		this.eventBus.bind('clik.timesync', function (params) {
			self.timeDelta = params[0];
		});

		this.eventBus.bind('conference.lastleave', function () {
			if (self.performingSwitch) {
				return;
			}

			clik.log('Last participant has left, abandoning conference.');

			if (self.confData.showcase && (self.confData.showcase != window.location.href)) {
				window.location.href = self.confData.showcase;
			}

			else {
				clik.overlay.show();
			}
		});

		this.eventBus.bind('clik.unlock', function () {
			clik.overlay.hide();
		});
	}

	Clik.prototype.init = function () {
		var self = this;

		function openStream () {
			self.confMan.getConference(function (confData) {
				self.confData = confData;
				self.qrData = confData.clikCode;

				self.stream = new clik._ClikStream(confData, self);
				clik._newConference();

				self.stream.eventBus.bind('clikstream.firstopen', function () {
					clik.log('First open');

					// This is the same getting an empty join.
					self.eventBus.trigger('conference.emptyjoin');
				});

				self.stream.eventBus.bind('clikstream.open', function () {
					clik.log('The stream has opened. I\'m indifferent.');
				});

				self.stream.eventBus.bind('clikstream.error', function (params) {
					var errTimer = (params && params[0]) || self.stream.errorInterval;

					self.ui.reportError({
						text: 'Could not connect.',
						description: 'Please make sure your Internet connection is working.<br/>I\'ll keep trying.',
						timer: errTimer,
						callback: function () {
							self.stream.retryConnection();
						}
					});
				});

				self.stream.eventBus.bind('clikstream.close', function () {
					clik.log('The stream has closed. I\'m indifferent.');
				});

				self.stream.eventBus.bind('conference.emptyjoin', function () {
					if (self.confData.showcase) {
						// Managed conferences shouldn't show the code (someone should be coming)
						self.eventBus.trigger('clik.unlock');
					}

					else {
						self.ui.setStateLoaded();
					}
				});

				self.stream.open();
			});
		}

		if (self.stream) {
			self.stream.close({ complete: openStream });
		}

		else {
			openStream();
		}
	};

	Clik.prototype.sendCommand = function (command, params) {
		var cmdAtom = new clik._Atom(clik._Atom.Types.CONTROL_MESSAGE);

		cmdAtom.controlMessagePayload = {
			command : command,
			params  : JSON.stringify(params)
		};

		this.stream.send(cmdAtom);

		return cmdAtom.atomId;
	};

	Clik.prototype.onCommand = function (command, params) {
		var self = this;

		if (command === 'unlock') {
			var unlockTime      = params.t || 1,
				localUnlockTime = unlockTime - self.timeDelta - self.stream.latency,
				timeUntilUnlock = localUnlockTime - +new Date(),
				logMsg          = 'That\'s ' + timeUntilUnlock + ' ms from now.';

			clik.log('Requested unlock at ' + unlockTime);

			if (Math.abs(timeUntilUnlock) > 5000) {
				logMsg += ' (too many)';
				timeUntilUnlock = 0;
			}

			clik.log(logMsg);

			setTimeout(function () {
				self.eventBus.trigger('clik.unlock');
			}, timeUntilUnlock);
		}

		else if (command === 'showClikCode') {
			clik.overlay.show();
		}

		else if (command === 'hideClikCode') {
			clik.overlay.hide();
		}

		else if (command === 'selectApp') {
			if (typeof params.url === 'undefined') {
				clik.log('Eating selectApp without a URL.');
				return;
			}

			self.performingSwitch = true;

			self.confMan.getConferenceForApp(params, function (confData) {
				var loadAppAtomId = self.sendCommand('loadApp', {
					sessionData: confData.clikCode,
					name       : params.name
				});

				self.stream.ackEvents.bind(loadAppAtomId, function () {
					clik.log(confData);

					confData.showcase = clik._desktop.confData.showcase || clik.utils.url.updateQuery({ conf: '' });

					window.location.href = clik.utils.url.withQuery(params.url, {
						conf: btoa( JSON.stringify( confData ) ),
						____: '____'
					});
				});
			});
		}
	};

	clik._Clik = Clik;
})();
