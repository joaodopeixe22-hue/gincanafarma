import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas grandes em arquivos separados: o celular baixa só o que a tela usa
        // e reaproveita o cache entre atualizações do app.
        manualChunks(id: string) {
          if (id.includes("commonjsHelpers")) return "vendor";
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@remix-run)\//.test(id)) return "react";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "query";
          if (/node_modules\/(recharts|recharts-scale|d3-[a-z-]+|victory-vendor)\//.test(id)) return "charts";
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return "motion";
          // utilitários pequenos usados por todos ficam juntos (evita o app inicial depender do chunk de gráficos)
          if (/node_modules\/(clsx|tailwind-merge|class-variance-authority)\//.test(id)) return "vendor";
          return undefined;
        },
      },
    },
  },
}));
