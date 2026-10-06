(() => {
  'use strict';
  if (/^#(?:merch|shop)$/.test(location.hash)) {
    location.replace('https://vt.tiktok.com/ZPLedk8hg/');
    return;
  }
  // Preserve bookmarked sections of the previous home page.
  if (/^#(?:books|forum|questions|fa-home-chat)$/.test(location.hash)) {
    location.replace('/catalog.html' + location.hash);
    return;
  }
  const sections = {
    updates: {number:'01', title:'Updates', description:'The Purple Rabbit, the books, and the story behind 23.2K followers.', links:[['Read the story','/me/']]},
    books: {number:'02', title:'Books', description:'Visual growing layouts lead into indoor climate and experiments, then chemistry and drug discovery and a pictorial lab manual. The coloring book brings the art into your hands.', links:[['Browse books','/catalog.html#books'],['All editions on Amazon','https://www.amazon.com/stores/Furious-Acid/author/B0GWLWJBS6/allbooks']]},
    merch: {number:'03', title:'Merch', description:'The Purple Rabbit beyond the page. Open Furious Acid’s TikTok Shop for the current collection.', links:[['Open TikTok Shop','https://vt.tiktok.com/ZPLedk8hg/']]},
    lab: {number:'04', title:'Lab Alpha', description:'Enter the interactive chemistry bench. The reference spreadsheet is a separate destination.', links:[['Enter the lab','/lab/'],['Chemical reference','/list-chem.html']]},
    games: {number:'05', title:'Games', description:'Furious Roll: a rabbit pilots a rabbit robot, rolling up a world and taking it to Mars.', links:[['Play Furious Roll','/roll/']]},
    apps: {number:'06', title:'Apps + Chatbot', description:'Meet the Purple Rabbit, calculate, create, or check the weather.', links:[['Purple Rabbit','/rabbit/'],['Calculator','/calc/'],['Custom Studio','/custom-studio.html'],['Roku weather','/weather/']]}
  };
  const books = {
    medicine:{title:'The Chemistry Behind Medicine and Drug Discovery', description:'Hidden Passages, Volume 1. Chemistry and drug discovery — the red book in the Furious Acid collection.', asin:'B0GJPYPJTZ'},
    marijuana:{title:'Marijuana Manual: Technical Notebook', description:'A visual technical notebook for indoor lighting, bulb counts, and grow-room layout.', asin:'B0G8VLPS1K'},
    cultivation:{title:'Indoor Cultivation: Coca, Khat and Kratom', description:'The all-black book. Indoor climate modeling, photocatalytic experiments, and Raman spectrometry.', asin:'B0GPL18WSK'},
    synthesis:{title:'Drug Synthesis', description:'A pictorial lab manual, with English, Italian, and Spanish editions. Turn it to see the other English edition’s cover.', asin:'B0HCMMZF89'},
    coloring:{title:'Furious Acid Coloring Book', description:'The Purple Rabbit and Furious Acid art, ready to color. The art connects the books with the merchandise.', asin:'B0GW9BRT6X'}
  };
  const stage = document.getElementById('stage');
  const cube = document.getElementById('cube');
  const motion = document.getElementById('motion');
  const motionLabel = document.getElementById('motion-label');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const faceButtons = [...cube.querySelectorAll('[data-select]')];
  const bookButtons = [...cube.querySelectorAll('[data-book]')];
  // The inside of each glass plane carries a mirrored, non-interactive layer.
  // Keep it out of keyboard navigation and the accessibility tree.
  const reflections = faceButtons.map(content => {
    const reflection=content.cloneNode(true);
    reflection.classList.add('plane-reflection');
    reflection.removeAttribute('data-select');
    reflection.removeAttribute('role');
    reflection.removeAttribute('aria-label');
    reflection.setAttribute('aria-hidden','true');
    reflection.setAttribute('inert','');
    reflection.querySelectorAll('a,button').forEach(control=>{
      const visual=document.createElement('span');
      visual.className=control.className;
      visual.append(...control.childNodes);
      control.replaceWith(visual);
    });
    reflection.querySelectorAll('img').forEach(img=>{img.alt='';});
    content.parentElement.append(reflection);
    return reflection;
  });
  let activeKey = '';
  let hovering = false;
  let previewHoldUntil = 0;
  let suppressUntil = 0;
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
      button.tabIndex = button.matches('a,button') && visible ? 0 : -1;
      button.setAttribute('aria-hidden', String(!visible));
      button.querySelectorAll('a,button').forEach(control=>{control.tabIndex=visible ? 0 : -1;});
    });
    reflections.forEach((reflection,i)=>{
      const angle=facing[faceButtons[i].dataset.select];
      reflection.style.opacity=angle<-.05 ? String(.12+.2*Math.min(1,-angle)) : '0';
    });
    cube.style.setProperty('--gloss-x',`${50+Math.sin(ry+Math.PI/2)*38}%`);
    cube.style.setProperty('--gloss-y',`${45+Math.sin(rx)*30}%`);
  }
  function updateMotion() {
    motion.textContent = paused ? 'Resume rotation' : 'Pause rotation';
    motion.setAttribute('aria-pressed',String(paused));
    motionLabel.textContent = paused ? 'ROTATION PAUSED' : 'SLOW ROTATION';
  }
  function renderPreview(section,key,plane) {
    if(activeKey===key)return;
    activeKey=key;
    document.querySelectorAll('[data-select]').forEach(link=>link.classList.toggle('is-active',link.dataset.select===plane));
    document.getElementById('preview-number').textContent=section.number+' / FURIOUS ACID';
    document.getElementById('preview-title').textContent=section.title;
    document.getElementById('preview-description').textContent=section.description;
    document.getElementById('preview-links').replaceChildren(...section.links.map(([label,url])=>{
      const link=document.createElement('a');link.textContent=label;link.href=url;return link;
    }));
  }
  function preview(key) {
    if(sections[key])renderPreview(sections[key],key,key);
  }
  function previewBook(key) {
    const book=books[key];if(!book)return;
    previewHoldUntil=performance.now()+8000;
    const links=[['View this book on Amazon',`https://www.amazon.com/dp/${book.asin}`],['All five books','/catalog.html#books']];
    if(key==='synthesis')links.splice(1,0,['Other English edition','https://www.amazon.com/dp/B0H6LXN9L7']);
    renderPreview({number:'02',...book,links},'book-'+key,'books');
  }
  bookButtons.forEach(button=>{
    button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovering=true;previewBook(button.dataset.book);}});
    button.addEventListener('pointerleave',()=>{hovering=false;});
    button.addEventListener('focus',()=>{previewBook(button.dataset.book);});
    button.addEventListener('click',event=>{
      if(suppressClick || performance.now()<suppressUntil){event.preventDefault();return;}
      const turned=button.getAttribute('aria-pressed')!=='true';
      button.setAttribute('aria-pressed',String(turned));
      button.classList.toggle('is-turned',turned);
      holdUntil=performance.now()+8000;
      previewBook(button.dataset.book);
    });
  });
  document.querySelectorAll('[data-select]').forEach(link=>{
    link.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovering=true;previewHoldUntil=performance.now()+8000;preview(link.dataset.select);link.classList.remove('is-rippling');void link.offsetWidth;link.classList.add('is-rippling');}});
    link.addEventListener('pointerleave',()=>{hovering=false;});
    link.addEventListener('focus',()=>{previewHoldUntil=performance.now()+8000;preview(link.dataset.select);});
    link.addEventListener('click',event=>{
      if(suppressClick || performance.now()<suppressUntil){event.preventDefault();return;}
      link.classList.remove('is-rippling'); void link.offsetWidth;link.classList.add('is-rippling');
    });
  });
  const panel=document.getElementById('preview-panel');
  panel.addEventListener('pointerenter',()=>{hovering=true;});
  panel.addEventListener('pointerleave',()=>{hovering=false;previewHoldUntil=performance.now()+3000;});
  stage.addEventListener('pointerdown',event=>{
    if(!event.isPrimary || event.button!==0)return;
    suppressClick=false;snap=null;vx=vy=0;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,time:performance.now(),moved:false};
    // Capture only after movement, so a tap still reaches the face button.
  });
  stage.addEventListener('pointermove',event=>{
    if(!drag || event.pointerId!==drag.id)return;
    const now=performance.now(),dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.moved && Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>7){drag.moved=true;stage.setPointerCapture(event.pointerId);stage.classList.add('dragging');}
    if(drag.moved && event.cancelable)event.preventDefault();
    if(drag.moved){y+=dx*.36;x-=dy*.36;const dt=Math.max(8,now-drag.time);vy=dx*.36/dt;vx=-dy*.36/dt;draw();}
    drag.x=event.clientX;drag.y=event.clientY;drag.time=now;
  });
  function release(event){
    if(!drag || event.pointerId!==drag.id)return;
    suppressClick=drag.moved;
    if(drag.moved){
      suppressUntil=performance.now()+350;previewHoldUntil=0;
      const front=faceButtons.slice().sort((a,b)=>Number(b.dataset.facing)-Number(a.dataset.facing))[0];
      if(front)preview(front.dataset.select);
    }
    vx=vy=0;
    holdUntil=performance.now()+5000;drag=null;stage.classList.remove('dragging');
    if(stage.hasPointerCapture?.(event.pointerId))stage.releasePointerCapture(event.pointerId);
    setTimeout(()=>{suppressClick=false;},0);
  }
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
  // Touch starts with implicit capture on a face. Losing that capture while
  // transferring to the stage is expected and must not cancel the swipe.
  stage.addEventListener('lostpointercapture',event=>{if(event.target===stage && drag)release(event);});
  stage.addEventListener('dragstart',event=>event.preventDefault());
  stage.addEventListener('click',event=>{if(suppressClick || performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
  if(!('PointerEvent' in window)) {
    function touchPoint(touch,type) {
      return {pointerId:touch.identifier,isPrimary:true,button:0,clientX:touch.clientX,clientY:touch.clientY,type};
    }
    stage.addEventListener('touchstart',event=>{
      if(event.touches.length!==1)return;
      const touch=event.touches[0];suppressClick=false;snap=null;vx=vy=0;
      drag={id:touch.identifier,x:touch.clientX,y:touch.clientY,startX:touch.clientX,startY:touch.clientY,time:performance.now(),moved:false};
    },{passive:true});
    stage.addEventListener('touchmove',event=>{
      if(!drag)return;
      const touch=[...event.touches].find(item=>item.identifier===drag.id);if(!touch)return;
      const dx=touch.clientX-drag.x,dy=touch.clientY-drag.y;
      if(Math.hypot(touch.clientX-drag.startX,touch.clientY-drag.startY)>7)drag.moved=true;
      if(drag.moved){event.preventDefault();y+=dx*.36;x-=dy*.36;stage.classList.add('dragging');draw();}
      drag.x=touch.clientX;drag.y=touch.clientY;drag.time=performance.now();
    },{passive:false});
    function endTouch(event){const touch=[...event.changedTouches].find(item=>drag && item.identifier===drag.id);if(touch)release(touchPoint(touch,event.type==='touchcancel'?'pointercancel':'pointerup'));}
    window.addEventListener('touchend',endTouch);window.addEventListener('touchcancel',endTouch);
  }
  // Release a tap that ends outside the stage as well.
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  stage.addEventListener('keydown',event=>{
    if(event.target!==stage)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();snap=null;vx=vy=0;holdUntil=performance.now()+12000;
      y+=(event.key==='ArrowRight'?15:event.key==='ArrowLeft'?-15:0);
      x+=(event.key==='ArrowDown'?-15:event.key==='ArrowUp'?15:0);draw();
    }
    if(event.key==='Enter' || event.key===' '){event.preventDefault();const face=faceButtons.filter(b=>b.getAttribute('aria-hidden')==='false').sort((a,b)=>Number(b.dataset.facing)-Number(a.dataset.facing));if(face[0]?.matches('a,button'))face[0].click();else face[0]?.querySelector('button,a')?.focus();}
  });
  motion.addEventListener('click',()=>{paused=!paused;vx=vy=0;holdUntil=0;updateMotion();});
  document.getElementById('reset').addEventListener('click',()=>{
    x=-22;y=-35;snap=null;vx=vy=0;holdUntil=performance.now()+3000;
    bookButtons.forEach(button=>{button.classList.remove('is-turned');button.setAttribute('aria-pressed','false');});
    preview('updates');draw();
  });
  reduced.addEventListener('change',()=>{paused=reduced.matches;vx=vy=0;if(snap){x=snap.x;y=snap.y;snap=null;}updateMotion();draw();});
  document.addEventListener('visibilitychange',()=>{lastFrame=0;vx=vy=0;});
  function frame(now){
    const dt=Math.min(lastFrame?now-lastFrame:16,40);lastFrame=now;
    const keyboardFocus=stage.contains(document.activeElement) || document.getElementById('preview-panel').contains(document.activeElement) || document.querySelector('.planes').contains(document.activeElement);
    if(!document.hidden && !drag){
      if(snap){const amount=1-Math.exp(-dt/150);x+=(snap.x-x)*amount;y+=(snap.y-y)*amount;if(Math.abs(snap.x-x)+Math.abs(snap.y-y)<.08){x=snap.x;y=snap.y;snap=null;}}
      else if(Math.abs(vx)+Math.abs(vy)>.002){x+=vx*dt;y+=vy*dt;const decay=Math.exp(-dt/220);vx*=decay;vy*=decay;}
      else if(!paused && !hovering && !keyboardFocus && now>holdUntil){y+=dt*.0025;x+=(-22-x)*.002;}
      draw();
      if(!hovering && !keyboardFocus && now>previewHoldUntil) {
        const front=faceButtons.slice().sort((a,b)=>Number(b.dataset.facing)-Number(a.dataset.facing))[0];
        if(front)preview(front.dataset.select);
      }
    }
    requestAnimationFrame(frame);
  }
  updateMotion();draw();preview('updates');requestAnimationFrame(frame);
})();
