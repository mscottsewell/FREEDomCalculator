import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
// import { resolve } from 'path';

// Production config for GitHub Pages deployment
export default defineConfig({
  plugins: [
  react(),
  ],
  base: '/freedomcalculator/', // CRITICAL: Replace with your repo name
  resolve: {
    alias: {
  '@': '/src',
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts', 'd3']
        }
      }
    }
  }
});