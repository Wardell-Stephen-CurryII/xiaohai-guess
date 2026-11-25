// 主题词库：src/data/words/ 下每个 JSON 文件是一个主题，构建时打包进应用（不走运行时请求）。
// 增删主题只需要增删文件，不需要改代码。

import type { Theme } from '../game/types'

const modules = import.meta.glob<Theme>('./words/*.json', { eager: true, import: 'default' })

export const THEMES: readonly Theme[] = Object.values(modules).sort((a, b) => a.order - b.order)
