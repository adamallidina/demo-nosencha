(function (global) {
	/*
		The indivisible unit of communication between parties.
		@class
	*/
	function Atom (payloadType, atomId) {
		this.atomId = atomId || clik.utils.random.num();

		this.payloadType = (typeof payloadType === 'string') ?
			Atom.Types[payloadType] :
			payloadType;
	}

	/*
		Convert this atom to it's JSON form.
		@return {String} Atom in JSON form.
	*/
	Atom.prototype.toJson = function () {
		if (typeof this.payload !== 'undefined') {
			switch (this.payloadType) {
				case Atom.Types.CONFERENCE_BIND:
					this.conferenceBindPayload = this.payload;
					break;

				case Atom.Types.CONFERENCE_JOINED:
					this.conferenceJoinedPayload = this.payload;
					break;

				case Atom.Types.CONFERENCE_LEFT:
					this.conferenceLeftPayload = this.payload;
					break;

				case Atom.Types.CONFERENCE_MESSAGE:
					this.conferenceMessagePayload = this.payload;
					break;

				case Atom.Types.TIME_SYNC:
					this.timeSyncPayload = this.payload;
					break;
			}

			this.payload = undefined;
		}

		var thisStr = JSON.stringify(this);

		if (typeof this.atomId === 'string') {
			thisStr = thisStr.replace(
				/("atomId"\:)(")([\-\w]+)(")/,
				function (match, key, q1, val, q2) {
					return key + val;
				}
			);
		}

		if (this.payloadType === Atom.Types.CONFERENCE_BIND) {
			thisStr = thisStr.replace(
				/("conferenceId"\:)(")([\-\w]+)(")/,
				function (match, key, q1, val, q2) {
					return key + val;
				}
			);
		}

		return thisStr;
	};

	/*
		Generate an atom for ack-ing this atom.
		@return {Atom} Atom for acking this.
	*/
	Atom.prototype.genAck = function () {
		return new Atom(Atom.Types.ATOM_ACK, this.atomId);
	};

	function getParticipantList (atomStr) {
		var match = /\"participantList\"\:\s*\[([^\]]*)\]/.exec(atomStr);

		return (!match || !match[1]) ? [] : clik.utils.arr.map(
			match[1].split(','),
			clik.utils.trim
		);
	}

	/*
		Factory: build an atom from an atom in JSON form.
		@static
		@param {String} atomStr Atom in JSON form.
		@return {Atom} Parsed atom.
	*/
	Atom.fromJson = function (atomStr) {
		var atom = clik.utils.obj.extend(new Atom(), JSON.parse(atomStr));

		// ..and now for the serialization hacks.
		// This is here because int64's dont play nice in JavaScript
		atom.atomId = /\"atomId\":([^,}]+)/.exec(atomStr)[1];

		switch (atom.payloadType) {
			case Atom.Types.CONFERENCE_JOINED:
				var partIdMatch = /\"participantId\":([^,}]+)/.exec(atomStr);

				if (partIdMatch) {
					atom.conferenceJoinedPayload.participantId = clik.utils.trim(partIdMatch[1]);
				}
				else {
					atom.conferenceJoinedPayload.participantId = null;
				}

				atom.conferenceJoinedPayload.participantList = getParticipantList(atomStr);
				break;

			case Atom.Types.CONFERENCE_LEFT:
				atom.conferenceLeftPayload.participantId = atomStr.replace(/.*participantId":/, '').replace(/,.*/, '').replace(/\}.*/, '');
				atom.conferenceLeftPayload.participantList = getParticipantList(atomStr);
				break;

			case Atom.Types.CONFERENCE_MIGRATION:
				atom.conferenceMigrationPayload.conferenceId = atomStr.replace(/.*conferenceId":/, '').replace(/,.*/, '').replace(/\}.*/, '');
				break;
		}

		return atom;
	};

	/*
		Payload types for atoms.
	*/
	Atom.Types = {
		ATOM_ACK            : 0,
		CONFERENCE_BIND     : 1,
		CONFERENCE_JOINED   : 2,
		CONFERENCE_LEAVE    : 3,
		CONFERENCE_LEFT     : 4,
		CONFERENCE_MESSAGE  : 5,
		PING                : 6,
		TIME_SYNC           : 7,
		CONFERENCE_MIGRATION: 8,
		CONTROL_MESSAGE     : 9
	};
	Atom.TypeIndex = clik.utils.obj.inverse(Atom.Types);

	// global.Atom = clik._Atom = Atom;
	clik._Atom = Atom;
})(window);
