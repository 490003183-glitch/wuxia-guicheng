// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
export const DELIVERY_LAYOUT_VERSION = "seedance-delivery-leftnav-v1";
export const DELIVERY_CSS = `:root { --paper:#f1eee7; --card:#fffdf8; --ink:#151918; --muted:#66706c; --line:#c9c2b5; --auto:#356d62; --directed:#ad3f27; --gold:#aa7a1a; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); background:linear-gradient(90deg,rgba(53,109,98,.05) 1px,transparent 1px) 0 0/40px 40px,linear-gradient(rgba(53,109,98,.05) 1px,transparent 1px) 0 0/40px 40px,var(--paper); font-family:"PingFang SC",system-ui,sans-serif; }
    main { width:min(1260px,calc(100% - 28px)); margin:0 auto 80px; }
    .hero { padding:54px 0 30px; border-bottom:3px solid var(--ink); }
    .kicker { color:var(--directed); font-size:12px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
    h1 { max-width:1000px; margin:10px 0 14px; font:700 clamp(34px,6vw,74px)/1.03 "Songti SC",serif; }
    h2 { margin:52px 0 18px; font:700 32px/1.2 "Songti SC",serif; }
    h3 { margin:6px 0 0; font:700 28px/1.2 "Songti SC",serif; }
    h4 { margin:22px 0 12px; font-size:16px; }
    code { display:block; color:var(--muted); margin-top:7px; overflow-wrap:anywhere; white-space:normal; font:12px/1.55 ui-monospace,monospace; }
    .stats,.source-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:14px; margin-top:20px; }
    .stat,.source-card { padding:18px; border:1px solid var(--line); background:var(--card); }
    .stat b { display:block; font-size:28px; }
    .source-card strong { display:block; margin:7px 0; }
    .unit-card { margin-top:26px; padding:clamp(18px,3vw,34px); border:1px solid var(--line); border-left:8px solid var(--auto); background:var(--card); box-shadow:9px 10px 0 rgba(21,25,24,.07); }
    .unit-card.directed_capture { border-left-color:var(--directed); }
    .unit-head,.section-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; }
    .priority { display:inline-block; min-width:42px; padding:9px 10px; color:white; background:var(--gold); text-align:center; font-weight:900; }
    .priority.p0 { background:var(--directed); } .priority.p1 { background:var(--gold); } .priority.p2 { background:var(--auto); }
    .trace-row,.handle-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:15px; }
    .pill,.handle-row span { padding:6px 9px; border:1px solid var(--line); background:#f5f1e8; font-size:12px; }
    .directed-box { margin-top:18px; padding:14px 18px; color:#fff9f3; background:var(--directed); }
    .directed-box p { margin:5px 0; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:28px; }
    ul { margin:8px 0; padding-left:20px; }
    .asset-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr)); gap:16px; }
    .asset-card { position:relative; margin:0; border:1px solid var(--line); background:white; }
    .asset-card img { display:block; width:100%; height:280px; object-fit:contain; background:#dfddd6; }
    .asset-order { position:absolute; top:0; left:0; padding:7px 9px; color:white; background:var(--ink); font-size:12px; font-weight:800; }
    figcaption { padding:12px; }
    figcaption strong { display:block; }
    button { border:0; padding:10px 14px; color:white; background:var(--ink); cursor:pointer; font-weight:800; }
    pre { margin:0; padding:20px; white-space:pre-wrap; overflow-wrap:anywhere; color:#f6f2e8; background:#19211f; font:14px/1.75 "PingFang SC",sans-serif; }
    .prompt-section { margin-top:28px; }
    .fallback { margin-top:20px; padding:14px; border:1px dashed var(--line); }
    .table-wrap { overflow:auto; border:1px solid var(--line); background:var(--card); }
    table { width:100%; border-collapse:collapse; min-width:920px; }
    th,td { padding:13px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; font-size:13px; }
    th { position:sticky; top:0; color:white; background:var(--ink); }
    .warning { margin-top:28px; padding:18px; color:#fff; background:var(--directed); }
    @media (max-width:720px) { .two-col{grid-template-columns:1fr}.unit-head,.section-head{flex-direction:column}.asset-card img{height:240px} }
    @media print { body{background:white}.unit-card{box-shadow:none;break-inside:avoid}button{display:none}main{width:100%} }
  
[hidden]{display:none!important}
html{scroll-behavior:smooth}
main{width:min(1260px,calc(100% - 286px));margin:24px 20px 80px 266px}
.take-nav{position:fixed;inset:16px auto 16px 16px;width:230px;z-index:20;display:flex;flex-direction:column;overflow:hidden;background:#101925;color:#eff6fa;border:1px solid #33485b;border-radius:14px}
.take-nav-heading{padding:18px 16px 14px;border-bottom:1px solid #33485b}
.take-nav-heading strong{display:block;font-size:17px}.take-nav-heading small{display:block;margin-top:6px;color:#a9b9c8;font-size:12px}
.take-nav-list{list-style:none;margin:0;padding:10px;overflow-y:auto;min-height:0;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#4d697b #101925}
.take-nav-list li+li{margin-top:5px}
.take-link{display:flex;gap:10px;align-items:flex-start;padding:10px 8px;color:#cbd8e3;text-decoration:none;border:1px solid transparent;border-radius:8px;transition:background .15s,color .15s}
.take-link:hover{background:#1c2e3d;color:white}.take-link:focus-visible{outline:2px solid #b8eddb;outline-offset:-2px}
.take-link[aria-current="location"]{background:#224b43;border-color:#69ab94;color:#fff}
.take-number{display:grid;place-items:center;flex:0 0 28px;height:28px;border-radius:6px;background:#253646;color:#e3edf5;font:700 13px/1 system-ui,sans-serif}
.take-link[aria-current="location"] .take-number{background:#a7dac5;color:#142c25}
.take-label{min-width:0}.take-label b{display:block;font:700 11px/1.4 system-ui,sans-serif;letter-spacing:.06em;color:#aebfca}.take-label>span{display:block;margin-top:3px;font-size:13px;line-height:1.5;overflow-wrap:anywhere}.take-link[aria-current="location"] .take-label b{color:#c1eadc}
.delivery-note{padding:20px;border:1px solid #365360;border-radius:16px;background:#15252c;color:#d4e4e7;line-height:1.7}.asset-usage{font-size:12px;line-height:1.6}.production-details{padding:16px}.unit-card .asset-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))}.asset-card img{object-fit:contain;background:#0b1118;max-height:340px;cursor:zoom-in}summary{cursor:pointer;padding:10px;font-weight:600}.unit-card[id]{scroll-margin-top:24px}
@media(max-width:800px){main{width:calc(100% - 96px);margin:16px 12px 64px 84px}.take-nav{inset:8px auto 8px 8px;width:64px;border-radius:10px}.take-nav-heading{padding:12px 4px;text-align:center}.take-nav-heading strong{font-size:12px}.take-nav-heading strong span,.take-nav-heading small,.take-label{display:none}.take-nav-list{padding:6px}.take-link{justify-content:center;padding:8px 2px}.take-number{flex-basis:32px;height:32px}.unit-card{padding:14px;border-left-width:5px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.take-link{transition:none}}
@media print{.take-nav{display:none}main{width:100%;margin:0}.unit-card[id]{scroll-margin-top:0}}`;
export const DELIVERY_SCRIPT = `
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copy);
      const value = target.textContent;
      try { await navigator.clipboard.writeText(value); }
      catch {
        const area = document.createElement("textarea");
        area.value = value; area.style.position = "fixed"; area.style.opacity = "0";
        document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove();
      }
      const original = button.textContent; button.textContent = "已复制";
      setTimeout(() => { button.textContent = original; }, 1200);
    });
  });


(() => {
  const cards = [...document.querySelectorAll('[data-unit]')];
  const links = [...document.querySelectorAll('.take-link')];
  const list = document.querySelector('.take-nav-list');
  let active = -1, scheduled = false;
  function updateCurrent() {
    scheduled = false;
    let next = 0;
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].getBoundingClientRect().top > 96) break;
      next = i;
    }
    if (active === next) return;
    if (links[active]) links[active].removeAttribute('aria-current');
    active = next;
    const link = links[active];
    link.setAttribute('aria-current', 'location');
    const item = link.getBoundingClientRect(), viewport = list.getBoundingClientRect();
    if (item.top < viewport.top) list.scrollTop -= viewport.top - item.top + 8;
    else if (item.bottom > viewport.bottom) list.scrollTop += item.bottom - viewport.bottom + 8;
  }
  function scheduleUpdate() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateCurrent); }
  }
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('hashchange', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  updateCurrent();
})();
`;

export function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function renderDeliveryNavigation(units) {
  return `<nav class="take-nav" aria-label="生成块目录"><div class="take-nav-heading"><strong>生成块目录</strong><small>${units.length} 条 · 点击跳转</small></div><ol class="take-nav-list">${units.map((u,i)=>`<li><a class="take-link" href="#take-${i+1}" title="${escapeHtml(u.id+' · '+(u.title||''))}" aria-label="${escapeHtml(u.id+' · '+(u.title||''))}"><span class="take-number">${String(i+1).padStart(2,'0')}</span><span class="take-label"><b>${escapeHtml(u.id.replace(/^EP\d+-/,''))}</b><span>${escapeHtml(u.title||'')}</span></span></a></li>`).join('')}</ol></nav>`;
}

export function renderDeliveryAsset(asset, index, styleOnly = false) {
  return `<figure class="asset-card">${styleOnly ? '' : `<span class="asset-order">上传 ${index+1}</span>`}<img src="${escapeHtml(asset.url || ('file://'+asset.path.split('/').map(encodeURIComponent).join('/')))}" alt="${escapeHtml(asset.id)}" loading="lazy"><figcaption><strong>${escapeHtml(asset.id)}</strong><code>${escapeHtml(asset.path)}</code>${asset.usage ? `<p class="asset-usage">${escapeHtml(asset.usage)}</p>` : ''}</figcaption></figure>`;
}

export function renderStyleReferences(references = []) {
  if (!references.length) return '';
  return `<details id="style-reference"><summary>风格污染参考（独立风格资料，不属于剧情资产上传清单）</summary><div class="asset-grid">${references.map((a,i)=>renderDeliveryAsset(a,i,true)).join('')}</div></details>`;
}

export function renderDeliveryCard(unit, index) {
  const promptId = unit.promptId ?? `prompt-${index}`;
  const pathsId = unit.pathsId ?? `paths-${index}`;
  const assets = unit.assets;
  return `<article class="unit-card ${escapeHtml(unit.className || 'auto_event')}" data-unit="${index}" id="take-${index+1}">
    <header class="unit-head"><div><div class="kicker">${escapeHtml(unit.eyebrow || '')}</div><h3>${escapeHtml(unit.id)}${unit.title ? ' · '+escapeHtml(unit.title) : ''}</h3><p>${escapeHtml(unit.summary || '')}</p></div></header>
    ${unit.asset_mode === 'TEXT_ONLY' ? `<section class="text-only-assets"><h4>TEXT_ONLY · 无需上传图片</h4><p>依据正式资产规划 ${escapeHtml(unit.asset_basis.baseline_ref)} 的文本方案；无图片上传位。</p></section>` : `<section><div class="section-head"><h4>引用资产与上传顺序：</h4><button type="button" data-copy="${escapeHtml(pathsId)}">复制本条所有图片路径</button></div><span id="${escapeHtml(pathsId)}" hidden>${escapeHtml(assets.map(a=>a.path).join('\n'))}</span><div class="asset-grid">${assets.map((a,i)=>renderDeliveryAsset(a,i)).join('')}</div></section>`}
    <section class="prompt-section"><div class="section-head"><h4>Seedance 可复制提示词</h4><button type="button" data-copy="${escapeHtml(promptId)}">复制提示词</button></div><pre id="${escapeHtml(promptId)}">${escapeHtml(unit.prompt)}</pre></section>
    ${unit.detailsHtml ? `<details class="production-details"><summary>来源、行程预算、状态与验收</summary>${unit.detailsHtml}</details>` : ''}
  </article>`;
}

export function renderDeliveryShell({ title, units, introHtml = '', bodyHtml, tailHtml = '' }) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="seedance-delivery-layout" content="${DELIVERY_LAYOUT_VERSION}"><title>${escapeHtml(title)}</title><style>${DELIVERY_CSS}</style></head>
<body data-delivery-layout="${DELIVERY_LAYOUT_VERSION}">${renderDeliveryNavigation(units)}<main>${introHtml}${bodyHtml}${tailHtml}</main><script>${DELIVERY_SCRIPT}</script></body></html>`;
}
