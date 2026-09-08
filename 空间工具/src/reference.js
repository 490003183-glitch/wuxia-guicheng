// Copyright (c) 2026 mtgh. LicenseRef-mtgh-Noncommercial-1.0; see LICENSE-TOOLS at repository root.
function makeReference(m){
 const city=mode==='overview',origin=referenceOrigin;
 const ids=city?(focusNodes||D.nodes.map(n=>n.id)):[];
 const raw=city?ids.map(id=>{const n=nodeBy[id];return[(n.a-origin.a)*Math.PI/180*origin.r*1000,(n.z-origin.z)*1000]}):m.boxes.flatMap(b=>[[b.x,b.z],[b.x+b.w,b.z+b.d]]);
 const span=Math.max(...raw.map(p=>p[0]))-Math.min(...raw.map(p=>p[0]));
 const base=city?(span>500?200:50):(span>40?10:span>15?5:2);
 const x0=Math.floor(Math.min(...raw.map(p=>p[0]))/base)*base-base,x1=Math.ceil(Math.max(...raw.map(p=>p[0]))/base)*base+base;
 const z0=Math.floor(Math.min(...raw.map(p=>p[1]))/base)*base-base,z1=Math.ceil(Math.max(...raw.map(p=>p[1]))/base)*base+base;
 const maxH=city?Math.max(...ids.map(id=>(origin.r-nodeBy[id].r)*1000)):Math.max(...m.boxes.map(b=>b.y+b.h));
 const heightStep=city?(maxH>120?100:20):(maxH>6?2:1),height=Math.max(heightStep,Math.ceil(maxH/heightStep)*heightStep);
 const at=(u,v,h=0)=>city?SpatialLogic.cityToLocal({a:origin.a+u/(origin.r*1000)*180/Math.PI,r:origin.r-h/1000,z:origin.z+v/1000},origin):[u,h,v];
 return{city,ids,base,x0,x1,z0,z1,height,heightStep,at,bounds:[at(x0,z0),at(x1,z0),at(x0,z1),at(x1,z1),at(x0,z0,height)]};
}
function drawReference(r){
 const g=E('g',{'data-reference':'grid','pointer-events':'none'}),{at,x0,x1,z0,z1,base,height,heightStep}=r;
 const curve=(v,h=0)=>Array.from({length:25},(_,i)=>at(x0+(x1-x0)*i/24,v,h));
 const ring=[...curve(z0),...curve(z1).reverse()];g.append(E('polygon',{points:ring.map(p=>project(p).slice(0,2).join(',')).join(' '),fill:'var(--ref-ground)','fill-opacity':.45,stroke:'var(--line)','stroke-width':1}));
 for(let x=x0;x<=x1+.001;x+=base){const l=line([at(x,z0),at(x,z1)],'var(--line)',x===0?1.2:.7);l.setAttribute('opacity',x===0?.8:.55);g.append(l)}
 for(let z=z0;z<=z1+.001;z+=base){const l=line(curve(z),'var(--line)',z===0?1.2:.7);l.setAttribute('opacity',z===0?.8:.55);g.append(l)}
 for(const [x,z]of[[x0,z0],[x1,z0],[x0,z1]]){const l=line([at(x,z),at(x,z,height)],'var(--line)',1,'4 5');l.setAttribute('opacity','.65');g.append(l)}
 g.append(line([at(x1,z0,height),at(x0,z0,height),at(x0,z1,height)],'var(--line)',1,'4 5'));
 const rulerBottom=project(at(x0,z0)),rulerTop=project(at(x0,z0,height));
 if(Math.hypot(rulerTop[0]-rulerBottom[0],rulerTop[1]-rulerBottom[1])>40){
  g.append(line([at(x0,z0),at(x0,z0,height)],'var(--axis-up)',1.8));
  for(let h=0;h<=height+.001;h+=heightStep){const p=project(at(x0,z0,h));g.append(E('line',{x1:p[0]-5,y1:p[1],x2:p[0]+5,y2:p[1],stroke:'var(--axis-up)','stroke-width':1.5}));if(p[0]>12&&p[0]<W-15&&p[1]>20&&p[1]<H-35)g.append(E('text',{x:p[0]-9,y:p[1]+4,'text-anchor':'end',class:'reference-label'},h+'米'))}
 }
 if(r.city)for(const id of r.ids){const n=nodeBy[id],foot=SpatialLogic.referenceFoot(n,referenceOrigin),point=pos[id],l=line([foot,point],'var(--axis-up)',1.2,'3 5');l.setAttribute('opacity','.7');g.append(l);const p=project(foot);g.append(E('circle',{cx:p[0],cy:p[1],r:3,fill:'var(--panel)',stroke:'var(--axis-up)','stroke-width':1}))}
 svg.append(g);
 $('reference-note').textContent=r.city?'网格：外缘参考曲面（r='+referenceOrigin.r.toFixed(3)+'公里，与'+referenceOrigin.id+'同半径），每格'+base+'米。虚线为径向投影，标注为离参考面的高度；网格和标尺均不是实体楼板。':'网格：当地地面零面，每格'+base+'米。横向、纵向用于这张场地图，尚未绑定全城方位；网格和标尺均为辅助线。';
}
function drawOrientation(){
 const s=$('orientation');s.setAttribute('viewBox','0 0 230 120');s.replaceChildren();const center=[86,66];
 const vector=(x,y,z)=>{const xx=x*Math.cos(yaw)-z*Math.sin(yaw),zz=x*Math.sin(yaw)+z*Math.cos(yaw);return[xx,zz*Math.sin(pitch)-y*Math.cos(pitch)]};
 function arrow(v,label,color,offset){const mag=Math.hypot(...v);if(mag<.02){s.append(E('circle',{cx:center[0],cy:center[1],r:6,fill:'none',stroke:color,'stroke-width':2}),E('circle',{cx:center[0],cy:center[1],r:2,fill:color}),E('text',{x:127,y:26},'⊙ 上：朝你'));return}const q=[center[0]+v[0]/mag*43,center[1]+v[1]/mag*43],u=[v[0]/mag,v[1]/mag];s.append(E('line',{x1:center[0],y1:center[1],x2:q[0],y2:q[1],stroke:color,'stroke-width':2}),E('polygon',{points:[q,[q[0]-8*u[0]+4*u[1],q[1]-8*u[1]-4*u[0]],[q[0]-8*u[0]-4*u[1],q[1]-8*u[1]+4*u[0]]].map(p=>p.join(',')).join(' '),fill:color}),E('text',{x:q[0]+offset[0],y:q[1]+offset[1],'text-anchor':v[0]<-.2?'end':'start'},label))}
 const world=mode==='overview';arrow(vector(1,0,0),world?'周向＋':'横向＋','var(--muted)',[6,-5]);arrow(vector(0,0,1),world?'轴向＋':'纵向＋','var(--blue)',[6,12]);arrow(vector(0,1,0),'上','var(--axis-up)',[6,-5]);s.append(E('circle',{cx:center[0],cy:center[1],r:3,fill:'var(--fg)'}));
 $('direction-note').textContent=Math.abs(Math.cos(pitch))<.02?'当前俯视：上朝向你，下朝屏幕内。高差看虚线及高度标注。':'上＝朝转轴；下＝朝外壳。三根轴与主图同步转动。';
 $('direction-meaning').textContent=world?'周向：沿筒壁绕城　｜　轴向：沿筒身前后':'横向／纵向：当前场地图里的两个地面方向。';
}
