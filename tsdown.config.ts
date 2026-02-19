import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['src/index.ts'],
    splitting: true,
    sourcemap: true,
    dts: true,
    clean: true,
    minify: false,
    format: ['cjs', 'esm'],
  target: false,
})