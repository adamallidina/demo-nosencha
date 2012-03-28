/*
	Create one-time-use interface for Clik API

	This gives us a little more flexibility over
	the prototype model (ie. private variable, etc).
	It is slower on execution, but since it is only
	run once it makes negligible difference.

	Run clik.implement({ functions ... }) to implement
	this. It will fail unless all methods are included
	and will ignore any methods that are not specified
	here.
*/

(function (context) {
	// IE does not know how to search through arrays..
	var indexOf = function () {
		if (Array.prototype.indexOf) {
			return function (arr, item, startIndex) {
				return Array.prototype.indexOf.call(arr, item, startIndex);
			};
		}

		else {
			return function (arr, item, startIndex) {
				for (var i=startIndex || 0, len=arr.length; i<len; i++) {
					if ((i in arr) && (arr[i] === item)) {
						return i;
					}
				}

				return -1;
			};
		}
	}();



	// Client
	function Client (clientID) {
		this.id = clientID + '';
	}

	// Listen for an event from the specific client
	Client.prototype.on = function (eventName, handler) {
		clik.on(eventName, handler, [ this ]);
	};

	// Stop listening for an event from the specific client
	Client.prototype.off = function (eventName, handler) {
		clik.off(eventName, handler, [ this ]);
	};

	// Listen for an event from the specific client once
	Client.prototype.once = function (eventName, handler) {
		clik.once(eventName, handler, [ this ]);
	};

	// Trigger an event on the specific client
	Client.prototype.send = function (eventName, data) {
		clik.send(eventName, data, [ this ]);
	};

	// Run a function on the remote client with optional callback
	Client.prototype.request = function (funcName, args, callback) {
		clik.request(funcName, args, [ this ], callback);
	};



	// clik.request uses this event name to send function calls
	var clik = context.clik = context.clik || {};

	var hadFirstConnection = false,
		initialQueue       = []   ,
		client;



	// List of all private methods to be implemented
	function notImplemented () {
		throw 'not implemented';
	}

	var implementation = {},
		privateMethods = [
			'close'        ,
			'sendMessage'  ,
			'clientID'     ,
			'clientList'   ,
			'conferenceID' ,
			'timeDelta'    ,
			'showOverlay'  ,
			'hideOverlay'  ,
			'clikCodeURL'  ,
			'showDashboard'
		];

	// Initialise empty implementation
	for (var i=0, len=privateMethods.length; i<len; i++) {
		implementation[ privateMethods[i] ] = notImplemented;
	}

	// Create a one-time-use implementation fuction
	clik.implement = function (newImplementation) {
		delete clik.implement;

		for (var i=0, len=privateMethods.length; i<len; i++) {
			if ( !(privateMethods[i] in newImplementation) ) {
				throw 'incomplete implementation, "' + privateMethods[i] + '" is missing';
			}
		}

		implementation = newImplementation;
	};



	// Connection

	// Run when Clik functions are all ready or if already ready
	clik._ready = function (callback) {
		if ( !callback ) {
			return;
		}

		var executed = false;

		function executeCallback () {
			if (executed) {
				return;
			}

			executed = true;

			callback();
		}

		function doScrollCheck () {
			try {
				document.documentElement.doScroll('left');
			}

			catch (err) {
				setTimeout(doScrollCheck, 1);
				return;
			}

			executeCallback();
		}

		if (document.readyState === 'complete') {
			executeCallback();
		}

		if (document.addEventListener) {
			document.addEventListener('DOMContentLoaded', executeCallback, false);
			window.addEventListener('load', executeCallback, false);
		}

		else if (document.attachEvent) {
			document.attachEvent('onreadystatechange', executeCallback);
			window.attachEvent('onload', executeCallback);

			var toplevel = false;
			try {
				toplevel = window.frameElement === null;
			} catch(e) {}

			if (document.documentElement.doScroll && toplevel) {
				doScrollCheck();
			}
		}
	};

	clik.ready = function (callback) {
		clik._ready(function () {
			if ( hadFirstConnection ) {
				callback.call(clik);
			}

			else {
				clik.once('connect', callback);
			}
		});
	};

	// Boolean flag indicating conference connection status
	clik.connected = false;

	clik.showDashboard = function () {
		return implementation.showDashboard();
	};

	// Close the Clik app
	clik.close = function (shouldPrompt) {
		clik._fireEvent('close');
		return implementation.close(shouldPrompt);
	};



	// Event handling

	var CLIK_EVENTS = ['connect', 'disconnect', 'reconnect',
							'join', 'leave', 'message', 'close'],
		eventHandlers = {};

	// Trigger an event using raw string data, preprocessing for clik.trigger
	clik._fireEvent = function (eventName, data) {
		// Insure that event occuring before connect are deferred until later
		if ( ! hadFirstConnection ) {
			// Fire all queue events that were buffered
			if (eventName == 'connect') {
				hadFirstConnection = true;

				clik.once('connect', function () {
					for (var i=0, len=initialQueue.length; i<len; i++) {
						clik._fireEvent(initialQueue[i][0], initialQueue[i][1]);
					}

					initialQueue = false;
				});

				clik._fireEvent(eventName, data);
			}

			// Eat all join events prior to load as if
			// they were already in the conference
			else if (eventName == 'join') {
				clik.clients.add(data);
			}

			// Queue up other event to be fired when ready
			else {
				initialQueue.push([eventName, data]);
			}

			return;
		}

		var self = clik;

		switch (eventName) {
			case 'connect':
				clik.connected = true;
				break;

			case 'disconnect':
				if ( !clik.connected ) {
					return;
				}
				clik.connected = false;
				break;

			case 'reconnect':
				if (clik.connected) {
					return;
				}
				clik.connected = true;
				break;

			case 'message':
				data = JSON.parse(data);

				if (data.recipients &&
						(indexOf(data.recipients, clik.client.id) == -1)) {
					// This message was not meant for you
					return;
				}

				self = clik.clients.get( data.sender );

				if ( !self ) {
					// A client that you do not know about sent you a message
					// This should never happen
					clik.log('message received from unknown sender');
					// return;

					//TODO: hack for Chris
					self = clik.clients.add(data.sender);
				}

				eventName = data.type;
				data = data.data;
				data = clik.transform.trigger('receive', data, true);
				break;

			case 'join':
				self = clik.clients.add(data);
				break;

			case 'leave':
				data += '';
				self = clik.clients.remove(data);

				if (self == clik) {
					clik.log('client who did not exist tried to leave');
				}

				break;

			case 'close':
				clik.connected = false;
				break;
		}

		clik.trigger(eventName, data, self);
	};

	// Attach a handler to listen for an event
	clik.on = function (eventName, handler, senders) {
		if ( !eventHandlers[eventName] ) {
			eventHandlers[eventName] = [];
		}

		eventHandlers[eventName].push([ handler, senders ]);
	};

	// Detach a handler from listening for an event
	//TODO: deal with "once" handlers
	clik.off = function (eventName, handler, senders) {
		if ( eventHandlers[eventName] ) {
			for (var i=0, len=eventHandlers[eventName].length; i<len; i++) {
				if (eventHandlers[eventName][i][0] == handler) {
					if ( !senders ) {
						eventHandlers[eventName].splice(i, 1);
					}

					else if ( eventHandlers[eventName][i][1] ) {
						var oldSenders = eventHandlers[eventName][i][1];

						for (var j=0, jLen=senders.length; j<jLen; j++) {
							var index = indexOf(oldSenders, senders[j]);

							if (index != -1) {
								oldSenders.splice(index, 1);
							}
						}

						if (oldSenders.length === 0) {
							eventHandlers[eventName].splice(i, 1);
						}
					}

					return;
				}
			}
		}
	};

	// Handle an event once (destroy handler after use)
	clik.once = function (eventName, handler, senders) {
		var handlerReference = handler;

		clik.on(eventName, function () {
			handlerReference.apply(this, arguments);
			handlerReference = function () {};
		}, senders);
	};

	// Trigger a local event
	clik.trigger = function (eventName, data, self) {
		self = self || clik;

		if (indexOf(CLIK_EVENTS, eventName) == -1) {
			clik.trigger('message', {
				type: eventName,
				data: data
			}, self);
		}

		if (eventName in eventHandlers) {
			for (var i=0, len=eventHandlers[eventName].length; i<len; i++) {
				var senders = eventHandlers[eventName][i][1];

				if (!senders || (indexOf(senders, self.id) != -1)) {
					eventHandlers[eventName][i][0].call(self, data);
				}
			}
		}
	};



	// Messaging

	// Trigger an event on remote clients
	clik.send = function (eventName, data, recipients) {
		clik.ready(function () {
			var sendData = {
				type  : eventName,
				data  : clik.transform.trigger('send', data),
				sender: clik.client.id
			};

			if (recipients) {
				sendData.recipients = [];

				for (var i=0, len=recipients.length; i<len; i++) {
					sendData.recipients.push( recipients[i].id );
				}
			}

			var stringData = JSON.stringify(sendData);

			implementation.sendMessage(stringData);
		});
	};

	// Request clients to run a function with optional callback
	// Callbacks will be called for each client that responds to the request
	var REQUEST_EVENT_NAME = '__CLIK_REQUEST__';

	clik.request = function (funcName, args, recipients, callback) {
		if (typeof recipients == 'function') {
			callback = recipients;
			recipients = null;
		}

		var instanceID = Math.random() + '';

		clik.on(REQUEST_EVENT_NAME + instanceID, function (response) {
			if (callback) {
				callback.apply(this, response);
			}
		}, recipients);

		clik.send(REQUEST_EVENT_NAME, {
			instanceID: instanceID,
			funcName  : funcName  ,
			args      : args
		}, recipients);
	};

	// Watch for remote function requests
	clik.on(REQUEST_EVENT_NAME, function (data) {
		var requestClient = this,
			func = clik.request[ data.funcName ];

		// Function does not exist
		if ( !func ) {
			return;
		}

		// Prepare a callback for reponse
		data.args.push(function () {
			var args = Array.prototype.slice.call(arguments);
			requestClient.send(REQUEST_EVENT_NAME + data.instanceID, args);
		});

		// Run requested function
		func.apply(requestClient, data.args);
	});



	// Conference managing

	clik.id = null;
	clik.client = null;
	clik.clients = [];

	clik._newConference = function () {
		clik.id = implementation.conferenceID() + '';
		clik.client = new Client( implementation.clientID() );

		var clients = implementation.clientList();
		clik.clients.clear();

		for (var i=0, len=clients.length; i<len; i++) {
			clik.clients.add( clients[i] );
		}
	};
	clik.ready(clik._newConference);

	clik.timeDelta = function () {
		return implementation.timeDelta();
	};

	clik.serverTime = function () {
		return new Date(+new Date() + clik.timeDelta());
	};

	clik.clients.get = function (clientID) {
		clientID = clientID + '';

		for (var i=0, len=clik.clients.length; i<len; i++) {
			if (clik.clients[i].id == clientID) {
				return clik.clients[i];
			}
		}
	};

	clik.clients.add = function (clientID) {
		clientID = clientID + '';

		var client = clik.clients.get(clientID);

		if ( !client ) {
			client = new Client(clientID);
			clik.clients.push(client);
		}

		return client;
	};

	clik.clients.remove = function (clientID) {
		clientID = clientID + '';

		for (var i=0, len=clik.clients.length; i<len; i++) {
			if (clik.clients[i].id == clientID) {
				return clik.clients.splice(i, 1)[0];
			}
		}
	};

	clik.clients.clear = function () {
		this.splice(0);
	};

	clik.overlay = {
		show: function () {
			implementation.showOverlay();
		},
		hide: function () {
			implementation.hideOverlay();
		}
	};

	clik.clikCodeURL = function () {
		return implementation.clikCodeURL();
	};



	// Plugins

	clik.plugin = function (name, func) {
		clik.plugin[name] = func;
	};

	clik.transform = function () {
		var transforms = {};

		function addTransform (name, func) {
			if ( ! transforms[name] ) {
				transforms[name] = [ func ];
			}

			else {
				transforms[name].push(func);
			}
		}


		function removeTransform (name, func) {
			var transformFuncs = transforms[name];

			if (transformFuncs) {
				for (var i=0, len=transformFuncs.length; i<len; i++) {
					if (transformFuncs[i] === func) {
						transformFuncs.splice(i, 1);
						return;
					}
				}
			}
		}

		function triggerTransform (name, data, reversed) {
			var transformFuncs = transforms[name];

			if (transformFuncs) {
				for (var i=0, len=transformFuncs.length; i<len; i++) {
					data = transformFuncs[reversed ? len-i-1 : i](data);
				}
			}

			return data;
		}

		addTransform.remove  = removeTransform;
		addTransform.trigger = triggerTransform;
		return addTransform;
	}();



	// Debugging

	var EVAL_EVENT_NAME = '__CLIK_EVAL__';

	clik.debug = function (str, callback) {
		clik.request(EVAL_EVENT_NAME, [ str ], callback);
	};

	clik.request[EVAL_EVENT_NAME] = function (str, callback) {
		callback( eval(str) );
	};

	clik.debug.assert = function (str, value) {
		clik.debug(str, function (remoteValue) {
			if (value !== remoteValue) {
				throw 'client <'+this.id+'> failed assertion for <'+str+'>: expected <'+value+'>, got <'+remoteValue+'>';
			}
		});
	};

	clik.log = function () {
		var supportsPrinting = !!(window.console && window.console.log),
			logs             = [];

		function logger (level, message) {
			if ( !message ) {
				message = level;
				level = 'log';
			}

			var log = {
				level  : level,
				message: message,
				time   : +new Date()
			};

			logs.push(log);

			if (clik.showLogs) {
				printLogs([ log ]);
			}
		}

		function printLogs (logList) {
			if ( !supportsPrinting ) {
				return;
			}

			var log, time, timeString, milliSeconds;

			for (var i=0, len=logList.length; i<len; i++) {
				log          = logList[i];
				time         = new Date(log.time);
				timeString   = time.toTimeString().split(' ')[0] + ':';
				milliSeconds = time.getMilliseconds();

				if (milliSeconds < 10) {
					timeString += '00' + milliSeconds;
				}
				else if (milliSeconds < 100) {
					timeString += '0' + milliSeconds;
				}
				else {
					timeString += milliSeconds;
				}

				console.log(timeString + ': ' + log.message);
			}
		}

		function getLogs (level) {
			if ( !level ) {
				return logs.slice();
			}

			var logList = [];

			for (var i=0, len=logs.length; i<len; i++) {
				if (logs[i].level === level) {
					logList.push( logs[i] );
				}
			}

			return logList;
		}

		function getRemoteLogs (level, callback) {
			if ( !callback ) {
				callback = level;
				level = null;
			}

			clik.debug(
				'clik.log.get('+JSON.stringify(level)+').slice(-20)',
				callback
			);
		}

		logger.get    = getLogs;
		logger.remote = getRemoteLogs;
		return logger;
	}();
})(window);
