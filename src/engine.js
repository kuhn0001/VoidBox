// engine.js
import { store, setGame } from './state.js';
import { W,H, clamp } from './utils.js';

export function attachCanvas() {
  const cvs=document.getElementById('game');
  const ctx=cvs.getContext('2d');
  const stage=document.getElementById('stage');

  function resize(){
    const rect=stage.getBoundingClientRect();
    const cssW=Math.floor(rect.width), cssH=Math.floor(rect.height);
    const dpr=Math.max(1, Math.min(2, window.devicePixelRatio||1));
    cvs.style.width=cssW+'px'; cvs.style.height=cssH+'px';
    cvs.width=Math.floor(cssW*dpr); cvs.height=Math.floor(cssH*dpr);
    ctx.setTransform(cvs.width/cssW, 0, 0, cvs.height/cssH, 0, 0);
  }
  new ResizeObserver(resize).observe(stage); resize();

  // Input (mouse/touch → player target)
  const mouse={x:W/2,y:H*0.8};
  cvs.addEventListener('mousemove',e=>{ const r=cvs.getBoundingClientRect(); const sx=r.width/W, sy=r.height/H; mouse.x=(e.clientX-r.left)/sx; mouse.y=(e.clientY-r.top)/sy; });
  cvs.addEventListener('touchstart',e=>{ const t=e.touches[0]; const r=cvs.getBoundingClientRect(); const sx=r.width/W, sy=r.height/H; mouse.x=(t.clientX-r.left)/sx; mouse.y=(t.clientY-r.top)/sy; e.preventDefault(); }, {passive:false});
  cvs.addEventListener('touchmove', e=>{ const t=e.touches[0]; const r=cvs.getBoundingClientRect(); const sx=r.width/W, sy=r.height/H; mouse.x=(t.clientX-r.left)/sx; mouse.y=(t.clientY-r.top)/sy; e.preventDefault(); }, {passive:false});

  return { cvs, ctx, mouse };
}

export function makeLoop(step, render) {
  let booted=false;
  function frame(now){
    const dt=Math.min(0.033,(now-store.game.lastTime)/1000);
    setGame({ lastTime: now, frame: store.game.frame+1 });
    if (store.game.running) step(dt);
    render(dt);
    if (!booted){ booted=true; /* if we reached here, loop is alive */ }
    requestAnimationFrame(frame);
  }
  // Boot watchdog (in case of syntax error earlier, we’d never reach here)
  setTimeout(()=>{
    if (!booted) {
      const el=document.getElementById('announce');
      if (el){ el.textContent='⚠️ Boot failed — check console for errors'; el.classList.remove('hide'); }
    }
  }, 500);
  requestAnimationFrame(frame);
}

export function moveToward(pos, target, speed, dt){
  const vx=target.x-pos.x, vy=target.y-pos.y; const d=Math.hypot(vx,vy);
  if(d>1){ pos.x=clamp(pos.x+vx/d*speed*dt, 20, W-20); pos.y=clamp(pos.y+vy/d*speed*dt, 20, H-20); }
}
