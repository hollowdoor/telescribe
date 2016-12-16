import writeToStream from './write_to_stream.js';

export default function resolveWrite(file, contents){
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
