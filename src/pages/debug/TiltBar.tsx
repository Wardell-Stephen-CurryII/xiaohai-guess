/** tilt 的可视化：-90（朝地）到 +90（朝天），标出触发区和回正区 */
export function TiltBar({ tilt, trigger, ret }: { tilt: number | null; trigger: number; ret: number }) {
  const pos = (deg: number) => `${((deg + 90) / 180) * 100}%`
  return (
    <div className="tiltbar">
      <div className="tiltbar-zone correct" style={{ left: 0, width: pos(-trigger) }} />
      <div className="tiltbar-zone skip" style={{ left: pos(trigger), right: 0 }} />
      <div
        className="tiltbar-zone neutral"
        style={{ left: pos(-ret), width: `${((2 * ret) / 180) * 100}%` }}
      />
      {tilt !== null && <div className="tiltbar-dot" style={{ left: pos(tilt) }} />}
      <div className="tiltbar-labels">
        <span>朝地 -90°</span>
        <span>0°</span>
        <span>朝天 +90°</span>
      </div>
    </div>
  )
}
