## Nylas-Stream

A simple wrapper around the [Nylas Delta API](https://nylas.com/docs/api#deltas). Uses Node’s EventEmitter API to expose the different messages the delta endpoint spits out. Uses some of the concepts in [Emittable](https://github.com/trever/emittable) and [Node-Tweet-Stream](https://github.com/SpiderStrategies/node-tweet-stream) behind the scenes to make the wrapper seamless without relying on Promises or Callbacks.

## Installation

``` javascript
---------------
git clone https://github.com/trever/nylas-stream
cd nylas-stream
npm install
node test.js

--------------
npm install nylas-stream

var nylas_stream = require('nylas-stream');
var user = nylas_stream().user( < ACCESS_TOKEN > [, < NAMESPACE > ]);                                          
var sub = user.subscribe([ < CURSOR >]);
sub.events({
	'create_message':function(message){
    	console.log('Message: ', message);                              
	}
});
```



## Usage

See above! More to come.

### Methods

###### `Nylas_Stream.user(access_token [, namespace, callback])`

###### `user.subscribe([cursor, events])`



###### `user.events(eventMap)`



###### `user.event(eventName, eventCallback)`

