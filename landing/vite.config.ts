import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Eigenständiger Build. Erzeugt statisches HTML/CSS/JS in dist/ und hat
// bewusst keine Berührungspunkte mit dem PWA-Build im Projektwurzelverzeichnis.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative Asset-Pfade: dist/ lässt sich damit auch in einem Unterverzeichnis
  // einer Domain ausliefern, nicht nur im Root.
  base: './',
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
})
