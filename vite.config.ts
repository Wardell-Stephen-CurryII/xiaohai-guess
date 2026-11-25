/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 正式部署在 GitHub Pages 的子路径下：https://wardell-stephen-curryii.github.io/xiaohai-guess/
// 开发时使用根路径，方便通过隧道地址直接访问。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/xiaohai-guess/' : '/',
  plugins: [react()],
  server: {
    host: true,
    // 本机 5173/5174 已被其他项目占用，固定使用 5188，端口被占时直接报错而不是自动换端口
    port: 5188,
    strictPort: true,
    // 允许 cloudflared 临时隧道的域名访问开发服务器
    allowedHosts: ['.trycloudflare.com'],
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
}))
