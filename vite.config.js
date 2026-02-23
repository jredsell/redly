import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['redly_logo.png'],
      manifest: {
        name: 'Redly Workspace',
        short_name: 'Redly',
        description: 'Fast, offline-first notes and tasks',
        theme_color: '#1e1e1e',
        background_color: '#1e1e1e',
        display: 'standalone',
        icons: [
          { src: 'redly_logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'redly_logo.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}']
      }
    })
  ]
})