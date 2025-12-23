import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",  // Allow connections from any IP
    port: 5173,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    allowedHosts: ["l.103.fm", "192.168.10.121", "212.179.162.102", "localhost", "127.0.0.1", "0.0.0.0"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
    watch: {
      usePolling: false
    }
  },
  preview: {
    host: "0.0.0.0",  // Allow connections from any IP
    port: 5173,
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __VITE_HMR_DISABLE__: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI Libraries
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip'
          ],

          // Material UI
          'mui-vendor': ['@mui/material', '@emotion/react', '@emotion/styled'],

          // Calendar functionality
          'calendar-vendor': [
            '@fullcalendar/daygrid',
            '@fullcalendar/interaction',
            '@fullcalendar/list',
            '@fullcalendar/react',
            '@fullcalendar/timegrid'
          ],

          // Rich text editor
          'editor-vendor': [
            '@tiptap/extension-link',
            '@tiptap/extension-text-align',
            '@tiptap/extension-underline',
            '@tiptap/react',
            '@tiptap/starter-kit'
          ],

          // PDF and export functionality
          'export-vendor': [
            'jspdf',
            'html2canvas',
            'html2pdf.js',
            'docx',
            'file-saver'
          ],

          // Date utilities
          'date-vendor': ['date-fns'],

          // Charts
          'chart-vendor': ['recharts'],

          // Other utilities
          'utils-vendor': [
            'axios',
            'uuid',
            'zod',
            'sonner',
            'lucide-react',
            'clsx',
            'tailwind-merge',
            'tailwindcss-animate'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase limit to 1MB to reduce warnings
  }
}));
