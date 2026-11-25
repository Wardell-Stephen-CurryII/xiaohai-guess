import { useEffect, useRef, useState } from 'react'
import { Stage, StageWord } from '../../components/Stage'
import { stageRotation } from '../../components/stageRotation'
import { useViewportPortrait } from '../../hooks/useViewportPortrait'
import type { SoundPlayer } from '../../platform/audio'
import { landscapeSign } from '../../sensor/tilt'
import type { SensorHub } from './sensorHub'

const SAMPLE_WORDS = [
  '大熊猫', '火锅', '青花瓷', '秦始皇', '长颈鹿', '雨伞', '画蛇添足', '泰坦尼克号',
  '乒乓球', '长城', '孤勇者', '煎饼果子', '四大发明', '挤地铁', '月亮代表我的心', '躺平',
]

/** 横屏舞台显示测试：方向实时跟随手机，点击任意位置关闭 */
export function StageTest({ hub, onExit }: { hub: SensorHub; onExit: () => void }) {
  const portrait = useViewportPortrait()
  const [upX, setUpX] = useState(() => hub.currentUpX())
  useEffect(() => {
    const id = setInterval(() => setUpX(hub.currentUpX()), 200)
    return () => clearInterval(id)
  }, [hub])
  const sign = landscapeSign(upX)
  const rotation = stageRotation(portrait, sign)

  return (
    <Stage rotation={rotation} className="overlay-tap">
      <div onClick={onExit} className="overlay-fill">
        <div className="overlay-info">
          视口：{portrait ? '竖屏' : '横屏'} · upX：{upX.toFixed(2)} · 舞台旋转：{rotation}°
        </div>
        <StageWord text="大熊猫" />
        <div className="overlay-hint">文字对围观者应该是正的 · 点击任意位置关闭</div>
      </div>
    </Stage>
  )
}

type SimPhase = 'waiting' | 'word' | 'correct' | 'skip'

/** 模拟一局：用识别器驱动出题，测试手感、反馈和误判 */
export function SimGame({ hub, sound, onExit }: { hub: SensorHub; sound: SoundPlayer; onExit: () => void }) {
  const portrait = useViewportPortrait()
  const [phase, setPhase] = useState<SimPhase>('waiting')
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState({ correct: 0, skip: 0 })
  const [sign, setSign] = useState<1 | -1>(1)
  const phaseRef = useRef<SimPhase>('waiting')

  useEffect(() => {
    hub.detector.reset()
    const go = (p: SimPhase) => {
      phaseRef.current = p
      setPhase(p)
    }
    return hub.onGesture((e) => {
      const p = phaseRef.current
      if (e === 'ready') {
        if (p === 'waiting') {
          // 开局时锁定舞台方向，游戏中途不再改变
          setSign(landscapeSign(hub.currentUpX()) === -1 ? -1 : 1)
          sound.play('go')
          go('word')
        } else if (p === 'correct' || p === 'skip') {
          setIndex((i) => i + 1)
          go('word')
        }
      } else if (p === 'word') {
        sound.play(e)
        setScore((s) => ({ ...s, [e]: s[e] + 1 }))
        go(e)
      }
    })
  }, [hub, sound])

  const rotation = stageRotation(portrait, sign)
  const word = SAMPLE_WORDS[index % SAMPLE_WORDS.length]

  return (
    <Stage rotation={rotation} className={`sim sim-${phase}`}>
      <button className="sim-exit" onClick={onExit}>
        退出
      </button>
      <div className="sim-score">
        答对 {score.correct} · 跳过 {score.skip}
      </div>
      {phase === 'waiting' && <div className="sim-prompt">把手机横过来举起，屏幕朝向朋友</div>}
      {phase === 'word' && <StageWord text={word} />}
      {phase === 'correct' && <StageWord text="答对" />}
      {phase === 'skip' && <StageWord text="跳过" />}
    </Stage>
  )
}
