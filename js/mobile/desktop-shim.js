clik._desktop.eventBus.bind('conference.firstjoin', function () {
	clik._desktop.ui.setStateHidden();
	clik._desktop.sendCommand('unlock');
});

clik._desktop.eventBus.clear('conference.lastleave');
clik._desktop.eventBus.bind('conference.lastleave', function () {
	clik._desktop.stream.close();
	clik._desktop.ui.reportError({
		text    : 'Desktop disconnected',
		overlay : true
	});
});
