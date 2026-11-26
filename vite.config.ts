/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// 正式部署在 GitHub Pages 的子路径下：https://wardell-stephen-curryii.github.io/xiaohai-guess/
// 开发时使用根路径，方便通过隧道地址直接访问；本地预览生产构建（vite preview）时与正式环境一致。
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/xiaohai-guess/' : '/',
  plugins: [
    react(),
    VitePWA({
      // 有新版本时不自动刷新，由界面在首页或结算页提示用户更新（设计文档 8.2）
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-64.png', 'fonts/*.woff'],
      manifest: {
        name: '小嗨猜猜猜',
        short_name: '小嗨猜猜猜',
        description: '朋友聚会时玩的猜词游戏：举起手机，朋友比划，你来猜',
        lang: 'zh-CN',
        // 部署在子路径下，使用相对路径（设计文档 8.4）
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f5f3f8',
        theme_color: '#f5f3f8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 预缓存全部静态资源，首次加载后断网可玩
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff,woff2,json,txt}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
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
