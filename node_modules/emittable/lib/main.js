var events = require('events');

var Emittable = function(fn){
	return new _emittable(fn);
}

var _emittable = function(fn){
	var _this = this;
	this.eids = [];
	this.token = (Math.random()*100000).toFixed(0);
	var oo = function(/* args */){
		try {
			var args = Array.prototype.slice.call(arguments);
			var callback;
			for (var i = args.length - 1; i >= 0; --i) {
				var arg = args[i];
				if (typeof arg !== "undefined"){
					if (typeof arg === "function"){
						callback = arg;
					};
					break;
				}
			};
			if (!callback){
				callback = function(){
					var yargs = Array.prototype.slice.call(arguments);
					var shifted = yargs.shift();
					if (shifted && shifted != undefined && shifted != null){
						return _this.throw(shifted);
					} else {
						return _this.next.apply(_this, yargs);
					};
				};
				++i;
			};
			args[i] = function(){
				var _args = Array.prototype.slice.call(arguments);
				process.nextTick(function(){
					callback.apply(_this, _args);
				});
			};
			var result = fn.apply(_this, args);
			return _this;
		} catch (e){
			_this.throw(e);
		};
	};
	return oo;
};

_emittable.prototype = new events.EventEmitter();

_emittable.prototype.next = function next(){
	var eid = this.eids.shift();
	var args = Array.prototype.slice.call(arguments);
	args.unshift(eid);
	return this.emit.apply(this, args) && this;
};

_emittable.prototype.then = function then(fn, context){
	context = context || this;
	var od = function(){
		var _this = this;
		var args = Array.prototype.slice.call(arguments);
		if (typeof args[args.length - 1] != "function"){
			args.push(function(e,r){
				if (e){
					_this.throw(e);
				};
				if (r){
					_this.next(r);
				};
			});
		};
		// console.log(args);
		fn.apply(context, args);
	}
	var eid = (Math.random()*100000).toFixed(0);
	this.eids.push(eid);
	return this.once.call(this, eid, od) && this;
};

_emittable.prototype.throw = function alert(){
	var args = Array.prototype.slice.call(arguments);
	// console.log(args);
	args.unshift('error'+this.token);
	return this.emit.apply(this, args) && this;
};

_emittable.prototype.catch = function error(cb){
	return this.on.call(this, 'error'+this.token, cb) && this;
};

_emittable.prototype._addCallback = function addCallback(){
	var _this = this;
	var args = Array.prototype.slice.call(arguments);
	var callback;
	for (var i = args.length - 1; i >= 0; --i) {
		var arg = args[i];
		if (typeof arg !== "undefined"){
			if (typeof arg === "function"){
				callback = arg;
			};
			break;
		}
	};
	if (!callback){
		callback = function(){
			var yargs = Array.prototype.slice.call(arguments);
			var shifted = yargs.shift();
			if (shifted && shifted != undefined && shifted != null){
				return _this.throw(shifted);
			} else {
				return _this.next.apply(_this, yargs);
			};
		};
		++i;
	};
	args[i] = callback;
	return args
};
// _emittable.prototype.done = function done(){
// 	// .then(function(){return this.next()});
// 	return this.next();
// };

Function.prototype.emit = function(){
	var x = Emittable(this);
	var args = Array.prototype.slice.call(arguments);
	return x.apply(x, args);
};


module.exports = Emittable;