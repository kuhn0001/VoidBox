// state.js
import { LS } from './utils.js';

export const store = {
  game:   { running: true, frame: 0, lastTime: performance.now() },
  world:  { wave: 1, score: 0, parts: 0 },
  player: { hp: 180, hpMax: 180, x: 480, y: 480 },
  boss:   { active: false, hp: 0, hpMax: 0 },
  spawner:{ left: 0, timer: 0, interval: 0.8 },
  ui:     { paused: false, showShop: false, showLevel: false, announce: '' },

  // new generic stores
  kv:   {},         // key→value
  dict: {},         // dictionary-of-dictionaries

  // high scores + player name
  scores: [],
  playerName: '',
};

// --- setters ---
export const setGame   = (patch)=>Object.assign(store.game, patch);
export const setWorld  = (patch)=>Object.assign(store.world, patch);
export const setPlayer = (patch)=>Object.assign(store.player, patch);
export const setBoss   = (patch)=>Object.assign(store.boss, patch);
export const setSpawn  = (patch)=>Object.assign(store.spawner, patch);
export const setUI     = (patch)=>Object.assign(store.ui, patch);

// --- kv/dict helpers ---
export function setKV(k,v){ store.kv[k]=v; saveKV(); }
export function getKV(k, def=null){ return (k in store.kv)? store.kv[k] : def; }
export function setDict(bucket, obj){ store.dict[bucket] = { ...(store.dict[bucket]||{}), ...obj }; saveDict(); }
export function getDict(bucket){ return store.dict[bucket]||{}; }

// --- high score API ---
export function setPlayerName(name){
  store.playerName = (name||'').toString().slice(0,16);
  LS.save('playerName', store.playerName);
}
export function addScore(score){
  const entry = { name: store.playerName||'PILOT', score: Number(score)||0, ts: Date.now() };
  store.scores.push(entry);
  store.scores.sort((a,b)=>b.score-a.score);
  store.scores = store.scores.slice(0,10);
  LS.save('scores', store.scores);
}
export function getTopScore(){ return (store.scores[0]?.score)||0; }

// --- persistence ---
export function saveKV(){ LS.save('kv', store.kv); }
export function saveDict(){ LS.save('dict', store.dict); }

// Load on module init
(function boot(){
  store.playerName = LS.load('playerName','');
  store.scores = LS.load('scores', []);
  store.kv = LS.load('kv', {});
  store.dict = LS.load('dict', {});
})();
