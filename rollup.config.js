var external = Object.keys(require('./package.json').dependencies);
export default {
  entry: 'src/index.js',
  external: external,
  targets: [
    { dest: 'dist/bundle.js', format: 'cjs' },
    { dest: 'dist/bundle.umd.js', format: 'umd', moduleName: 'telescribe' },
    { dest: 'dist/bundle.es.js', format: 'es' }
  ]
};
