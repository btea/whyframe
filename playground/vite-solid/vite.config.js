import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'
import solid from 'vite-plugin-solid'
import { whyframe } from '@whyframe/core'
import { whyframeJsx } from '@whyframe/jsx'

export default defineConfig({
  plugins: [
    inspect(),
    whyframe({
      template: {
        basic: '/frames/basic/index.html'
      },
      components: ['Story']
    }),
    whyframeJsx({
      framework: 'solid',
    }),
    solid()
  ],
  build: {
    rollupOptions: {
      input: {
        whyframeBasic: 'frames/basic/index.html',
        index: 'index.html'
      }
    }
  }
})
