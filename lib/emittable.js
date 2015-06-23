var request = require('request'),
	split = require('split');

var Emittable = function(){
	return this;
};
Emittable.prototype.next = function(){
	var self = this;
	var args = Array.prototype.slice.call(arguments);
	process.nextTick(function(){
		var nextFunction = self.functionChain.shift();
		if (nextFunction){
			if (args && args.length > 0){
				self.emit(nextFunction, args);
			} else {
				self.emit(nextFunction);
			};
		} else {
			if (args && typeof args[args.length-1] === "function"){
				args[args.length-1](null, args[0]);
			} else {
				console.log(this.caller + ": called self.next() but there was nothing left in the function chain. Letting you know and letting it fail silently.");
			};
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

module.exports = Emittable;