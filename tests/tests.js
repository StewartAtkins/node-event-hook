var evtTools = require('../');

var events = require('events');

// Verifies that the testEvent1 event is forwarded correctly to the shim
exports.testShimForwarding = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj);
	shim.on("testEvent1", function(magicNo){
		test.equal(magicNo, 42, "Arguments were not propagated correctly");
		test.equal(this, shim, "Incorrect 'this' context in shim mode");
	});
	testObj.emit("testEvent1",42);
	test.done();
};

//As the previous test, but verifies behaviour when forwardEvent is called instead of passing the event name in the pseudo-constructor
//Removed since forwarding doesn't need to be exposed anymore, and therefore isn't
/*
exports.testShimForwardingCall = function(test){
	test.expect(1);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj, []);
	shim.forwardEvent("testEvent1");
	shim.on("testEvent1", function(magicNo){
		test.equal(magicNo, 42, "Arguments were not propagated correctly");
	});
	testObj.emit("testEvent1",42);
	test.done();
};
*/

//Verifies that an event which is not registered will not be forwarded
//Removed since non-forwarding isn't part of the contract anymore
/*exports.testShimNonForwarding = function(test){
	test.expect(0);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj, []);
	shim.on("testEvent1", function(magicNo){
		test.equal(1,2, "Event called when unexpected");
	});
	testObj.emit("testEvent1",42);
	test.done();
};*/

//Verifies that testEvent2 will be dispatched, and with the right argument and to the right handler, but testEvent1 won't
exports.testShimMultiEvent = function(test){
	test.expect(3);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj);
	/*shim.on("testEvent1", function(magicNo){
		test.ok(false, "Unregistered event was forwarded");
	});*/
	shim.on("testEvent2", function(magicNo){
		test.notEqual(magicNo, 42, "Incorrect event was dispatched to registered handler");
		test.equal(magicNo, 43, "Arguments were not propagated correctly, or incorrect event was dispatched");
	});
	testObj.emit("testEvent1",42);
	testObj.emit("testEvent2",43);
	shim.on("testEvent1", function(magicNo){
		test.equal(magicNo, 42, "Incorrect argument");
	});
	testObj.emit("testEvent1",42);
	test.done();
};

// Ensure only the correct event processor is being called on the event and the argument matches up with the processed result
exports.testShimWithProcessor = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj);
	shim.addEventProcessor("testEvent1", function(cb, magicNo){
		test.ok(false, "Incorrect processor was invoked");
		cb(magicNo - 10);
	});
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		test.ok(true, "Correct processor was invoked");
		cb(magicNo + 10);
	});
	shim.on("testEvent2", function(magicNo){
		test.equal(magicNo, 52, "Processed argument was not dispatched");
	});
	testObj.emit("testEvent2",42);
	test.done();
};

//Ensures multiple processors on the same event are run and 
exports.testShimWithMultipleProcessors = function(test){
	test.expect(3);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj);
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		test.ok(true, "Processor 1 was invoked");
		cb(magicNo + 10);
	});
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		test.ok(true, "Processor 2 was invoked");
		cb(magicNo * 2);
	});
	shim.on("testEvent2", function(magicNo){
		test.equal(magicNo, 104, "Processors executed in wrong order");
	});
	testObj.emit("testEvent2",42);
	test.done();
};

//Ensures that if a processor indicates an abort that the event isn't propagated
//Also ensures that a processor which returns neither an abort nor an array will still result in the correct arguments to the next
exports.testShimProcessorAbort = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj);
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		test.ok(true, "Processor 1 was invoked");
		cb();
	});
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		test.equals(magicNo, 42, "Correct argument was dispatched to second processor");
	});
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		test.ok(false, "Event was propagated to next processor");
	});
	shim.on("testEvent2", function(magicNo){
		test.ok(false, "Event was propagated to handler");
	});
	testObj.emit("testEvent2",42);
	test.done();
};

//Ensures when using a processor which emits an event multiple times that:
// 1. the previous processors in the chain aren't affected - this one will fail assertion if called multiple times
// 2. that multiple emissions work, even when async (two sync emissions from second processor with async then tested via setTimeout)
// 3. that subsequent processors are called for each emission (number of assertions tested)
// 4. that the event listener gets called with the correct argument and the correct number of times (number of assertions tested, plus comparison assertion for agument)
exports.testShimProcessorAsyncAndMultiEmit = function(test){
	test.expect(7);
	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj);
	var firstProcessorCalled = false;
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		test.ok(!firstProcessorCalled, "First processor was called more than once");
		firstProcessorCalled = true;
		cb();
	});
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		cb(magicNo);
		cb(magicNo+1);
		setTimeout(function(){ cb(magicNo+2); },10);
	});
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		test.ok(true, "Marker assertion to verify number of subsequent processor calls");
		cb();
	});
	var expectedNumber = 42;
	shim.on("testEvent2", function(magicNo){
		test.equals(magicNo, expectedNumber, "Incorrect argument provided");
		expectedNumber++;
	});
	testObj.emit("testEvent2",42);
	setTimeout(function(){ test.done(); }, 20);
	//test.done();
};

//Verifies that hook causes the object itself to emit the event and the arguments are processed
//Also ensures that 'this' holds the correct value when called

exports.testHook = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventHook(testObj);
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		cb(magicNo + 10);
	});
	testObj.on("testEvent2", function(magicNo){
		test.equal(magicNo, 52, "Incorrect argument was propagated");
		test.equal(this, testObj, "Incorrect 'this' context in hook mode")
	});
	testObj.emit("testEvent2",42);
	test.done();
};


exports.testHookCheck = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	test.ok(!evtTools.IsHooked(testObj), "Hook check returning true incorrectly");
	var shim = evtTools.EventHook(testObj);
	test.ok(evtTools.IsHooked(testObj), "Hook check returning false incorrectly");
	test.done();
};

exports.testShimRetrievabl = function(test){
	test.expect(1);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventHook(testObj);
	test.equal(evtTools.GetShim(testObj), shim, "Hook retrieval returned incorrect value");
	test.done();
};

exports.testHookAsync = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventHook(testObj);
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		cb(magicNo + 10);
	});
	testObj.on("testEvent2", function(magicNo){
		test.equal(magicNo, 52, "Incorrect argument was propagated");
		test.equal(this, testObj, "Incorrect 'this' context in hook mode")
	});
	process.nextTick(function(){
		testObj.emit("testEvent2",42);
		test.done();
	});
};

exports.testHookReapply = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	var origOn = testObj.on;
	var shim = evtTools.EventHook(testObj);
	testObj.on = origOn;
	evtTools.EventHook(testObj);
	shim.addEventProcessor("testEvent2", function(cb, magicNo){
		cb(magicNo + 10);
	});
	testObj.on("testEvent2", function(magicNo){
		test.equal(magicNo, 52, "Incorrect argument was propagated");
		test.equal(this, testObj, "Incorrect 'this' context in hook mode")
	});
	testObj.emit("testEvent2",42);
	test.done();
};
