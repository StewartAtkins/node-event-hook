var EventEmitter = require('events').EventEmitter;

var self = {};
module.exports = exports = self;

/*
* EventShim provides a proxy object to intercept and process events emitted by an object
* Processors can be registered to modify the event arguments before they're emitted by the proxy
* Only registered events will be emitted, though events do not need to have a processor to be registered
* forwardEvent and addEentProcessor both return the shim itself to allow for chained calls.
*
* Returns the shim object for binding event listeners, and adding processors or additional events
*
* TODO: Allow for removal of event processors
*/

self.EventShim = function(obj, events){
	var ret = new EventEmitter();

	var eventProcessors = {};

	var origOn = obj.on;

	ret.getObject = function(){ return obj; };

	ret.forwardEvent = function(evt){
		origOn.apply(obj, [evt, function(){
			var arglist = [];
			for(var i=0;i<arguments.length;i++){
				arglist.push(arguments[i]);
			}
			var continueProcessing = true;
			if(evt in eventProcessors){
				eventProcessors[evt].forEach(function(func){
					if(!continueProcessing)
						return;
					var newArgList = func.apply(func, arglist);
					if(newArgList instanceof Array)
						arglist = newArgList;
					else if(newArgList === false)
						continueProcessing = false;
				});
			}
			arglist.unshift(evt);
			if(continueProcessing)
				ret.emit.apply(ret, arglist);
		}]);
		return ret;
	};

	ret.addEventProcessor = function(evt, processor){
		if(!(evt in eventProcessors))
			eventProcessors[evt] = [];
		eventProcessors[evt].push(processor);
		return ret;
	};

	events.forEach(function(evt){
		ret.forwardEvent(evt);
	});

	return ret;
};

/* 
* EventHook extends EventShim by also replacing the addEventListener and on methods of the provided object
* As a result the original object itself should emit events that have been processed by the shim
*
* Returns the event shim for adding of processors or future event forwards
*/

self.EventHook = function(obj, events){
	var ret = self.EventShim(obj, events);
	obj.on = obj.addEventListener = function(){
		for(var i=0;i<arguments.length;i++){
			if(arguments[i] instanceof Function){
				arguments[i] = arguments[i].bind(obj);
			}
		}
		ret.on.apply(ret, arguments);
	};
	obj.__eventHookShim = ret;
	return ret;
};

/*
* Returns true if object has been hooked, false otherwise
*/
self.IsHooked = function(obj){
	return ("__eventHookShim" in obj);
};