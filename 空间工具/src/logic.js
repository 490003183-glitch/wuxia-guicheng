// Copyright (c) 2026 mtgh. LicenseRef-mtgh-Noncommercial-1.0; see LICENSE-TOOLS at repository root.
const SpatialLogic = (() => {
  function cityToLocal(node, origin) {
    const angle=(node.a-origin.a)*Math.PI/180;
    return [node.r*Math.sin(angle)*1000,(origin.r-node.r*Math.cos(angle))*1000,(node.z-origin.z)*1000];
  }
  function referenceFoot(node, origin) {
    return cityToLocal({...node,r:origin.r},origin);
  }
  function routeProfile(nodes, edges) {
    const by=Object.fromEntries(nodes.map(n=>[n.id,n]));
    const origin=nodes.reduce((a,b)=>a.r>=b.r?a:b);
    if(!edges.length)return {origin,points:[],total:0};
    let distance=0,last=edges[0].from;
    const point=id=>({id,name:by[id].name,distance,height:(origin.r-by[id].r)*1000});
    const points=[point(last)];
    for(const edge of edges){
      if(edge.from!==last)throw Error('高度剖面需要按顺序相连的路线。');
      distance+=edge.length;points.push(point(edge.to));last=edge.to;
    }
    return {origin,points,total:distance};
  }
  function phaseAt(phases, minute) {
    let index = 0;
    phases.forEach((p, i) => { if (p[0] <= minute) index = i; });
    return index;
  }
  function spanAt(spans, minute) {
    return spans.find(s => s[0] <= minute && minute < s[1]) || null;
  }
  function edgeAt(edges, minute) {
    return edges.find(e => e.start <= minute && minute < e.end) || null;
  }
  function nextEvent(phases, minute, direction) {
    const times = phases.map(p => p[0]);
    return direction > 0 ? (times.find(t => t > minute) ?? times[times.length - 1]) : (times.filter(t => t < minute).pop() ?? times[0]);
  }
  function validate(packet) {
    if (!packet || !packet.local || !packet.global || !packet.expected) throw Error('空间数据未完整打包。');
    const { local: d, global: g, expected: x } = packet;
    if (d.version !== x.local || g.version !== x.global || d.globalVersion !== g.version) throw Error('全局与局部空间版本不一致，请从项目入口重新打开。');
    if (!Array.isArray(d.nodes) || d.nodes.length < 2 || !Array.isArray(d.phases) || !Array.isArray(d.timing)) throw Error('空间数据缺少地点或时间线。');
    const ids = new Set();
    d.nodes.forEach(n => {
      if (ids.has(n.id) || ![n.a, n.r, n.z].every(Number.isFinite)) throw Error('地点编号重复或坐标无效。');
      ids.add(n.id);
    });
    let last = -1;
    d.phases.forEach(p => { if (!Number.isFinite(p[0]) || p[0] <= last) throw Error('事件时间顺序有误。'); last = p[0]; });
    d.legs.forEach(l => { if (!ids.has(l[0]) || !ids.has(l[1]) || !(l[2] > 0)) throw Error('路线端点或路程有误。'); });
    return true;
  }
  function mainLocation(edges, minute) {
    const edge = edgeAt(edges, minute);
    if (edge) return { kind: 'segment', edge, node: edge.from, text: `${edge.fromName} → ${edge.toName}` };
    if (minute >= 19 && minute < 27) return { kind: 'stay', node: 'S54', text: 'L3接应凹间 · 等候与换甲' };
    if (minute >= 34) return { kind: 'exit', node: 'S56', text: '泵房外墙后的维护道 · 尚未到白塔' };
    return { kind: 'unknown', node: 'S39', text: '尚未标定' };
  }
  return { phaseAt, spanAt, edgeAt, nextEvent, validate, mainLocation, cityToLocal, referenceFoot, routeProfile };
})();
if (typeof module !== 'undefined') module.exports = SpatialLogic;
