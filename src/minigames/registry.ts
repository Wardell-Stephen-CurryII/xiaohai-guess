// 「更多游戏」里的小游戏清单。
// 以后加新游戏：写页面组件 → 在这里把 status 改成 'ready' → 在 App.tsx 的小游戏路由里加一行。

export type MiniGameId = 'truth' | 'dare' | 'link' | 'match3'

export interface MiniGameDef {
  id: MiniGameId
  name: string
  /** 一句话介绍 */
  desc: string
  /** 配图：一大两小三个 emoji */
  art: [string, string, string]
  /** 卡片底色 */
  color: string
  status: 'ready' | 'soon'
  /** 页面路由 */
  hash: string
}

export const MINI_GAMES: MiniGameDef[] = [
  { id: 'truth', name: '真心话', desc: '抽一题，说实话', art: ['🫣', '💬', '❓'], color: '#D8D5FF', status: 'ready', hash: '#truth' },
  { id: 'dare', name: '大冒险', desc: '抽一张，敢不敢', art: ['🎲', '🔥', '🎤'], color: '#FFD8C4', status: 'ready', hash: '#dare' },
  { id: 'link', name: '连连看', desc: '20 关，不限时间', art: ['🧩', '🔗', '⭐'], color: '#C3ECDD', status: 'ready', hash: '#link' },
  { id: 'match3', name: '消消乐', desc: '敬请期待', art: ['🍬', '🍭', '✨'], color: '#FFD3E3', status: 'soon', hash: '#match3' },
]

export const miniGameByHash = (hash: string) => MINI_GAMES.find((g) => g.hash === hash && g.status === 'ready')
