import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { name } from "./package.json";
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import viteCompression from 'vite-plugin-compression'
import { terser } from 'rollup-plugin-terser';
import { uglify } from "rollup-plugin-uglify";
import {codeObfuscatorPlugin} from './obfuscator'

// import peerDepsExternal from 'rollup-plugin-peer-deps-external'
// import Unocss from 'unocss/vite'
// https://vitejs.dev/config/

export default defineConfig({
  optimizeDeps: {
    // exclude: ["vue-demi"],
  },
  plugins: [
    vue(),
    cssInjectedByJsPlugin(),
    codeObfuscatorPlugin(true)
    // viteCompression()
    //Unocss(),
    //peerDepsExternal()
  ],
  server: {
    host: "0.0.0.0",
    port: "9001",
  },
  build: {
    cssCodeSplit: true,
    lib: {
      name,
      entry: "src/index.ts",
    },
    sourcemap: true, // 输出.map文件
    rollupOptions: {
      external: ["vue"],
      plugins:[],
      output: {
        name: 'InfiniteScrolling',
        //In UMD build mode, a global variable is provided for these externalized dependencies
        globals: {
          vue: "Vue",
        },
      },
    },
  },
});
