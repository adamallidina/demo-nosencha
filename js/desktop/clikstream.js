(function () {
	var spamTraffic = true;

	/*
		A socket-ish connection to the conference.
		@param {Object} confData Conference options.
		@param {Clik} clik Clik instance.
	*/
	function ClikStream (confData, clikDesktop) {
		var self = this;

		// How frequently should we ping when waiting for a scan?
		this.INACTIVE_PING_INTERVAL = confData.inactiveInterval || 2000;
		// How frequently should we ping while an app is being used?
		this.ACTIVE_PING_INTERVAL = confData.activeInterval || 5000;

		if (confData.xd) {
			this.httpUrl = 'http://' + confData.server + ':8080/';
		}
		else {
			this.httpUrl = 'http://' + window.location.host + '/conf/' + confData.server.replace(/\..*/,'') + '/';
		}

		this.wsUrl = confData.ws ? ('wss://' + confData.server + '/') : null;

		this.confId = confData.confId;
		this.partId = confData.partId || this.generateParticipantID();
		this.role = 1;
		this.participants = {};
		this.eventBus = new clik._EventBus(clikDesktop.eventBus);
		this.ackEvents = new clik._EventBus();
		this.conf = new clik._Conference(this);
		this.eventBus.bind('conference.firstjoin', function () {
			self.setPingInterval(self.ACTIVE_PING_INTERVAL);
		});
		this.eventBus.bind('conference.lastleave', function () {
			self.setPingInterval(self.INACTIVE_PING_INTERVAL);
		});

		this.buf = {};
		this.connected = false;
		this.stream = null;
		this.streamType = null;
		this.pingInterval = 0;
		this.pingTimer = null;
		this.lastPingSnd = 0;

		this.latency = 100;
		this.lastAtomRcv = +new Date();
		this.errorInterval = 10000;

		this.firstOpen = true;
		this.tries = 0;
		this.ignoreStreamErrors = false;

		this.urlSuffix = '2.1.0-123/json/';
	}

	ClikStream.prototype.generateParticipantID = function () {
		return clik.utils.random.num();

		/* TODO: uncomment when server bugs are gone
		var url    = window.location.href,
			index  = url.lastIndexOf('/'),
			key    = url.substr(0, index + 1) + clik._desktop.clientId,
			hash   = clik.utils.sha(key),
			shrunk = '' + (hash[0] ^ hash[1] ^ hash[2]) + (hash[3] ^ hash[4]);

		return shrunk.substr(0, shrunk.length - 1);
		*/
	};

	ClikStream.prototype.healthCheck = function () {
		var timeSinceAtom = this.getTimeSinceLastAtom(),
			tolerableTime = Math.max(this.pingInterval * 3, this.ACTIVE_PING_INTERVAL);

		if (timeSinceAtom > tolerableTime) {
			clik.log('It\'s been ' + timeSinceAtom + 'ms since my last atom. I can only tolerate ' + tolerableTime);

			// Trigger an error state (unless we're currently displaying one)
			this.setConnected(false);

			if ( !clik._desktop.ui.hasError() ) {
				this.eventBus.trigger('clikstream.error');
			}

			return false;
		}

		return true;
	};

	ClikStream.prototype.retryConnection = function () {
		if (this.firstOpen) {
			this.open();
		}

		else if (this.getTimeSinceLastAtom() > 120000) {
			clik.log('Giving up on conference.');
			clik._desktop.init();
		}

		else {
			this.open();
			this.eventBus.trigger(clik._desktop.ui.hasError() ? 'clikstream.reopen' : 'clikstream.error');
		}
	};

	ClikStream.prototype.getTimeSinceLastAtom = function () {
		return +new Date() - this.lastAtomRcv;
	};



	ClikStream.prototype.setConnected = function (connected) {
		var self = this;

		self.connected = connected;

		if ( !connected ) {
			self.setPingInterval(0);
		}
	};

	ClikStream.prototype.open = function () {
		var self = this,
			// Retry connections if an error is followed by no subsequent close.
			openTime = +new Date(),
			streamLoc;

		this.tries++;

		// Open jQuery stream.

		if (this.streamType === 'ws') {
			// If we're being opened and the type is websocket, we're probably hitting a firewall.
			clik.log('Open with ' + this.getTimeSinceLastAtom());

			if (this.firstOpen) {
				this.streamType = 'http';
				streamLoc = this.httpUrl;
			}

			else {
				clik.log('WS reconnect');
				streamLoc = this.wsUrl;
			}
		}

		else {
			if (this.wsUrl) {
				this.streamType = 'ws';
				streamLoc = this.wsUrl;
			}

			else {
				this.streamType = 'http';
				streamLoc = this.httpUrl;
			}
		}

		streamLoc += this.urlSuffix;

		clik.log('Starting stream to ' + this.confId + '@' + streamLoc);

		this.stream = clik.$.stream(streamLoc, {
			reconnect : this.streamType == 'http',
			enableXDR : true,
			throbber  : { type: 'lazy' },

			openData: {
				'clientId'    : clik._desktop.clientId,
				'participant' : self.partId     ,
				'conference'  : self.confId     ,
				'role'        : self.role
			},

			open: function (event, stream) {
				self.stream = stream;
				self.stream.wasOpened = true;

				clik.log('StreamOpen: ' + stream.id);

				self.setConnected(true);
				self.setPingInterval(self.INACTIVE_PING_INTERVAL);
				self.lastAtomRcv = +new Date();

				self.sendTimeSync();

				if ( self.isWebSocket() ) {
					// long-pollers join by GET params, ws needs to send a bind atom.
					var joinAtom = new clik._Atom(clik._Atom.Types.CONFERENCE_BIND);

					joinAtom.conferenceBindPayload = {
						conferenceId  : self.confId,
						participantId : self.partId,
						role          : self.role
					};

					self.send(joinAtom);
				}

				self.eventBus.trigger('clikstream.open');
			},

			error: function (event, stream) {
				if (self.ignoreStreamErrors) {
					return;
				}

				clik.log('StreamError: ' + stream.id + '.');
				self.setConnected(false);
				self.retryConnection();
			},

			close: function (event, stream) {
				clik.log('StreamClose: ' + stream.id + '.');

				if (self.firstOpen && (self.tries < 2)) {
					self.retryConnection();
					return;
				}

				if (self.connected && self.isWebSocket()) {
					// Any websocket closed without calling ClikStream.close() first is an error
					self.setConnected(false);
					self.eventBus.trigger('clikstream.error', [ 500 ]);
				}

				else if (+new Date() - openTime < 3000) {
					// If the connection died quickly, that's an error.
					self.eventBus.trigger('clikstream.error');
				}

				else if (stream.connected) {
					clik.log('HTTP long poll disconnecting (or bug).');
				}

				else if ( !self.stream.wasOpened ) {
					// Close without a successful open: may also encapsulate some of the cases above...
					self.setConnected(false);
					self.eventBus.trigger('clikstream.error');
				}

				self.eventBus.trigger('clikstream.close');
			},

			message: function (event, stream) {
				if (spamTraffic) {
					clik.log(' in:' + event.data);
				}

				var atom = clik._Atom.fromJson(event.data);

				self.lastAtomRcv = +new Date();

				if (self.firstOpen) {
					self.firstOpen = false;
					self.setPingInterval(self.ACTIVE_PING_INTERVAL);
					self.eventBus.trigger('clikstream.firstopen');
				}

				if (typeof clik._desktop.ui !== 'undefined') {
					clik._desktop.ui.hideError();
				}

				self.onAtom(atom);
			}
		});

		this.stream.wasOpened = false;
	};

	ClikStream.prototype.isWebSocket = function () {
		return this.stream.options.type === 'ws';
	};

	ClikStream.prototype.close = function (opts) {
		this.setPingInterval(0);

		switch (typeof opts) {
			case 'boolean':
				opts = { isAsync: opts };
				break;
			case 'object':
				clik.utils.obj.extend(opts, { isAsync: false });
				break;
			default:
				opts = { isAsync: false };
				break;
		}

		// Send the part, fire the close callback if it exists on completion.
		if (typeof clik._desktop.confData.devMode === 'undefined') {
			var partAtom = new clik._Atom(clik._Atom.Types.CONFERENCE_LEAVE);

			this.send(partAtom, {
				async    : opts.isAsync,
				complete : function () {
					if (typeof opts.complete === 'function') {
						opts.complete();
					}
				}
			});
		}

		if (this.stream !== null) {
			this.firstOpen = true;
			this.setConnected(false);
			this.stream.close();
		}
	};

	ClikStream.prototype.onAtom = function (atom) {
		if (typeof atom.payloadType === 'undefined') {
			return;
		}

		var self = this,
			needsAck = true;

		switch (atom.payloadType) {
			case clik._Atom.Types.ATOM_ACK:
				this.ack( atom.atomId );
				needsAck = false;
				break;

			case clik._Atom.Types.CONFERENCE_JOINED:
				var joinedPayload = atom.conferenceJoinedPayload;
				this.conf.setParticipantList(joinedPayload.participantList, joinedPayload.participantId);
				break;

			case clik._Atom.Types.CONFERENCE_LEFT:
				var leftPayload = atom.conferenceLeftPayload;
				this.conf.setParticipantList(leftPayload.participantList, leftPayload.participantId);
				break;

			case clik._Atom.Types.CONTROL_MESSAGE:
				var command = atom.controlMessagePayload.command,
					params = atom.controlMessagePayload.params;
				params = params ? JSON.parse(params) : {};
				clik._desktop.onCommand(command, params);
				break;

			case clik._Atom.Types.CONFERENCE_MESSAGE:
				var message = atom.conferenceMessagePayload.payload;
				clik.log('Message: ' + message);
				clik._desktop.onMessage(message);
				break;

			case clik._Atom.Types.TIME_SYNC:
				var timeDelta = atom.timeSyncPayload.time2 - atom.timeSyncPayload.time1;
				clik.log('I am ' + Math.abs(timeDelta) + ' ' + (timeDelta > 0 ? 'behind' : 'ahead') + ' the server.');
				this.eventBus.trigger('clik.timesync', [ timeDelta ]);
				break;

			case clik._Atom.Types.CONFERENCE_MIGRATION:
				var server = atom.conferenceMigrationPayload.serverFqdn,
					newConfId = atom.conferenceMigrationPayload.conferenceId;

				clik.log('Migration to ' + server + '@' + newConfId);

				if (this.httpUrl.search(server) !== -1) {
					clik.log('Migration failed: we\'re already there!');
					return;
				}

				this.close();
				this.firstOpen = false;
				this.streamType = null;
				this.httpUrl = this.httpUrl.replace(/\/\/[^\/]+/, '//' + server);
				this.wsUrl = this.wsUrl && this.wsUrl.replace(/\/\/[^\/]+/, '//' + server);

				var baseQr = clik._desktop.qrData.split('?')[0],
					qrQuery = clik.utils.url.parseQuery(clik._desktop.qrData),
					qrHost = qrQuery.h;

				if (qrHost.indexOf('.') === -1) {
					// Short-form QR.
					var qrHostDomain = baseQr.replace(/.*\/\//, '').replace(/\/.*$/, '');
					qrHost += '.' + qrHostDomain;

					// We should should keep the QR short if possible:
					var confHostDomain = qrHost.split('.');
					confHostDomain = confHostDomain.splice(1, confHostDomain.length - 1).join('.');

					if ( new RegExp(confHostDomain + '$').exec(server) ) {
						// We can shorten!
						clik._desktop.qrData = clik.utils.url.updateQuery(clik._desktop.qrData, { h: server.substring(0, server.length - confHostDomain.length - 1) });
					}
					else {
						clik._desktop.qrData = clik.utils.url.updateQuery(clik._desktop.qrData, { h: server });
					}
				}
				else {
					clik._desktop.qrData = clik.utils.url.updateQuery(clik._desktop.qrData, { h: server });
				}

				this.open();

				var oldParticipantList = this.conf.startMigration();

				setTimeout(function () {
					self.conf.stopMigration(oldParticipantList);
				}, 5000);
				break;

			default:
				clik.log('uh... why don\'t i understand this');
				clik.log(atom);
				break;
		}

		if (needsAck) {
			this.send( atom.genAck() );
		}
	};

	/*
		Send an atom.
		@param {Atom} atom Atom to send.
		@param {Object} [options] Optional options for sending.
	*/
	ClikStream.prototype.send = function (atom, options) {
		if (!this.connected && (atom.payloadType !== clik._Atom.Types.CONFERENCE_LEAVE)) {
			clik.log('Dropping atom while not connected.');
			this.healthCheck();
			return;
		}

		if (atom.payloadType != clik._Atom.Types.ATOM_ACK) {
			this.buf[atom.atomId] = { atom: atom, t: +new Date() };
		}

		options = options || {};

		var doSync = ('async' in options) ? !options.async : false;

		this.setPingInterval(this.pingInterval);
		this.healthCheck();

		if (spamTraffic) {
			clik.log('out:' + atom.toJson());
		}

		if ((this.stream.options.type === 'ws') && !doSync) {
			this.stream.send( atom.toJson() );
		}

		else {
			var self = this;

			clik.$.ajax({
				type: 'POST',
				async: !doSync,
				timeout: options.timeout || 5000,
				url: clik.utils.url.withQuery(this.httpUrl + this.urlSuffix, {
					conference: this.confId,
					participant: this.partId,
					clientId: clik._desktop.clientId,
					role: this.role
				}),
				data: atom.toJson(),
				complete: options.complete,
				error: function(jqxhr, textStatus, e) {
					self.healthCheck();
				}
			});
		}
	};

	ClikStream.prototype.ack = function (atomId) {
		var origAtom = this.buf[atomId];

		if (origAtom !== null) {
			delete this.buf[atomId];
			var roundtrip = +new Date() - origAtom.t;
			this.latency = (this.latency + roundtrip) / 2;
		}

		else {
			clik.log('Got atom ' + atomId + ' but didn\'t send it.');
		}

		this.ackEvents.trigger(atomId);
	};

	ClikStream.prototype.setPingInterval = function (pingTime) {
		if (this.pingTimer !== null) {
			clearTimeout(this.pingTimer);
		}

		if (pingTime != this.pingInterval) {
			clik.log('New ping interval: ' + pingTime + ' (was ' + this.pingInterval + ')');
			this.pingInterval = pingTime;
		}

		if (pingTime > 100) {
			var self = this;
			this.pingTimer = setTimeout(function () {
				self.sendPing();
			}, pingTime);
		}
	};

	ClikStream.prototype.sendPing = function (pingTimeout) {
		var pingAtom = new clik._Atom(clik._Atom.Types.PING);
		this.lastPingSnd = +new Date();

		this.send(pingAtom, { timeout: pingTimeout });
	};

	ClikStream.prototype.sendTimeSync = function () {
		var atom = new clik._Atom(clik._Atom.Types.TIME_SYNC);
		atom.payload = { time1: +new Date() };
		this.send(atom);
	};

	clik._ClikStream = ClikStream;
})();
