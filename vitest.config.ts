import { defineConfig } from 'vitest/config'

// Eigene Konfiguration, damit die Tests nicht die PWA-/Compiler-Plugins aus
// vite.config.ts laden. Bisher nur reine Logik-Tests ohne DOM.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
