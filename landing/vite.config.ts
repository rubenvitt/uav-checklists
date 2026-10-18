import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import handbuch from './handbuch.plugin.ts'

// Eigenständiger Build. Erzeugt statisches HTML/CSS/JS in dist/ und hat
// bewusst keine Berührungspunkte mit dem PWA-Build im Projektwurzelverzeichnis.
export default defineConfig({
  plugins: [react(), tailwindcss(), handbuch({ dir: 'src/handbuch/kapitel', imageDir: 'public/screenshots' })],
  // Relative Asset-Pfade: dist/ lässt sich damit auch in einem Unterverzeichnis
  // einer Domain ausliefern, nicht nur im Root.
  base: './',
  // Zwei Seiten: Startseite und Handbuch (/handbuch/).
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        handbuch: fileURLToPath(new URL('./handbuch/index.html', import.meta.url)),
      },
    },
  },
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
})
