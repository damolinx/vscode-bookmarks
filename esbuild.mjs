import * as esbuild from 'esbuild';
import * as fs from 'fs';

const production = process.argv.includes('--production');

async function main() {
  const context = await esbuild.context({
    entryPoints: ['./src/extension.ts'],
    external: ['vscode'],
    outfile: './out/extension.js',
    platform: 'node',

    bundle: true,
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
  });

  if (production) {
    fs.rmSync('./out', { recursive: true, force: true });
  }
  await context.rebuild();
  await context.dispose();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});