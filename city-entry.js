(() => {
  'use strict';
  const stage=document.getElementById('stage'),gate=document.getElementById('city-gate'),label=document.getElementById('city-gate-label'),message=document.getElementById('city-entry-message'),meter=document.getElementById('city-entry-light'),pause=document.getElementById('city-entry-pause');
  if(!stage||!gate)return;
  let light=100,depth=0,paused=false,last=0,dragged=false,start=null;
  window.cityEntryLight=()=>light;
  stage.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};dragged=false;});
  stage.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>7)dragged=true;});
  stage.addEventListener('pointerup',()=>{start=null;});
  gate.addEventListener('click',()=>{
    if(dragged)return;
    if(light<=0){light=100;depth=0;}
    depth++;light=Math.min(100,light+10);
    stage.classList.toggle('city-near',depth===1);stage.classList.toggle('city-closer',depth>=2);
    label.textContent=depth===1?'Closer. Tap again.':depth===2?'One more tap. Play Furious Roll.':'Play Furious Roll';
    gate.setAttribute('aria-label',depth>=2?'Play Furious Roll':'Get closer to the city');
    message.textContent=depth===1?'You found the city.':depth===2?'Roll the world up.':'Furious Roll is waiting.';
    stage.dispatchEvent(new CustomEvent('city-approach',{detail:{enter:depth>=3}}));
  });
  pause.addEventListener('pointerdown',e=>e.stopPropagation());
  pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume game':'Pause game';pause.setAttribute('aria-pressed',String(paused));});
  function frame(now){const dt=Math.min(last?(now-last)/1000:0,.1);last=now;const portal=document.getElementById('game-portal');if(!document.hidden&&!paused&&!portal.open){light=Math.max(0,light-dt*.45);meter.value=light;if(light<=0){message.textContent='The city dimmed. Tap to bring it back.';label.textContent='Restore the city';}else if(depth===0)message.textContent=`City light ${Math.ceil(light)}%. Get closer.`;}requestAnimationFrame(frame);}
  document.addEventListener('visibilitychange',()=>last=0);requestAnimationFrame(frame);
})();
