// engine.js
import { store, setGame } from './state.js';
import { W, H, clamp } from './utils.js';

export function attachCanvas() {
  const cvs = document.getElementById('game');
  const ctx = cvs.getContext('2d');
  const stage = document.getElementById('stage');

  function resize() {
    // Size the canvas to the stage, but render in logical W×H units
    const rect = stage.getBoundingClientRect();
    const cssW = Math.floor(rect.width);
    const cssH = Math.floor(rect.height);
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    // CSS size for layout
    cvs.style.width = cssW + 'px';
    cvs.style.height = cssH + 'px';

    // Internal pixel buffer at DPR
    cvs.width = Math.floor(cssW * dpr);
    cvs.height = Math.floor(cssH * dpr);

    // Map logical game units (W×H) → internal pixels
    // This ensures all drawing uses game coords (0..W, 0..H),
    // regardless of CSS size or DPR.
    ctx.setTransform(cvs.width / W, 0, 0, cvs.height / H, 0, 0);
  }

  new ResizeObserver(resize).observe(stage);
  resize();

  // --- Pointer input: convert CSS → game coords using the CANVAS rect ---
  const mouse = { x: W / 2, y: H * 0.8 };

  function pointFromEvent(e) {
    const r = cvs.getBoundingClientRect();
    const cx = 'clientX' in e ? e.clientX : e.touches[0].clientX;
    const cy = 'clientY' in e ? e.clientY : e.touches[0].clientY;
    const scaleX = W / r.width;   // CSS px → game units
    const scaleY = H / r.height;
    return { x: (cx - r.left) * scaleX, y: (cy - r.top) * scaleY };
  }

  // Mouse / pointer
  cvs.addEventListener('mousemove', (e) => {
    const p = pointFromEvent(e);
    mouse.x = p.x; mouse.y = p.y;
  });

  // Touch (iOS / tablets)
  cvs.addEventListener('touchstart', (e) => {
    const p = pointFromEvent(e);
    mouse.x = p.x; mouse.y = p.y;
    e.preventDefault();
  }, { passive: false });

  cvs.addEventListener('touchmove', (e) => {
    const p = pointFromEvent(e);
    mouse.x = p.x; mouse.y = p.y;
    e.preventDefault();
  }, { passive: false });

  // Optional: track drag outside canvas while pressed
  window.addEventListener('pointermove', (e) => {
    if (e.buttons) {
      const p = pointFromEvent(e);
      mouse.x = p.x; mouse.y = p.y;
    }
  });

  return { cvs, ctx, mouse };
}

export function makeLoop(step, render) {
  let booted = false;
  function frame(now) {
    const dt = Math.min(0.033, (now - store.game.lastTime) / 1000);
    setGame({ lastTime: now, frame: store.game.frame + 1 });
    if (store.game.running) step(dt);
    render(dt);
    if (!booted) { booted = true; /* loop is alive */ }
    requestAnimationFrame(frame);
  }
  // Boot watchdog
  setTimeout(() => {
    if (!booted) {
      const el = document.getElementById('announce');
      if (el) { el.textContent = '⚠️ Boot failed — check console for errors'; el.classList.remove('hide'); }
    }
  }, 500);
  requestAnimationFrame(frame);
}

export function moveToward(pos, target, speed, dt) {
  const vx = target.x - pos.x, vy = target.y - pos.y;
  const d = Math.hypot(vx, vy);
  if (d > 1) {
    pos.x = clamp(pos.x + (vx / d) * speed * dt, 20, W - 20);
    pos.y = clamp(pos.y + (vy / d) * speed * dt, 20, H - 20);
  }
}
