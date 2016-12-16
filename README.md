telescribe
======

Install
-------

`npm install --save telescribe`

Globs
-----

Globs are used extensively with `telescribe`.

See the [node-glob](https://github.com/isaacs/node-glob) module for more about globs.

* [Example using rollup](#example-using-rollup)
* [A simpler example](#a-simpler-example)
* [Streams example](#streams-example)
* [How read works](#how-read-works)
* [How write works](#how-write-works)
* [Detailed explanation](#detailed-explanation)
* [Contributing](#contributing)

Example using rollup
--------------------

In this example all file names that match the glob pattern `"testsrc/*.js"` are passed to rollup for transpiling.

The telescribe `read()` function reads the names, and passes them to rollup.

The telescribe `write()` callback gets the results from `read()`. The results are rollup bundles which are used to write to disk.

```javascript
import { read, write } from 'telescribe';
import { rollup } from 'rollup';
import buble from 'rollup-plugin-buble';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

let transfer = read({
    "testsrc/*.js": (filename)=>{
        return rollup({
            entry: filename,
            plugins: [
                buble(),
                nodeResolve({
                    jsnext: true,
                    main: true
                }),
                commonjs()
            ]
        });
    }
});

write(transfer, 'test', {
    "test/*.js": (dest, bundle)=>{
        //dest = The destination file name.
        //bundle = One of the return values from read().
        return bundle.write({
            dest: dest,
            format: 'iife',
            sourceMap: true,
            moduleName: 'none'
        });
    }
}).catch((err)=>console.log(err));
```

A simpler example
-----------------

This example also uses brace expansion.

```javascript
import { read, write } from 'telescribe';
import fs from 'mz/fs';

let transfer = read({
    "src/{*.txt,sub/*.txt}": (filename)=>{
        return fs.readFile(filename, 'utf8');
    }
});

write(transfer, 'dest', {
    "dest/*.txt": (dest, contents)=>{
        //This won't write the files from the sub directory.
        return fs.writeFile(dest, contents);
    }
}).catch((err)=>console.log(err));
```

Streams example
---------------

```javascript
import { read, write } from 'telescribe';
import fs from 'fs';

let transfer = read({
    "src/*.txt": (filename)=>{
        return fs.createReadStream(filename);
    }
});

write(transfer, 'dest', {
    "dest/*.txt": (dest, contents)=>{        
        return contents.pipe(fs.createWriteStream(dest));
    }
}).catch((err)=>console.log(err));
```

How read works
----------------

The `read` function takes an object with any number of methods that have names that are globs. It doesn't actually do any reading. In each method you return a **result**.

For this module we'll call these result returning methods  **reader methods**.

The return value of `read()` is a **transfer** function meant to be consumed by a function, or object that will write the results from the **reader methods**.

```javascript
let transfer = read({
    "src/*.js": (filename)=>{
        //Return a result from this reader method.
    },
    "src/*.css": (filename)=>{
        //Return a result from this reader method.
    }
});
```

### reader method arguments

Reader methods receive one argument which is a file path name.

### reader method result

The reader result should be a promise, node readable stream, or a javascript primitive value. If a method returns undefined this undefined result is skipped without error.

### valid results

Things you can return from a reader that are known to work:

* a promise
* string
* number
* boolean
* node stream
* node buffer

How write works
---------------

`write()` takes three arguments `write(transfer, destination, readerObject)`.

`transfer` is a function returned from `write()`.

`destination` is a directory where you want to write the files under.

`readerObject` is should have your reader methods.

The `write()` function returns a promise that resolves when all writes are complete.

Like the `read()` function `write()` takes an object (`readerObject`) with methods that have globs for names. These can be called **writer methods**.

### **write()**

### Directories

The `write()` function creates what ever directories are needed. It doesn't over write already existing directories. So if you have directories with content already in them those already existing files will remain. You can still explicitely overwrite them in the writer methods.

### writer method arguments

`writers` get two arguments. `dest`, and `contents`.

`dest` is the destination file name created by joining the destination passed to `write()` to all of the file names retreived from `read()`.

`contents` are the return value from the writer methods from `read()`.

```javascript
read(transfer, 'dist', {
    "dist/*.js": (dest, contents)=>{
        //Do something with the contents.
        //Presumably you will write them to dest.
    },
    "dist/*.css": (dest, contents)=>{
        //Do something with the contents.
        //Presumably you will write them to dest.
    }
}).then(duration=>console.log(duration));
```

### valid writer results

You actually don't have to return anything from a writer. If you return a promises from writers then the promise returned by the `read()` function will wait for those promises to resolve. All other values will be resolved immediately.

### The final promise

`read()` returns a promise that resolves to the time taken to do the entire read/write process including promise resolution, and all the calls required to complete that process.

The [performance-now](https://www.npmjs.com/package/performance-now) module is used to produce the duration returned by `read().then()`.


Detailed explanation
--------------------

`read()` is a late executor. It returns a function (transfer) that will do the actual globbing, and reading when it's called.

### Here is the process in detail.

For the purposes of this explanation **transfer** is defined as the function returned by `read()`.

1. Reader methods are passed to `read(readers)`
2. `read(readers)` returns a `transfer()` function
3. Pass these arguments to `write()`.
   1. transfer (returned from `read()`)
   2. dest (destination directory)
   3. readers (object with reader methods)
4. Calling `write(transfer, dest, writers)` starts I/O immediately
   * I/O
     1. `transfer()` is called.
        1. `transfer()` grabs the glob names from the writer methods passed to `write()`
        2. If any file names match those globs then the respective writer method is called
        2. The writer methods return their value
5. Internally `write()` takes the models provided by `transfer()`
   1. creates required sub directories under `dest`,
   2. passes the file names, and contents provided by the models into each writer method,
   3. and the writer methods write if they are defined that way
6. `write()` waits for all I/O to complete
7. `write().then()` resolves to a number representing the duration of I/O, and general process execution


`write()` executes I/O right away. `read()` doesn't actually do much of anything except return a transfer function that actually does the reading, and is meant to be passed to the first argument of `write()`.

### The model in the results returned from `transfer()`

Arrays are returned by `transfer()`. The items in these arrays look like this:

```javascript
{
    file: path.join(dirname, basename),
    contents: contents, //The return value of a reader method.
    fileName: basename,
    dirname: dirname
}
```


Making your own transfer consumer
---------------------------------

You can use the `transfer()` function directly.

Make a function like this (saved as my_writer.js):

```javascript
import fs from 'mz/fs';
import path from 'path';

export default function myWriter(transfer){
    let myFilesAlwaysGoHere = 'favorite_folder';
    return transfer((err, results)=>{
        if(err) return Promise.reject(err);

        let writing = results.map(model=>{
            //You're deciding what you'll accept here.
            let file = path.join(myFilesAlwaysGoHere, model.file);
            return fs.writeFile(file, model.contents);
        });
        //Make sure to return something.
        //Returning a Promise is best.
        //If you don't return something you'll fool the transfer function.
        return Promise.all(writing);
    });
}
```

Use the above like so:

```javascript
import { read } from 'telescribe';
import myWriter from './my_writer.js';
import fs from 'mz/fs';

let transfer = read({
    'just_these/*': (filename)=>{
        return fs.readFile(filename, 'utf8');
    }
});

myWriter(transfer).then(duration=>console.log(duration));
//You can call a write function as many times as you like.
myWriter(transfer).then(duration=>console.log(duration));
```

Contributing
------------

The basic api of `telescribe` is unlikely to change.

There still might be bugs, or maybe you think the README docs can be improved.

Feel free to post a pull request for changes on the README.md file.

If you want to fix bugs in the code base of `telescribe` post an issue before you make a pull request.

For code contributions here are some things you should probably be familiar with before you start:

* rollup (The es2015 module transpiler)
* promises (Really promises are all over inside `telescribe`!)
* glob (Not too big of a requirement)

After you make changes to code run `npm run build` inside the `telescribe` directory.

Run `npm test` to run the test. The test also uses rollup in the I/O methods of the test.

Happy coding!
