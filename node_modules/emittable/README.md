# Emittable
A Function Wrapper with promise-like syntax for callback chaining, using eventEmitters at its core.

## Usage
```
npm install emittable

- OR -

git clone https://github.com/RebelMail/emittable.git
cd emittable
npm install
npm test
```

```javascript

var Emittable = require('emittable');

fs.readFile
	.emit('./package.json')
	.then(msg)
	.catch(function(e){
		throw e;
	});

function msg(msg){console.log(msg.toString())}

```
