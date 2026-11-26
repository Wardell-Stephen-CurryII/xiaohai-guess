// 自愿打赏：首页的打赏卡片、结算页的入口，以及弹出的微信赞赏码。

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './tip.css'

const QR_URL = `${import.meta.env.BASE_URL}images/reward-qr.jpg`

const PERKS = ['永久免费', '没有广告', '不用注册', '不收集数据', '断网也能玩']

/** 保存赞赏码：优先调起系统分享面板（可「存储图像」），不支持时在新页面打开图片 */
async function saveQr() {
  try {
    const blob = await (await fetch(QR_URL)).blob()
    const file = new File([blob], '小嗨猜猜猜-赞赏码.jpg', { type: 'image/jpeg' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
      return
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
  }
  window.open(QR_URL, '_blank')
}

export function TipDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // 渲染到 body 下，不受所在卡片的样式影响
  return createPortal(
    <div className="tip-backdrop" onClick={onClose}>
      <div
        className="tip-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tip-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="tip-title">谢谢你的支持</h2>
        <p className="tip-dialog-lede">微信扫码打赏，金额随意。</p>
        <img className="tip-qr" src={QR_URL} alt="作者的微信赞赏码" />
        <ul className="tip-howto">
          <li>
            <strong>用朋友的手机：</strong>打开微信「扫一扫」，直接扫上面的码。
          </li>
          <li>
            <strong>用这部手机：</strong>先点「保存图片」或长按图片存到相册，再在微信「扫一扫」右上角选相册里的这张图。
          </li>
        </ul>
        <div className="tip-actions">
          <button className="btn btn-primary" onClick={() => void saveQr()}>
            保存图片
          </button>
          <button className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** 首页的打赏卡片 */
export function TipCard() {
  const [open, setOpen] = useState(false)
  return (
    <section className="tip-card" aria-labelledby="tip-card-title">
      <span className="tip-card-art" aria-hidden>
        🧋
      </span>
      <h2 id="tip-card-title">请作者喝杯奶茶</h2>
      <p>小嗨猜猜猜是作者利用业余时间一个人做的小游戏，开发不易。</p>
      <ul className="tip-perks">
        {PERKS.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p>如果它给你们的聚会带来了欢乐，欢迎请作者喝杯奶茶，支持继续更新词库和玩法。</p>
      <button className="btn btn-primary tip-card-btn" onClick={() => setOpen(true)}>
        🧋 请作者喝杯奶茶
      </button>
      {open && <TipDialog onClose={() => setOpen(false)} />}
    </section>
  )
}

/** 结算页的打赏入口 */
export function TipLink() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="tip-link" onClick={() => setOpen(true)}>
        <span aria-hidden>🧋</span> 玩得开心？请作者喝杯奶茶
      </button>
      {open && <TipDialog onClose={() => setOpen(false)} />}
    </>
  )
}
