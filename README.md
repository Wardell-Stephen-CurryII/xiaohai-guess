# 小嗨猜猜猜

聚会猜词游戏，iPhone 主屏幕 Web App（PWA）。手机横屏举起、屏幕朝向朋友，屏幕翻向地面算答对，翻向天空算跳过。

当前状态：阶段 5（已部署，待实机安装验证）。

**正式地址：** https://wardell-stephen-curryii.github.io/xiaohai-guess/ （用 iPhone 的 Safari 打开，分享 → 添加到主屏幕）进度见 `docs/项目规划.md`。

## 开发

需要 Node.js 20 以上，以及 [cloudflared](https://github.com/cloudflare/cloudflared/releases)（只用于开发时让 iPhone 通过 HTTPS 访问，不需要 Cloudflare 账号）。

```bash
npm install
npm run dev      # 开发服务器，固定端口 5188
npm run tunnel   # 另开一个终端：生成临时 HTTPS 地址（*.trycloudflare.com），用 iPhone 打开
npm test         # 单元测试
npm run lint     # 代码检查
npm run build    # 生产构建，输出到 dist/，部署路径为 /xiaohai-guess/
npx vite preview # 本地预览生产构建（含离线缓存），地址 http://localhost:4173/xiaohai-guess/
```

## 部署

推送到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）自动运行测试、代码检查和构建，全部通过后发布到 GitHub Pages。测试不通过则不发布。

隧道地址每次启动都会变化。iPhone 的传感器只能在 HTTPS 下使用，所以实机测试要用隧道地址，不能用局域网 IP。

## 目录

```text
guess/
├── README.md
├── docs/
│   ├── 设计文档.md        当前生效的设计（v1.1）
│   ├── 项目规划.md        阶段、任务、待决事项
│   ├── 实机测试记录.md    iPhone 实测结果
│   └── archive/           历史版本
├── public/                原样发布的静态文件（图标等）
├── src/
│   ├── main.tsx           入口
│   ├── App.tsx            根组件
│   ├── pages/             页面（目前只有传感器调试页）
│   ├── components/        横屏舞台等通用组件
│   ├── sensor/            倾角计算、翻转识别器、传感器订阅、录制
│   ├── platform/          对浏览器能力的薄封装（音效、屏幕常亮、日志）
│   ├── hooks/
│   └── styles/
├── index.html
├── vite.config.ts         构建、开发服务器和测试配置
└── package.json
```

完整的目标目录结构见 `docs/设计文档.md` 第 7 节，各目录随阶段推进逐步创建。
