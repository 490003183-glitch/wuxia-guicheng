// Copyright (c) 2026 mtgh. LicenseRef-mtgh-Noncommercial-1.0; see LICENSE-TOOLS at repository root.
// Local-only batch export. Reuses model(), draw() and the viewer's own scene list.
function captureZip(files){
 const enc=new TextEncoder(),parts=[],directory=[];let offset=0;
 const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0};
 const head=n=>({bytes:new Uint8Array(n),view:null});
 for(const f of files){
  const name=enc.encode(f.name),data=f.data,sum=crc(data),h=head(30);h.view=new DataView(h.bytes.buffer);
  h.view.setUint32(0,0x04034b50,true);h.view.setUint16(4,20,true);h.view.setUint16(6,0x800,true);h.view.setUint32(14,sum,true);h.view.setUint32(18,data.length,true);h.view.setUint32(22,data.length,true);h.view.setUint16(26,name.length,true);
  parts.push(h.bytes,name,data);
  const d=head(46);d.view=new DataView(d.bytes.buffer);d.view.setUint32(0,0x02014b50,true);d.view.setUint16(4,20,true);d.view.setUint16(6,20,true);d.view.setUint16(8,0x800,true);d.view.setUint32(16,sum,true);d.view.setUint32(20,data.length,true);d.view.setUint32(24,data.length,true);d.view.setUint16(28,name.length,true);d.view.setUint32(42,offset,true);directory.push(d.bytes,name);offset+=30+name.length+data.length;
 }
 const size=directory.reduce((n,x)=>n+x.length,0),end=head(22);end.view=new DataView(end.bytes.buffer);end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,files.length,true);end.view.setUint16(10,files.length,true);end.view.setUint32(12,size,true);end.view.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end.bytes],{type:'application/zip'});
}
async function captureMapJpeg(){
 const clone=svg.cloneNode(true),originals=[svg,...svg.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
 const properties=['fill','fill-opacity','stroke','stroke-width','stroke-opacity','stroke-dasharray','stroke-linecap','stroke-linejoin','opacity','font-family','font-size','font-weight','font-style','letter-spacing','text-anchor','dominant-baseline','paint-order','visibility','display'];
 originals.forEach((el,i)=>{const style=getComputedStyle(el);for(const p of properties)copies[i].style.setProperty(p,style.getPropertyValue(p))});
 clone.setAttribute('xmlns',NS);clone.setAttribute('width','960');clone.setAttribute('height','720');clone.style.width='960px';clone.style.height='720px';
 const source=new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(source);
 try{
  const img=new Image();await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('地图图像转换失败'));img.src=url});
  const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1440;const ctx=canvas.getContext('2d');ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--panel').trim();ctx.fillRect(0,0,1920,1440);ctx.drawImage(img,0,0,1920,1440);
  const blob=await new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(Error('截图编码失败')),'image/jpeg',.95));return new Uint8Array(await blob.arrayBuffer());
 }finally{URL.revokeObjectURL(url)}
}
async function capturePairJpeg(pair,name){
 const canvas=document.createElement('canvas');canvas.width=3840;canvas.height=1504;
 const ctx=canvas.getContext('2d');ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--panel').trim();ctx.fillRect(0,0,3840,1504);
 for(let i=0;i<2;i++){
  const url=URL.createObjectURL(new Blob([pair[i].data],{type:'image/jpeg'}));
  try{const img=new Image();await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('并排图合成失败'));img.src=url});ctx.drawImage(img,i*1920,64,1920,1440)}finally{URL.revokeObjectURL(url)}
 }
 ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim();ctx.font='28px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';ctx.textBaseline='middle';
 ctx.fillText(name+' · 斜视',32,32);ctx.fillText(name+' · 俯视',1952,32);
 const blob=await new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(Error('并排图编码失败')),'image/jpeg',.95));return new Uint8Array(await blob.arrayBuffer());
}
let captureBusy=false,captureDownloadUrl=null;
$('capture-all').onclick=async()=>{
 if(captureBusy)return;captureBusy=true;
 const control=$('capture-all'),status=$('capture-status'),link=$('capture-download'),pane=svg.closest('.map-pane');
 const saved={mode,minute,phase,yaw,pitch,zoom,panX,panY,panMode,focusNodes,selected,reference:$('reference-toggle').checked,svgStyle:svg.getAttribute('style'),paneStyle:pane.getAttribute('style'),scrollX:window.scrollX,scrollY:window.scrollY};
 const overlay=document.createElement('div');overlay.className='capture-overlay';overlay.setAttribute('role','status');document.body.append(overlay);control.disabled=true;link.hidden=true;
 const files=[],records=[],choices=Array.from($('view').options).map(o=>({id:o.value,name:o.textContent.trim()}));
 try{
  await document.fonts.ready;pane.style.width='960px';svg.style.setProperty('width','960px','important');svg.style.setProperty('height','720px','important');$('reference-toggle').checked=true;
  for(const choice of choices){
   const pair=[];
   for(const angle of ['斜视','俯视']){
   overlay.textContent=status.textContent=`正在截图 ${records.length+1}/${choices.length*3}：${choice.name} · ${angle}`;
   changeMode(choice.id);if(angle==='俯视'){yaw=0;pitch=Math.PI/2}draw();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const filename=`EP31_${String(records.length+1).padStart(2,'0')}_${choice.name}_${angle}.jpg`;
   const item={name:filename,data:await captureMapJpeg()};files.push(item);pair.push(item);records.push({file:filename,scene:choice.id,node:modeNode[choice.id]||null,view:angle,story_minute:minute,width:1920,height:1440});
   }
   overlay.textContent=status.textContent=`正在合成 ${records.length+1}/${choices.length*3}：${choice.name} · 左斜视右俯视`;
   const filename=`EP31_${String(records.length+1).padStart(2,'0')}_${choice.name}_左斜视右俯视.jpg`;
   files.push({name:filename,data:await capturePairJpeg(pair,choice.name)});records.push({file:filename,scene:choice.id,node:modeNode[choice.id]||null,view:'左斜视右俯视',layout:'horizontal',panels:pair.map((x,i)=>({file:x.name,view:i===0?'斜视':'俯视',x:i*1920,y:64,width:1920,height:1440})),story_minute:minute,width:3840,height:1504});
  }
  const manifest={episode:31,global_version:G.version,local_version:D.version,source:packet.expected,images:records,note:'由本集网页现有模型自动截图，保留原标注、参考网格和路线；局部站位采用各场景默认事件时间。工作空间参考，不是正式场景资产。'};
  files.push({name:'截图清单.json',data:new TextEncoder().encode(JSON.stringify(manifest,null,2))});
  const zip=captureZip(files);if(captureDownloadUrl)URL.revokeObjectURL(captureDownloadUrl);captureDownloadUrl=URL.createObjectURL(zip);link.href=captureDownloadUrl;link.download=`EP31_全部空间截图_${D.version}.zip`;link.hidden=false;link.click();
  status.textContent=`已完成 ${records.length} 张截图（每处斜视＋俯视＋左右并排图），已打包下载。`;
 }catch(error){status.textContent='截图未完成：'+error.message+'。可重试。';}
 finally{
  ({mode,minute,phase,yaw,pitch,zoom,panX,panY,panMode,focusNodes,selected}=saved);$('view').value=mode;$('reference-toggle').checked=saved.reference;
  for(const[el,attr]of[[svg,saved.svgStyle],[pane,saved.paneStyle]]){if(attr===null)el.removeAttribute('style');else el.setAttribute('style',attr)}
  draw();window.scrollTo(saved.scrollX,saved.scrollY);overlay.remove();control.disabled=false;captureBusy=false;
 }
};
