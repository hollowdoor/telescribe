import glob from 'glob-promise';
import isGlob from 'is-glob';
import path from 'path';
import getNow from 'performance-now';

export function read(sources){
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
                results = results.filter(r=>r.contents !== undefined)
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
