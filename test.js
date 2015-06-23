var Nylas = require('./index.js');
require('dotenv').load();

var userSub = Nylas().user(process.env.ACCESS_TOKEN).subscribe();

userSub.events({
	'create_thread':function(thread){
		console.log("Thread", thread);
	},
	'create_message':function(message){
		console.log("Message", message);
	}
});
