var evtTools = require('../');

var events = require('events');

// Verifies that the testEvent1 event is forwarded correctly to the shim
exports.testShimForwarding = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj, ["testEvent1"]);
	shim.on("testEvent1", function(magicNo){
		test.equal(magicNo, 42, "Arguments were not propagated correctly");
		test.equal(this, shim, "Incorrect 'this' context in shim mode");
	});
	testObj.emit("testEvent1",42);
	test.done();
};

//As the previous test, but verifies behaviour when forwardEvent is called instead of passing the event name in the pseudo-constructor
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

//Verifies that an event which is not registered will not be forwarded
exports.testShimNonForwarding = function(test){
	test.expect(0);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj, []);
	shim.on("testEvent1", function(magicNo){
		test.equal(1,2, "Event called when unexpected");
	});
	testObj.emit("testEvent1",42);
	test.done();
};

//Verifies that testEvent2 will be dispatched, and with the right argument and to the right handler, but testEvent1 won't
exports.testShimMultiEvent = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj, ["testEvent2"]);
	shim.on("testEvent1", function(magicNo){
		test.ok(false, "Unregistered event was forwarded");
	});
	shim.on("testEvent2", function(magicNo){
		test.notEqual(magicNo, 42, "Incorrect event was dispatched to registered handler");
		test.equal(magicNo, 43, "Arguments were not propagated correctly, or incorrect event was dispatched");
	});
	testObj.emit("testEvent1",42);
	testObj.emit("testEvent2",43);
	test.done();
};

// Ensure only the correct event processor is being called on the event and the argument matches up with the processed result
exports.testShimWithProcessor = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventShim(testObj, ["testEvent2"]);
	shim.addEventProcessor("testEvent1", function(magicNo){
		test.ok(false, "Incorrect processor was invoked");
		return [magicNo - 10];
	});
	shim.addEventProcessor("testEvent2", function(magicNo){
		test.ok(true, "Correct processor was invoked");
		return [magicNo + 10];
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
	var shim = evtTools.EventShim(testObj, ["testEvent2"]);
	shim.addEventProcessor("testEvent2", function(magicNo){
		test.ok(true, "Processor 1 was invoked");
		return [magicNo + 10];
	});
	shim.addEventProcessor("testEvent2", function(magicNo){
		test.ok(true, "Processor 2 was invoked");
		return [magicNo * 2];
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
	var shim = evtTools.EventShim(testObj, ["testEvent2"]);
	shim.addEventProcessor("testEvent2", function(magicNo){
		test.ok(true, "Processor 1 was invoked");
	});
	shim.addEventProcessor("testEvent2", function(magicNo){
		test.equals(magicNo, 42, "Correct argument was dispatched to second processor");
		return false;
	});
	shim.addEventProcessor("testEvent2", function(magicNo){
		test.ok(false, "Event was propagated to next processor");
	});
	shim.on("testEvent2", function(magicNo){
		test.ok(false, "Event was propagated to handler");
	});
	testObj.emit("testEvent2",42);
	test.done();
};

//Verifies that hook causes the object itself to emit the event and the arguments are processed
//Also ensures that 'this' holds the correct value when called

exports.testHook = function(test){
	test.expect(2);

	var testObj = new events.EventEmitter();
	var shim = evtTools.EventHook(testObj, ["testEvent2"]);
	shim.addEventProcessor("testEvent2", function(magicNo){
		return [magicNo + 10];
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
	var shim = evtTools.EventHook(testObj, []);
	test.ok(evtTools.IsHooked(testObj), "Hook check returning false incorrectly");
	test.done();
}