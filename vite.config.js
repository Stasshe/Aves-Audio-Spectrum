import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    hmr: {
      overlay: false,
    },
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0, // FFmpegのワーカーファイルをインライン化しないようにする
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser', // terserを使用する
    terserOptions: {
      compress: {
        drop_console: false, // コンソールログを保持（デバッグ用）
        drop_debugger: true
      }
    }
  },
  optimizeDeps: {
    include: ['vue', 'pinia', 'file-saver']
  }
});
