import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'

// HTTPS en local : le salon (WebRTC / crypto.subtle), le gyroscope et le micro exigent un contexte
// sécurisé. Certificat auto-signé dans .certs/ (voir README / commande openssl), ignoré par git.
const https = fs.existsSync('.certs/key.pem') && fs.existsSync('.certs/cert.pem')
  ? { key: fs.readFileSync('.certs/key.pem'), cert: fs.readFileSync('.certs/cert.pem') }
  : undefined

// base './' : fonctionne sur GitHub Pages (sous-dossier du dépôt) et en local.
export default defineConfig({
  base: './',
  server: { https },
  preview: { https },
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
