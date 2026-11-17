// Small UI sounds for the controls, synthesized with Web Audio (no audio files): a soft tap
// when you select something, fine ticks while a slider moves, little pops for opening and
// closing, and a two-note chime when changes are sent. Quiet by design. The browser only
// allows sound after the first click or key press, so the first interaction wakes it up.
(() => {
  let ctx = null;
  let out = null;
  const wake = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0.6; // master volume
      out.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  addEventListener('pointerdown', wake, { capture: true, passive: true });
  addEventListener('keydown', wake, { capture: true });

  // a short tone that glides from one pitch to another and dies away quickly
  const tone = ({ from, to = from, at = 0, length = 0.05, volume = 0.06, type = 'sine' }) => {
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + length);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(volume, t + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + length + 0.02);
  };

  // a tiny burst of filtered noise: the "click" of a physical switch
  let noise = null;
  const click = ({ at = 0, volume = 0.05, freq = 3500, length = 0.012 } = {}) => {
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = freq;
    band.Q.value = 1.2;
    const env = ctx.createGain();
    env.gain.setValueAtTime(volume, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(band).connect(env).connect(out);
    src.start(t);
    src.stop(t + length + 0.01);
  };

  const SOUNDS = {
    select: () => {
      click({ volume: 0.05, freq: 4200 });
      tone({ from: 1100, to: 820, length: 0.045, volume: 0.05 });
    },
    deselect: () => {
      click({ volume: 0.03, freq: 2600 });
      tone({ from: 620, to: 480, length: 0.04, volume: 0.03 });
    },
    // pitch follows the slider's position (0..1), like the detents of a dial
    tick: (pos = 0.5) => {
      click({ volume: 0.035, freq: 2800 + pos * 2400, length: 0.008 });
      tone({ from: 1500 + pos * 900, length: 0.018, volume: 0.018, type: 'triangle' });
    },
    open: () => {
      tone({ from: 520, to: 780, length: 0.07, volume: 0.045 });
      click({ volume: 0.025, freq: 3000 });
    },
    close: () => {
      tone({ from: 760, to: 500, length: 0.07, volume: 0.04 });
      click({ volume: 0.02, freq: 2400 });
    },
    edit: () => {
      tone({ from: 1320, length: 0.03, volume: 0.03 });
      tone({ from: 1760, at: 0.035, length: 0.04, volume: 0.025 });
    },
    sent: () => {
      tone({ from: 784, length: 0.22, volume: 0.06 });
      tone({ from: 784 * 2, length: 0.16, volume: 0.012, type: 'triangle' });
      tone({ from: 1175, at: 0.09, length: 0.32, volume: 0.06 });
      tone({ from: 1175 * 2, at: 0.09, length: 0.2, volume: 0.012, type: 'triangle' });
    },
    error: () => {
      tone({ from: 330, to: 300, length: 0.09, volume: 0.05, type: 'triangle' });
      tone({ from: 300, to: 270, at: 0.11, length: 0.12, volume: 0.05, type: 'triangle' });
    },
  };

  // ticks are throttled, so a fast drag sounds like a dial, not a buzz
  let lastTick = 0;
  window.uiSound = (name, arg) => {
    if (!wake() || !SOUNDS[name]) return;
    if (name === 'tick') {
      const now = performance.now();
      if (now - lastTick < 28) return;
      lastTick = now;
    }
    try {
      SOUNDS[name](arg);
    } catch {}
  };
})();
