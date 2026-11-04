/**
 * Tiny synthesised sound effects (Web Audio), so the prototype has punch
 * without any audio assets. Replace with @pixi/sound samples when real SFX exist.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<string, number>();
  public volume = 0.45;

  /** Must be called from a user gesture (browser autoplay rules). */
  public unlock() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private ready(key: string, minGapMs: number) {
    if (!this.ctx || !this.master || this.ctx.state !== "running") return false;
    const now = performance.now();
    if (now - (this.last.get(key) ?? 0) < minGapMs) return false;
    this.last.set(key, now);
    return true;
  }

  private burst(
    dur: number,
    freq: number,
    q: number,
    gain: number,
    type: BiquadFilterType = "lowpass",
    sweepTo?: number,
  ) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (sweepTo)
      filter.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private thump(dur: number, from: number, to: number, gain: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  public shot(power: number) {
    if (!this.ready("shot", 25)) return;
    this.burst(
      0.08 + power * 0.25,
      5000,
      0.7,
      0.55 + power * 0.3,
      "lowpass",
      300,
    );
    this.thump(0.1 + power * 0.2, 160, 40, 0.6 + power * 0.3);
  }

  public hit() {
    if (!this.ready("hit", 30)) return;
    this.burst(0.07, 900, 3, 0.35, "bandpass", 300);
  }

  public splat() {
    if (!this.ready("splat", 35)) return;
    this.burst(0.22, 700, 1.5, 0.5, "lowpass", 120);
    this.thump(0.12, 90, 45, 0.35);
  }

  public hurt() {
    if (!this.ready("hurt", 80)) return;
    this.thump(0.18, 220, 70, 0.5);
    this.burst(0.12, 1800, 2, 0.25, "bandpass", 500);
  }

  /** TNT: a long rumble under a sharp crack. */
  public explosion() {
    if (!this.ready("explosion", 120)) return;
    this.burst(1.4, 4000, 0.6, 1.1, "lowpass", 50);
    this.burst(0.25, 6000, 0.8, 0.8, "lowpass", 800);
    this.thump(0.9, 110, 22, 1.2);
  }

  /** Picking up a power-up: a quick rising chirp. */
  public powerUp() {
    if (!this.ready("powerUp", 60)) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  /** A zombie bounces off the shield bubble. */
  public shieldHit() {
    if (!this.ready("shieldHit", 70)) return;
    this.burst(0.09, 2400, 6, 0.22, "bandpass", 1200);
  }

  /** The shield runs out. */
  public shieldDown() {
    if (!this.ready("shieldDown", 100)) return;
    this.burst(0.35, 3000, 2, 0.4, "bandpass", 300);
  }
}
