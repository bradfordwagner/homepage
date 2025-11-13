const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: ['src/search.js'],
  bundle: true,
  outfile: 'skeletons/search.bundle.js',
  format: 'iife',
  minify: false,
  sourcemap: false,
}).catch(() => process.exit(1));

