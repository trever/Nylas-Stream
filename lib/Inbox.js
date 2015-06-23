var Writable = require('stream').Writable,
	util = require('util'),
	split = require('split'),
	request = require('request'),
	_ = require('underscore'),
	Random = require('meteor-random');

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;

var Emittable = function(){
	return this;
};
Emittable.prototype.next = function(){
	var self = this;
	process.nextTick(function(){
		var nextFunction = self.functionChain.shift();
		if (nextFunction){
			var args = Array.prototype.slice.call(arguments);
			if (args && args.length > 0){
				self.emit(nextFunction, args);
			} else {
				self.emit(nextFunction);
			};
		} else {
			console.log(this.caller + ": called self.next() but there was nothing left in the function chain. Letting you know and letting it fail silently.");
		};
	});
};

Emittable.prototype._generateCursor = function(starttime){
	var self = this;
	if (!self.namespace){
		throw Error('Namespace Required');
	};

	starttime = starttime || Math.round(new Date().getTime() / 1000);
	self._post('delta/generate_cursor', {start:starttime}, function(e,r,b){
		self.cursor = b.cursor; 
	    self.emit('cursorAdded');
	});
	return self;
};

Emittable.prototype._call = function(method, options, cb){
	var self = this;
	var prefix = 'https://api.nylas.com/n';
	if (options && options.url && options.url.indexOf('://') === -1){
		if (!self.namespace) throw Error("Namespace Required");
		if (options.url[0] === "/") options.url = options.url.substr(1);
		
		if (self.namespace && options.url && options.url != "/"){
			options.url = prefix + '/' +self.namespace+ '/' +options.url;
		} else {
			options.url = prefix;
		};
		
	};
	if (options && !options.url){
		options.url = prefix;
	};
	options.auth = {
		user:self.access_token,
		pass:''
	};
	request[method](options, cb);
};

Emittable.prototype._get = function(url, cb){
	var self = this;
	var opts = (typeof url === "object" && url != null && url != undefined) ? url : {
		url: url
	};
	this._call("get", opts, cb);
};
Emittable.prototype._post = function(url, data, cb){
	var opts ={
		url: url,
		body:data,
		json:true
	};
	this._call("post", opts, cb);
};
Emittable.prototype._startStream = function(){
	var self = this;
	if (!self.cursor) throw Error('Missing Cursor. Required for Streaming Subscription');
	if (!self.namespace) throw Error('Missing Namespace. Required for Streaming Subscription');

	var StreamingUrl = 'https://api.nylas.com/n/'+self.namespace+'/delta/streaming?cursor='+self.cursor+'&exclude_types=contact,event,file,tag';

	self._stream("get", StreamingUrl);	
};
Emittable.prototype._stream = function(method, url){
	var self = this;
	this.stale = false;
	var streamReq = request[method]({
		url: url,
		auth:{
			user:self.access_token,
			pass:''
		}
	});
	streamReq.on('error', (function(err){
		var self = this;
		this.abort();
		this.emit('reconnect', {type: 'network', err: err});
		setTimeout(function(){
			self._startStream();
		}, this.networkBackoff())
	}).bind(this));
	streamReq.on('response', (function(res){
		self.emit('connect');
		this.parser = split(null, function(d){
			try{return JSON.parse(d);
			} catch(e){};
		});
		this.parser = res.pipe(this.parser, {end:false});
		this.parser.pipe(this);
	}).bind(this));
};

Emittable.prototype.reconnect = function () {
  if (this.stale) {
    if (this.stream) {
      this.abort()
    }
    this._startStream();
  }
}


Emittable.prototype.abort = function () {
  if (this.parser) {
    this.parser.destroy()
  };
  clearTimeout(this.timeout)
  this.stream.abort();
  this.stream = null;
};

Emittable.prototype._write = function (data, encoding, done) {
	// This is called internally on the pipe of the stream.
	// So, when a new event is streamed, it's cleaned and piped to this
	// function. Here, we can name our events, decide which event it is
	// and emit an internal event to the class with that evenname. 
	// We'll then take that internal event, call the full object from the 
	// Nylas API and emit an external (listenable) event with the full modified
	// object as the context/argument.

	// This is stolen from the Node.JS core Stream API
	var self = this;
	if (data.object && data.event){
		self.cursor = data.cursor || self.cursor;
		var eventName = data.event + "_" + data.object;
		self.emit(eventName, data.attributes);
	};
	done();
};

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