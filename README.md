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

``` javascript
var nylas_stream = require('nylas-stream');

// Instantiate a new instance of Nylas-Stream, or don't. It'll do it for you
var ns = new nylas_stream || nylas_stream();


```

