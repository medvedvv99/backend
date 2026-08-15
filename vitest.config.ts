import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@common': path.resolve(rootDir, 'src/common'),
            '@modules': path.resolve(rootDir, 'src/modules'),
            '@libs/contracts': path.resolve(rootDir, 'libs/contract'),
            '@contract': path.resolve(rootDir, 'libs/contract'),
            '@libs/subscription-page': path.resolve(rootDir, 'libs/subscription-page'),
            '@integration-modules': path.resolve(rootDir, 'src/integration-modules'),
            '@queue': path.resolve(rootDir, 'src/queue'),
            '@scheduler': path.resolve(rootDir, 'src/scheduler'),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.spec.ts'],
    },
});
