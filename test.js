var Nylas = require('./index.js');
require('dotenv').load();

var userSub = Nylas();
var user = userSub.user(process.env.ACCESS_TOKEN);
var sub = user.subscribe();
// console.log(sub);
sub.events({
	'create_thread':function(thread){
		console.log("Thread", thread);
	},
	'create_message':function(message){
		console.log("Message", message);
	}
});
