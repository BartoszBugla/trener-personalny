import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro(),
    tailwindcss(),
    tanstackStart({
      importProtection: {
        // Everything under src/server (DI container, services, repositories, DB)
        // is server-only. Importing it from client code fails the build.
        // Server functions / server routes may import it inside their handlers –
        // the Start compiler strips those from the client bundle.
        client: {
          files: ['**/*.server.*', '**/src/server/**'],
        },
      },
    }),
    viteReact(),
  ],
})

export default config
