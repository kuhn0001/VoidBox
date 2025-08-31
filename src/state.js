// state.js
export const store = {
  game:   { running: true, frame: 0, lastTime: performance.now() },
  world:  { wave: 1, score: 0, parts: 0 },
  player: { hp: 180, hpMax: 180, x: 480, y: 480 },
  boss:   { active: false, hp: 0, hpMax: 0 },
  spawner:{ left: 0, timer: 0, interval: 0.8 },
  ui:     { paused: false, showShop: false, showLevel: false, announce: '' },
};

export const setGame   = (patch)=>Object.assign(store.game, patch);
export const setWorld  = (patch)=>Object.assign(store.world, patch);
export const setPlayer = (patch)=>Object.assign(store.player, patch);
export const setBoss   = (patch)=>Object.assign(store.boss, patch);
export const setSpawn  = (patch)=>Object.assign(store.spawner, patch);
export const setUI     = (patch)=>Object.assign(store.ui, patch);
