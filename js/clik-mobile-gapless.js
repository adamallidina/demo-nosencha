/*
	Mobile implementation for Clik API
*/

(function (context) {
	var _clientID,
		_conferenceID,
		_participants,
		hadFirstConnect = false;



	// Clik plugin

	clik._mobile.fireEvent = function (eventName, data) {
		data = JSON.parse(data);

		if ((eventName == 'clikIn') && !hadFirstConnect) {
			getClientID();
			getConferenceData();

			hadFirstConnect = true;
			clik._fireEvent('connect');

			clik._ready(function () {
				clik._mobile.invokeFunction('Clik.pageLoaded');
			});
		}

		clik._fireEvent(eventName, data.message);
	};

	clik._mobile.invokeFunction(
		'requestPlugin',
		{
			name: 'Clik',
			eventCallback: 'clik._mobile.fireEvent'
		}
	);


	// Connection

	function getClientID () {
		if (_clientID) {
			return;
		}

		clik._mobile.invokeFunction(
			'Clik.getParticipantId',
			function (status, data) {
				_clientID = data.participantId + '';
			}
		);
	}

	function getConferenceData () {
		if (_conferenceID && _participants) {
			return;
		}

		clik._mobile.invokeFunction(
			'Clik.getConferenceData',
			function (status, data) {
				_conferenceID = data.conferenceId + '';
				_participants = data.participants;
			}
		);
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

	function showDashboard () {
		clik.ready(function () {
			clik._mobile.invokeFunction('Clik.clikScreen');
		});
	}

	function closeClik (shouldPrompt) {
		clik.ready(function () {
			clik._mobile.invokeFunction(
				'Clik.disconnect',
				{ shouldPrompt: !!shouldPrompt }
			);
		});
	}

	function timeDelta () {
		//TODO: MAKE THIS LESS STUBBY
	}



	// Messaging

	function sendMessage (data) {
		clik.ready(function () {
			clik._mobile.invokeFunction(
				'Clik.sendMessage',
				{ message: data }
			);
		});
	}



	// Conference managing

	function conferenceID () {
		return _conferenceID;
	}

	function clientID () {
		return _clientID;
	}

	function clientList () {
		return _participants;
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
		conferenceID  : conferenceID ,
		clientID      : clientID     ,
		clientList    : clientList   ,
		timeDelta     : timeDelta    ,
		showOverlay   : showOverlay  ,
		hideOverlay   : hideOverlay  ,
		clikCodeURL   : clikCodeURL  ,
		showDashboard : showDashboard
	});
})(window);
