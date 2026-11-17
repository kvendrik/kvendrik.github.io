// UI sounds for the controls, the way beautifului.dev makes them: synthesized with Web Audio
// from short recipes of filtered noise and tones (no audio files), at a quiet master volume.
// - press:   a tiny high-passed noise transient plus a 680 Hz blip (selecting, buttons)
// - tick:    a short square wave through a band-pass (sliders, toggles, opening and closing)
// - release: a soft low-passed noise brush (deselecting, closing, cancelling)
// - pulse:   a round 330 Hz tone (sending)
// The browser only allows sound after the first click or key press.
(() => {
  let ctx = null;
  let master = null;
  let noise = null;

  const wake = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC({ latencyHint: 'interactive' });
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  addEventListener('pointerdown', wake, { capture: true, passive: true });
  addEventListener('keydown', wake, { capture: true });

  const whiteNoise = () => {
    if (!noise) {
      noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.25), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noise;
  };

  // one layer: a source (tone or noise), an optional filter, an attack/decay envelope, a gain
  const layer = ({ source, filter, envelope, gain }) => {
    const t = ctx.currentTime;
    const { attack = 0.001, decay = 0.05, release = 0 } = envelope;
    const end = t + attack + decay + release;
    let src;
    if (source.type === 'noise') {
      src = ctx.createBufferSource();
      src.buffer = whiteNoise();
    } else {
      src = ctx.createOscillator();
      src.type = source.type;
      const f = source.frequency;
      if (typeof f === 'object') {
        src.frequency.setValueAtTime(f.start, t);
        src.frequency.exponentialRampToValueAtTime(f.end, t + attack + decay);
      } else {
        src.frequency.value = f;
      }
    }
    let node = src;
    if (filter) {
      const bq = ctx.createBiquadFilter();
      bq.type = filter.type;
      bq.frequency.value = filter.frequency;
      if (filter.resonance) bq.Q.value = filter.resonance;
      node.connect(bq);
      node = bq;
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay + release);
    node.connect(env).connect(master);
    src.start(t);
    src.stop(end + 0.02);
  };

  const RECIPES = {
    press: [
      { source: { type: 'noise' }, filter: { type: 'highpass', frequency: 2400 }, envelope: { attack: 0.0003, decay: 0.009 }, gain: 0.13 },
      { source: { type: 'sine', frequency: 680 }, envelope: { attack: 0.0006, decay: 0.022, release: 0.008 }, gain: 0.24 },
    ],
    tick: [
      { source: { type: 'square', frequency: 2100 }, filter: { type: 'bandpass', frequency: 2600, resonance: 1.6 }, envelope: { attack: 0.0004, decay: 0.028 }, gain: 0.24 },
    ],
    release: [
      { source: { type: 'noise' }, filter: { type: 'lowpass', frequency: 1600, resonance: 0.9 }, envelope: { attack: 0.001, decay: 0.055 }, gain: 0.32 },
    ],
    pulse: [
      { source: { type: 'sine', frequency: 330 }, filter: { type: 'lowpass', frequency: 2200 }, envelope: { attack: 0.002, decay: 0.13, release: 0.04 }, gain: 0.5 },
    ],
  };

  // what each moment in the controls sounds like
  const MOMENTS = {
    select: 'press',
    deselect: 'release',
    tick: 'tick',
    open: 'tick',
    close: 'release',
    edit: 'press',
    sent: 'pulse',
    error: 'release',
  };

  // slider ticks are throttled, so a fast drag sounds like detents, not a buzz
  let lastTick = 0;
  window.uiSound = (moment) => {
    const recipe = RECIPES[MOMENTS[moment]];
    if (!recipe || !wake()) return;
    if (moment === 'tick') {
      const now = performance.now();
      if (now - lastTick < 40) return;
      lastTick = now;
    }
    try {
      recipe.forEach(layer);
    } catch {}
  };
})();
