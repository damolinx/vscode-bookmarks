import * as esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: 'node',
  target: 'es2022',
  outfile: './out/extension.js',
  external: ['vscode'],
}).catch(() => {
  console.error(e);
  process.exit(1);
}
);