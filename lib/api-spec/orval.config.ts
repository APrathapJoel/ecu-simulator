import { defineConfig } from 'orval';

export default defineConfig({
  zod: {
    input: './openapi.yaml',
    output: {
      mode: 'split',
      target: '../api-zod/src/generated.ts',
      client: 'zod',
    },
  },
  reactQuery: {
    input: './openapi.yaml',
    output: {
      mode: 'split',
      target: '../api-client-react/src/generated.ts',
      client: 'react-query',
    },
  },
});
