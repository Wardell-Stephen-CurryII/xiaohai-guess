// 音效，见设计文档 3.6。用 Web Audio 振荡器合成，不需要音频文件。

export type SoundName = 'correct' | 'skip' | 'count' | 'go' | 'tick' | 'finish'

interface Note {
  freq: number
  /** 相对开始播放的时间，秒 */
  at: number
  dur: number
  type: OscillatorType
}

const SOUNDS: Record<SoundName, Note[]> = {
  // 答对：上扬的两个音
  correct: [
    { freq: 784, at: 0, dur: 0.1, type: 'triangle' },
    { freq: 1175, at: 0.09, dur: 0.18, type: 'triangle' },
  ],
  // 跳过：下沉的低音，和答对明显不同
  skip: [
    { freq: 392, at: 0, dur: 0.12, type: 'sawtooth' },
    { freq: 262, at: 0.11, dur: 0.22, type: 'sawtooth' },
  ],
  count: [{ freq: 660, at: 0, dur: 0.15, type: 'sine' }],
  go: [{ freq: 990, at: 0, dur: 0.35, type: 'sine' }],
  tick: [{ freq: 1500, at: 0, dur: 0.04, type: 'square' }],
  finish: [
    { freq: 880, at: 0, dur: 0.15, type: 'triangle' },
    { freq: 698, at: 0.16, dur: 0.15, type: 'triangle' },
    { freq: 523, at: 0.32, dur: 0.4, type: 'triangle' },
  ],
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } }

export class SoundPlayer {
  private ctx: AudioContext | null = null
  enabled = true
  volume = 0.35

  /** 必须在用户点击的事件处理函数中调用，否则 iOS 会拦截声音。 */
  unlock(): void {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state !== 'running') void this.ctx.resume()
    // 播放一个极短的静音缓冲区，确保 iOS 真正解锁音频输出
    const buf = this.ctx.createBuffer(1, 1, this.ctx.sampleRate)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.connect(this.ctx.destination)
    src.start()
  }

  get state(): AudioContextState | 'not-created' {
    return this.ctx?.state ?? 'not-created'
  }

  play(name: SoundName): void {
    if (!this.enabled || !this.ctx) return
    const ctx = this.ctx
    const t0 = ctx.currentTime + 0.01
    for (const n of SOUNDS[name]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = n.type
      osc.frequency.value = n.freq
      const start = t0 + n.at
      const end = start + n.dur
      const peak = n.type === 'sawtooth' || n.type === 'square' ? this.volume * 0.5 : this.volume
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(peak, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, end)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(end + 0.02)
    }
  }
}

/** 音频会话类型。'playback' 可能让声音不受静音开关影响，需实机验证。返回是否支持。 */
export function setAudioSessionType(type: 'auto' | 'playback' | 'ambient'): boolean {
  const nav = navigator as AudioSessionNavigator
  if (!nav.audioSession) return false
  nav.audioSession.type = type
  return true
}

export function getAudioSessionType(): string | null {
  return (navigator as AudioSessionNavigator).audioSession?.type ?? null
}
