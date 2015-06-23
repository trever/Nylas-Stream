var J = function(){
	this.mary = 'proud';
	return this;
};

J.prototype.whatIsMary = function(){
	return console.log(this.mary)
};

var j = new J;
j.whatIsMary();