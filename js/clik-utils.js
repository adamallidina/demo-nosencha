(function () {
	clik = window.clik || {};
	if (clik.utils) {
		return;
	}
	clik.utils = {};

	// Functions for dealing with random numbers
	clik.utils.random = {};

	// Randomly generated integer
	clik.utils.random.num = function () {
		return Math.floor((Math.random() * 18014398509481984) - 9007199254740992);
	};

	// Generate a random UUID
	clik.utils.random.UUID = function () {
		var len = 36,
			s = new Array(len),
			itoh = '0123456789abcdef',
			i;

		// Make array of random hex digits. The UUID only has 32 digits in it, but we
		// allocate an extra items to make room for the '-'s we'll be inserting.
		for (i=0; i<len; i++) {
			s[i] = Math.floor(Math.random() * 0x10);
		}

		// Conform to RFC-4122, section 4.4
		s[14] = 4;

		// Set 4 high bits of time_high field to version
		s[19] = (s[19] & 0x3) | 0x8;
		// Specify 2 high bits of clock sequence

		// Convert to hex chars
		for (i=0; i<len; i++) {
			s[i] = itoh[ s[i] ];
		}

		// Insert '-'s
		s[8] = s[13] = s[18] = s[23] = '-';

		return s.join('');
	};

	clik.utils.sha = function () {
		function rotate_left (n,s) {
			return (n << s) | (n >>> (32 - s));
		}

		function Utf8Encode (string) {
			var utftext = '',
				c;

			string = string.replace(/\r\n/g, '\n');

			for (var n=0, len=string.length; n<len; n++) {
				c = string.charCodeAt(n);

				if (c < 128) {
					utftext += String.fromCharCode(c);
				}

				else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}

				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}
			}

			return utftext;
		}

		return function (msg) {
			var i, j,
				W = new Array(80),
				word_array = [],
				H0 = 0x67452301,
				H1 = 0xEFCDAB89,
				H2 = 0x98BADCFE,
				H3 = 0x10325476,
				H4 = 0xC3D2E1F0,
				A, B, C, D, E,
				msg_len,
				temp;

			msg = Utf8Encode(msg);
			msg_len = msg.length;

			for (i=0; i<msg_len-3; i+=4) {
				word_array.push(
					(msg.charCodeAt(i) << 24) |
					(msg.charCodeAt(i+1) << 16) |
					(msg.charCodeAt(i+2) << 8) |
					msg.charCodeAt(i+3)
				);
			}

			switch (msg_len % 4) {
				case 0:
					i = 0x080000000;
					break;
				case 1:
					i = msg.charCodeAt(msg_len-1)<<24 | 0x0800000;
					break;
				case 2:
					i = msg.charCodeAt(msg_len-2)<<24 | msg.charCodeAt(msg_len-1)<<16 | 0x08000;
					break;
				case 3:
					i = msg.charCodeAt(msg_len-3)<<24 | msg.charCodeAt(msg_len-2)<<16 | msg.charCodeAt(msg_len-1)<<8	| 0x80;
					break;
			}

			word_array.push(i);

			while ((word_array.length % 16) != 14) {
				word_array.push(0);
			}

			word_array.push(msg_len >>> 29);
			word_array.push((msg_len << 3) & 0x0ffffffff);

			for (var blockstart=0; blockstart<word_array.length; blockstart+=16) {
				for (i=0; i<16; i++) {
					W[i] = word_array[blockstart+i];
				}

				for (i=16; i<=79; i++) {
					W[i] = rotate_left(W[i-3] ^ W[i-8] ^ W[i-14] ^ W[i-16], 1);
				}

				A = H0;
				B = H1;
				C = H2;
				D = H3;
				E = H4;

				for (i= 0; i<=19; i++) {
					temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
					E = D;
					D = C;
					C = rotate_left(B, 30);
					B = A;
					A = temp;
				}

				for (i=20; i<=39; i++) {
					temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
					E = D;
					D = C;
					C = rotate_left(B, 30);
					B = A;
					A = temp;
				}

				for (i=40; i<=59; i++) {
					temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
					E = D;
					D = C;
					C = rotate_left(B, 30);
					B = A;
					A = temp;
				}

				for (i=60; i<=79; i++) {
					temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
					E = D;
					D = C;
					C = rotate_left(B, 30);
					B = A;
					A = temp;
				}

				H0 = (H0 + A) & 0x0ffffffff;
				H1 = (H1 + B) & 0x0ffffffff;
				H2 = (H2 + C) & 0x0ffffffff;
				H3 = (H3 + D) & 0x0ffffffff;
				H4 = (H4 + E) & 0x0ffffffff;
			}

			return [ H0, H1, H2, H3, H4 ];
		};
	}();

	// Trim strings
	clik.utils.trim = function () {
		var TRIM_REGEX = /^\s+|\s+$/g;

		return function (str) {
			return String(str).replace(TRIM_REGEX, '');
		};
	}();

	// Enumerated object based on given keys
	clik.utils.enumerate = function (arr) {
		if (typeof arr != 'object') {
			arr = arguments;
		}

		var enumed = {};

		for (var i=0, len=arr.length; i<len; i++) {
			enumed[ arr[i] ] = i;
		}

		return enumed;
	};

	// Preload an image
	clik.utils.preloadImage = function () {
		var cache = {};

		return function (url, callback) {
			if ( cache[url] ) {
				if (callback) {
					callback();
				}
				return;
			}

			var img = new Image();

			if (callback) {
				img.onload = callback;
			}

			img.src = url;

			cache[url] = true;
		};
	}();

	// Get and set cookies
	clik.utils.cookies = function () {
		function getCookie (name) {
			var regex = new RegExp('(?:^|; )' + encodeURIComponent(name) + '=([^;]*)'),
				result = regex.exec(document.cookie);

			return result ? decodeURIComponent( result[1] ) : null;
		}

		function setCookie (name, value, options) {
			options = options || {};

			var expires = options.expires;

			if ((value === null) || (value === undefined)) {
				expires = -1;
			}

			if (expires) {
				expires = new Date(+new Date() + expires * 24 * 60 * 60 * 1000);
			}

			document.cookie = [
				encodeURIComponent(name),
				'=',
				encodeURIComponent(value),
				expires ?
					'; expires=' + expires.toUTCString() :
					'',
				options.path ?
					'; path=' + options.path :
					'',
				options.domain ?
					'; domain=' + options.domain :
					'',
				options.secure ?
					'; secure' :
					''
			].join('');
		}

		return {
			get: getCookie,
			set: setCookie
		};
	}();

	// URL related operations
	clik.utils.url = {};

	// Return the url until (and including) the directory, but nothing after
	clik.utils.url.dir = function () {
		var afterDir = /\/[^\/\?]*(\?.*)?$/;

		return function (url) {
			url = url || window.location.href;

			return url.replace(afterDir,'/');
		};
	}();

	// Generate a query string from data
	clik.utils.url.createQuery = function () {
		var encodedSpace = /%20/g;

		return function (data) {
			var queryParts = [];

			for (var key in data) {
				queryParts.push( encodeURIComponent( key ) + '=' + encodeURIComponent( data[key] ) );
			}

			return queryParts.join('&').replace(encodedSpace, '+');
		};
	}();

	// Append the data to the url as a query string
	clik.utils.url.withQuery = function (url, data) {
		if ( !data ) {
			data = url;
			url = window.location.href;
		}

		url = url.split('?')[0];

		return url + '?' + clik.utils.url.createQuery(data);
	};

	// Update the url query string (as opposed to appending)
	clik.utils.url.updateQuery = function (url, newData) {
		if ( !newData ) {
			newData = url;
			url = window.location.href;
		}

		var data = clik.utils.url.parseQuery(url);

		clik.utils.obj.extend(data, newData);

		return clik.utils.url.withQuery(url, data);
	};

	// Gives access to the url query string
	clik.utils.url.parseQuery = function () {
		var re = /([^&=]+)=([^&]+)/g;

		return function (url) {
			url = url || window.location.href;

			var queryString = url.split('?')[1],
				result = {},
				m;

			while ((m = re.exec(queryString))) {
				result[ decodeURIComponent( m[1] ) ] = decodeURIComponent( m[2] );
			}

			return result;
		};
	}();
	clik.utils.url.query = clik.utils.url.parseQuery();

	// Root Clik server
	clik.utils.rootDomain = clik.utils.url.query.env || function () {
		var betaCheck = /(^|\.)betaclik\.com(\:|$)/;

		if ( betaCheck.test( window.location.host ) ) {
			return 'betaclik.com';
		}
		else {
			return 'clikthis.com';
		}
	}();
	clik.utils.ctrlRoot = 'http://ctrl.' + clik.utils.rootDomain + '/';

	clik.utils.jsonp = function (options) {
		var success       = false                                     ,
			emptyFunc     = function () {}                            ,
			unique        = ('' + Math.random()).replace('.', '')     ,
			url           = options.url                               ,
			data          = clik.utils.obj.copy(options.data)         ,
			callback      = options.callback || emptyFunc             ,
			errorCallback = options.error || emptyFunc                ,
			firstScript   = document.getElementsByTagName('script')[0],
			jsonpScript   = document.createElement('script')          ;

		data.callback = 'clik.utils.jsonp.callbacks["'+unique+'"]';

		jsonpScript.type = 'text/javascript';
		jsonpScript.async = true;
		jsonpScript.onerror = errorOccured;
		jsonpScript.src = clik.utils.url.updateQuery(url, data);

		function removeTraces () {
			clik.utils.jsonp.callbacks[ unique ] = emptyFunc;
			try {
				firstScript.parentNode.removeChild(jsonpScript);
			} catch (err) {}
		}

		function errorOccured () {
			if (success) {
				return;
			}

			removeTraces();

			callback = emptyFunc;
			errorCallback();
			errorCallback = emptyFunc;
		}

		clik.utils.jsonp.callbacks[ unique ] = function () {
			success = true;
			removeTraces();
			callback.apply(this, arguments);
		};

		if (options.timeout) {
			setTimeout(errorOccured, options.timeout);
		}

		firstScript.parentNode.insertBefore(jsonpScript, firstScript);
	};
	clik.utils.jsonp.callbacks = {};

	// Array operations
	clik.utils.arr = {};

	// Search through arrays (IE sucks)
	clik.utils.arr.indexOf = function () {
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

	// Iterate through arrays
	clik.utils.arr.forEach = function () {
		if (Array.prototype.forEach) {
			return function (arr, callback, self) {
				Array.prototype.forEach.call(arr, callback, self);
			};
		}

		else {
			return function (arr, callback, self) {
				for (var i=0, len=arr.length; i<len; i++) {
					if (i in arr) {
						callback.call(self, arr[i], i, arr);
					}
				}
			};
		}
	}();

	// Map arrays using transformation function
	clik.utils.arr.map = function () {
		if (Array.prototype.map) {
			return function (arr, callback, self) {
				return Array.prototype.map.call(arr, callback, self);
			};
		}

		else {
			return function (arr, callback, self) {
				var len = arr.length,
					mapArr = new Array(len);

				for (var i=0; i<len; i++) {
					if (i in arr) {
						mapArr[i] = callback.call(self, arr[i], i, arr);
					}
				}

				return mapArr;
			};
		}
	}();

	// Return filtered array based on testing function
	clik.utils.arr.filter = function () {
		if (Array.prototype.filter) {
			return function (arr, func, self) {
				return Array.prototype.filter.call(arr, func, self);
			};
		}

		else {
			return function (arr, func, self) {
				var filterArr = [];

				for (var val, i=0, len=arr.length; i<len; i++) {
					val = arr[i];

					if ((i in arr) && func.call(self, val, i, arr)) {
						filterArr.push(val);
					}
				}

				return filterArr;
			};
		}
	}();

	// Object operations
	clik.utils.obj = {};

	// Extend an object with properties of another object
	clik.utils.obj.extend = function (obj1, obj2) {
		for (var name in obj2) {
			val1 = obj1[name];
			val2 = obj2[name];

			if (val1 !== val2) {
				obj1[name] = val2;
			}
		}

		return obj1;
	};

	// Create a shallow copy of the object
	clik.utils.obj.copy = function (obj) {
		return clik.utils.obj.extend({}, obj);
	};

	// Iterate over the objects key-value pairs
	clik.utils.obj.forEach = function (obj, callback, self) {
		for (var name in obj) {
			callback.call(self, name, obj[name], obj);
		}
	};

	// Reverse keys and values (overwriting duplicate values)
	// Inverted values will be stringified
	clik.utils.obj.inverse = function (obj) {
		var inverse = {};

		for (var name in obj) {
			inverse[ obj[name] ] = name;
		}

		return inverse;
	};

	// List of keys in the object
	clik.utils.obj.keys = Object.keys || function (obj) {
		var keys = [];

		for (var name in obj) {
			keys.push( name );
		}

		return keys;
	};

	// List of values in the object
	clik.utils.obj.values = function (obj) {
		var values = [];

		for (var name in obj) {
			values.push( obj[name] );
		}

		return values;
	};

	clik.utils.obj.has = function (obj, value) {
		for (var name in obj) {
			if (obj[name] === value) {
				return true;
			}
		}

		return false;
	};

	// DOM operations
	clik.utils.dom = {};

	// Select DOM elements by class name
	clik.utils.dom.byClass = function () {
		if (document.getElementsByClassName) {
			return function (className) {
				var elems = document.getElementsByClassName(className);
				return Array.prototype.slice.call(elems);
			};
		}

		else {
			return function (className) {
				var matcher = new RegExp('(\\s|^)' + className + '(\\s|$)'),
					elems   = document.getElementsByTagName('*'),
					arr     = [];

				for (var i=0, l=elems.length; i<l; i++) {
					if ( matcher.test( elems[i].className ) ) {
						arr.push( elems[i] );
					}
				}

				return arr;
			};
		}
	}();

	// Select DOM elements by class name
	clik.utils.dom.remove = function (elems) {
		if (Object.prototype.toString.call(elems) != '[object Array]') {
			elems = [ elems ];
		}

		var elem, parent;

		for (var i=0, l=elems.length; i<l; i++) {
			elem = elems[i];

			if (elem) {
				parent = elem.parentNode;

				if (parent) {
					parent.removeChild(elem);
				}
			}
		}
	};

	// Bind a handler to an event
	clik.utils.dom.bind = function (elem, eventName, handler) {
		if (elem.addEventListener) {
			elem.addEventListener(eventName, handler, false);
		}

		else if (elem.attachEvent) {
			elem.attachEvent('on'+eventName, handler);
		}
	};

	// Window size
	clik.utils.dom.windowSize = function () {
		var width, height;

		if ( !window.innerWidth ) {
			if (document.documentElement.clientWidth !== 0) {
				height = document.documentElement.clientHeight;
				width  = document.documentElement.clientWidth;
			}
			else {
				height = document.body.clientHeight;
				width  = document.body.clientWidth;
			}
		}

		else {
			height = window.innerHeight;
			width  = window.innerWidth;
		}

		return {
			height: height,
			width : width
		};
	};
})();
