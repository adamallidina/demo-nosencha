/*
	Desktop implementation of the Clik API.
*/

(function (context) {
	// Initialise Clik desktop object

	clik._desktop = new clik._Clik();



	// Connection

	var hadFirstConnect = false;
	function handleFirstConnect () {
		if (hadFirstConnect) {
			return;
		}
		hadFirstConnect = true;
		clik._fireEvent('connect');
	}
	clik._desktop.eventBus.bind('clikstream.firstopen', function () {
		if ( !clik._desktop.confData.devMode ) {
			handleFirstConnect();
		}
	});
	clik._desktop.eventBus.bind('conference.firstjoin', function () {
		if (clik._desktop.confData.devMode) {
			handleFirstConnect();
		}
	});
	clik._desktop.eventBus.bind('conference.emptyjoin', function () {
		if (clik._desktop.confData.devMode) {
			setTimeout(handleFirstConnect, 200);
		}
	});
	clik._desktop.eventBus.bind('clikstream.error', function () {
		clik._fireEvent('disconnect');
	});
	clik._desktop.eventBus.bind('clikstream.reopen', function () {
		clik._fireEvent('reconnect');
	});
	clik._desktop.eventBus.bind('conference.join', function (params) {
		clik._fireEvent('join', params[0] + '');
	});
	clik._desktop.eventBus.bind('conference.leave', function (params) {
		clik._fireEvent('leave', params[0] + '');
	});

	function isConnected () {
		return !!clik._desktop.stream && clik._desktop.stream.connected;
	}

	function showDashboard () {
		throw 'cannot show dashboard on desktop';
	}

	function closeClik () {
		if (clik._desktop.confData && clik._desktop.confData.showcase && (clik._desktop.confData.showcase != window.location.href)) {
			// Hack to make v196 compatible with new showcase mapping
			if (clik._desktop.confData.showcase === true) {
				window.location.href = 'http://live.betaclik.com/showcase/v196/showcase.html';
			}
			else {
				window.location.href = self.confData.showcase;
			}

			return;
		}

		clik._desktop.qrData = null;
		clik._desktop.ui.setStateLoading();

		if (clik.utils.url.query.conf) {
			window.location.href = clik.utils.url.updateQuery({ conf: '' });
		}

		else if (clik._desktop.stream) {
			clik._desktop.init();
		}
	}

	clik.utils.dom.bind(window, 'beforeunload', function () {
		if ( !clik._desktop.stream ) {
			return;
		}

		clik._desktop.stream.ignoreStreamErrors = true;

		if (clik._desktop.stream.connected && clik.clients.length) {
			clik._desktop.stream.close();
		}
	});



	// Messaging

	function sendMessage (msg) {
		if (clik._desktop.stream) {
			var msgAtom = new clik._Atom(clik._Atom.Types.CONFERENCE_MESSAGE);
			msgAtom.conferenceMessagePayload = { payload: msg };
			clik._desktop.stream.send(msgAtom);
		}

		else {
			clik.log('Sending message before stream is available.');
		}
	}

	clik._desktop.onMessage = function (msg) {
		clik._fireEvent('message', msg);
	};



	// Conference managing

	function showOverlay () {
		if (clik._desktop.stream && (clik.clients.length > 0)) {
			clik._desktop.ui.setStateSharing(10000);
		}

		else {
			clik._desktop.ui.setStateLoaded();
		}
	}

	function hideOverlay () {
		clik._desktop.ui.setStateHidden();
	}

	function qrCodeURL (colour) {
		var showcase = window.CLIK_IS_SHOWCASE ? '&s=1' : '',
			match, clikCodeUrl;

		colour = colour ? colour.replace(/#/g, '') : 'trans';

		match = /^(\w+)\:\/\/([^\/\:]+).*$/g.exec(clik._desktop.qrData);
		if (match && ((match[1] == 'file') || (match[2] == 'localhost') || (match[2] == '127.0.0.1'))) {
			colour = 'dd0000';
		}

		clikCodeUrl = clik.utils.ctrlRoot + 'srv/clikcode/' + colour + '/';
		return clikCodeUrl + encodeURIComponent(clik._desktop.qrData + showcase) + '.png';
	}

	function clientID () {
		return clik._desktop.stream.conf.partId + '';
	}

	function clientList () {
		if (!clik._desktop.stream || !clik._desktop.stream.conf || !clik._desktop.stream.conf.otherParticipants) {
			return [];
		}

		return clik.utils.obj.keys( clik._desktop.stream.conf.otherParticipants );
	}

	function conferenceID () {
		return clik._desktop.stream.conf.confId + '';
	}

	function timeDelta () {
		return clik._desktop.timeDelta;
	}



	// Initialise the implementation
	clik.implement({
		isConnected  : isConnected ,
		close        : closeClik   ,
		sendMessage  : sendMessage ,
		clientID     : clientID    ,
		clientList   : clientList  ,
		conferenceID : conferenceID,
		timeDelta    : timeDelta   ,
		showOverlay  : showOverlay ,
		hideOverlay  : hideOverlay ,
		clikCodeURL  : qrCodeURL   ,
		showDashboard: showDashboard
	});

	clik._desktop.init();
})(window);
