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
    games: {number:'05', title:'Furious Roll', description:'A rabbit pilots a rabbit robot. Roll the world up, then unroll it all on Mars.', links:[['Play Furious Roll','/roll/']]},
    apps: {number:'06', title:'Contact + Apps', description:'Get in touch with Zach through the submission form or the public contact email. The calculator, studio, and weather tools are here too.', links:[['Contact Zach','/contact/'],['Calculator','/calc/'],['Custom Studio','/custom-studio.html'],['Roku weather','/weather/']]}
  };
  const books = {
    medicine:{title:'The Chemistry Behind Medicine and Drug Discovery', description:'Hidden Passages, Volume 1. Chemistry and drug discovery — the red book in the Furious Acid collection.', asin:'B0GJPYPJTZ'},
    marijuana:{title:'Marijuana Manual: Technical Notebook', description:'A visual technical notebook for indoor lighting, bulb counts, and grow-room layout.', asin:'B0G8VLPS1K'},
    cultivation:{title:'Indoor Cultivation: Coca, Khat and Kratom', description:'The all-black book. Indoor climate modeling, photocatalytic experiments, and Raman spectrometry.', asin:'B0GPL18WSK'},
    synthesis:{title:'Drug Synthesis', description:'A pictorial lab manual, with English, Italian, and Spanish editions. Turn it to see the other English edition’s cover.', asin:'B0HCMMZF89'},
    coloring:{title:'Furious Acid Coloring Book', description:'The Purple Rabbit and Furious Acid art, ready to color. The art connects the books with the merchandise.', asin:'B0GW9BRT6X'}
  };
  // Topics come from the author's descriptions and existing public catalog.
  // Preview art is existing artwork, never fabricated interior pages.
  const interiors = {
    marijuana:{short:'Visual manual',color:'#b27a28',image:'/mj-page1.png',caption:'Actual sample · visual technical notebook',topics:[['Visual instructions','IKEA-style diagrams make the notebook visual: layouts, equipment, and the growing environment.'],['Lighting & layout','Bulb counts and room layout connect the drawings to the indoor environment.'],['The technical notebook','A visual entry point into the collection’s more detailed climate and research books.']],related:['cultivation','coloring'],connection:'Follow the drawings into climate modeling, or explore the visual side of the collection.'},
    cultivation:{short:'Climate models',color:'#007c91',image:'/coca-page3.png',caption:'Actual sample · botanical illustrations',topics:[['Indoor climate','Indoor cultivation and climate modeling extend the manual’s view of the growing environment.'],['Experimental methods','The author connects this book with photocatalytic experiments and Raman spectrometry.'],['Plant sources','Coca, khat, and kratom are the plants named in this research notebook.']],related:['marijuana','medicine','synthesis'],connection:'The growing environment connects to plant research, comparative methods, and chemistry.'},
    medicine:{short:'Chemistry & medicine',color:'#b63850',caption:'The red book · Hidden Passages, Volume 1',topics:[['Chemistry & medicine','The chemistry behind medicine and drug discovery, in the author’s Hidden Passages series.'],['Connected research','Plant research, chemical ideas, and the history of medicine meet in this part of the collection.'],['Comparative methods','A connection to the author’s broader interest in comparing research approaches.']],related:['cultivation','synthesis'],connection:'Follow plant research into chemistry, then explore the pictorial lab manual.'},
    synthesis:{short:'Pictorial research',color:'#7b4bb5',caption:'Actual cover · pictorial lab manual',topics:[['Pictorial lab manual','The author describes Drug Synthesis as a visual lab manual and a story best explored in the book itself.'],['Research connections','Comparative methods and plant-source research connect this book with the rest of the collection.'],['Editions','Explore the English editions and the Italian and Spanish versions from the catalog.']],related:['medicine','cultivation','coloring'],connection:'The chemistry connects back to plant research; the pictorial format connects to the collection’s art.'},
    coloring:{short:'Art & coloring',color:'#9559b8',caption:'Actual cover · Furious Acid Coloring Book',topics:[['Coloring book','The coloring title brings Furious Acid’s visual identity onto the page.'],['The Purple Rabbit','The character connects the books with the broader Furious Acid world.'],['Beyond the page','Follow the art into the merchandise collection and the game.']],related:['marijuana','synthesis'],connection:'A shared visual language runs through the diagrams, the pictorial manual, and the art.'}
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
  const cityElevations=[...cube.querySelectorAll('[data-city-side]')];
  let activeKey = '';
  let hovering = false;
  let previewHoldUntil = 0;
  let suppressUntil = 0;
  let x=-18,y=-68,paused=reduced.matches,drag=null,snap=null,vx=0,vy=0;
  let projectedBook='';
  const projection=document.getElementById('book-projection');
  const beam=document.getElementById('projection-beam');
  const world=document.getElementById('book-world');
  const gamePortal=document.getElementById('game-portal');
  const gameFrame=document.getElementById('game-frame');
  let gameTrigger=null;
  function playGame(key,trigger){
    const game={title:'Furious Roll',url:'/roll/'};
    if(typeof gamePortal.showModal!=='function'){location.href=game.url;return;}
    if(!gamePortal.open)gameTrigger=trigger || document.activeElement;
    document.getElementById('game-portal-title').textContent=game.title;gameFrame.title=game.title;gameFrame.src=game.url;
    document.getElementById('game-page').href=game.url;
    document.querySelectorAll('[data-play-game]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.playGame===key)));
    if(!gamePortal.open)gamePortal.showModal();
  }
  document.querySelectorAll('[data-play-game]').forEach(button=>button.addEventListener('click',()=>playGame(button.dataset.playGame)));
  document.getElementById('close-game').addEventListener('click',()=>gamePortal.close());
  gamePortal.addEventListener('close',()=>{gameFrame.removeAttribute('src');gameTrigger?.focus({preventScroll:true});});
  const bookCover=key=>bookButtons.find(button=>button.dataset.book===key).querySelector('.book-cover img').getAttribute('src');
  const bookControl=(key,className)=>{
    const button=document.createElement('button');button.type='button';button.className=className;button.dataset.exploreBook=key;button.setAttribute('aria-label','Explore '+books[key].title);
    const img=document.createElement('img');img.src=bookCover(key);img.alt='';img.draggable=false;
    const label=document.createElement('span');label.textContent=interiors[key].short;button.append(img,label);
    button.addEventListener('click',()=>openBook(key,true));return button;
  };
  document.getElementById('book-trail').replaceChildren(...Object.keys(books).map(key=>bookControl(key,'trail-book')));
  bookButtons.forEach(button=>{button.removeAttribute('aria-pressed');button.setAttribute('aria-label','Explore '+books[button.dataset.book].title);button.setAttribute('aria-controls','book-projection');button.setAttribute('aria-expanded','false');});
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
      button.querySelectorAll('a,button').forEach(control=>{control.tabIndex=visible ? 0 : -1;control.style.pointerEvents=visible ? 'auto' : 'none';});
    });
    reflections.forEach((reflection,i)=>{
      const angle=facing[faceButtons[i].dataset.select];
      reflection.style.opacity=angle<-.05 ? String(.12+.2*Math.min(1,-angle)) : '0';
    });
    cube.style.setProperty('--gloss-x',`${50+Math.sin(ry+Math.PI/2)*38}%`);
    cube.style.setProperty('--gloss-y',`${45+Math.sin(rx)*30}%`);
    // Four synthesized elevations keep the skyline upright in the same cube
    // coordinates. Blend neighbouring views at corners instead of showing
    // four opaque image walls. The terrain has its own top, sides and underside.
    const sideFacing=[Math.cos(ry),-Math.sin(ry),-Math.cos(ry),Math.sin(ry)];
    const strongest=Math.max(...sideFacing);
    cityElevations.forEach((plane,i)=>{
      const facing=sideFacing[i];
      const blend=Math.max(0,Math.min(1,(facing-strongest+.34)/.34));
      plane.style.opacity=String(blend);
    });
    drawBeam();
  }
  function drawBeam(){
    const button=bookButtons.find(item=>item.dataset.book===projectedBook);
    if(!button || projection.hidden || Number(button.closest('[data-select]').dataset.facing)<.13){beam.setAttribute('hidden','');return;}
    const origin=button.getBoundingClientRect(),target=projection.getBoundingClientRect(),area=world.getBoundingClientRect();
    const sx=origin.x+origin.width/2-area.x,sy=origin.y+origin.height/2-area.y;
    const side=target.x>origin.right;
    const tx=(side?target.x:target.x+target.width/2)-area.x,ty=(side?target.y+35:target.y)-area.y;
    const end1=side?[tx,ty]:[tx-35,ty],end2=side?[tx,ty+85]:[tx+35,ty];
    beam.removeAttribute('hidden');beam.setAttribute('viewBox',`0 0 ${area.width} ${area.height}`);
    beam.querySelector('.beam-fan').setAttribute('d',`M ${sx} ${sy} L ${end1.join(' ')} L ${end2.join(' ')} Z`);
    beam.querySelector('.beam-line').setAttribute('d',`M ${sx} ${sy} L ${tx} ${ty}`);
    const dot=beam.querySelector('circle');dot.setAttribute('cx',sx);dot.setAttribute('cy',sy);
  }
  function closeBook(){
    projectedBook='';projection.hidden=true;beam.setAttribute('hidden','');
    document.getElementById('preview-panel').classList.remove('is-projecting');
    bookButtons.forEach(button=>{button.classList.remove('is-projecting');button.setAttribute('aria-expanded','false');});
  }
  function openBook(key,pin=false){
    const book=books[key],inside=interiors[key];if(!book)return;
    const changed=projectedBook!==key;projectedBook=key;
    if(pin){snap={x:-12,y:nearest(y,-90)};holdUntil=performance.now()+12000;}
    previewHoldUntil=performance.now()+8000;
    const links=[['View on Amazon',`https://www.amazon.com/dp/${book.asin}`]];
    if(key==='synthesis')links.push(['Other English edition','https://www.amazon.com/dp/B0H6LXN9L7'],['All language editions','/catalog.html#books']);
    if(key==='coloring')links.push(['Explore merch','https://vt.tiktok.com/ZPLedk8hg/']);
    renderPreview({number:'02',...book,links},'book-'+key,'books');
    projection.hidden=false;document.getElementById('preview-panel').classList.add('is-projecting');
    document.getElementById('preview-panel').style.setProperty('--book-accent',inside.color);
    bookButtons.forEach(button=>{const selected=button.dataset.book===key;button.classList.toggle('is-projecting',selected);button.setAttribute('aria-expanded',String(selected));});
    document.querySelectorAll('.trail-book').forEach(button=>button.setAttribute('aria-current',String(button.dataset.exploreBook===key)));
    if(changed){
      const img=document.getElementById('projection-image');img.src=inside.image || bookCover(key);img.alt=inside.image?inside.caption+' from '+book.title:book.title+' cover';
      img.classList.toggle('is-page',Boolean(inside.image));img.dataset.book=key;
      document.getElementById('projection-art-caption').textContent=inside.caption;
      document.getElementById('projection-topics').replaceChildren(...inside.topics.map(([title,description],i)=>{
        const card=document.createElement('details');card.className='projection-topic';card.name='book-topics';card.open=i===0;card.style.setProperty('--assembly-step',i+1);
        const heading=document.createElement('summary');heading.textContent=title;const text=document.createElement('p');text.textContent=description;card.append(heading,text);return card;
      }));
      document.getElementById('connection-description').textContent=inside.connection;
      document.getElementById('connected-books').replaceChildren(...inside.related.map(related=>bookControl(related,'connected-book')));
      const assembly=document.getElementById('projection-assembly');assembly.classList.remove('is-assembling');void assembly.offsetWidth;assembly.classList.add('is-assembling');
    }
    const turned=bookButtons.find(button=>button.dataset.book===key).classList.contains('is-turned');
    document.getElementById('turn-book').setAttribute('aria-pressed',String(turned));
    document.getElementById('turn-book').textContent=turned?'Show front':'Turn book';
    if(key==='synthesis')document.getElementById('projection-image').src=bookButtons.find(button=>button.dataset.book===key).querySelector(turned?'.book-reverse img':'.book-cover img').getAttribute('src');
    if(pin && matchMedia('(max-width:780px)').matches)document.getElementById('preview-panel').scrollIntoView?.({block:'nearest',behavior:reduced.matches?'auto':'smooth'});
    drawBeam();
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
      const link=document.createElement('a');link.textContent=label;link.href=url;
      if(url==='/roll/')link.addEventListener('click',event=>{if(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;event.preventDefault();playGame('roll',link);});return link;
    }));
  }
  function preview(key) {
    if(sections[key]){closeBook();renderPreview(sections[key],key,key);}
  }
  function previewBook(key) {
    openBook(key);
  }
  bookButtons.forEach(button=>{
    button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovering=true;previewBook(button.dataset.book);}});
    button.addEventListener('pointerleave',()=>{hovering=false;});
    button.addEventListener('focus',()=>{previewBook(button.dataset.book);});
    button.addEventListener('click',event=>{
      if(suppressClick || performance.now()<suppressUntil){event.preventDefault();return;}
      openBook(button.dataset.book,true);
    });
  });
  document.querySelectorAll('[data-select]').forEach(link=>{
    link.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovering=true;previewHoldUntil=performance.now()+8000;if(!projectedBook || link.dataset.select!=='books')preview(link.dataset.select);link.classList.remove('is-rippling');void link.offsetWidth;link.classList.add('is-rippling');}});
    link.addEventListener('pointerleave',()=>{hovering=false;});
    link.addEventListener('focus',()=>{previewHoldUntil=performance.now()+8000;preview(link.dataset.select);});
    link.addEventListener('click',event=>{
      if(suppressClick || performance.now()<suppressUntil){event.preventDefault();return;}
      if(link.dataset.select==='games' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey){event.preventDefault();playGame('roll',link);return;}
      link.classList.remove('is-rippling'); void link.offsetWidth;link.classList.add('is-rippling');
    });
  });
  const panel=document.getElementById('preview-panel');
  document.getElementById('close-projection').addEventListener('click',()=>{preview('books');stage.focus({preventScroll:true});});
  document.getElementById('turn-book').addEventListener('click',()=>{
    const button=bookButtons.find(item=>item.dataset.book===projectedBook);if(!button)return;
    const turned=!button.classList.contains('is-turned');button.classList.toggle('is-turned',turned);
    document.getElementById('turn-book').setAttribute('aria-pressed',String(turned));document.getElementById('turn-book').textContent=turned?'Show front':'Turn book';
    if(projectedBook==='synthesis'){document.getElementById('projection-image').src=button.querySelector(turned?'.book-reverse img':'.book-cover img').getAttribute('src');}
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && projectedBook){preview('books');stage.focus({preventScroll:true});}});
  window.addEventListener('resize',drawBeam);
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
    if(!drag.moved && Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>7){drag.moved=true;closeBook();stage.setPointerCapture(event.pointerId);stage.classList.add('dragging');}
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
      if(!drag.moved && Math.hypot(touch.clientX-drag.startX,touch.clientY-drag.startY)>7){drag.moved=true;closeBook();}
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
    x=-18;y=-68;snap=null;vx=vy=0;holdUntil=performance.now()+3000;
    bookButtons.forEach(button=>{button.classList.remove('is-turned');});
    preview('books');draw();
  });
  reduced.addEventListener('change',()=>{paused=reduced.matches;vx=vy=0;if(snap){x=snap.x;y=snap.y;snap=null;}updateMotion();draw();});
  document.addEventListener('visibilitychange',()=>{lastFrame=0;vx=vy=0;});
  function frame(now){
    const dt=Math.min(lastFrame?now-lastFrame:16,40);lastFrame=now;
    const keyboardFocus=stage.contains(document.activeElement) || document.getElementById('preview-panel').contains(document.activeElement) || document.querySelector('.planes').contains(document.activeElement);
    if(!document.hidden && !drag){
      if(snap){const amount=1-Math.exp(-dt/150);x+=(snap.x-x)*amount;y+=(snap.y-y)*amount;if(Math.abs(snap.x-x)+Math.abs(snap.y-y)<.08){x=snap.x;y=snap.y;snap=null;}}
      else if(Math.abs(vx)+Math.abs(vy)>.002){x+=vx*dt;y+=vy*dt;const decay=Math.exp(-dt/220);vx*=decay;vy*=decay;}
      else if(!paused && !hovering && !keyboardFocus && !projectedBook && now>holdUntil){y+=dt*.0025;x+=(-22-x)*.002;}
      draw();
      if(!projectedBook && !hovering && !keyboardFocus && now>previewHoldUntil) {
        const front=faceButtons.slice().sort((a,b)=>Number(b.dataset.facing)-Number(a.dataset.facing))[0];
        if(front)preview(front.dataset.select);
      }
    }
    requestAnimationFrame(frame);
  }
  stage.addEventListener('city-approach',event=>{
    closeBook();snap={x:-27,y:nearest(y,-45)};holdUntil=performance.now()+12000;preview('games');
    if(event.detail?.enter)playGame('city',document.getElementById('city-gate'));
  });
  updateMotion();draw();preview('books');requestAnimationFrame(frame);
})();
