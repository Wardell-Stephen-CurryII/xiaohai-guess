import './updateBanner.css'

/** 顶部横幅：有新版本时提示更新（更新不会丢失数据）；也用于显示会员失效等消息 */
export function UpdateBanner({
  onUpdate,
  text = '有新版本可以用了，更新不会丢失数据',
  actionText = '更新',
}: {
  onUpdate: () => void
  text?: string
  actionText?: string
}) {
  return (
    <div className="update-banner" role="status">
      <span>{text}</span>
      <button className="update-banner-btn" onClick={onUpdate}>
        {actionText}
      </button>
    </div>
  )
}
