/**
 * Uninteresting callback container.
 * May have a parent, which will receive events BEFORE listeners bound here.
 */
(function () {
	function EventBus (parent) {
		this.parent = parent;
		this.listeners = {};
	}

	EventBus.prototype.bind = function (evt, fn) {
		var listenerList = this.listeners[evt];

		if ( !listenerList ) {
			listenerList = this.listeners[evt] = [];
		}

		listenerList.push(fn);
	};

	EventBus.prototype.unbind = function (evt, fn) {
		var listenerList = this.listeners[evt];

		if (listenerList) {
			var index = clik.utils.arr.indexOf(listenerList, fn);

			if (index != -1) {
				listenerList.splice(index, 1);
			}
		}
	};

	EventBus.prototype.trigger = function (evt, params) {
		if (this.parent) {
			this.parent.trigger(evt, params);
		}

		var listenerList = this.listeners[evt] || [];

		clik.log('Firing: ' + evt + ' for ' + listenerList.length);

		clik.utils.arr.forEach(listenerList, function (listener) {
			listener(params);
		});
	};

	EventBus.prototype.clear = function (singleEvt) {
		if (singleEvt) {
			this.listeners[singleEvt] = [];
		}

		else {
			for (var evt in this.listeners) {
				this.listeners[evt] = [];
			}
		}
	};

	clik._EventBus = EventBus;
})();
