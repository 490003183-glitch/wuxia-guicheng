// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
import {renderDeliveryNavigation,renderDeliveryCard,renderStyleReferences,escapeHtml} from '/layout.mjs';

const byId=id=>document.getElementById(id);
const episode=new URLSearchParams(location.search).get('episode')||'';
let etag='',currentHash='',busy=false,cards=[],links=[],lastActive=-1,scheduled=false;
let previousWarning='';
const key='seedance-reader:'+episode;
function selectionInPrompt(){const selection=getSelection();return selection&&!selection.isCollapsed&&selection.anchorNode?.parentElement?.closest('.unit-card');}
function readingPoint(){
  const index=Math.max(0,cards.findLastIndex(card=>card.getBoundingClientRect().top<=96));
  return cards[index]?{id:cards[index].dataset.blockId,top:cards[index].getBoundingClientRect().top}:null;
}
function updateCurrent(){
  scheduled=false;
  if(!cards.length)return;
  const next=Math.max(0,cards.findLastIndex(card=>card.getBoundingClientRect().top<=96));
  if(next===lastActive)return;
  links[lastActive]?.removeAttribute('aria-current');lastActive=next;
  const link=links[next];link.setAttribute('aria-current','location');
  const list=document.querySelector('.take-nav-list'),box=link.getBoundingClientRect(),area=list.getBoundingClientRect();
  if(box.top<area.top)list.scrollTop-=area.top-box.top+8;
  else if(box.bottom>area.bottom)list.scrollTop+=box.bottom-area.bottom+8;
  try{localStorage.setItem(key,cards[next].dataset.blockId);}catch{}
}
function scheduleCurrent(){if(!scheduled){scheduled=true;requestAnimationFrame(updateCurrent);}}
function restorePosition(point){
  if(!point)return;
  const target=cards.find(card=>card.dataset.blockId===point.id);
  if(target)window.scrollBy({top:target.getBoundingClientRect().top-point.top,behavior:'instant'});
}
function showSnapshot(data){
  const point=currentHash?readingPoint():null;
  const oldStyleOpen=byId('style-reference')?.open;
  const previous=new Map(cards.map(card=>[card.dataset.blockId,card]));
  byId('introduction').innerHTML=`<header class="hero"><div class="kicker">Seedance · Markdown 自动读取</div><h1>${escapeHtml(data.title)}</h1></header><section class="delivery-note">${data.notes.map(n=>`<p>${escapeHtml(n)}</p>`).join('')}${renderStyleReferences(data.styles)}</section>`;
  if(byId('style-reference')&&oldStyleOpen)byId('style-reference').open=true;
  for(const [index,block] of data.blocks.entries()) {
    const signature=JSON.stringify(block);
    let card=previous.get(block.id);
    if(!card || card.dataset.signature!==signature) {
      const oldDetailsOpen=card?.querySelector('details')?.open;
      const holder=document.createElement('template');
      holder.innerHTML=renderDeliveryCard({...block,className:block.generationClass.toLowerCase(),eyebrow:block.id+' · '+block.generationClass,detailsHtml:block.transition?`<p>${escapeHtml(block.transition)}</p>`:''},index);
      const replacement=holder.content.firstElementChild;
      replacement.dataset.blockId=block.id;replacement.dataset.signature=signature;
      if(oldDetailsOpen&&replacement.querySelector('details'))replacement.querySelector('details').open=true;
      card=replacement;
    }
    // Reuse unchanged cards, including loaded images and existing text selection.
    card.id='take-'+(index+1);card.dataset.unit=String(index);
    card.querySelectorAll('[data-copy]').forEach(button=>{
      const target=card.querySelector('[id="'+button.dataset.copy+'"]');
      const newId=button.dataset.copy.startsWith('prompt-')?'prompt-'+index:'paths-'+index;
      target.id=newId;button.dataset.copy=newId;
    });
    const existing=byId('blocks').children[index];
    if(existing!==card)byId('blocks').insertBefore(card,existing||null);
    previous.delete(block.id);
  }
  for(const old of previous.values())old.remove();
  // A replaced card with the same block ID can remain after the inserted replacement.
  const wanted=new Set(data.blocks.map(b=>b.id));
  const seen=new Set();
  for(const card of [...byId('blocks').children]) {
    if(!wanted.has(card.dataset.blockId)||seen.has(card.dataset.blockId))card.remove();
    else seen.add(card.dataset.blockId);
  }
  byId('navigation').innerHTML=renderDeliveryNavigation(data.blocks);
  cards=[...document.querySelectorAll('[data-unit]')];links=[...document.querySelectorAll('.take-link')];lastActive=-1;
  const first=!currentHash;currentHash=data.hash;
  byId('reader-status').textContent=`${data.meta.episode} · R${String(data.meta.revision).padStart(2,'0')} · ${data.blocks.length} 条 · 自动读取最新已交付 MD`;
  byId('download-md').hidden=false;byId('download-md').href='/api/markdown?episode='+encodeURIComponent(episode);byId('download-md').style.color='#c1eadc';
  byId('reader-status').title=data.file;
  previousWarning=data.warnings.join('\n');byId('reader-warning').textContent=previousWarning;byId('reader-warning').hidden=!previousWarning;
  if(first){
    let target=location.hash&&document.getElementById(location.hash.slice(1));
    if(!target){try{target=cards.find(c=>c.dataset.blockId===localStorage.getItem(key));}catch{}}
    target?.scrollIntoView({behavior:'instant',block:'start'});
  } else restorePosition(point);
  updateCurrent();
}
async function refresh(){
  if(busy||document.hidden||selectionInPrompt())return;
  busy=true;
  try{
    const response=await fetch('/api/latest?episode='+encodeURIComponent(episode),{cache:'no-store',headers:etag?{'If-None-Match':etag}:{}});
    if(response.status===304){byId('reader-warning').textContent=previousWarning;byId('reader-warning').hidden=!previousWarning;document.querySelectorAll('[data-copy]').forEach(b=>b.disabled=false);return;}
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'暂时无法读取 MD');
    if(selectionInPrompt())return;
    if(data.hash!==currentHash)showSnapshot(data);
    else {previousWarning=data.warnings.join('\n');byId('reader-warning').textContent=previousWarning;byId('reader-warning').hidden=!previousWarning;}
    etag=response.headers.get('etag')||'';
    document.querySelectorAll('[data-copy]').forEach(b=>b.disabled=false);
  }catch(error){
    byId('reader-warning').hidden=false;byId('reader-warning').textContent='更新暂停：'+error.message+(currentHash?'。保留上次显示，恢复连接前暂停复制。':'');
    document.querySelectorAll('[data-copy]').forEach(b=>b.disabled=true);
  }finally{busy=false;}
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-copy]');
  if(!button||button.disabled)return;
  const text=byId(button.dataset.copy).textContent;
  try{await navigator.clipboard.writeText(text);}catch{
    const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();document.execCommand('copy');area.remove();
  }
  const original=button.textContent;button.textContent='已复制';setTimeout(()=>button.textContent=original,1200);
});
window.addEventListener('scroll',scheduleCurrent,{passive:true});
window.addEventListener('resize',scheduleCurrent);
window.addEventListener('hashchange',scheduleCurrent);
document.addEventListener('visibilitychange',refresh);
window.addEventListener('focus',refresh);
await refresh();setInterval(refresh,5000);
