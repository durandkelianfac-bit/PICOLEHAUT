import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// base './' : fonctionne sur GitHub Pages (sous-dossier du dépôt) et en local.
export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,glb}'] },
      manifest: {
        name: 'PICOLE HAUT',
        short_name: 'PICOLE HAUT',
        description: 'Jeux à gorgées entre amis',
        lang: 'fr',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        background_color: '#242423',
        theme_color: '#242423',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
