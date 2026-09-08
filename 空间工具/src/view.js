// Copyright (c) 2026 mtgh. LicenseRef-mtgh-Noncommercial-1.0; see LICENSE-TOOLS at repository root.
(() => { 'use strict';
try {
const packet=JSON.parse(document.getElementById('space-packet').textContent);SpatialLogic.validate(packet);
const D=packet.local,G=packet.global,$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const C={main:'var(--main)',lin:'var(--blue)',enemy:'var(--enemy)',white:'var(--white)',sight:'var(--muted)'};
let mode='overview',minute=0,phase=0,yaw=-.64,pitch=.56,W=1000,H=560,scale=1,focus=[0,0,0],down=null;
let zoom=1,panX=0,panY=0,panMode=false,focusNodes=null,selected=null,moved=false;
const svg=$('map'),nodeBy=Object.fromEntries(D.nodes.map(n=>[n.id,n]));
const referenceOrigin=D.nodes.reduce((a,b)=>a.r>=b.r?a:b);
const modeNode={sorting:'S50',warehouse:'S51',discard:'S53',reception:'S54',pool:'S55'};
const modeMinute={overview:0,sorting:3,warehouse:8,discard:17,reception:27,pool:30};
const edges=D.legs.map((l,i)=>{const times=l[5].match(/\d+/g).map(Number);return{id:'E'+(i+1),from:l[0],to:l[1],length:l[2],method:l[3],elevation:l[4],start:times[0],end:times[1],fromName:nodeBy[l[0]].name,toName:nodeBy[l[1]].name,who:i>=5?'步小蛮、乔昔、圈圈、林逸':'步小蛮、乔昔、圈圈'};});
const heightProfile=SpatialLogic.routeProfile(D.nodes,edges);
function E(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e}
function Ht(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function button(text,fn){const b=Ht('button',text);b.type='button';b.onclick=fn;return b}
function coord(n){return SpatialLogic.cityToLocal(n,referenceOrigin)}
const pos=Object.fromEntries(D.nodes.map(n=>[n.id,coord(n)]));
function project(p){const x=p[0]-focus[0],y=p[1]-focus[1],z=p[2]-focus[2],xx=x*Math.cos(yaw)-z*Math.sin(yaw),zz=x*Math.sin(yaw)+z*Math.cos(yaw);return[W/2+panX+xx*scale,H/2+panY+(zz*Math.sin(pitch)-y*Math.cos(pitch))*scale,zz*Math.cos(pitch)+y*Math.sin(pitch)]}
function line(points,color,width=3,dash=''){return E('polyline',{points:points.map(p=>project(p).slice(0,2).join(',')).join(' '),fill:'none',stroke:color,'stroke-width':width,'stroke-dasharray':dash,'stroke-linejoin':'round','stroke-linecap':'round'})}
function box(list,x,y,z,w,h,d,name='',fill='var(--surface)'){list.boxes.push({x,y,z,w,h,d,fill});if(name)list.labels.push({p:[x+w/2,y+h,z+d/2],s:name});return list}
function route(list,points,kind,name){list.routes.push({points,kind,name});return list}
function marker(list,p,s,kind){list.marks.push({p,s,kind});return list}
function empty(){return{boxes:[],routes:[],marks:[],labels:[],bounds:null}}
/*__MODEL__*/
/*__REFERENCE__*/
/*__PROFILE__*/
function activate(el,action,label){el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',label);el.addEventListener('click',()=>{if(!moved)action()});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action()}});return el}
function resetCamera(){zoom=1;panX=panY=0;focusNodes=null}
function selectNode(id){selected={type:'node',id};if(mode==='overview'){focusNodes=[id];zoom=1;panX=panY=0}draw()}
function selectEdge(id){const e=edges.find(x=>x.id===id);selected={type:'edge',id};mode='overview';$('view').value=mode;minute=e.start;phase=SpatialLogic.phaseAt(D.phases,minute);resetCamera();focusNodes=[e.from,e.to];draw()}
function changeTime(value){minute=Math.max(0,Math.min(34,Number(value)));phase=SpatialLogic.phaseAt(D.phases,minute);draw()}
function changeMode(value,jump=true){mode=value;$('view').value=mode;resetCamera();yaw=-.64;pitch=.56;selected=modeNode[mode]?{type:'node',id:modeNode[mode]}:null;if(jump){minute=modeMinute[mode];phase=SpatialLogic.phaseAt(D.phases,minute)}draw()}
function corners(b){const p=[];for(const x of[b.x,b.x+b.w])for(const y of[b.y,b.y+b.h])for(const z of[b.z,b.z+b.d])p.push([x,y,z]);return p}
function localFrameVisible(){if(mode==='pool')return minute>=21;if(mode==='reception')return true;return minute===modeMinute[mode]}
function draw(){
 W=Math.max(280,svg.getBoundingClientRect().width);H=svg.getBoundingClientRect().height;svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
 const m=model(),location=SpatialLogic.mainLocation(edges,minute),currentEdge=SpatialLogic.edgeAt(edges,minute);
 if(mode==='overview'){
  m.routes=m.routes.slice(1);m.routes[0].linkType='lin';m.routes[1].linkType='enemy';
  edges.forEach(e=>m.routes.unshift({points:[pos[e.from],pos[e.to]],kind:'main',edge:e}));m.marks=[];
  const p=location.kind==='segment'?pos[location.edge.from].map((v,i)=>(v+pos[location.edge.to][i])/2):pos[location.node];
  marker(m,p,location.kind==='segment'?'步／乔／圈 · 本段范围':'步／乔／圈','main');
  if(minute>=19&&minute<27)marker(m,minute<25?[pos.S54[0]-80,pos.S54[1]+150,pos.S54[2]+60]:pos.S54,'林逸 · 接应途中','lin');
  if(minute>=27)marker(m,[p[0],p[1]+15,p[2]+15],'林逸 · 同行','lin');
  if(minute>=21)marker(m,[pos.S55[0]+35,pos.S55[1],pos.S55[2]+12],'星／温 · 池区','enemy');
 } else {
  if(!localFrameVisible())m.marks=[];
  if(mode==='pool'&&minute<30)m.marks=m.marks.filter(x=>!['步小蛮','乔昔／圈圈','林逸'].includes(x.s));
  if(mode==='pool'&&minute<29)m.marks=m.marks.filter(x=>x.s!=='阿尔法封桥');
 }
 let pts=m.boxes.flatMap(corners).concat(m.routes.flatMap(r=>r.points),m.labels.map(l=>l.p));
 if(mode==='overview'&&focusNodes){pts=focusNodes.flatMap(id=>{const p=pos[id];return[[p[0]-65,p[1]-65,p[2]-65],[p[0]+65,p[1]+65,p[2]+65]]})}
 const reference=makeReference(m);if($('reference-toggle').checked)pts.push(...reference.bounds);
 const lo=[0,1,2].map(i=>Math.min(...pts.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...pts.map(p=>p[i])));focus=lo.map((v,i)=>(v+hi[i])/2);
 scale=1;const q=pts.map(project),xw=Math.max(...q.map(p=>p[0]))-Math.min(...q.map(p=>p[0])),yh=Math.max(...q.map(p=>p[1]))-Math.min(...q.map(p=>p[1]));scale=Math.min((W-90)/(xw||1),(H-100)/(yh||1))*zoom;
 svg.replaceChildren(E('title',{},'EP31 '+$('view').selectedOptions[0].textContent),E('desc',{},'拖动旋转，滚轮缩放，Shift拖动平移。点选地点或路线显示详情。'));
 if($('reference-toggle').checked)drawReference(reference);else $('reference-note').textContent='参考网格已隐藏；可勾选“参考网格”恢复。';
 const faces=[];for(const b of m.boxes){const p=[[b.x,b.y,b.z],[b.x+b.w,b.y,b.z],[b.x+b.w,b.y,b.z+b.d],[b.x,b.y,b.z+b.d],[b.x,b.y+b.h,b.z],[b.x+b.w,b.y+b.h,b.z],[b.x+b.w,b.y+b.h,b.z+b.d],[b.x,b.y+b.h,b.z+b.d]];for(const ids of[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]]){const a=ids.map(i=>project(p[i]));faces.push({depth:a.reduce((n,p)=>n+p[2],0)/4,node:E('polygon',{points:a.map(p=>p.slice(0,2).join(',')).join(' '),fill:b.fill,stroke:'var(--line)','stroke-width':.8,'fill-opacity':.72})})}}
 faces.sort((a,b)=>a.depth-b.depth).forEach(f=>svg.append(f.node));
 for(const r of m.routes){const chosen=r.edge&&selected?.type==='edge'&&selected.id===r.edge.id,now=r.edge&&currentEdge?.id===r.edge.id;const el=line(r.points,C[r.kind],chosen?6:now?4.5:r.kind==='main'?2.6:2,r.dash||(r.kind==='enemy'?'7 4':''));if(r.edge&&!chosen&&!now)el.setAttribute('opacity','.48');svg.append(el);if(r.edge||r.linkType){const hit=line(r.points,'transparent',17);hit.classList.add('route-hit');hit.append(E('title',{},r.edge?`${r.edge.fromName} → ${r.edge.toName} · ${r.edge.start}—${r.edge.end}分钟`:(r.linkType==='lin'?'林逸接应的交通与时间':'星落、温雅的转移与时间')));activate(hit,()=>{if(r.edge)selectEdge(r.edge.id);else{selected={type:'lane',index:r.linkType==='lin'?2:3};draw()}},r.edge?'查看路线 '+r.edge.id:(r.linkType==='lin'?'查看林逸接应时间':'查看星落温雅时间'));svg.append(hit)}}
 const occupied=[];
 function label(p,s,dy=0,priority=false,meta=''){
  const a=project(p);if(a[0]<-10||a[0]>W+10||a[1]<20||a[1]>H-40)return;
  const el=E('text',{'text-anchor':'middle',class:priority?'label':''});
  const parts=meta?(s.match(/.{1,9}/gu)||[s]):[s];
  const spans=parts.map((part,i)=>E('tspan',{x:0,dy:i?16:0},part));
  if(meta)spans.push(E('tspan',{x:0,dy:15,class:'label-meta'},meta));
  el.append(...spans);svg.append(el);
  const width=Math.max(...spans.map(t=>t.getComputedTextLength()))+12,height=spans.length*16+5;
  let found=null;
  const candidates=[[0,dy],[0,dy-height-4],[0,dy+height+4],[width/2+18,dy],[-width/2-18,dy],[width/2+18,dy-height],[-width/2-18,dy-height],[0,dy-height*2],[0,dy+height*2],[width+20,dy],[-width-20,dy]];
  for(const[dx,yy]of candidates){const x=Math.max(width/2+8,Math.min(W-width/2-8,a[0]+dx)),y=Math.max(39,Math.min(H-height-38,a[1]+yy)),rect=[x-width/2,y-14,width,height];if(!occupied.some(r=>rect[0]<r[0]+r[2]&&rect[0]+rect[2]>r[0]&&rect[1]<r[1]+r[3]&&rect[1]+rect[3]>r[1])){found={x,y,rect};break}}
  if(!found){el.remove();return}el.setAttribute('x',found.x);el.setAttribute('y',found.y);spans.forEach(t=>t.setAttribute('x',found.x));occupied.push(found.rect);
  if(Math.abs(found.x-a[0])>20||Math.abs(found.y-a[1])>30)svg.insertBefore(E('line',{x1:a[0],y1:a[1],x2:found.x,y2:found.y-5,stroke:'var(--muted)','stroke-width':.8}),el);
 }
 if(mode==='overview'){
  const ordered=[...D.nodes].sort((a,b)=>Number(b.id===selected?.id)-Number(a.id===selected?.id));
  for(const n of ordered){const a=project(pos[n.id]);const circle=E('circle',{cx:a[0],cy:a[1],r:n.id===selected?.id?8:6,fill:n.id===selected?.id?'var(--blue)':'var(--main)',stroke:'var(--panel)','stroke-width':2,class:'map-hit'});circle.append(E('title',{},n.id+' '+n.name));activate(circle,()=>selectNode(n.id),'定位 '+n.id+' '+n.name);svg.append(circle);label([pos[n.id][0],pos[n.id][1]+12,pos[n.id][2]],n.name,-36,true,n.id+' · '+Math.round((referenceOrigin.r-n.r)*1000)+'米')}
 }
 for(const mark of m.marks){const p=project(mark.p);svg.append(E('circle',{cx:p[0],cy:p[1],r:5.5,fill:C[mark.kind],stroke:'var(--panel)','stroke-width':1.5}));label(mark.p,mark.s,22,true)}
 for(const l of m.labels){if(mode==='overview'&&/^S\d+ /.test(l.s))continue;label(l.p,l.s,-8)}
 const target=90/scale,pow=10**Math.floor(Math.log10(target)),step=[1,2,5,10].map(v=>v*pow).find(v=>v>=target)||pow*10,len=step*scale;
 svg.append(E('path',{d:`M18 ${H-24} v5 h${len} v-5`,fill:'none',stroke:'var(--fg)','stroke-width':1.5}),E('text',{x:18,y:H-32},(step>=1000?step/1000+'公里':step+'米')),E('text',{x:W-14,y:23,'text-anchor':'end'},mode==='overview'?'高度相对'+referenceOrigin.id+'参考曲面':'当地上：朝转轴　下：朝外壳'));
 $('view').value=mode;$('time').value=minute;$('time-label').textContent='故事第 '+minute+' 分钟';$('zoom-readout').textContent=Math.round(zoom*100)+'%';
 $('phase-title').textContent=(D.phases[phase][0]===minute?'此刻事件':'最近事件 · 第'+D.phases[phase][0]+'分钟')+'：'+D.phases[phase][1];$('phase-detail').textContent=D.phases[phase][2];
 $('prev-event').disabled=minute===0;$('next-event').disabled=minute===34;
 document.querySelectorAll('.event-dot').forEach(b=>b.classList.toggle('active',Number(b.dataset.time)===D.phases[phase][0]));
 $('location-now').textContent='步小蛮一行的当前行动范围：'+location.text;
 $('scene-notice').textContent=mode==='overview'?'图上的人物标记表示本段活动范围，不是每分钟的精确坐标。点路线可核对实际通行方式。':mode==='pool'&&minute>=30?'池区人物采用第'+D.phases[phase][0]+'分钟的关键站位；事件之间保持上一节点示意。':localFrameVisible()?'场地与关键事件站位示意；时间窗口另见下方。':'当前分钟没有此处的已标定人物站位，仅显示场地与预定通路。';
 $('space-detail').textContent=mode==='overview'?'这只是128公里筒城里的一个局部片区。连接线表示场景接续，实际道路、坡廊和升降台见路线详情。':D.spaces[mode].size+'。'+D.spaces[mode].connections+' '+D.spaces[mode].cover;
 document.querySelectorAll('#node-buttons button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===selected?.id)));
 document.querySelectorAll('#legs tr').forEach(tr=>{tr.classList.toggle('current',tr.dataset.edge===currentEdge?.id);tr.classList.toggle('selected',selected?.type==='edge'&&selected.id===tr.dataset.edge)});
 drawOrientation();drawCity();drawProfile();drawSelection();drawLanes();drawConditions();
}
function contextNode(){if(selected?.type==='node')return nodeBy[selected.id];if(selected?.type==='edge')return nodeBy[edges.find(e=>e.id===selected.id).to];return nodeBy[modeNode[mode]||SpatialLogic.mainLocation(edges,minute).node]}
function drawCity(){const s=$('city');s.setAttribute('viewBox','0 0 300 210');s.replaceChildren();const geo=G.geometry;
 const p=(r,a,z)=>{const x=r*Math.cos(a),y=r*Math.sin(a);return[150+x*1.15+z*.6,103-y*.85+z*.34]};
 const ring=(r,z)=>Array.from({length:73},(_,i)=>p(r,i/72*Math.PI*2,z));const points=a=>a.map(v=>v.join(',')).join(' ');const back=-geo.lengthKm/2,front=geo.lengthKm/2;
 s.append(E('polygon',{points:points([p(geo.outerShellRadiusKm,0,back),p(geo.outerShellRadiusKm,0,front),...ring(geo.outerShellRadiusKm,front).slice(0,37),p(geo.outerShellRadiusKm,Math.PI,back),...ring(geo.outerShellRadiusKm,back).slice(36).reverse()]),fill:'var(--surface)','fill-opacity':.55}));
 for(const z of[back,front]){s.append(E('polyline',{points:points(ring(geo.outerShellRadiusKm,z)),fill:'none',stroke:'var(--line)','stroke-width':2}),E('polyline',{points:points(ring(geo.innerWallRadiusKm,z)),fill:'none',stroke:'var(--muted)','stroke-width':1}));}
 for(const a of[0,Math.PI/2,Math.PI,Math.PI*1.5]){const u=p(geo.outerShellRadiusKm,a,back),v=p(geo.outerShellRadiusKm,a,front);s.append(E('line',{x1:u[0],y1:u[1],x2:v[0],y2:v[1],stroke:'var(--line)'}))}
 const axis1=p(0,0,back-15),axis2=p(0,0,front+15);s.append(E('line',{x1:axis1[0],y1:axis1[1],x2:axis2[0],y2:axis2[1],stroke:'var(--muted)','stroke-dasharray':'4 4'}),E('text',{x:axis1[0]-6,y:axis1[1]-8,'text-anchor':'end'},'转轴'));
 const n=contextNode(),angle=n.a*Math.PI/180;
 const slice=r=>Array.from({length:25},(_,i)=>p(r,angle-.55+i/24*1.1,n.z));
 s.append(E('polygon',{points:points([...slice(geo.outerShellRadiusKm),...slice(geo.innerWallRadiusKm).reverse()]),fill:'var(--axis-up)','fill-opacity':.45,stroke:'var(--axis-up)','stroke-width':1}),E('polyline',{points:points(slice(geo.innerWallRadiusKm)),fill:'none',stroke:'var(--axis-up)','stroke-width':3}));
 const dot=p(n.r,angle,n.z),up=p(n.r-25,angle,n.z),dir=[up[0]-dot[0],up[1]-dot[1]],mag=Math.hypot(...dir),u=dir.map(x=>x/mag);
 s.append(E('circle',{cx:dot[0],cy:dot[1],r:9,fill:'var(--main)','fill-opacity':.18}),E('circle',{cx:dot[0],cy:dot[1],r:4.5,fill:'var(--main)'}),E('line',{x1:dot[0],y1:dot[1],x2:up[0],y2:up[1],stroke:'var(--main)','stroke-width':2}),E('polygon',{points:points([up,[up[0]-7*u[0]+3*u[1],up[1]-7*u[1]-3*u[0]],[up[0]-7*u[0]-3*u[1],up[1]-7*u[1]+3*u[0]]]),fill:'var(--main)'}),E('text',{x:up[0],y:up[1]-11,'text-anchor':'middle'},'上 · 朝转轴'),E('text',{x:150,y:194,'text-anchor':'middle'},'金色筒壁切片 · 绿色为当前地点'));
 $('city-place').textContent=n.name+' · '+n.id;$('city-coords').textContent='离轴 '+n.r.toFixed(2)+' km · 轴向 '+n.z.toFixed(2)+' km · 周向 '+n.a.toFixed(2)+'°';
}
function drawSelection(){const s=$('selection');s.replaceChildren();
 const dl=Ht('dl');function pair(k,v){dl.append(Ht('dt',k),Ht('dd',v))}
 if(selected?.type==='edge'){
  const e=edges.find(e=>e.id===selected.id);s.append(Ht('h2',e.fromName+' → '+e.toName));pair('同行者',e.who);pair('窗口',e.start+'—'+e.end+'分钟（移动与事件）');pair('约路长',e.length+'米');pair('高差',e.elevation);pair('怎么走',e.method);s.append(dl);
  s.append(Ht('p',minute<e.start?'当前时间尚未进入这段路线。':minute>=e.end?'当前时间已经结束这段行动窗口。':'当前分钟落在这段行动窗口内。','muted'));
  const a=Ht('div',undefined,'small-actions');a.append(button('跳到出发',()=>changeTime(e.start)),button('跳到到达',()=>changeTime(e.end)));const nextMode=Object.keys(modeNode).find(k=>modeNode[k]===e.to);if(nextMode)a.append(button('看终点局部',()=>changeMode(nextMode)));s.append(a);
 }else if(selected?.type==='lane'){
  const lane=D.timing[selected.index],span=SpatialLogic.spanAt(lane.spans,minute);s.append(Ht('h2',lane.who));pair('当前',span?span[2]:(minute<lane.spans[0][0]?'尚未进入本表记录的行动':'已离开本表的时间记录'));if(span)pair('窗口',span[0]+'—'+span[1]+'分钟');s.append(dl,Ht('p',selected.index===2?D.checks.find(c=>c[0]==='C05')[2]:selected.index===3?'0—21分钟包含旧街交战及转移；21分钟后在水槽区对抗白塔机器人。':'仅显示已记录的时间窗口。','muted'));
 }else if(selected?.type==='node'){
  const n=nodeBy[selected.id];s.append(Ht('h2',n.id+' '+n.name),Ht('p',n.detail));pair('层区',n.zone);pair('位置',n.r.toFixed(2)+' km离轴；'+n.z.toFixed(2)+' km轴向');s.append(dl);const actions=Ht('div',undefined,'small-actions');const local=Object.keys(modeNode).find(k=>modeNode[k]===n.id);if(local&&mode!==local)actions.append(button('查看局部空间',()=>changeMode(local)));actions.append(button('在全程中聚焦',()=>{mode='overview';$('view').value=mode;resetCamera();selectNode(n.id)}));s.append(actions);
 }else{s.append(Ht('h2','点地点或路线'),Ht('p','地图下方的地点按钮可以聚焦；点绿色连接线，查看路长、高差、交通方式和同行者。'),Ht('p','全城小图会跟随所选地点。','muted'))}
}
function drawLanes(){const s=$('lanes'),w=Math.max(720,s.getBoundingClientRect().width),h=270,x0=155,dx=(w-x0-16)/34;s.setAttribute('viewBox',`0 0 ${w} ${h}`);s.replaceChildren();
 for(let t=0;t<=34;t+=2){s.append(E('line',{x1:x0+t*dx,x2:x0+t*dx,y1:28,y2:234,stroke:'var(--line)','stroke-width':.5}),E('text',{x:x0+t*dx,y:18,'text-anchor':'middle'},t))}
 const state=$('lane-state');state.replaceChildren();D.timing.forEach((lane,i)=>{const y=40+i*49,color=[C.main,C.enemy,C.lin,C.enemy][i],active=SpatialLogic.spanAt(lane.spans,minute);s.append(E('text',{x:5,y:y+20},lane.who));for(const[a,b,name]of lane.spans){const g=E('g'),rect=E('rect',{x:x0+a*dx,y,width:Math.max(2,(b-a)*dx-2),height:32,rx:3,fill:color,opacity:minute>=a&&minute<b?.4:.16});g.append(rect,E('title',{},lane.who+'：'+a+'—'+b+'分钟 '+name));if(name.length*12<(b-a)*dx-8)g.append(E('text',{x:x0+(a+b)/2*dx,y:y+21,'text-anchor':'middle','pointer-events':'none'},name));activate(g,()=>{selected={type:'lane',index:i};changeTime(a)},lane.who+' '+a+'至'+b+'分钟 '+name);s.append(g)}const card=Ht('div');card.style.borderColor=color;card.append(Ht('strong',lane.who),Ht('p',active?active[2]:(minute<lane.spans[0][0]?'尚未开始本表记录的行动':i===1?'20分钟后状态未披露':minute>=34?'本章时间记录结束':'此时未标定')));state.append(card)});
 const x=x0+minute*dx;s.append(E('line',{x1:x,x2:x,y1:26,y2:237,stroke:'var(--fg)','stroke-width':2,'pointer-events':'none'}),E('text',{x:Math.max(x0+24,Math.min(w-30,x)),y:257,'text-anchor':'middle'},minute+'分钟'));
}
function drawConditions(){const s=$('traffic-condition');s.replaceChildren(Ht('strong','通行条件'));s.append(Ht('p',minute<29?'检修桥：29—30分钟将发生封桥，当前尚未到该节点。':minute<30?'检修桥：29—30分钟封桥阶段。':'检修桥：阿尔法已封桥，人物需走池端绕行路。'));s.append(Ht('p','林逸来路：接驳站在他到达后因交战封闭，具体关闭分钟未标定。接应完成后改走池区；无人机使用独立的设备运载通路。'))}
for(const p of D.phases){const b=button('',()=>changeTime(p[0]));b.className='event-dot';b.style.left=p[0]/34*100+'%';b.dataset.time=p[0];b.title=p[0]+'分钟 · '+p[1];b.setAttribute('aria-label',b.title);$('event-rail').append(b)}
for(const t of[0,10,20,30,34]){const e=Ht('span',t+'分','tick');e.style.left=t/34*100+'%';$('event-rail').append(e)}
for(const n of D.nodes){const b=button(n.id+' '+n.name,()=>{mode='overview';$('view').value=mode;resetCamera();selectNode(n.id)});b.dataset.id=n.id;b.setAttribute('aria-pressed','false');$('node-buttons').append(b)}
for(const e of edges){const tr=Ht('tr');tr.dataset.edge=e.id;const td=Ht('td');td.append(button(e.fromName+' → '+e.toName,()=>selectEdge(e.id)));tr.append(td,Ht('td',e.start+'—'+e.end+'分钟'),Ht('td',e.length+'米'),Ht('td',e.elevation+'；'+e.method));$('legs').append(tr)}
$('reference-toggle').onchange=()=>draw();
$('view').onchange=()=>changeMode($('view').value);$('time').oninput=()=>changeTime($('time').value);$('prev-event').onclick=()=>changeTime(SpatialLogic.nextEvent(D.phases,minute,-1));$('next-event').onclick=()=>changeTime(SpatialLogic.nextEvent(D.phases,minute,1));
$('zoom-in').onclick=()=>{zoom=Math.min(8,zoom*1.4);draw()};$('zoom-out').onclick=()=>{zoom=Math.max(.5,zoom/1.4);draw()};$('fit').onclick=()=>{resetCamera();draw()};$('oblique').onclick=()=>{yaw=-.64;pitch=.56;resetCamera();draw()};$('top').onclick=()=>{yaw=0;pitch=Math.PI/2;draw()};$('rotate').onclick=()=>{yaw+=Math.PI/2;draw()};$('pan').onclick=()=>{panMode=!panMode;$('pan').setAttribute('aria-pressed',String(panMode));svg.dataset.pan=panMode};
svg.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey)return;e.preventDefault();zoom=Math.max(.5,Math.min(8,zoom*Math.exp(-e.deltaY*.0015)));draw()},{passive:false});
svg.addEventListener('pointerdown',e=>{moved=false;down={x:e.clientX,y:e.clientY,yaw,pitch,panX,panY,pan:panMode||e.shiftKey};if(e.target===svg||e.target.closest('[role=button]')===null)svg.setPointerCapture(e.pointerId)});
svg.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;if(!moved)return;if(down.pan){panX=down.panX+dx;panY=down.panY+dy}else{yaw=down.yaw+dx*.007;pitch=Math.max(.1,Math.min(Math.PI/2,down.pitch+dy*.006))}draw()});
svg.addEventListener('pointerup',()=>{down=null;setTimeout(()=>moved=false,0)});svg.addEventListener('pointercancel',()=>down=null);
/*__REVIEW__*/
/*__CAPTURE__*/
new ResizeObserver(()=>draw()).observe(svg);window.addEventListener('pageshow',()=>draw());draw();window.spaceReady=true;$('load-status').hidden=true;$('app').classList.remove('pending');
}catch(error){window.spaceFail(error.message)}
})();
