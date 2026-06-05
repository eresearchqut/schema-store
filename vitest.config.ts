import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.ts'],
        testTimeout: 60000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
            reportsDirectory: 'coverage',
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.d.ts',
                'src/**/*.interface.ts',
                'src/**/index.ts',
            ],
        },
    },
});
