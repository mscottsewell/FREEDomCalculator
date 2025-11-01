import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/FREEDomCalculator/', // Set to your repo name for GitHub Pages
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
