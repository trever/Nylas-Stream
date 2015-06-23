var Writable = require('stream').Writable,
	util = require('util'),
	split = require('split'),
	_ = require('underscore'),
	Random = require('meteor-random'),
	Emittable = require('./emittable.js');

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;


function getParamNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
  if(result === null)
     result = [];
  return result;
}



function backoff (current, max, step, _value) {
  return function () {
    if ((_value = current) > max) {
      throw Error('Exceeded twitter rate limit')
    }
    current = step(current)
    return _value
  }

};

var NStream = function(regist){
	if (!(this instanceof NStream)){
		return new NStream(regist);
	};
	this.functionChain = [];
	wrapPrototype.call(this, NStream.prototype);
	_.extend(NStream.prototype, Emittable.prototype);
	Writable.call(this, {objectMode:true});
	var self = this;
	self.next();
	return this;
};

util.inherits(NStream, Writable);

function wrapPrototype(ob){
	var self = this;
	if (ob && typeof ob === "object"){
		var keys = Object.keys(ob);
		for (var index in keys){
			var key = keys[index];
			if (typeof ob[key] === "function"){
				var fnWrapper = function(){
					var self = this.this;
					var key = this.key;
					var oldFn = ob[key];
					var args = Array.prototype.slice.call(arguments);
					var lastArg = args[args.length-1];
					if (typeof lastArg === "function"){
						var backupCallback = lastArg;
						var newCB = function(e,r){
							if (e){
								self.throw(e);
							} else {
								self.next(r, backupCallback);
							};
						}.bind(self);
						args[args.length-1] = newCB;
					};
					// Give me a name
					var id = Random.id() + "_"+ key;

					// Push my ID to the master
					self.functionChain.push(id);

					// Create listener for my ID;
					self.once(id, function(){
						var _newArgs = Array.prototype.slice.call(arguments);
						var finalArgs = (_newArgs.length > 0) ? args.concat(_newArgs) : args;
						oldFn.apply(self, finalArgs);
					});
					
					return self;
				};

				self[key] = fnWrapper.bind({this: self, key: key});
			};
		};

		return
	}
}

NStream.prototype.user = function(access_token, namespace, cb){
	var self = this;
	if (!access_token) throw Error("Requires Access Token");
	this.access_token = access_token;
	if (!namespace){
		// Get Namespace using Access Token
		this._get(null, function(e,r,b){
			var parsedB = JSON.parse(b);
			if (!e){
				if (parsedB && parsedB[0] && parsedB[0].namespace_id){
					self.namespace = parsedB[0].namespace_id;
					// We have a namespace
					self.next();
				} else {
					throw Error("Error Retreiving Namespace", {body: b, res: r});
				}
			} else {
				throw Error("Error Retreiving Namespace", e);
			};
		})
	} else {
		self.namespace = namespace;
		self.next();
	};
	return this;
}


NStream.prototype.backoffs = function () {
  // Network hiccup, try every 250 seconds
  this.networkBackoff = backoff(0, 16 * 1000, function (x) { return x + 250 })
  // Rate limited. Try exponetially starting at 5 seconds
  this.httpBackoff = backoff(5 * 1000, 320 * 1000, function (x) { return x * 2 })
}

NStream.prototype.subscribe = function(namespace, cursor){
	var evs = ["create", "modify", "delete"];
	var obs = ["message", "thread", "tag", "draft", "file", "calendar", "event", "contact", "filter"];

	var self = this;
	if (!namespace && !self.namespace){
		throw Error('Namespace Required');
	};

	cursor = cursor || self.cursor;
	namespace = namespace || self.namespace;
	self.namespace = namespace;
	cursor = cursor ? self.emit('cursorAdded') : this._generateCursor();
	self.once('cursorAdded', function(){
		var streamingURL = 'https://api.nylas.com/n/'+self.namespace+'/delta/streaming?cursor='+self.cursor;
		self._startStream();
		self.next();
	});
	
	return this;
};

NStream.prototype.events = function(eventsObj, cb){
	var self = this;
	if (typeof eventsObj === "object"){
		var keys = Object.keys(eventsObj);
		for (var index in keys){
			var key = keys[index];
			self.on(key, eventsObj[key]);
		};
	} else if (typeof eventsObj === "string"){
		if (!cb){
			throw Error("Need a Callback for Each Event");
		};
		self.on(eventsObj, cb);
	} else {
		throw Error('Must be an object of event,callback pairs or an event and callback pair of arguments')
	};
};



module.exports = NStream;