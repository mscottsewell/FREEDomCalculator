import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/' : '/FREEDomCalculator/', // Root for Actions, subdir for gh-pages
  plugins: [
    react(),
    {
      name: 'copy-nojekyll',
      closeBundle() {
        writeFileSync('dist/.nojekyll', '');
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
