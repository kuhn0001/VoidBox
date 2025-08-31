// ui.js
import { store, setPlayerName, addScore } from './state.js';

export function wireUI(startGame){
  const pausePanel=document.getElementById('pausePanel');
  const gameOverPanel=document.getElementById('gameOverPanel');
  const restartBtn=document.getElementById('restartBtn');
  const settingsPanel=document.getElementById('settingsPanel');
  const closeSettings=document.getElementById('closeSettings');
  const shopPanel=document.getElementById('shopPanel');

  // High score / name panels added in index.html (see snippet below)
  const namePanel=document.getElementById('highScorePanel') || document.getElementById('namePanel');
  const nameInput=document.getElementById('playerNameInput') || document.getElementById('nameInput');
  const saveNameBtn=document.getElementById('saveScoreBtn') || document.getElementById('saveName');
  const cancelNameBtn=document.getElementById('cancelName') || document.getElementById('closeScoresBtn');

  hide(pausePanel); hide(gameOverPanel); hide(settingsPanel); hide(shopPanel);
  if (namePanel) hide(namePanel);

  document.getElementById('menuBtn')?.addEventListener('click',()=>show(settingsPanel));
  closeSettings?.addEventListener('click',()=>hide(settingsPanel));
  restartBtn?.addEventListener('click',()=>{ hide(gameOverPanel); startGame(); });

  // Pause toggle
  addEventListener('keydown',e=>{
    if(e.key==='p'||e.key==='P'){
      if(pausePanel.classList.contains('hide')) show(pausePanel); else hide(pausePanel);
    }
  });

  // Name entry handlers
  function openNamePanel(prefill=''){
    if (!namePanel) return;
    if (nameInput) nameInput.value = prefill || store.playerName || '';
    show(namePanel);
    nameInput?.focus();
  }
  function commitNameAndRecord(){
    const val = (nameInput?.value||'').trim().slice(0,16) || 'PILOT';
    setPlayerName(val);
    hide(namePanel);
    if (store._pendingScore!=null){
      addScore(store._pendingScore);
      delete store._pendingScore;
      show(gameOverPanel);
      // optional: refresh scoreboard list if the panel is open later
      const list=document.getElementById('scoreList');
      if (list) list.innerHTML = (store.scores||[]).map((s,i)=>`<li>${i+1}. ${escapeHtml(s.name)} — ${s.score}</li>`).join('');
    }
  }

  saveNameBtn?.addEventListener('click', commitNameAndRecord);
  cancelNameBtn?.addEventListener('click', ()=>{ if(namePanel) hide(namePanel); show(gameOverPanel); });
  nameInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') commitNameAndRecord(); });

  // Optional scoreboard panel wiring
  const scoreboardPanel=document.getElementById('scoreboardPanel');
  const scoreList=document.getElementById('scoreList');
  const closeScoresBtn=document.getElementById('closeScoresBtn');
  closeScoresBtn?.addEventListener('click',()=>hide(scoreboardPanel));

  function renderScoreboardList(){
    if (!scoreList) return;
    scoreList.innerHTML = (store.scores||[]).map((s,i)=>`<li>${i+1}. ${escapeHtml(s.name)} — ${s.score}</li>`).join('');
  }
  function showScoreboard(){
    if (!scoreboardPanel) return;
    renderScoreboardList();
    show(scoreboardPanel);
  }

  return { pausePanel, gameOverPanel, shopPanel, openNamePanel, showScoreboard };
}

// Override gameOver flow to include name & high-score persistence
export function gameOver(){
  const score = store.world.score;
  const haveName = (store.playerName || '').length>0;
  if (!haveName){
    store._pendingScore = score;
    const panel=document.getElementById('highScorePanel') || document.getElementById('namePanel');
    if (panel) panel.classList.remove('hide');
    const input=document.getElementById('playerNameInput') || document.getElementById('nameInput');
    input?.focus();
  } else {
    addScore(score);
    const panel=document.getElementById('gameOverPanel');
    if (panel) panel.classList.remove('hide');
  }
}

function show(el){ if(el) el.classList.remove('hide'); }
function hide(el){ if(el) el.classList.add('hide'); }
function escapeHtml(s){
  s = String(s ?? '');
  return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
}
