// 传感器调试页（阶段 1）。验证项见设计文档 9.1，结果记入 docs/实机测试记录.md。

import { useEffect, useState, type ReactNode } from 'react'
import { useViewportPortrait } from '../hooks/useViewportPortrait'
import { getAudioSessionType, setAudioSessionType, SoundPlayer, type SoundName } from '../platform/audio'
import { describeEnvironment, readProbe } from '../platform/environment'
import { getLog, log, onLog } from '../platform/errorLog'
import { ScreenWakeLock, type WakeLockStatus } from '../platform/wakeLock'
import { DEFAULT_PARAMS, type DetectorParams } from '../sensor/gestureDetector'
import { requestMotionPermission, type MotionPermission } from '../sensor/orientationSource'
import { landscapeSign } from '../sensor/tilt'
import { SensorHub, type HubSnapshot, type TiltSource } from './debug/sensorHub'
import { SimGame, StageTest } from './debug/StageOverlays'
import { TiltBar } from './debug/TiltBar'
import './debug/debug.css'

const hub = new SensorHub()
const sound = new SoundPlayer()
const wakeLock = new ScreenWakeLock()

const f = (v: number | null | undefined, d = 1) => (v === null || v === undefined ? '—' : v.toFixed(d))

const EVENT_LABEL = { correct: '答对', skip: '跳过', ready: '回正' } as const

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dbg-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value, warn }: { label: string; value: ReactNode; warn?: boolean }) {
  return (
    <div className={`dbg-row${warn ? ' warn' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default function DebugPage() {
  const [env] = useState(() => describeEnvironment(readProbe()))
  const [perm, setPerm] = useState<MotionPermission | 'not-asked'>('not-asked')
  const [snap, setSnap] = useState<HubSnapshot>(() => hub.snapshot(performance.now()))
  const [params, setParams] = useState<DetectorParams>(hub.params)
  const [source, setSource] = useState<TiltSource>(hub.source)
  const [motionSign, setMotionSign] = useState<1 | -1>(hub.motionSign)
  const [beepOnEvent, setBeepOnEvent] = useState(true)
  const [overlay, setOverlay] = useState<'none' | 'stage' | 'sim'>('none')
  const [, forceRender] = useState(0)
  const portrait = useViewportPortrait()

  // 界面每 100ms 刷新一次，不随 60Hz 的传感器事件重绘
  useEffect(() => {
    const id = setInterval(() => setSnap(hub.snapshot(performance.now())), 100)
    return () => clearInterval(id)
  }, [])

  useEffect(() => onLog(() => forceRender((n) => n + 1)), [])

  useEffect(() => {
    if (!beepOnEvent || overlay === 'sim') return
    return hub.onGesture((e) => {
      if (e !== 'ready') sound.play(e)
    })
  }, [beepOnEvent, overlay])

  const start = () => {
    // 必须在点击处理函数中同步调用，前面不能有 await
    const p = requestMotionPermission()
    sound.unlock()
    hub.start()
    void p.then((r) => {
      setPerm(r)
      log(`传感器权限：${r}`)
    })
  }

  const updateParam = (key: keyof DetectorParams, value: number) => {
    const next = { ...params, [key]: value }
    setParams(next)
    hub.setParams(next)
  }

  const landscape = landscapeSign(snap.gravity?.upX ?? 0)

  return (
    <main className="dbg">
      <h1>小嗨猜猜猜 · 调试</h1>
      <a className="dbg-back" href="#">返回游戏</a>

      <Section title="1. 环境与授权">
        {env.map((c) => (
          <Row key={c.label} label={c.label} value={c.detail} warn={!c.ok} />
        ))}
        <Row label="传感器权限" value={perm === 'not-asked' ? '尚未申请' : perm} warn={perm === 'denied' || perm === 'error'} />
        <Row label="方向事件频率" value={`${f(snap.orientationHz, 0)} Hz`} warn={hub.started && snap.orientationHz === 0} />
        <Row label="运动事件频率" value={`${f(snap.motionHz, 0)} Hz`} />
        <button className="dbg-primary" onClick={start}>
          授权传感器并解锁声音
        </button>
      </Section>

      <Section title="2. 实时姿态">
        <TiltBar tilt={snap.smoothedTilt} trigger={params.triggerDeg} ret={params.returnDeg} />
        <div className="dbg-big">
          tilt {f(snap.gravity?.tilt)}°
          <small> 平滑后 {f(snap.smoothedTilt)}°</small>
        </div>
        <Row label="alpha / beta / gamma" value={`${f(snap.orientation?.alpha)} / ${f(snap.orientation?.beta)} / ${f(snap.orientation?.gamma)}`} />
        <Row label="upX / upY / upZ" value={`${f(snap.gravity?.upX, 2)} / ${f(snap.gravity?.upY, 2)} / ${f(snap.gravity?.upZ, 2)}`} />
        <Row label="握持判断" value={landscape === 1 ? '横屏（+x 朝上）' : landscape === -1 ? '横屏（-x 朝上）' : '非横屏'} />
        <Row label="重力加速度 x / y / z" value={`${f(snap.motion?.x, 2)} / ${f(snap.motion?.y, 2)} / ${f(snap.motion?.z, 2)}`} />
        <Row label="由加速度算出的 tilt" value={`${f(snap.motionGravity?.tilt)}°`} />
        <p className="dbg-note">
          检查：屏幕朝天平放 ≈ +90°，横屏竖立 ≈ 0°，屏幕朝地 ≈ -90°。屏幕朝天平放时，如果重力加速度 z 是负数，说明需要反转加速度符号。
        </p>
      </Section>

      <Section title="3. 翻转识别">
        <Row label="识别器状态" value={snap.detectorState === 'neutral' ? '中立（可识别）' : '等待回正'} />
        <Row label="数据中断" value={snap.stale ? '是' : '否'} warn={hub.started && snap.stale} />
        <div className="dbg-counts">
          <span className="c">答对 {snap.counts.correct}</span>
          <span className="s">跳过 {snap.counts.skip}</span>
          <span>回正 {snap.counts.ready}</span>
        </div>
        <ol className="dbg-history">
          {snap.history.map((h, i) => (
            <li key={`${h.time}-${i}`}>
              {h.time} {EVENT_LABEL[h.event]}（{f(h.tilt)}°）
            </li>
          ))}
        </ol>
        <div className="dbg-buttons">
          <button onClick={() => hub.resetCounts()}>计数清零</button>
          <label>
            <input type="checkbox" checked={beepOnEvent} onChange={(e) => setBeepOnEvent(e.target.checked)} /> 识别时播放音效
          </label>
        </div>
        <Row
          label="数据源"
          value={
            <select
              value={source}
              onChange={(e) => {
                const s = e.target.value as TiltSource
                setSource(s)
                hub.setSource(s)
              }}
            >
              <option value="orientation">方向事件（主）</option>
              <option value="motion">加速度（备用）</option>
            </select>
          }
        />
        <Row
          label="加速度符号"
          value={
            <button
              onClick={() => {
                const s = motionSign === 1 ? -1 : 1
                setMotionSign(s)
                hub.motionSign = s
              }}
            >
              {motionSign === 1 ? '规范（+1）' : '反转（-1）'}
            </button>
          }
        />
        {(
          [
            ['triggerDeg', '触发角度', 30, 80, 1, '°'],
            ['holdMs', '保持时间', 0, 500, 10, 'ms'],
            ['returnDeg', '回正角度', 5, 45, 1, '°'],
            ['returnHoldMs', '回正保持', 0, 800, 10, 'ms'],
            ['smoothingMs', '平滑时间常数', 0, 300, 10, 'ms'],
          ] as const
        ).map(([key, label, min, max, step, unit]) => (
          <label key={key} className="dbg-slider">
            <span>
              {label}：{params[key]}
              {unit}
            </span>
            <input type="range" min={min} max={max} step={step} value={params[key]} onChange={(e) => updateParam(key, Number(e.target.value))} />
          </label>
        ))}
        <button
          onClick={() => {
            setParams(DEFAULT_PARAMS)
            hub.setParams(DEFAULT_PARAMS)
          }}
        >
          恢复默认参数
        </button>
      </Section>

      <Section title="4. 模拟一局 / 横屏舞台">
        <p className="dbg-note">模拟一局：回正后出词，朝地答对、朝天跳过，用来测试手感和连续 20 次动作。横屏舞台：检查文字方向，开启和关闭竖排方向锁定各测一次。</p>
        <Row label="当前视口" value={`${portrait ? '竖屏' : '横屏'} ${window.innerWidth}×${window.innerHeight}`} />
        <div className="dbg-buttons">
          <button className="dbg-primary" onClick={() => setOverlay('sim')} disabled={!hub.started}>
            模拟一局
          </button>
          <button onClick={() => setOverlay('stage')}>横屏舞台测试</button>
        </div>
      </Section>

      <RecordSection />
      <AudioSection />
      <WakeLockSection />

      <Section title="8. 日志">
        <button onClick={() => log('手动标记')}>插入标记</button>
        <ol className="dbg-log">
          {getLog().map((e, i) => (
            <li key={i} className={e.level}>
              {e.time} {e.message}
            </li>
          ))}
        </ol>
      </Section>

      {overlay === 'stage' && <StageTest hub={hub} onExit={() => setOverlay('none')} />}
      {overlay === 'sim' && <SimGame hub={hub} sound={sound} onExit={() => setOverlay('none')} />}
    </main>
  )
}

function RecordSection() {
  const [note, setNote] = useState('')
  const [, tick] = useState(0)
  const rec = hub.recorder

  useEffect(() => {
    if (!rec.recording) return
    const id = setInterval(() => tick((n) => n + 1), 250)
    return () => clearInterval(id)
  }, [rec.recording])

  const makeFile = () => {
    const data = rec.export(note, navigator.userAgent, new Date())
    const stamp = data.recordedAt.replace(/[:.]/g, '-').slice(0, 19)
    return new File([JSON.stringify(data)], `sensor-${stamp}.json`, { type: 'application/json' })
  }

  const share = async () => {
    const file = makeFile()
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: file.name })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(file)
        a.download = file.name
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) log(`导出失败：${String(e)}`, 'error')
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(await makeFile().text())
      log('录制数据已复制到剪贴板')
    } catch (e) {
      log(`复制失败：${String(e)}`, 'error')
    }
  }

  return (
    <Section title="5. 录制与导出">
      <input className="dbg-input" placeholder="备注，例如：右手 横屏 向下10次" value={note} onChange={(e) => setNote(e.target.value)} />
      <Row label="已录制样本" value={rec.sampleCount} />
      <div className="dbg-buttons">
        {rec.recording ? (
          <button className="dbg-primary" onClick={() => { rec.stop(); tick((n) => n + 1) }}>停止录制</button>
        ) : (
          <button className="dbg-primary" onClick={() => { rec.begin(performance.now()); tick((n) => n + 1) }} disabled={!hub.started}>
            开始录制
          </button>
        )}
        <button onClick={share} disabled={rec.recording || rec.sampleCount === 0}>分享 / AirDrop</button>
        <button onClick={copy} disabled={rec.recording || rec.sampleCount === 0}>复制</button>
      </div>
    </Section>
  )
}

function AudioSection() {
  const [session, setSession] = useState(() => getAudioSessionType())
  const [, tick] = useState(0)
  const sounds: [SoundName, string][] = [
    ['correct', '答对'],
    ['skip', '跳过'],
    ['count', '倒数'],
    ['go', '开始'],
    ['tick', '滴答'],
    ['finish', '时间到'],
  ]
  return (
    <Section title="6. 音效">
      <Row label="AudioContext" value={sound.state} warn={sound.state !== 'running'} />
      <Row
        label="audioSession.type"
        value={
          session === null ? (
            '不支持'
          ) : (
            <select
              value={session}
              onChange={(e) => {
                setAudioSessionType(e.target.value as 'auto' | 'playback' | 'ambient')
                setSession(getAudioSessionType())
              }}
            >
              <option value="auto">auto</option>
              <option value="playback">playback</option>
              <option value="ambient">ambient</option>
            </select>
          )
        }
      />
      <p className="dbg-note">先点第 1 节的授权按钮解锁声音。测试静音开关：打开静音后分别在 auto 和 playback 下播放，记录是否有声音。</p>
      <div className="dbg-buttons">
        {sounds.map(([name, label]) => (
          <button
            key={name}
            onClick={() => {
              sound.unlock()
              sound.play(name)
              tick((n) => n + 1)
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </Section>
  )
}

function WakeLockSection() {
  const [status, setStatus] = useState<WakeLockStatus>(wakeLock.status)
  const [lastTouch, setLastTouch] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const off = wakeLock.onChange((s, detail) => {
      setStatus(s)
      log(`屏幕常亮：${s}${detail ? `（${detail}）` : ''}`)
    })
    const touch = () => setLastTouch(Date.now())
    document.addEventListener('touchstart', touch, { passive: true })
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      off()
      document.removeEventListener('touchstart', touch)
      clearInterval(id)
    }
  }, [])

  return (
    <Section title="7. 屏幕常亮">
      <Row label="状态" value={status} warn={status === 'error' || status === 'unsupported'} />
      <Row label="距上次触摸" value={`${Math.round((now - lastTouch) / 1000)} 秒`} />
      <p className="dbg-note">
        测试前确认「设置 → 显示与亮度 → 自动锁定」是 30 秒（不能是「永不」）。点「申请常亮」后不要碰屏幕，放置 2 分钟，看屏幕是否变暗。Safari 和主屏幕 Web App 各测一次。
      </p>
      <div className="dbg-buttons">
        <button className="dbg-primary" onClick={() => void wakeLock.acquire()}>申请常亮</button>
        <button onClick={() => wakeLock.release()}>释放</button>
      </div>
    </Section>
  )
}
