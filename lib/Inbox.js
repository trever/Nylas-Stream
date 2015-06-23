var Writable = require('stream').Writable,
	util = require('util'),
	request = require('request');

function backoff (current, max, step, _value) {
  return function () {
    if ((_value = current) > max) {
      throw new Error('Exceeded twitter rate limit')
    }
    current = step(current)
    return _value
  }

};

var Inbox = function(regist){
	if (!(this instanceof Inbox)){
		if (!regist) throw new Error("Needs API Params");
		return new Inbox(regist);
	};
	if (!regist || typeof regist != "object" || !regist.appId || !regist.appSecret){
		throw new Error('Needs API Auth Params AppId + AppSecret');
	};
	this.appId = regist.appId;
	this.appSecret = regist.appSecret;
	Writable.call(this, {objectMode:true});
	return this;
};

util.inherits(Inbox, Writable);

Inbox.prototype.backoffs = function () {
  // Network hiccup, try every 250 seconds
  this.networkBackoff = backoff(0, 16 * 1000, function (x) { return x + 250 })
  // Rate limited. Try exponetially starting at 5 seconds
  this.httpBackoff = backoff(5 * 1000, 320 * 1000, function (x) { return x * 2 })
}

Inbox.prototype.subscribe = function(namespace, cursor){
	var evs = ["create", "modify", "delete"];
	var obs = ["message", "thread", "tag", "draft", "file", "calendar", "event", "contact", "filter"];

	var self = this;
	if (!namespace && !self.namespace){
		throw new Error('Namespace Required');
	};

	cursor = cursor || self.cursor;
	namespace = namespace || self.namespace;
	self.namespace = namespace;
	cursor = (cursor && self.emit('cursorAdded'))|| this._makeCursor();
	
	self.once('cursorAdded', function(){
		var streamingURL = 'https://api.nylas.com/n/'+self.namespace+'/delta/streaming?cursor='+self.cursor;
		self._startStream();
		self.emit('ready', {where: 'Stream', event:'Initialized'});
	});
	
};

Inbox.prototype._generateCursor = function(starttime){
	var self = this;
	!self.namespace && throw new Error('Namespace Required');

	starttime = starttime || (new Date().getTime() / 1000);
	self._get('delta/generate_cursor', function(e,b){
		self.cursor = body.cursor; 
	    self.emit('cursorAdded');
	});
};

Inbox.prototype._call = function(method, options, cb){
	var self = this;
	if (options && options.url && options.url.indexOf('://') === -1){
		if (!self.namespace) throw new Error("Namespace Required");
		if (options.url[0] === "/") options.url = options.url.substr(1);
		options.url = 'https://api.nylas.com/n/'+self.namespace+'/'+options.url;
	};
	request[method](options, cb);
};

Inbox.prototype._get = function(url, cb){
	var self = this;
	var opts ={
		url: url
	};
	this._call("get", opts, cb);
};
Inbox.prototype._post = function(url, data, cb){
	var opts ={
		url: url,
		form:data
	};
	this._call("post", opts, cb);
};
Inbox.prototype._startStream = function(){
	var self = this;
	if (!self.cursor) throw new Error('Missing Cursor. Required for Streaming Subscription');
	if (!self.namespace) throw new Error('Missing Namespace. Required for Streaming Subscription');

	var StreamingUrl = 'https://api.nylas.com/n/'+self.namespace+'/delta/streaming?cursor='+self.cursor+'&exclude_types=contact,event,file,tag';

	self._stream("GET", StreamingUrl);	
};
Inbox.prototype._stream = function(method, url){
	var self = this;
	this.stale = false;
	var streamReq = request[method](url);
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
			try{
				return JSON.parse(d);
			} catch(e){};
		});
		this.parser = res.pipe(this.parser, {end:false});
		this.parser.pipe(this);
	}).bind(this));
};

Inbox.prototype.reconnect = function () {
  if (this.stale) {
    if (this.stream) {
      this.abort()
    }
    this._startStream();
  }
}


Inbox.prototype.abort = function () {
  if (this.parser) {
    this.parser.destroy()
  };
  clearTimeout(this.timeout)
  this.stream.abort();
  this.stream = null;
};

Inbox.prototype._write = function (data, encoding, done) {
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

modules.exports = Inbox;