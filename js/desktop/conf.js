/*
	A conference identifier and list of participants.
*/
(function () {
	function Conference (clikStream) {
		this.confId = clikStream.confId;
		this.partId = clikStream.partId;
		this.otherParticipants = {};
		this.migrating = false;
		this.eventBus = new clik._EventBus( clikStream.eventBus );
	}

	// Begin conference migration: return a clone of the current participant list for merging later.
	Conference.prototype.startMigration = function () {
		this.migrating = true;
		return clik.utils.obj.extend({}, this.otherParticipants);
	};

	// Complete conference migration: fire join/part events based on the delta between the previous participant list and this one.
	Conference.prototype.stopMigration = function (oldParticipants) {
		this.migrating = false;

		var curParticipants = clik.utils.obj.keys( this.otherParticipants );

		this.otherParticipants = oldParticipants;
		this.setParticipantList( curParticipants );
	};

	Conference.prototype.setParticipantList = function (participantList, deltaParticipant) {
		var asMap = {},
			newParticipants = [],
			deadParticipants = [];

		clik.utils.arr.forEach(participantList, function (participantId) {
			asMap[participantId] = {};

			if ( !(participantId in this.otherParticipants) ) {
				this.otherParticipants[ participantId ] = {};
				newParticipants.push( participantId );
			}
		}, this);

		clik.utils.obj.forEach(this.otherParticipants, function (existingParticipant) {
			if ( !( existingParticipant in asMap) ) {
				delete this.otherParticipants[ existingParticipant ];
				deadParticipants.push( existingParticipant );
			}
		}, this);

		// Eat join/leave events while migrating: we'll sync up after things have settled down.
		if (this.migrating) {
			clik.log('The conference is migrating, eating particpant changes.');
		}

		else {
			clik.utils.arr.forEach(newParticipants, function (newParticipant) {
				this.eventBus.trigger(
					'conference.join',
					[ newParticipant, this.otherParticipants ]
				);
			}, this);

			clik.utils.arr.forEach(deadParticipants, function (deadParticipant) {
				this.eventBus.trigger(
					'conference.leave',
					[ deadParticipant, this.otherParticipants ]
				);
			}, this);


			var partCount = clik.utils.obj.keys( this.otherParticipants ).length;

			if (partCount === 0) {
				this.eventBus.trigger(
					deltaParticipant ?
						'conference.lastleave' :
						'conference.emptyjoin'
				);
			}

			else if (partCount == 1) {
				this.eventBus.trigger('conference.firstjoin');
			}
		}
	};

	clik._Conference = Conference;
})();
