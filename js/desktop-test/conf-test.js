function testConference() {
	return new Conference("123", "321");
}

TestCase("ConferenceTest", {
	testConstruction : function() {
		var conf = testConference();
		assertEquals(0, conf.getParticipantCount());
	},
	testSetParticipantList_OneJoin : function() {
		var conf = testConference();

		var joinCount = 0;
		conf.bind("conference.join", function() {
			joinCount++;
		});

		conf.setParticipantList(['123']);
		assertEquals(1, joinCount);
		assertEquals(1, conf.getParticipantCount());
	},
	testSetParticipantList_OneLeave : function() {
		var conf = testConference();

		var leaveCount = 0;
		conf.bind("conference.leave", function() {
			leaveCount++;
		});

		conf.setParticipantList(['123', '321']);
		conf.setParticipantList(['123']);
		assertEquals(1, leaveCount);
		assertEquals(1, conf.getParticipantCount());
	},
	testSetParticipantList_Swaperoo : function() {
		var conf = testConference();

		var joinCount = 0;
		conf.bind("conference.join", function() {
			joinCount++;
			assertEquals(1, conf.getParticipantCount());
		});
		var leaveCount = 0;
		conf.bind("conference.leave", function() {
			leaveCount++;
			assertEquals(1, conf.getParticipantCount());
		});

		conf.setParticipantList(['123']);
		conf.setParticipantList(['321']);
		assertEquals(2, joinCount);
		assertEquals(1, leaveCount);
		assertEquals(1, conf.getParticipantCount());
	}
});
