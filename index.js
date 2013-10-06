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

self.EventShim = function(obj){
	var ret = new EventEmitter();

	var eventProcessors = {};
	var registeredEvents = [];


	var origOn = obj.on;
	var origRemoveAll = obj.removeAllListeners;
	ret.getObject = function(){ return obj; };

	var executeProcessor = function(evt, arglist, pid){
		var newArgList = [null];
		for(var i=0;i<arglist.length;i++){
			newArgList.push(arglist[i]);
		}
		if(!(evt in eventProcessors) || pid >= eventProcessors[evt].length){
			newArgList[0] = evt;
			ret.emit.apply(ret, newArgList);
		}else{
			var func = eventProcessors[evt][pid];
			newArgList[0] = function(){
				var newArgs = arguments;
				if(!arguments.length)
					newArgs = arglist;
				executeProcessor(evt, newArgs, pid+1);
			};
			func.apply(func, newArgList);
		}
	};

	var forwardEvent = function(evt){
		if(registeredEvents.indexOf(evt) < 0){
			origOn.apply(obj, [evt, function(){
				executeProcessor(evt, arguments, 0);
			}]);
			registeredEvents.push(evt);
		}
		return ret;
	};

	var oldOn = ret.on;
	ret.on = ret.addEventListener = function(){
		forwardEvent(arguments[0]);
		return oldOn.apply(ret, arguments);
	};

	ret.addEventProcessor = function(evt, processor){
		if(!(evt in eventProcessors))
			eventProcessors[evt] = [];
		eventProcessors[evt].push(processor);
		return ret;
	};

	return ret;
};

/* 
* EventHook extends EventShim by also replacing the addEventListener and on methods of the provided object
* As a result the original object itself should emit events that have been processed by the shim
*
* Returns the event shim for adding of processors or future event forwards
*/

//TODO: apply this to all eventEmitter methods in target object
self.EventHook = function(obj){
	var ret = self.EventShim(obj);
	Object.keys(EventEmitter.prototype).forEach(function(funcName){
		if(funcName.toLowerCase() == "emit") //Don't hook emit otherwise what the hell are we doing here...
			return;
		obj[funcName] = function(){
			for(var i=0;i<arguments.length;i++){
				if(arguments[i] instanceof Function){
					arguments[i] = arguments[i].bind(obj);
				}
			}
			return ret[funcName].apply(ret, arguments);
		}
	});
	obj.__eventHookShim = ret;
	return ret;
};

/*
* Returns true if object has been hooked, false otherwise
*/
self.IsHooked = function(obj){
	return typeof(self.GetShim(obj)) != "undefined";
};

/*
* Returns the shim object, null otherwise
*/
self.GetShim = function(obj){
	if("__eventHookShim" in obj)
		return obj.__eventHookShim;
};