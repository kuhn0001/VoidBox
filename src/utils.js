// utils.js
export const W=960, H=540;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const rand=(a=1,b=0)=>b+(a-b)*Math.random();
export const rndi=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
export const collide=(a,b)=>{ const dx=a.x-b.x, dy=a.y-b.y; const rr=(a.r||0)+(b.r||0); return dx*dx+dy*dy<rr*rr; };

// Namespaced LocalStorage helpers
export const NS = 'voidbox';
export const LS = {
  load: (k, fallback)=>{ try{ const s=localStorage.getItem(`${NS}:${k}`); return s? JSON.parse(s): fallback; }catch{ return fallback; } },
  save: (k, v)=>{ try{ localStorage.setItem(`${NS}:${k}`, JSON.stringify(v)); }catch{} }
};
