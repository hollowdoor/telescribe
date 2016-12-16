'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var glob = _interopDefault(require('glob-promise'));
var isGlob = _interopDefault(require('is-glob'));
var path = _interopDefault(require('path'));
var getNow = _interopDefault(require('performance-now'));
var minimatch = _interopDefault(require('minimatch'));
var mz_fs = require('mz/fs');
var mkpath = _interopDefault(require('mkpath'));

function read(sources){
    let patterns = Object.keys(sources);

    return function transfer(callback){
        let start = getNow();
        return Promise.all(
            patterns.map(pattern=>grab(pattern, callback))
        )
        .then(()=>getNow().toFixed()-start.toFixed())
        .catch(callback);
    };

    function grab(pattern, callback){

        if(!isGlob(pattern)){
            return getFileInfo(pattern, pattern)
            .then(result=>callback(null, [result]));
        }

        return glob(pattern, {matchBase:true}).then(files=>{
            return Promise.all(
                files.map(file=>{
                    return getFileInfo(pattern, file);
                })
            )
            .then(results=>{
                results = results.filter(r=>r.contents !== undefined);
                //callback(null, results.filter(r=>{r.contents !== 'undefined'}))
                return callback(null, results)
            });
        });

        function getFileInfo(pattern, file){
            let result = sources[pattern](file);
            let dirname = path.dirname(file);
            let basename = path.basename(file);
            let parts = dirname.split(path.sep);
            let filename = basename;
            let usePath = '';
            if(parts.length){
                usePath = path.join.apply(null, parts.slice(1));
            }

            return Promise.resolve(result)
            .then(contents=>{
                return {
                    file: path.join(usePath, basename),
                    contents: contents,
                    fileName: basename,
                    dirname: usePath
                };
            });
        }
    }
}

function writeToStream(file, contents){
    let wstream = mz_fs.createWriteStream(file);
    let p = new Promise((resolve, reject)=>{
        wstream.on('finish', ()=>resolve(file));
        wstream.on('error', reject);
    });
    wstream.write(contents);
    wstream.end();
    return p;
}

function resolveWrite(file, contents){
    let type = typeof contents;
    let p = null;

    if(type === 'object'){
        if(typeof contents['then'] === 'function'){
            return contents;
        }else if(typeof contents['pipe'] === 'function'){
            if(typeof contents['on'] === 'function'){
                return new Promise((resolve, reject)=>{
                    contents.on('finish', resolve);
                    contents.on('error', reject);
                });
            }
        }
    }

    return writeToStream(file, contents + '');
}

function safeMkdirp(dirname){
    return new Promise((resolve, reject)=>{
        mkpath(dirname, (err)=>{
            if(err) return reject(err);
            resolve(dirname);
        });
    });
}

function write(transfer, root, dests){
    let patterns = Object.keys(dests);

    return transfer((err, results)=>{


        if(err) return Promise.reject(err);

        let written = results.map(result=>{

            let fullpath = path.join(root, result.dirname);

            return safeMkdirp(fullpath)
            .then(()=>{
                let file = path.join(root, result.file);

                let pattern = patterns.find(p=>{
                    if(!isGlob(p)){
                        return file === p;
                    }
                    return minimatch(file, p);
                });


                if(!pattern){
                    return null;
                }

                let contents = dests[pattern](file, result.contents);

                return resolveWrite(file, contents);
            });

        });

        return Promise.all(written).then(()=>null)
    });
}

exports.read = read;
exports.write = write;
