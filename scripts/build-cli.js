import * as esbuild from 'esbuild';
import { chmod } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function build() {
  await esbuild.build({
    entryPoints: [join(__dirname, 'start-proxy.ts')],
    bundle: true,
    minify: true,
    platform: 'node',
    target: 'node16',
    format: 'esm',
    outfile: './dist/cli.mjs',
    banner: {
      js: '#!/usr/bin/env node',
    },
  });

  // Make the output file executable
  await chmod('./dist/cli.cjs', 0o755);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
}); 