/*
	Touch-based click event simulation

	Jairaj Sethi
*/

window.buttonizer = function (button, callback) {
	var pressedClass   = 'pressed',
		pressedCheck   = new RegExp('\\b' + pressedClass + '\\b'),
		touchfail      = false,
		mousedown      = false,
		position       = {};

	function getOffset () {
		var bounds = button.getBoundingClientRect();
		return { top: bounds.top, left: bounds.left };
	}

	function isOrIsChild (elem) {
		do {
			if (elem === button) {
				return true;
			}
		} while ((elem = elem.parentNode));

		return false;
	}

	function activate () {
		mousedown = true;
		button.className += ' ' + pressedClass;
	}

	function deactivate () {
		mousedown = false;
		button.className = button.className.replace(pressedCheck, '');
	}

	function touchstart (e) {
		if ( ! isOrIsChild( e.target ) ) {
			return;
		}

		touchfail = false;
		position = getOffset();
		activate();
	}

	function touchmove (e) {
		if (touchfail || !isOrIsChild( e.target )) {
			return;
		}

		var currPosition = getOffset();

		if ((position.left !== currPosition.left) || (position.top !== currPosition.top)) {
			touchcancel(e);
			return;
		}

		var touch = e.touches[0];

		if ( !touch ) {
			return;
		}

		var elem = document.elementFromPoint(touch.screenX, touch.screenY);

		if (elem === button) {
			activate();
		}
		else {
			deactivate();
		}
	}

	function touchend (e) {
		if (!mousedown || touchfail || !isOrIsChild( e.target )) {
			return;
		}

		deactivate();

		run();

		setTimeout(function () {
			clickLock = false;
		}, 1);
	}

	function touchcancel (e) {
		touchfail = true;
		deactivate();
	}

	function enable () {
		button.addEventListener('touchstart' , touchstart , false);
		button.addEventListener('touchmove'  , touchmove  , false);
		button.addEventListener('touchend'   , touchend   , false);
		button.addEventListener('touchcancel', touchcancel, false);
	}

	function disable () {
		button.removeEventListener('touchstart' , touchstart );
		button.removeEventListener('touchmove'  , touchmove  );
		button.removeEventListener('touchend'   , touchend   );
		button.removeEventListener('touchcancel', touchcancel);
	}

	function run () {
		callback.call(button);
	}

	enable();

	return {
		enable  : enable,
		disable : disable,
		trigger : run
	};
};
