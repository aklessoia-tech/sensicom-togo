import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // node fournit crypto.subtle et crypto.getRandomValues, seuls besoins des
    // modules testés : inutile de charger un DOM complet.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
