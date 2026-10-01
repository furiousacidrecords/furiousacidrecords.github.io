(() => {
  'use strict';
  // Preserve bookmarked sections of the previous home page.
  if (/^#(?:books|merch|shop|forum|questions|fa-home-chat)$/.test(location.hash)) {
    location.replace('/catalog.html' + location.hash);
    return;
  }
  const sections = {
    updates: {number:'01', title:'Furious Acid Updates', description:'What happened to Furious Acid, and what comes next.', x:0,y:0, links:[['Read the updates','/me']]},
    books: {number:'02', title:'Furious Acid Books', description:'Explore the books and read sample pages.', x:0,y:-90, links:[['Browse books','/catalog.html#books'],['Read a sample','/excerpt-medicine.html']]},
    merch: {number:'03', title:'Furious Acid Merch', description:'The Furious Acid collection, direct from the shop.', x:0,y:-180, links:[['Open the merch shop','/merch/'],['Browse the collection','/catalog.html#merch']]},
    lab: {number:'04', title:'Furious Acid Lab Alpha', description:'A chemistry bench with live equations and the Purple Rabbit.', x:0,y:90, links:[['Enter Lab Alpha','/lab/']]},
    games: {number:'05', title:'Furious Acid Games', description:'A rabbit pilots a rabbit robot. Roll up the world, then take it to Mars.', x:-90,y:0, links:[['Play Furious Roll','/roll/']]},
    apps: {number:'06', title:'Furious Acid Apps + Chatbot', description:'Talk to the Purple Rabbit, work through a calculation, or create something.', x:90,y:0, links:[['Open the chatbot','/rabbit/'],['Calculator','/calc/'],['Custom Studio','/custom-studio.html'],['Weather for Roku','/weather/']]}
  };
  const stage = document.getElementById('stage');
  const cube = document.getElementById('cube');
  const motion = document.getElementById('motion');
  const motionLabel = document.getElementById('motion-label');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const faceButtons = [...cube.querySelectorAll('[data-select]')];
  let x=-22,y=-35,paused=reduced.matches,drag=null,snap=null,vx=0,vy=0;
  let holdUntil=0,lastFrame=0,suppressClick=false;
  const nearest = (current,target) => current + ((target-current+180)%360+360)%360-180;
  function draw() {
    cube.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
    const rx=x*Math.PI/180,ry=y*Math.PI/180;
    const facing={updates:Math.cos(rx)*Math.cos(ry),books:-Math.cos(rx)*Math.sin(ry),merch:-Math.cos(rx)*Math.cos(ry),lab:Math.cos(rx)*Math.sin(ry),games:-Math.sin(rx),apps:Math.sin(rx)};
    faceButtons.forEach(button => {
      button.dataset.facing = String(facing[button.dataset.select]);
      const visible = facing[button.dataset.select] > .13;
      button.style.opacity = visible ? '1' : '0';
      button.style.pointerEvents = visible ? 'auto' : 'none';
      button.tabIndex = visible ? 0 : -1;
      button.setAttribute('aria-hidden', String(!visible));
    });
  }
  function updateMotion() {
    motion.textContent = paused ? 'Resume rotation' : 'Pause rotation';
    motion.setAttribute('aria-pressed',String(paused));
    motionLabel.textContent = paused ? 'ROTATION PAUSED' : 'SLOW ROTATION';
  }
  function select(key) {
    const section=sections[key]; if (!section) return;
    vx=vy=0;holdUntil=performance.now()+12000;
    if (reduced.matches) {x=section.x;y=nearest(y,section.y);snap=null;draw();}
    else snap={x:nearest(x,section.x),y:nearest(y,section.y)};
    document.querySelectorAll('.planes [data-select]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.select===key)));
    document.getElementById('destination-number').textContent=section.number+' / FURIOUS ACID';
    document.getElementById('destination-title').textContent=section.title;
    document.getElementById('destination-description').textContent=section.description;
    document.getElementById('destination-links').replaceChildren(...section.links.map(([label,url])=>{
      const link=document.createElement('a');link.textContent=label;link.href=url;return link;
    }));
    document.getElementById('destination').hidden=false;
  }
  document.querySelectorAll('[data-select]').forEach(button=>button.addEventListener('click',()=>{if(!suppressClick)select(button.dataset.select);}));
  stage.addEventListener('pointerdown',event=>{
    if(!event.isPrimary || event.button!==0)return;
    suppressClick=false;snap=null;vx=vy=0;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,time:performance.now(),moved:false};
    // Capture only after movement, so a tap still reaches the face button.
  });
  stage.addEventListener('pointermove',event=>{
    if(!drag || event.pointerId!==drag.id)return;
    const now=performance.now(),dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>7){drag.moved=true;stage.setPointerCapture(event.pointerId);stage.classList.add('dragging');}
    if(drag.moved){y+=dx*.36;x-=dy*.36;const dt=Math.max(8,now-drag.time);vy=dx*.36/dt;vx=-dy*.36/dt;draw();}
    drag.x=event.clientX;drag.y=event.clientY;drag.time=now;
  });
  function release(event){
    if(!drag || event.pointerId!==drag.id)return;
    suppressClick=drag.moved;
    if(performance.now()-drag.time>90 || reduced.matches || event.type==='pointercancel')vx=vy=0;
    holdUntil=performance.now()+5000;drag=null;stage.classList.remove('dragging');
    if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
    setTimeout(()=>{suppressClick=false;},0);
  }
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
  stage.addEventListener('lostpointercapture',event=>{if(drag)release(event);});
  stage.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}},true);
  // Release a tap that ends outside the stage as well.
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  stage.addEventListener('keydown',event=>{
    if(event.target!==stage)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();snap=null;vx=vy=0;holdUntil=performance.now()+12000;
      y+=(event.key==='ArrowRight'?15:event.key==='ArrowLeft'?-15:0);
      x+=(event.key==='ArrowDown'?-15:event.key==='ArrowUp'?15:0);draw();
    }
    if(event.key==='Enter' || event.key===' '){event.preventDefault();const face=faceButtons.filter(b=>b.getAttribute('aria-hidden')==='false').sort((a,b)=>Number(b.dataset.facing)-Number(a.dataset.facing));if(face[0])select(face[0].dataset.select);}
  });
  motion.addEventListener('click',()=>{paused=!paused;vx=vy=0;holdUntil=0;updateMotion();});
  document.getElementById('reset').addEventListener('click',()=>{
    x=-22;y=-35;snap=null;vx=vy=0;holdUntil=performance.now()+3000;
    document.getElementById('destination').hidden=true;
    document.querySelectorAll('.planes [data-select]').forEach(b=>b.setAttribute('aria-pressed','false'));draw();
  });
  reduced.addEventListener('change',()=>{paused=reduced.matches;vx=vy=0;if(snap){x=snap.x;y=snap.y;snap=null;}updateMotion();draw();});
  document.addEventListener('visibilitychange',()=>{lastFrame=0;vx=vy=0;});
  function frame(now){
    const dt=Math.min(lastFrame?now-lastFrame:16,40);lastFrame=now;
    const keyboardFocus=stage.contains(document.activeElement) || document.getElementById('destination').contains(document.activeElement);
    if(!document.hidden && !drag){
      if(snap){const amount=1-Math.exp(-dt/150);x+=(snap.x-x)*amount;y+=(snap.y-y)*amount;if(Math.abs(snap.x-x)+Math.abs(snap.y-y)<.08){x=snap.x;y=snap.y;snap=null;}}
      else if(Math.abs(vx)+Math.abs(vy)>.002){x+=vx*dt;y+=vy*dt;const decay=Math.exp(-dt/220);vx*=decay;vy*=decay;}
      else if(!paused && !keyboardFocus && now>holdUntil){y+=dt*.0045;x+=(-22-x)*.002;}
      draw();
    }
    requestAnimationFrame(frame);
  }
  updateMotion();draw();requestAnimationFrame(frame);
})();
