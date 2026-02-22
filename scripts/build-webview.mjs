#!/usr/bin/env node

import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/webview/main.ts'],
  bundle: true,
  outfile: 'dist/webview/main.js',
  format: 'iife',
  platform: 'browser',
  sourcemap: true,
  target: ['chrome91', 'firefox90', 'safari14'],
  treeShaking: true,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      console.log('🎮 Watching webview files...');
      await ctx.watch();
    } else {
      await esbuild.build(buildOptions);
      console.log('✅ Webview build complete');
    }
  } catch (error) {
    console.error('❌ Webview build failed:', error);
    process.exit(1);
  }
}

build();