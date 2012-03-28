TestCase("AtomTest", {
	testDeserialize_AtomIdIsString : function() {
		var atom = Atom.fromJson('{"atomId":-5810577737355259568, "payloadType": 0}');
		assertEquals("-5810577737355259568", atom.atomId);
		assertEquals(Atom.Types.ATOM_ACK, atom.payloadType);
	},
	/*
		Deserializing join atoms from the server.
	*/
	testDeserializeJoin_WithParticipant : function() {
		var atom = Atom.fromJson('{"atomId":-7399332613120299052,"payloadType":2,"conferenceJoinedPayload":{"participantId":-8859602685991994516,"participantList":[-8859602685991994516]}}');

		var payload = atom.conferenceJoinedPayload;
		assertEquals("-8859602685991994516", payload.participantId);

		var participantList = payload.participantList;
		assertEquals(1, participantList.length);
		assertEquals("-8859602685991994516", participantList[0]);
	},
	testDeserializeJoin_WithParticipants : function() {
		var atom = Atom.fromJson('{"atomId":-7399332613120299052,"payloadType":2,"conferenceJoinedPayload":{"participantId":-8859602685991994516,"participantList":[-8859602685991994516, 2379953152720896]}}');

		var payload = atom.conferenceJoinedPayload;
		assertEquals("-8859602685991994516", payload.participantId);

		var participantList = payload.participantList;
		assertEquals(2, participantList.length);
		assertEquals("-8859602685991994516", participantList[0]);
		assertEquals("2379953152720896", participantList[1]);
	},
	testDeserializeJoin_WithoutParticipant : function() {
		var atom = Atom.fromJson('{"atomId":-5986190320883122604,"payloadType":2,"conferenceJoinedPayload":{}}');

		var payload = atom.conferenceJoinedPayload;
		assertEquals(null, payload.participantId);
		var participantList = payload.participantList;
		assertEquals(0, participantList.length);
	},
	/*
		Deserializing left atoms from the server.
	*/
	testDeserializePart_NoParticipant : function() {
		var atom = Atom.fromJson('{"atomId":-6050106814737578326,"payloadType":4,"conferenceLeftPayload":{"participantId":-5489907010723582113}}');

		var payload = atom.conferenceLeftPayload;
		assertEquals("-5489907010723582113", payload.participantId);
		var participantList = payload.participantList;
		assertEquals(0, participantList.length);
	},
	testDeserializePart_WithParticipant : function() {
		var atom = Atom.fromJson('{"atomId":-7971086450329228406,"payloadType":4,"conferenceLeftPayload":{"participantId":-8007851415711470858,"participantList":[-6322504811295489782]}}');

		var payload = atom.conferenceLeftPayload;
		assertEquals("-8007851415711470858", payload.participantId);
		var participantList = payload.participantList;
		assertEquals(1, participantList.length);
		assertEquals("-6322504811295489782", participantList[0]);
	},
	testDeserializePart_WithParticipants : function() {
		var atom = Atom.fromJson('{"atomId":-7971086450329228406,"payloadType":4,"conferenceLeftPayload":{"participantId":-8007851415711470858,"participantList":[-6322504811295489782,2365027344449536]}}');

		var payload = atom.conferenceLeftPayload;
		assertEquals("-8007851415711470858", payload.participantId);
		var participantList = payload.participantList;
		assertEquals(2, participantList.length);
		assertEquals("-6322504811295489782", participantList[0]);
		assertEquals("2365027344449536", participantList[1]);
	},

	/*
		Deserializing conference migration atoms.
	*/
	testDeserializeConferenceMigration : function() {
		var atom = Atom.fromJson('{"atomId":-5960385285522250303,"payloadType":8,"conferenceMigrationPayload":{"serverFqdn":"c2.betaclik.com","conferenceId":-3013241744449948248}}');

		var payload = atom.conferenceMigrationPayload;
		assertEquals("c2.betaclik.com", payload.serverFqdn);
		assertEquals("-3013241744449948248", payload.conferenceId);
	}
});
