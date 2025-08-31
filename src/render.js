// render.js
import { store } from './state.js';
import { W,H } from './utils.js';

const starsA=Array.from({length:80},()=>({x:Math.random()*W,y:Math.random()*H}));
const starsB=Array.from({length:60},()=>({x:Math.random()*W,y:Math.random()*H}));
const COLORS={ bullet:'#5eead4', enemy:'#8ab4ff', boss:'#f87171', ship:'#5eead4' };

export function renderAll(ctx, world){
  // Parallax background
  ctx.clearRect(0,0, W,H);
  ctx.globalAlpha=0.25; for(const s of starsA){ s.y+=20*(1/60); if(s.y>H) s.y-=H; dot(ctx,s.x,s.y,1,'#5eead433'); }
  ctx.globalAlpha=0.10; for(const s of starsB){ s.y+=50*(1/60); if(s.y>H) s.y-=H; dot(ctx,s.x,s.y,1.2,'#f472b633'); }
  ctx.globalAlpha=1;

  // Entities
  for(const e of world.enemies) drawEnemy(ctx,e);
  for(const b of world.enemyBullets) dot(ctx,b.x,b.y,b.r,b.col);
  for(const b of world.bullets) dot(ctx,b.x,b.y,b.r,b.col);
  if(world.boss) drawBoss(ctx, world.boss);
  drawShip(ctx, world.player.x, world.player.y, COLORS.ship);

  // HUD
  const hudP1=document.getElementById('hudP1');
  const hudCenter=document.getElementById('hudCenter');
  if (hudP1){ const hpPct=Math.round(store.player.hp/store.player.hpMax*100);
    hudP1.innerHTML=`<div class="hud-title">PILOT</div>
      <div class="row"><div>HP ${hpPct}%</div></div>
      <div class="bar"><span style="width:${hpPct}%"></span></div>`;
  }
  if (hudCenter){
    hudCenter.innerHTML=`<div class="hud-title">WAVE</div>
      <div> ${store.world.wave}${store.boss.active?' (BOSS)':''} • SCORE ${store.world.score} </div>`;
  }
  const versionBadge=document.getElementById('versionBadge');
  if (versionBadge){ versionBadge.textContent = `Void Skies v1.1.2 • 1P | wave ${store.world.wave} | score ${store.world.score}`; }
}

function dot(ctx,x,y,r,c){ ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }

function drawShip(ctx,x,y,col){
  ctx.save(); ctx.translate(x,y);
  ctx.beginPath(); ctx.moveTo(0,-16); ctx.lineTo(12,12); ctx.lineTo(-12,12); ctx.closePath();
  const grad=ctx.createLinearGradient(0,-16,0,12); grad.addColorStop(0,col); grad.addColorStop(1,'#0ea5e9');
  ctx.fillStyle=grad; ctx.fill(); ctx.shadowColor=col; ctx.shadowBlur=12; ctx.lineWidth=2; ctx.strokeStyle=col; ctx.stroke();
  ctx.shadowBlur=0; ctx.lineWidth=1; ctx.strokeStyle='rgba(255,255,255,.4)';
  ctx.beginPath(); ctx.moveTo(-12,8); ctx.lineTo(-20,4); ctx.moveTo(12,8); ctx.lineTo(20,4); ctx.stroke();
  ctx.globalAlpha=.85; ctx.fillStyle='rgba(94,234,212,.35)'; ctx.beginPath(); ctx.ellipse(0,14,6,3,0,0,Math.PI*2); ctx.fill(); ctx.restore();
}
function drawEnemy(ctx,e){ dot(ctx,e.x,e.y,e.r,'#9ca3af'); }
function drawBoss(ctx,b){ ctx.save(); ctx.translate(b.x,b.y); ctx.strokeStyle='#f87171'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,b.r,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
