// spawner.js
import { store, setWorld, setSpawn } from './state.js';
import { rndi } from './utils.js';
import { spawnEnemy, newBoss } from './entities.js';

export function initWave(world){
  const bossWave = (store.world.wave % 2 === 0);
  if (bossWave){
    world.boss = newBoss(); setSpawn({ left:0, timer:0 });
    announce(`BOSS — Wave ${store.world.wave}`);
  } else {
    const left = 6 + Math.floor(store.world.wave*1.5);
    setSpawn({ left, timer:0, interval: Math.max(0.28, 0.95 - store.world.wave*0.05) });
    announce(`Wave ${store.world.wave}`);
  }
}

export function stepSpawner(world, dt){
  const bossWave = (store.world.wave % 2 === 0);
  if (!bossWave){
    const sp = store.spawner;
    setSpawn({ timer: sp.timer + dt });
    if (store.spawner.left > 0 && store.spawner.timer >= store.spawner.interval){
      setSpawn({ timer: 0, left: store.spawner.left - 1 });
      const types = ['grunt','grunt','grunt','bruiser','viper'];
      const pick = types[rndi(0, types.length-1)];
      world.enemies.push(spawnEnemy(pick, Math.random()*920+20, -rndi(20,200)));
    }
  }
  // Auto-advance if nothing is happening
  const empty = world.enemies.length===0 && !world.boss && store.spawner.left===0;
  if (empty){ setWorld({ wave: store.world.wave + 1 }); initWave(world); }
}

function announce(text){ const el=document.getElementById('announce'); if(!el) return; el.textContent=text; el.classList.remove('hide'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add('hide'), 2200); }
