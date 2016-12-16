import minimatch from 'minimatch';
import isGlob from 'is-glob';
import path from 'path';
import resolveWrite from './resolve_write.js';
import mkdirp from './safe_mkdirp.js';

export function write(transfer, root, dests){
    let patterns = Object.keys(dests);

    return transfer((err, results)=>{


        if(err) return Promise.reject(err);

        let written = results.map(result=>{

            let fullpath = path.join(root, result.dirname);

            return mkdirp(fullpath)
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
