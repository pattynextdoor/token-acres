#!/usr/bin/env node

import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/extension/extension.ts'],
  bundle: true,
  outfile: 'dist/extension/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  target: 'node18',
  treeShaking: true,
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      console.log('🔧 Watching extension files...');
      await ctx.watch();
    } else {
      await esbuild.build(buildOptions);
      console.log('✅ Extension build complete');
    }
  } catch (error) {
    console.error('❌ Extension build failed:', error);
    process.exit(1);
  }
}

build();