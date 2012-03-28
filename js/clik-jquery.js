(function () {
	clik = window.clik || {};
	if (clik.$) {
		return;
	}
	clik.$ = jQuery.noConflict(true);
})();
