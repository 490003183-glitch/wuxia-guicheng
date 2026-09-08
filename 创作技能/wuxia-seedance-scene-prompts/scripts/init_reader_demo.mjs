#!/usr/bin/env node
// Copyright mtgh. SPDX-License-Identifier: LicenseRef-mtgh-Noncommercial-1.0
import fs from 'node:fs';
import path from 'node:path';
import {digest} from './read_prompt_markdown.mjs';
import {markdownFromDelivery} from './write_prompt_delivery_markdown.mjs';

const index=process.argv.indexOf('--output');
if(index<0 || !process.argv[index+1])throw Error('Usage: node scripts/init_reader_demo.mjs --output <new-demo-directory>');
const output=path.resolve(process.argv[index+1]);
if(fs.existsSync(output))throw Error('Output already exists; choose a new directory.');
fs.mkdirSync(path.join(output,'deliveries','ep01_r01'),{recursive:true});
const basisPath=path.join(output,'asset-plan.json');
fs.writeFileSync(basisPath,JSON.stringify({rows:[{baseline_ref:'DEMO-T01',decision:'TEXT_ONLY'}]},null,2)+'\n');
const manifest={title:'Seedance 阅读器示例',scope_notes:['这是阅读器格式示例，不是完整制作包，也不代表经过模型生成或时长校准。'],blocks:[
  {id:'EP01-GEN-01',title:'设备停机',duration_status:'未校准',prompt:'生成编号：EP01-GEN-01\n\n特殊规则：全程无台词。\n特殊规则：不生成旁白或画外人声。\n操作员按下停止按钮，输送带停止转动。'},
  {id:'EP01-GEN-02',title:'确认状态',duration_status:'未校准',prompt:'生成编号：EP01-GEN-02\n\n特殊规则：只说本条明确列出的原文台词，不新增、改写或重复对白，不添加未列出的旁白或画外人声。\n操作员（对检修员）说：“已经停好了。”\n检修员保持沉默，开始检查设备。'}
].map(block=>({...block,assets:[],required_assets:[],asset_mode:'TEXT_ONLY',asset_basis:{path:basisPath,sha256:digest(fs.readFileSync(basisPath)),baseline_ref:'DEMO-T01',decision:'TEXT_ONLY'}}))};
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(output,'deliveries','ep01_r01','delivery.md'),markdownFromDelivery(manifest,{episode:'EP01',revision:1}));
fs.writeFileSync(path.join(output,'reader.json'),JSON.stringify({port:8873,asset_roots:[],episodes:[{id:'EP01',root:'./deliveries',directory_prefix:'ep01_',markdown_name:'delivery.md'}]},null,2)+'\n');
console.log('Demo created: '+output+'\nStart: node scripts/serve_prompt_reader.mjs --config "'+path.join(output,'reader.json')+'"');
