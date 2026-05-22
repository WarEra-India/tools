import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => {
  return {
    base: "/warera-calculators/",
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Heavy libs that only specific lenses need — keep them in their own
          // chunks so the landing route stays tiny and lenses share cached
          // vendor bundles across calculators.
          manualChunks: {
            "vendor-maplibre": ["maplibre-gl"],
            "vendor-recharts": ["recharts"],
            "vendor-topojson": ["topojson-client"],
            "vendor-react": ["react", "react-dom", "react-router-dom"],
          },
        },
      },
      // maplibre-gl ships as a ~1MB chunk that's already isolated and
      // lazy-loaded — only fetched when the Industry lens opens. 1200k caps
      // the warning above that floor without hiding genuinely-oversized code.
      chunkSizeWarningLimit: 1200,
    },
  }
})
