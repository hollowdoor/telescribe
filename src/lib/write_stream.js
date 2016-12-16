import { createWriteStream } from 'mz/fs';

export default function writeStream(file, contents){
    let wstream = createWriteStream(file);
    let p = new Promise((resolve, reject)=>{
        wstream.on('finish', ()=>resolve(file));
        wstream.on('error', reject);
    });
    wstream.write(contents);
    wstream.end();
    return p;
}
