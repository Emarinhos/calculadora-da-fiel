import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// base './' deixa os caminhos relativos: o app funciona na raiz (localhost) e em
// subpastas, como https://usuario.github.io/calculadora-da-fiel/ no GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
})
