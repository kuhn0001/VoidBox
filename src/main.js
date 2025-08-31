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
