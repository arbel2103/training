import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base '/training/' so it works when hosted at https://<user>.github.io/training/
// https://vite.dev/config/
export default defineConfig({
  base: '/training/',
  plugins: [react()],
})
