var Writable = require('stream').Writable,
	util = require('util');

var Tester = function(){
	if (!(this instanceof Tester)){
		console.log("making instanceof self");
		return new Tester;
	};

	// console.log(this.magic);
	console.log(this.constructor.super_)
	for (var a in this){
		console.log(a);
		if (typeof this[a] === "function"){

			console.log(this[a] instanceof Tester)
		};
	}
	// console.log(Object.getOwnPropertyNames(this));
	return this;
};

// Tester.prototype = Writable.prototype;
// Tester.constructor = Tester;
util.inherits(Tester, Writable);

Tester.prototype.magic = function(){
	return true;
}



var x = Tester();
// for (var o in x){
// 	console.log(o);
// };
// console.log('x', Object.getOwnPropertyNames(x));

