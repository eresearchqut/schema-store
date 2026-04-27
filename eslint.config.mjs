import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import jestPlugin from 'eslint-plugin-jest';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default defineConfig([
    globalIgnores(["node_modules/*", "dist/*"]),
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        plugins: {
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error',
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
        },
    },
    {
        files: ['test/**/*.ts'],
        plugins: { jest: jestPlugin },
        rules: {
            ...jestPlugin.configs['flat/recommended'].rules,
        },
    },
]);