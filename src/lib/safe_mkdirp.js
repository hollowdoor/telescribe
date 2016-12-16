import mkpath from 'mkpath';

export default function safeMkdirp(dirname){
    return new Promise((resolve, reject)=>{
        mkpath(dirname, (err)=>{
            if(err) return reject(err);
            resolve(dirname);
        });
    });
}
