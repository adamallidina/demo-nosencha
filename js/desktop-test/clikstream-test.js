// function testClikStream(o) {
// var host = 'c1.betaclik.com';
// var wsUrl = cantWebSocket() ? null : 'ws://' + host + '/';
//
// var baseParams = {
// confId : clik.randomID(),
// httpUrl : 'http://' + host + ":8080/",
// wsUrl : wsUrl
// };
// o = $.extend(baseParams, o);
// return new ClikStream(o, {
// clientId : 'ClikStreamTest',
// appVersion : 0,
// randomID : function() {
// return Math.floor((Math.random() * 18446744073709551614) - 9223372036854775807);
// },
// hasError : function() {
// return false;
// }
// });
//
// }
//
// function cantWebSocket() {
// return navigator.userAgent.search(/MSIE/ !== -1);
// }
//
// AsyncTestCase("ClikStreamTest", {
// testOpen_WebSocket : function(pool) {
// if(cantWebSocket()) {
// // FlashSockets don't seem js test driver friendly...
// return;
// }
//
// var cs = testClikStream();
// expectAsserts(1);
// cs.bind("clikstream.open", pool.add(function() {
// assertTrue(cs.connected);
// }));
// try {
// cs.open();
// } finally {
// cs.close();
// }
//
// },
// // testOpen_Http : function(pool) {
// // var cs = testClikStream({
// // wsUrl : null
// // });
// //
// // expectAsserts(1);
// // cs.bind("clikstream.open", pool.add(function() {
// // assertTrue(cs.connected);
// // }));
// // try {
// // cs.open();
// // } finally {
// // cs.close();
// // }
// // },
//
// // testClose : function(pool) {
// // var cs = testClikStream();
// // pool.call("open the stream", function(callbacks) {
// // cs.bind("clikstream.open", callbacks.add(function() {
// // assertTrue(cs.connected);
// // }));
// //
// // cs.open();
// //
// // });
// //
// // pool.call("close the stream", function(callbacks) {
// // cs.close();
// // });
// // // poo
// // //
// // // expectAsserts(2);
// //
// // },
//
// });

