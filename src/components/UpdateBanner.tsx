import './updateBanner.css'

/** 有新版本时显示在首页 / 结算页顶部 */
export function UpdateBanner({ onUpdate }: { onUpdate: () => void }) {
  return (
    <div className="update-banner" role="status">
      <span>有新版本可以用了</span>
      <button className="update-banner-btn" onClick={onUpdate}>
        更新
      </button>
    </div>
  )
}
