// 横屏舞台的旋转角度，见设计文档 5.4。
//
// 视口已经是横屏（系统旋转了页面）：不旋转。
// 视口仍是竖屏（用户开启了竖排方向锁定）：把舞台旋转 90°，让文字对围观者是正的。
//   设备 +x 轴朝上（upX > 0）时，内容的「上」应指向竖屏视口的右侧，即顺时针旋转 90°。

export type StageRotation = 0 | 90 | -90

export function stageRotation(viewportIsPortrait: boolean, landscape: 1 | -1 | 0): StageRotation {
  if (!viewportIsPortrait) return 0
  return landscape === -1 ? -90 : 90
}
