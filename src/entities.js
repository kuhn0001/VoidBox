// entities.js
import { store, setPlayer, setBoss, setWorld } from './state.js';
import { W,H, clamp } from './utils.js';

export function createWorld(){
  return { player: newPlayer(), enemies:[], bullets:[], enemyBullets:[], boss:null };
}

export function newPlayer(){
  return { x:W*0.5, y:H-60, r:14, fireT:0, speed:200 };
}

export function stepPlayer(world, target, dt){
  // move toward target
  const vx=target.x-world.player.x, vy=target.y-world.player.y; const d=Math.hypot(vx,vy);
  if(d>1){ world.player.x=clamp(world.player.x+vx/d*world.player.speed*dt,20,W-20);
           world.player.y=clamp(world.player.y+vy/d*world.player.speed*dt,20,H-20); }
  // auto-fire
  world.player.fireT-=dt;
  if(world.player.fireT<=0){
    firePlayer(world); world.player.fireT=0.18;
  }
}
export function firePlayer(world){
  world.bullets.push({x:world.player.x-6,y:world.player.y-12, vx:0,vy:-380, r:3, col:'#5eead4', dmg:20, from:'p'});
  world.bullets.push({x:world.player.x+6,y:world.player.y-12, vx:0,vy:-380, r:3, col:'#5eead4', dmg:20, from:'p'});
}

export function spawnEnemy(type='grunt', x, y){
  const r = type==='bruiser'?12:12;
  const v = type==='viper'?120:70;
  const hp= type==='bruiser'?36:20;
  return { type, x, y, r, v, hp };
}

export function stepEnemy(e, dt){ e.y += e.v*dt; if(e.y>H+30) e.dead=true; if(Math.random()<0.004){ return {x:e.x,y:e.y,vx:0,vy:150,r:3,col:'#94a3b8',dmg:10}; } }

export function newBoss(){
  setBoss({ active:true, hp:600, hpMax:600 });
  return { x:W/2, y:-60, r:46, t:0 };
}
export function stepBoss(b, dt, world, target){
  b.t+=dt;
  if(b.y<100) b.y+=60*dt;
  b.x = clamp(b.x + Math.sin(b.t*0.8)*40*dt, 60, W-60);
  b.y = clamp(b.y, 60, H*0.6);
  if(Math.random()<0.02){
    world.enemyBullets.push({x:b.x,y:b.y, vx:Math.sin(b.t)*80, vy:180, r:4, col:'#f87171', dmg:12});
  }
}
export function bossHit(d){
  const hp=Math.max(0, store.boss.hp - d);
  setBoss({ hp });
  if(hp===0){ setBoss({ active:false, hpMax:0 }); setWorld({ score: store.world.score + 150 }); return true; }
  return false;
}
