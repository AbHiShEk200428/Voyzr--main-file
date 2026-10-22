import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars at config time so we can use them in the server config.
  // VITE_HMR_HOST must be the ngrok domain WITHOUT protocol, e.g.:
  //   abc123.ngrok-free.app
  const env = loadEnv(mode, process.cwd(), '');
  const ngrokHost = env.VITE_HMR_HOST?.trim() || undefined;

  return {
  server: {
    host: "::",
    port: 3000,
    allowedHosts: [".ngrok-free.dev", ".ngrok-free.app"],
    hmr: ngrokHost
      ? false // Disable HMR client over ngrok — the WS upgrade doesn't survive
               // the Express middleware integration through an ngrok tunnel.
               // File changes still trigger full page reloads via Vite's watcher.
      : {
          // Local dev (no ngrok): plain ws on the Vite port.
          protocol: 'ws',
          port: 3000,
        },
    proxy: {
      '/ws-voyzr': {
        target: 'http://127.0.0.1:8080',
        ws: true,
      },
      '/ws-location': {
        target: 'http://127.0.0.1:8080',
        ws: true,
      }
    },
    fs: {
      allow: [".", "./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
};
});

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", 
    configureServer(server) {
      const app = createServer();
      
      // Use a custom middleware to ensure we don't conflict with Vite's proxy
      server.middlewares.use((req, res, next) => {
        // Skip WS paths, let Vite's proxy handle them
        if (req.url?.startsWith('/ws-')) return next();
        app(req as any, res as any, next);
      });
    },
  };
}
