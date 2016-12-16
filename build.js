var rollup = require('rollup').rollup;

rollup({
  entry: 'src/index.js'
}).then(bundle=>{
    bundle.write({
        format: 'cjs',
        dest: 'bundle.js'
    });
    bundle.write({
        format: 'es',
        dest: 'bundle.es.js'
    });
});
