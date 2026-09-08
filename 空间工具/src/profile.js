// Copyright (c) 2026 mtgh. LicenseRef-mtgh-Noncommercial-1.0; see LICENSE-TOOLS at repository root.
// This is a view of the existing nodes and legs; it has no separate episode data.
function drawProfile(){
 const svg=$('height-profile'),{points,total,origin}=heightProfile;
 svg.setAttribute('viewBox','0 0 300 245');svg.replaceChildren();
 if(!points.length)return;
 const left=38,right=282,top=28,bottom=190;
 const maxHeight=Math.max(...points.map(p=>p.height),1);
 const step=maxHeight>120?100:maxHeight>30?20:5,ceiling=Math.ceil(maxHeight/step)*step;
 const x=d=>left+d/(total||1)*(right-left),y=h=>bottom-h/ceiling*(bottom-top);
 svg.append(E('text',{x:8,y:14},'离参考面高度（米）'));
 for(let h=0;h<=ceiling;h+=step)svg.append(E('line',{x1:left,x2:right,y1:y(h),y2:y(h),stroke:'var(--line)','stroke-width':.7}),E('text',{x:left-7,y:y(h)+4,'text-anchor':'end'},h));
 svg.append(E('line',{x1:left,x2:right,y1:bottom,y2:bottom,stroke:'var(--axis-up)','stroke-width':1.5}));
 for(const f of[0,.5,1])svg.append(E('text',{x:x(total*f),y:bottom+19,'text-anchor':f===0?'start':f===1?'end':'middle'},(total*f/1000).toFixed(2)));
 svg.append(E('text',{x:right,y:bottom+40,'text-anchor':'end'},'累计路长（公里）'));
 const now=SpatialLogic.edgeAt(edges,minute);
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],edge=edges[i],chosen=selected?.type==='edge'&&selected.id===edge.id;
  const color=chosen?'var(--blue)':'var(--main)';
  svg.append(E('line',{x1:x(a.distance),y1:y(a.height),x2:x(b.distance),y2:y(b.height),stroke:color,'stroke-width':chosen||now?.id===edge.id?3:1.5,opacity:chosen||now?.id===edge.id?1:.5}));
 }
 const current=contextNode(),matching=points.filter(p=>p.id===current.id);
 for(const p of points){
  const active=p.id===current.id,circle=E('circle',{cx:x(p.distance),cy:y(p.height),r:active?6:4,fill:active?'var(--blue)':'var(--main)',stroke:'var(--panel)','stroke-width':1.5});
  const hit=E('circle',{cx:x(p.distance),cy:y(p.height),r:9,fill:'transparent',class:'map-hit'});
  hit.append(E('title',{},p.name+' · '+Math.round(p.height)+'米'));
  activate(hit,()=>{selected={type:'node',id:p.id};mode='overview';resetCamera();draw()},'剖面定位 '+p.name+' '+Math.round(p.height)+'米');
  svg.append(circle,hit);
 }
 const p=matching[0];
 $('profile-current').textContent=p?p.name+' · '+Math.round(p.height)+'米':current.name+' · 未在这条路线中';
 $('profile-note').textContent='沿行程展开，参考零面与'+origin.name+'（'+origin.id+'）同半径。连线只连接地点，不表示真实坡道；点圆点可与主图对照。';
}
