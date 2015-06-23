var Emittable = require('./index.js');
var fs = require('fs');

var xy = function(name, cb){
	// console.log(a);
	cb(null, './package.js');
	return;
};

function msg(msgd, cb){
	// console.log(arguments);
	cb(null, msgd.name);
	// cb(null, JSON.parse(msg).name)
};


// xy.emit('magic')
// 	.then(fs.readFile)
// 	.then(function(file){
// 		console.log(file);
// 	})
// 	.catch(function(e){
// 		throw(e);
// 		console.log('e', e);
// 	});
var q = function(){
	var oode = 'magic'
	this.invite = {
		magic:true
	};
	return this;
};

q.prototype.yes = function(text, cb){
	console.log(this);
	console.log('hello');
	cb(null, 'yes');
}

q.prototype.marvingaye = function(text, cb){
	console.log(text);
	console.log(this.invite);
	cb(null, 'this is logged at three');
};

q.prototype.three = function(text){
	console.log(text);
};

var m = new q;
m.yes.emit('magic').then(m.marvingaye, m).then(m.three);

// xy('magic', function(e,r){
// 	console.log(r);
// });

// fs.readFile.emit('./package.json', 'utf8')
// 	.then(function(name){
// 		console.log(name);
// 	});





