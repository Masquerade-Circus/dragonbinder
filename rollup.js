let rollup = require('rollup');
let commonjs = require('rollup-plugin-commonjs');
let nodeResolve = require('rollup-plugin-node-resolve');
let includepaths = require('rollup-plugin-includepaths');
let filesize = require('rollup-plugin-filesize');
let progress = require('rollup-plugin-progress');
let buble = require('rollup-plugin-buble');
let sourcemaps = require('rollup-plugin-sourcemaps');
let { terser } = require('rollup-plugin-terser');

let inputOptions = {
  input: './lib/index.js',
  plugins: [
    progress({ clearLine: false }),
    includepaths({ paths: ['./lib', './node_modules'] }),
    nodeResolve({
      jsnext: true,
      main: true,
      browser: true
    }),
    commonjs({
      include: ['./node_modules/**'], // Default: undefined
      // if false then skip sourceMap generation for CommonJS modules
      sourceMap: true // Default: true
    }),
    sourcemaps(),
    filesize(),
    buble({ target: { chrome: 70, firefox: 60, safari: 10, node: 8 } }),
    terser({ warnings: 'verbose', compress: {passes: 1} })
  ],
  cache: undefined
};

let outputOptions = {
  file: './dist/dragonbinder.min.js',
  format: 'iife',
  sourcemap: true,
  compact: true,
  name: 'Store'
};

if (process.env.NODE_ENV === 'production') {
  rollup
    .rollup(inputOptions)
    .then((bundle) => bundle.write(outputOptions))
    .then(() => console.log('Bundle finished.'));
}

if (process.env.NODE_ENV !== 'production') {
  inputOptions.output = outputOptions;
  inputOptions.watch = {
    include: ['./lib/**'],
    chokidar: false
  };

  const watch = rollup.watch(inputOptions);
  const stderr = console.error.bind(console);

  watch.on('event', (event) => {
    switch (event.code) {
      case 'START':
        stderr('checking rollup-watch version...');
        break;
      case 'BUNDLE_START':
        stderr(`bundling ${outputOptions.file}...`);
        break;
      case 'BUNDLE_END':
        stderr(`${outputOptions.file} bundled in ${event.duration}ms.`);
        break;
      case 'ERROR':
        stderr(`error: ${event.error}`);
        break;
      case 'FATAL':
        stderr(`error: ${event.error}`);
        break;
      case 'END':
        stderr(`Watching for changes...`);
        break;
      default:
        stderr(`unknown event: ${event}`);
    }
  });
}
