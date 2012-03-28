/*
	Mobile implementation for Clik API

	PhoneGap takes care of all the socket-level work.
*/

(function (context) {
	var _clientID,
		_conferenceID,
		_participants,
		_timeDelta,
		deviceIsReady = false,
		hadFirstJoin = false,
		hadFirstConnect = false;



	// iPhone PhoneGap hax
	(function () {
		if ( ! /(iphone|ipod|ipad)/i.test( window.navigator.userAgent ) ) {
			return;
		}

		window.plugins = window.plugins || {};

		var oldSuccessCallback = PhoneGap.callbackSuccess;
		PhoneGap.callbackSuccess = function (callbackId, args) {
			if (args === null) {
				args = {
					status       : 1    ,
					message      : []   ,
					keepCallback : false
				};
			}

			oldSuccessCallback.call(PhoneGap, callbackId, args);
		};
	})();



	function getClientID (checkReady) {
		if (_clientID) {
			if (checkReady) {
				checkIfReady();
			}
			return;
		}

		PhoneGap.exec(function (cID) {
			_clientID = cID + '';
			if (checkReady) {
				checkIfReady();
			}
		}, null, 'Clik', 'getParticipantId', []);
	}

	function getConferenceID (checkReady) {
		if (_conferenceID) {
			if (checkReady) {
				checkIfReady();
			}
			return;
		}

		PhoneGap.exec(function (cID) {
			_conferenceID = cID + '';
			if (checkReady) {
				checkIfReady();
			}
		}, null, 'Clik', 'getConferenceId', []);
	}

	function getParticipants (checkReady) {
		if (_participants) {
			if (checkReady) {
				checkIfReady();
			}
			return;
		}

		PhoneGap.exec(function (participants) {
			_participants = participants;
			if (checkReady) {
				checkIfReady();
			}
		}, null, 'Clik', 'getParticipants', []);
	}

	function getTimeDelta (checkReady) {
		if (_timeDelta) {
			if (checkReady) {
				checkIfReady();
			}
			return;
		}

		PhoneGap.exec(function (timeDelta) {
			_timeDelta = timeDelta;
			if (checkReady) {
				checkIfReady();
			}
		}, null, 'Clik', 'getTimeDelta', []);
	}

	function checkForSocket () {
		setTimeout(function () {
			if (deviceIsReady) {
				getClientID(true);
				getConferenceID(true);
				getParticipants(true);
				getTimeDelta(true);
			}
		}, 100);
	}

	function checkIfReady () {
		if (hadFirstConnect) {
			return;
		}

		if (_clientID && _conferenceID && _participants) {
			hadFirstConnect = true;
			clik._fireEvent('connect');
		}
	}

	document.addEventListener('deviceready', function () {
		PhoneGap.addConstructor(function () {
			PhoneGap.addPlugin('Clik', clik);
		});

		deviceIsReady = true;
		checkForSocket();
	}, false);



	// Connection

	clik.onJoin = function (clientID) {
		if ( !hadFirstJoin ) {
			checkForSocket();
		}

		hadFirstJoin = true;
		clik._fireEvent('join', clientID);
	};
	clik.onPart = function (clientID) {
		clik._fireEvent('leave', clientID);
	};
	clik.onMessage = function (message) {
		clik._fireEvent('message', message);
	};

	function showDashboard () {
		clik.ready(function () {
			PhoneGap.exec(null, null, 'Clik', 'clikScreen', []);
		});
	}

	function closeClik (shouldPrompt) {
		clik.ready(function () {
			PhoneGap.exec(null, null, 'Clik', 'disconnect', [ !!shouldPrompt ]);
		});
	}



	// Messaging

	function sendMessage (data) {
		clik.ready(function () {
			PhoneGap.exec(null, null, 'Clik', 'sendMessage', [ data ]);
		});
	}



	// Conference managing

	function clientID () {
		return _clientID;
	}

	function clientList () {
		return _participants;
	}

	function conferenceID () {
		return _conferenceID;
	}

	function timeDelta () {
		return _timeDelta;
	}

	function showOverlay () {
		throw 'cannot show overlay on mobile';
	}

	function hideOverlay () {
		throw 'cannot hide overlay on mobile';
	}

	function clikCodeURL () {
		throw 'cannot get clik code on mobile';
	}



	// Initialise the implementation
	clik.implement({
		close         : closeClik    ,
		sendMessage   : sendMessage  ,
		clientID      : clientID     ,
		clientList    : clientList   ,
		conferenceID  : conferenceID ,
		timeDelta     : timeDelta    ,
		showOverlay   : showOverlay  ,
		hideOverlay   : hideOverlay  ,
		clikCodeURL   : clikCodeURL  ,
		showDashboard : showDashboard
	});
})(window);
