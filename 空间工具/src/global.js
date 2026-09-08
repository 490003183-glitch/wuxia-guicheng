// Copyright (c) 2026 mtgh. LicenseRef-mtgh-Noncommercial-1.0; see LICENSE-TOOLS at repository root.

(()=>{
  const root=document.getElementById('wxgc-space-r01');
  const D=JSON.parse(document.getElementById('wx-data').textContent);
  const $=s=>root.querySelector(s), map=$('#wx-map'), sel=$('#wx-scene');
  const NS='http://www.w3.org/2000/svg', by=Object.fromEntries(D.scenes.map(s=>[s.id,s]));
  const series=['var(--viz-series-1)','var(--viz-series-2)','var(--viz-series-3)','var(--viz-series-4)'];
  let W=736,H=490,yaw=.52,pitch=.36,scale=32,zoom=1,focus=[0,0,0],active='S55',ep=31,mode='city',drag=null,dirty=false;
  let hit=[];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rad=a=>a*Math.PI/180;
  function rShow(r){return $('#wx-explode').checked ? 51+(r-51)*1.3 : r;}
  function xyz(a,r,z){r=rShow(r);return [Math.sin(rad(a))*r,Math.cos(rad(a))*r,z];}
  function project(v){let x=v[0]-focus[0],y=v[1]-focus[1],z=v[2]-focus[2];let xx=x*Math.cos(yaw)+z*Math.sin(yaw),zz=-x*Math.sin(yaw)+z*Math.cos(yaw);return [W/2+xx*scale*zoom,H/2-(y*Math.cos(pitch)-zz*Math.sin(pitch))*scale*zoom,y*Math.sin(pitch)+zz*Math.cos(pitch)];}
  function point(s){return project(xyz(s.a,s.r,s.z));}
  function el(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
  function poly(vertices,fill,stroke,opacity=.3,width=1){const p=vertices.map(project);return {depth:p.reduce((n,a)=>n+a[2],0)/p.length,node:el('polygon',{points:p.map(v=>v[0].toFixed(1)+','+v[1].toFixed(1)).join(' '),fill,stroke,'fill-opacity':opacity,'stroke-opacity':.4,'stroke-width':width})};}
  function segment(vertices,stroke,width=1,dash='',alpha=1){const p=vertices.map(project);return el('polyline',{points:p.map(v=>v[0].toFixed(1)+','+v[1].toFixed(1)).join(' '),fill:'none',stroke,'stroke-width':width,'stroke-dasharray':dash,opacity:alpha,'stroke-linejoin':'round','stroke-linecap':'round'});}
  function arc(a1,a2,r,z){const list=[];for(let a=a1;a<=a2+.001;a+=Math.max(.3,(a2-a1)/45))list.push(xyz(a,r,z));list.push(xyz(a2,r,z));return list;}
  function box(a,r,z,da,dr,dz,col,faces){const vs=[];for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)vs.push(xyz(a+(i?da:-da)/2,r+(j?dr:-dr)/2,z+(k?dz:-dz)/2));for(const idx of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])faces.push(poly(idx.map(i=>vs[i]),col,'var(--border)',.22,.6));}
  function routePath(a,b){const list=[xyz(a.a,a.r,a.z)];let diff=((b.a-a.a+180)%360+360)%360-180;for(let i=1;i<=12;i++)list.push(xyz(a.a+diff*i/12,a.r,a.z));list.push(xyz(b.a,b.r,a.z),xyz(b.a,b.r,b.z));return list;}
  function setView(){zoom=1;if(mode==='city'){focus=[0,0,0];yaw=.52;pitch=.36;scale=Math.min(W/171,H/154);}else if(mode==='story'){focus=xyz(1.2,50,-18);yaw=-.05;pitch=.60;scale=Math.min(W/17,H/23);}else{focus=xyz(2.36,59.65,-17.7);yaw=-.04;pitch=.90;scale=Math.min(W/2.5,H/1.65);}draw();}
  function draw(){
    dirty=false;map.replaceChildren();map.setAttribute('viewBox',`0 0 ${W} ${H}`);map.style.height=H+'px';
    const title=el('title',{},'雾峡轨城的滚筒内壁、朝轴心生长的建筑、分层地点与逐集路线');map.append(title);
    const defs=el('defs');const clip=el('clipPath',{id:'wx-map-clip'});clip.append(el('rect',{x:0,y:0,width:W,height:H}));defs.append(clip);map.append(defs);const world=el('g',{'clip-path':'url(#wx-map-clip)'});map.append(world);
    const faces=[],cut=$('#wx-cut').checked, start=mode==='city'?0:-4,end=mode==='city'?360:12;
    const shellR=64,wallR=60,z0=mode==='city'?-40:-20.7,z1=mode==='city'?40:-15.5,stepA=mode==='city'?6:.5;
    for(let a=start;a<end;a+=stepA){const aa=a+stepA;const front=project(xyz(a+stepA/2,shellR,0))[2]>0;if(!cut||!front){faces.push(poly([xyz(a,shellR,z0),xyz(aa,shellR,z0),xyz(aa,shellR,z1),xyz(a,shellR,z1)],'var(--muted)','var(--border)',.23));}
      if(!cut||!front)for(const z of [z0,z1])faces.push(poly([xyz(a,wallR,z),xyz(aa,wallR,z),xyz(aa,shellR,z),xyz(a,shellR,z)],'var(--muted)','var(--border)',.32));
    }
    if(mode==='city'){
      for(let a=0;a<360;a+=8){for(let zi=0;zi<5;zi++){const z=-32+zi*16;const height=8+((a*13+zi*7)%12);box(a,wallR-height/2,z,4,height,6,'var(--muted)',faces);}}
      box(0,49.75,-17.92,.25,19.5,.45,'var(--viz-series-1)',faces);
    }else{
      // Local blocks retain human/streetscale. The shell is large, the doors are not.
      for(let a=start;a<end;a+=.5)for(let zi=0;zi<4;zi++){const z=-20+zi*1.25;const h=.6+((Math.round(a*100+400)*13+zi*7)%11)/10;box(a,60-h/2,z,.25,h,.48,'var(--muted)',faces);}
      box(0,49.75,-17.92,.16,19.5,.22,'var(--viz-series-1)',faces);
      for(const r of [40,45.3,51,56.8])for(let a=start;a<end;a+=1)box(a,r,-18,.6,.05,2.8,'var(--muted)',faces);
    }
    faces.sort((a,b)=>a.depth-b.depth).forEach(f=>world.append(f.node));
    for(const r of [40,51,59.5,60])for(const z of [z0,z1])world.append(segment(arc(start,end,r,z),'var(--border)',1,'',.65));
    for(let a=start;a<=end;a+=mode==='city'?30:2){for(const z of [z0,z1])world.append(segment([xyz(a,30,z),xyz(a,64,z)],'var(--border)',1,'',.55));world.append(segment([xyz(a,60,z0),xyz(a,60,z1)],'var(--border)',1,'',.55));}
    if(mode==='city'){
      world.append(segment([[0,0,-48],[0,0,48]],'var(--muted-foreground)',1.5,'6 5',.8));
      const p=project([0,0,30]);world.append(el('text',{x:p[0]+8,y:p[1]},'转轴 / 中央大空腔'));
      for(const [a,name]of [[75,'校准与能源区'],[135,'农业与居住区'],[205,'循环与回收区'],[270,'物流与仓储区']]){
        const p=project(xyz(a,61,12));world.append(el('text',{x:Math.min(W-120,Math.max(8,p[0])),y:Math.max(18,Math.min(H-15,p[1])),'class':'wx-zone-label'},name));
      }
      const pp=point(by.S18);world.append(el('text',{x:Math.min(W-130,Math.max(8,pp[0]-30)),y:pp[1]-16,'paint-order':'stroke',stroke:'var(--background)','stroke-width':4},'白塔主线片区 ↗'));
    }
    const barKm=mode==='city'?20:mode==='story'?5:.5;
    const barPx=barKm*scale*zoom;
    if(barPx<W*.75){world.append(el('path',{d:`M18 ${H-30} v5 h${barPx} v-5`,stroke:'var(--foreground)',fill:'none','stroke-width':1.5}));world.append(el('text',{x:18,y:H-36},barKm+' 公里'))}
    const episode=D.episodes.find(e=>e.ep===ep),routes=episode?.routes||[],inEp=new Set(routes.flatMap(r=>r.nodes));
    routes.forEach((r,ri)=>{for(let i=1;i<r.nodes.length;i++){const a=by[r.nodes[i-1]],b=by[r.nodes[i]];if(!a.physical||!b.physical)continue;world.append(segment(routePath(a,b),series[ri%4],ri===0?3:2.2,ri===0?'':'7 4',.95));const aa=project(xyz(a.a,a.r,a.z)),bb=project(xyz(b.a,b.r,b.z));if(Math.hypot(aa[0]-bb[0],aa[1]-bb[1])>25){const tail=project(routePath(a,b).slice(-2)[0]);let dx=bb[0]-tail[0],dy=bb[1]-tail[1],n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;world.append(el('path',{d:`M${bb[0]-dx*8-dy*4},${bb[1]-dy*8+dx*4} L${bb[0]},${bb[1]} L${bb[0]-dx*8+dy*4},${bb[1]-dy*8-dx*4}`,fill:'none',stroke:series[ri%4],'stroke-width':2}));}}});
    hit=[];const labels=[];const important=new Set(mode==='city'?[]:mode==='story'?['S01','S18','S21','S29','S34','S43','S55','S15']:['S39','S50','S51','S52','S53','S54','S55','S56']);
    const list=D.scenes.filter(s=>s.physical).map(s=>({s,p:point(s)})).sort((a,b)=>a.p[2]-b.p[2]);
    for(const {s,p} of list){if(p[0]<-15||p[0]>W+15||p[1]<-15||p[1]>H+15)continue;const selected=s.id===active,relevant=!ep||inEp.has(s.id),color=selected?'var(--foreground)':(s.id>='S50'&&s.id<='S56'?'var(--viz-series-2)':'var(--viz-series-1)');const radius=mode==='city'?2:(selected?6:relevant?4.5:2.5);const g=el('g',{'data-scene':s.id,'data-tooltip':s.id+' '+s.name});g.append(el('circle',{cx:p[0],cy:p[1],r:radius,fill:color,opacity:relevant||selected?1:.28,stroke:selected?'var(--background)':'none','stroke-width':2}));world.append(g);hit.push({id:s.id,x:p[0],y:p[1]});
      if(mode!=='city'&&(selected||important.has(s.id))){const name=W<500?s.id+' '+s.name.slice(0,7):s.id+' '+s.name;labels.push({p,name,selected});}
    }
    const boxes=[];
    labels.sort((a,b)=>Number(b.selected)-Number(a.selected));
    for(const l of labels){const measure=el('text',{x:0,y:0,visibility:'hidden'},l.name);world.append(measure);const len=measure.getComputedTextLength()+5;measure.remove();let placed=false;for(const dy of [-12,20,-29,37]){let x=Math.min(W-len-8,Math.max(8,l.p[0]+9)),y=l.p[1]+dy;if(y<16||y>H-12)continue;const box={x,y:y-12,w:len,h:17};if(boxes.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;world.append(el('text',{x,y,'paint-order':'stroke',stroke:'var(--background)','stroke-width':4,'stroke-linejoin':'round'},l.name));boxes.push(box);placed=true;break;}if(!placed&&l.selected){world.append(el('text',{x:10,y:20},l.name));}}
    map.dataset.rendered='true';map.dataset.mode=mode;map.dataset.episode=ep;
  }
  function updateDetail(){const s=by[active];sel.value=active;const epText=s.eps.length?s.eps.map(n=>'EP'+String(n).padStart(2,'0')).join(' · '):s.id==='S12'?'间章《记录之外》':s.id==='S57'?'2471序章':'系统／特殊空间';$('#wx-detail').innerHTML=`<strong>${esc(s.id+' '+s.name)}</strong><div>${esc(s.detail)}</div><div class="text-small">${esc(epText)} · ${esc(s.kind)}${s.physical?' · r='+s.r.toFixed(2)+' km · 本轮规划坐标':' · 不绘为普通地理体积'}</div>`;}
  function updateLanes(){const e=D.episodes.find(x=>x.ep===ep);$('#wx-lanes').innerHTML=e?e.routes.map((r,i)=>`<span><span class="wx-linekey" style="background:${series[i%4]}"></span>${esc(r.name)}</span>`).join(''):'已出现地点与本轮补齐地点';}
  for(const e of D.episodes){const o=document.createElement('option');o.value=e.ep;o.textContent=`EP${String(e.ep).padStart(2,'0')} ${e.title}`;$('#wx-ep').append(o);}$('#wx-ep').value='31';
  for(const s of D.scenes){const o=document.createElement('option');o.value=s.id;o.textContent=s.id+' '+s.name;sel.append(o);}
  $('#wx-view').addEventListener('change',e=>{mode=e.target.value;setView();});
  $('#wx-ep').addEventListener('change',e=>{ep=Number(e.target.value);updateLanes();draw();});
  sel.addEventListener('change',e=>{active=e.target.value;updateDetail();draw();});
  $('#wx-cut').addEventListener('change',draw);$('#wx-explode').addEventListener('change',setView);
  $('#wx-reset').addEventListener('click',setView);
  $('#wx-focus').addEventListener('click',()=>{const s=by[active];if(!s.physical){updateDetail();return;}focus=xyz(s.a,s.r,s.z);zoom=1;scale=Math.min(W/2.5,H/2.0);yaw=-rad(s.a);pitch=.8;draw();});
  function schedule(){if(!dirty){dirty=true;requestAnimationFrame(draw);}}
  map.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,moved:0};map.setPointerCapture(e.pointerId);});
  map.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);yaw+=dx*.006;pitch=Math.max(-1.45,Math.min(1.45,pitch+dy*.006));drag.x=e.clientX;drag.y=e.clientY;schedule();});
  map.addEventListener('pointerup',e=>{if(drag&&drag.moved<6){const rect=map.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;let near=hit.map(h=>({...h,d:Math.hypot(h.x-x,h.y-y)})).sort((a,b)=>a.d-b.d)[0];if(near&&near.d<24){active=near.id;updateDetail();draw();}}drag=null;});
  map.addEventListener('pointercancel',()=>drag=null);
  map.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.4,Math.min(9,zoom*Math.exp(-e.deltaY*.001)));schedule();},{passive:false});

  new ResizeObserver(entries=>{const w=Math.round(entries[0].contentRect.width);if(w&&w!==W){W=w;H=W<500?380:500;setView();}}).observe(root);
  updateDetail();updateLanes();setView();
})();
