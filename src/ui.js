// ui.js
import { setUI } from './state.js';

export function wireUI(startGame){
  const pausePanel=document.getElementById('pausePanel');
  const gameOverPanel=document.getElementById('gameOverPanel');
  const restartBtn=document.getElementById('restartBtn');
  const settingsPanel=document.getElementById('settingsPanel');
  const closeSettings=document.getElementById('closeSettings');
  const shopPanel=document.getElementById('shopPanel');

  hide(pausePanel); hide(gameOverPanel); hide(settingsPanel); hide(shopPanel);

  document.getElementById('menuBtn')?.addEventListener('click',()=>show(settingsPanel));
  closeSettings?.addEventListener('click',()=>hide(settingsPanel));
  restartBtn?.addEventListener('click',()=>{ hide(gameOverPanel); startGame(); });

  // Pause
  addEventListener('keydown',e=>{
    if(e.key==='p'||e.key==='P'){
      if(pausePanel.classList.contains('hide')) show(pausePanel); else hide(pausePanel);
    }
  });

  return { pausePanel, gameOverPanel, shopPanel };
}

export function gameOver(){
  const p=document.getElementById('gameOverPanel'); show(p);
}

function show(el){ if(el) el.classList.remove('hide'); }
function hide(el){ if(el) el.classList.add('hide'); }
