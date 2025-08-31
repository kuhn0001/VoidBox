// main.js
import { store, setWorld, setPlayer, setBoss } from './state.js';
import { attachCanvas, makeLoop, moveToward } from './engine.js';
import { renderAll } from './render.js';
import { createWorld, stepPlayer, stepEnemy, stepBoss } from './entities.js';
import { collide } from './utils.js';
import { initWave, stepSpawner } from './spawner.js';
import { wireUI, gameOver as showGameOver } from './ui.js';

const { ctx, mouse } = (()=>{ const o=attachCanvas(); return { ctx:o.ctx, mouse:o.mouse }; })();
const ui = wireUI(startGame);
let world;

function startGame(){
  world = createWorld();
  setPlayer({ hp:180, hpMax:180, x:world.player.x, y:world.player.y });
  setWorld({ wave:1, score:0 });
  setBoss({ active:false, hp:0, hpMax:0 });
  initWave(world);
}

function step(dt){
  // Player
  stepPlayer(world, mouse, dt);

  // Spawner
  stepSpawner(world, dt);

  // Bullets
  for(const b of world.bullets){ b.x+=b.vx*dt; b.y+=b.vy*dt; if(b.y<-20) b.dead=true; }
  for(const b of world.enemyBullets){
    b.x+=b.vx*dt; b.y+=b.vy*dt; if(b.y>560) b.dead=true;
    if(collide(b, {x:world.player.x,y:world.player.y,r:14})){
      setPlayer({ hp: Math.max(0, store.player.hp - (b.dmg||10)) });
      if (store.player.hp===0) showGameOver();
      b.dead=true;
    }
  }

  // Enemies
  for(const e of world.enemies){
    const nb = stepEnemy(e, dt); if(nb) world.enemyBullets.push(nb);
    if(collide(e, {x:world.player.x,y:world.player.y,r:14})){
      setPlayer({ hp: Math.max(0, store.player.hp - 14) });
      e.dead=true; if (store.player.hp===0) showGameOver();
    }
  }

  // Player bullets → enemies/boss
  for(const b of world.bullets){
    if(world.boss && collide(b, {x:world.boss.x,y:world.boss.y,r:world.boss.r})){
      setBoss({ hp: Math.max(0, store.boss.hp - (b.dmg||20)) });
      b.dead=true;
      if (store.boss.hp===0){ world.boss=null; setBoss({ active:false }); setWorld({ wave: store.world.wave + 1, score: store.world.score + 150 }); initWave(world); }
      continue;
    }
    for(const e of world.enemies){
      if(!e.dead && collide(b,e)){ e.hp-= (b.dmg||20); b.dead=true; if(e.hp<=0){ e.dead=true; setWorld({ score: store.world.score + 5 }); } }
    }
  }

  // Boss
  if(world.boss){ stepBoss(world.boss, dt, world, mouse); if(collide(world.boss, {x:world.player.x,y:world.player.y,r:14})){ setPlayer({ hp: Math.max(0, store.player.hp - 18) }); if (store.player.hp===0) showGameOver(); } }

  // GC
  world.bullets = world.bullets.filter(b=>!b.dead);
  world.enemyBullets = world.enemyBullets.filter(b=>!b.dead);
  world.enemies = world.enemies.filter(e=>!e.dead);
}

function render(dt){
  renderAll(ctx, world);
}

startGame();
makeLoop(step, render);

/* === CONFIG === */
const CONFIG = {
  // Resolution / scaling
  baseWidth: 1280,
  baseHeight: 720,
  // Player feel
  playerMaxSpeed: 520,         // ↑ faster ship (px/sec)
  playerAccel: 2800,           // responsiveness (px/sec^2)
  playerFriction: 0.86,        // 0..1, higher = more glide
  turnLerp: 0.28,              // 0..1, rotation smoothing
  // Firing
  fireCooldownMs: 95,          // ↓ faster fire (lower = faster)
  bulletSpeed: 1100,           // faster projectiles
  bulletLifeMs: 900,
  // Visuals
  glow: true,
  glowShadowBlur: 18,
  starLayers: [
    { count: 160, speed: 12,  size: [1, 2],  color: "rgba(126,249,255,0.7)" },
    { count: 90,  speed: 38,  size: [1, 3],  color: "rgba(164,128,255,0.8)" },
    { count: 55,  speed: 90,  size: [2, 4],  color: "rgba(255,119,189,0.9)" }
  ]
};

/* === CANVAS WITH DEVICE-PIXEL-RATIO SCALING === */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.floor(window.innerWidth);
  const h = Math.floor(window.innerHeight);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // everything in CSS pixels
}
window.addEventListener("resize", resize);
resize();

/* === INPUT (mouse + keyboard) === */
const keys = new Set();
window.addEventListener("keydown", e => keys.add(e.code));
window.addEventListener("keyup", e => keys.delete(e.code));

const mouse = { x: window.innerWidth/2, y: window.innerHeight/2, down: false };
window.addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener("pointerdown", () => mouse.down = true);
window.addEventListener("pointerup",   () => mouse.down = false);

/* === WORLD OBJECTS === */
const player = {
  x: window.innerWidth/2,
  y: window.innerHeight/2,
  vx: 0, vy: 0,
  angle: 0,
  targetAngle: 0,
  radius: 16
};

const bullets = [];
let lastFire = 0;

/* === STARFIELD (3-layer parallax) === */
function rand(a,b){ return a + Math.random()*(b-a); }
const stars = CONFIG.starLayers.map(layer => ({
  ...layer,
  items: Array.from({length: layer.count}, () => ({
    x: Math.random()*window.innerWidth,
    y: Math.random()*window.innerHeight,
    r: rand(layer.size[0], layer.size[1])
  }))
}));

/* === UTILS === */
function lerp(a,b,t){ return a + (b-a)*t; }
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

/* === UPDATE === */
let prev = performance.now();
function loop(now){
  const dt = (now - prev) / 1000; // seconds
  prev = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* === GAME LOGIC === */
function update(dt){
  // Movement input
  let ax = 0, ay = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp"))    ay -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown"))  ay += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft"))  ax -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) ax += 1;

  // Normalize diagonal
  if (ax !== 0 || ay !== 0) {
    const m = Math.hypot(ax, ay);
    ax /= m; ay /= m;
  }

  // Acceleration -> velocity (frame-rate independent)
  player.vx += ax * CONFIG.playerAccel * dt;
  player.vy += ay * CONFIG.playerAccel * dt;

  // Clamp to max speed
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > CONFIG.playerMaxSpeed) {
    const s = CONFIG.playerMaxSpeed / speed;
    player.vx *= s; player.vy *= s;
  }

  // Friction for small smoothing (keeps control snappy)
  player.vx *= CONFIG.playerFriction;
  player.vy *= CONFIG.playerFriction;

  // Integrate position
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // Cursor aim + a touch of smoothing
  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  player.targetAngle = Math.atan2(dy, dx);
  // shortest-arc lerp for angle:
  let da = player.targetAngle - player.angle;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  player.angle = player.angle + da * CONFIG.turnLerp;

  // Auto-fire while mouse down or space held
  const wantFire = mouse.down || keys.has("Space");
  if (wantFire && (performance.now() - lastFire) > CONFIG.fireCooldownMs) {
    lastFire = performance.now();
    const cos = Math.cos(player.angle), sin = Math.sin(player.angle);
    bullets.push({
      x: player.x + cos * (player.radius + 6),
      y: player.y + sin * (player.radius + 6),
      vx: cos * CONFIG.bulletSpeed,
      vy: sin * CONFIG.bulletSpeed,
      born: performance.now()
    });
  }

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--){
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (performance.now() - b.born > CONFIG.bulletLifeMs ||
        b.x < -50 || b.y < -50 ||
        b.x > window.innerWidth+50 || b.y > window.innerHeight+50) {
      bullets.splice(i,1);
    }
  }

  // Move stars (parallax scroll to the left)
  for (const layer of stars) {
    for (const s of layer.items) {
      s.x -= layer.speed * dt;
      if (s.x < -5) {
        s.x = window.innerWidth + 5;
        s.y = Math.random() * window.innerHeight;
      }
    }
  }

  // HUD
  const hud = document.getElementById("hud");
  if (hud) {
    hud.textContent = `SPD ${Math.round(speed)}  |  BUL ${bullets.length}`;
  }
}

/* === RENDER === */
function render(){
  // Clear
  ctx.fillStyle = "#05070b";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Stars
  for (const layer of stars) {
    ctx.fillStyle = layer.color;
    for (const s of layer.items) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // Bullets (neon glow)
  for (const b of bullets) {
    if (CONFIG.glow) {
      ctx.save();
      ctx.shadowColor = "#7ef9ff";
      ctx.shadowBlur = CONFIG.glowShadowBlur;
    }
    ctx.fillStyle = "#b3fcff";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
    ctx.fill();
    if (CONFIG.glow) ctx.restore();
  }

  // Player ship (simple neon triangle)
  const r = player.radius;
  if (CONFIG.glow) {
    ctx.save();
    ctx.shadowColor = "#ff6ad5";
    ctx.shadowBlur = CONFIG.glowShadowBlur;
  }
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r*0.8, r*0.6);
  ctx.lineTo(-r*0.6, 0);
  ctx.lineTo(-r*0.8, -r*0.6);
  ctx.closePath();
  ctx.fillStyle = "#ff8bd6";
  ctx.strokeStyle = "#ffe0f5";
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  ctx.setTransform(1,0,0,1,0,0); // reset transform
  if (CONFIG.glow) ctx.restore();
}

