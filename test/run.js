"use strict";
const rollup = require('rollup').rollup;
const buble = require('rollup-plugin-buble');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const fs = require('mz/fs');
let telescribe = require('../');
const read = telescribe.read;
const write = telescribe.write;

let transfer = read({
    "testsrc/{*.js,sub/*.js}": (filename)=>{
        console.log('filename ',filename)

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
    },
    "testsrc/*.png": (filename)=>{
        console.log('filename ',filename)
        return fs.readFile(filename);
    }
});

write(transfer, 'test', {
    "test/{*.js,sub/*.js}": (dest, bundle)=>{
        console.log('dest ',dest)
        return bundle.write({
            dest: dest,
            format: 'iife',
            sourceMap: true,
            moduleName: 'none'
        });
    },
    "test/*.png": (dest, contents)=>{
        console.log('dest ',dest)
        return fs.writeFile(dest, contents);
    }
})
.then((time)=>console.log('done ', time))
.catch((err)=>console.log(err));
