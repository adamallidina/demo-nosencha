/*
	Check whether to load the desktop shim or proceed with mobile code
*/

if ( ! /(ipod|ipad|iphone|android)/i.test(navigator.userAgent) ) {
	document.write('<'+'script type="text/javascript" src="http://cdn.clikthis.com/js/latest/clik-mobile.desktop.min.js"></'+'script>');
	throw 'blocking mobile Clik, using Chrome extension instead';
}
