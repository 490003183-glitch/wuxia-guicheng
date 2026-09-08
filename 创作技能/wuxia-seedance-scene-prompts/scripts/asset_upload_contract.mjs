// A source-authorized no-image decision is not an asset gap. This verifies
// evidence identity and declared decision; scene/scope suitability still needs review.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function validateAssetUploadMode(unit, {verifyFiles=true}={}) {
  const fail=message=>{throw new Error(message);};
  const mode=unit.asset_mode ?? 'REFERENCE_IMAGES';
  if (!['REFERENCE_IMAGES','TEXT_ONLY'].includes(mode)) fail('ASSET_MODE_INVALID: use REFERENCE_IMAGES or TEXT_ONLY');
  if (!Array.isArray(unit.assets)) fail('ASSET_LIST_REQUIRED: assets must be an array');
  for(const asset of unit.assets){
    if(asset?.role==='style_only' || /风格污染/u.test(path.basename(asset?.path ?? ''))) fail('STYLE_ONLY_UPLOAD_FORBIDDEN: show style-only material in the separate reference section, not a story upload slot');
  }
  if(mode==='REFERENCE_IMAGES'){
    if(!unit.assets.length)fail('ASSET_LIST_EMPTY: empty uploads require a source-authorized TEXT_ONLY decision');
    return {asset_mode:mode};
  }
  if(unit.assets.length || !Array.isArray(unit.required_assets) || unit.required_assets.length)fail('TEXT_ONLY_ASSET_CONFLICT: assets and required_assets must both be empty arrays');
  const basis=unit.asset_basis;
  if(!basis || basis.decision!=='TEXT_ONLY' || typeof basis.path!=='string' || !path.isAbsolute(basis.path) || !/^[a-f0-9]{64}$/i.test(basis.sha256 ?? '') || typeof basis.baseline_ref!=='string' || !basis.baseline_ref.trim())fail('TEXT_ONLY_EVIDENCE_REQUIRED: supply asset_basis path, sha256, baseline_ref and decision');
  if(verifyFiles){
    const bytes=fs.readFileSync(basis.path);
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==basis.sha256.toLowerCase())fail('TEXT_ONLY_SOURCE_STALE: asset_basis hash differs');
    const source=JSON.parse(bytes.toString('utf8'));
    const rows=[];
    function visit(value){if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object'){if(value.baseline_ref===basis.baseline_ref)rows.push(value);Object.values(value).forEach(visit);}}
    visit(source);
    if(rows.length!==1 || rows[0].decision!=='TEXT_ONLY')fail('TEXT_ONLY_SOURCE_DECISION_MISMATCH: identify exactly one TEXT_ONLY row in the formal asset handoff');
  }
  return {asset_mode:mode,asset_basis:{...basis}};
}
