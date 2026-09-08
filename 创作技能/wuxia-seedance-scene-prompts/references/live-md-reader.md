# Seedance 提示词阅读器

阅读器只在本机运行，从指定目录读取 Markdown，按集数和修订号展示提示词、参考图和上传顺序。不会上传文件、调用模型或生成视频。需要 Node.js 22 或更新版本及现代浏览器，无需安装 npm 依赖。

## 立即试用

在本技能目录执行；两个 Seedance 技能文件夹保持同级，见[制作包技能](../../compile-director-draft-to-seedance-package/SKILL.md)。

```bash
node scripts/init_reader_demo.mjs --output ./reader-demo
node scripts/serve_prompt_reader.mjs --config ./reader-demo/reader.json
```

浏览器打开 `http://127.0.0.1:8873/?episode=EP01`。按 Ctrl+C 停止。示例是两条无图提示词，用于检查阅读与更新，不能当作完整制作包校验通过的证明。初始化器拒绝覆盖已有目录。

后台运行和停止：

```bash
node scripts/serve_prompt_reader.mjs --config ./reader-demo/reader.json --background
node scripts/serve_prompt_reader.mjs --config ./reader-demo/reader.json --stop
```

## 接入自己的交付

`reader.json` 中每个 episode 配置 `id`、`root`、`directory_prefix`、`markdown_name`。例如 EP01 扫描 root 下以 `ep01_` 开头的目录中的 `delivery.md`。配置文件中的相对 root 与 asset_roots 相对于配置文件目录；MD 内图片路径则必须是使用者本机的完整绝对路径。填入 asset_roots 可限制允许展示的图片目录。port 可选 1024–65535 中的空闲端口。

MD 首行标记：

```markdown
<!-- seedance-reader {"schema":1,"episode":"EP01","revision":1,"status":"ready","blocks":2} -->
```

选择结构完整、图片可读且标为 ready 的最高 revision，同修订号重复会报错。draft 不展示；新版本不完整时显示提示并保留上一完整版本。ready 仅表示交付格式状态，不证明剧情或模型效果正确。

每条用 `## EP01-GEN-01 · 标题`，附 `时长：未校准 · 0张剧情参考图。`，以及“可复制提示词：”后的 text 代码块。无图块明确“无需上传图片。”和规划依据。有图块采用“顺序 | 资产图片 | 本条用途”表，链接使用完整路径，随后“按此顺序上传：”的 text 代码块逐行列出相同顺序的路径。单独风格参考不能放进剧情图上传表。完整可运行格式由上述示例或导出器产生。

编辑 MD 即可，约五秒检查一次；无需重新生成网页。页面保留阅读位置与展开状态，选中文本期间暂停刷新；连接断开或文件不可读时保留上次显示、暂停复制。重启配置才会载入新集数和根目录。页面记录的是阅读位置，不是持久审核批注系统。

## 从交付清单导出

```bash
node scripts/write_prompt_delivery_markdown.mjs ./reader-demo/manifest.json --episode EP01 --revision 2 --output ./reader-demo/deliveries/ep01_r02/delivery.md
node scripts/read_prompt_markdown.mjs ./reader-demo/deliveries/ep01_r02/delivery.md
node scripts/render_prompt_delivery_html.mjs ./reader-demo/manifest.json --output ./reader-demo/snapshot.html
```

普通清单使用 `blocks`；导演制作包使用 `generation_units`，由同级制作包校验器检查。导出器逐字保留提示词和上传顺序，先检查再原子写入。静态 HTML 是历史快照，参考图仍依赖使用者本地图片；分享 HTML 不会自动打包图片，也不会自动清理清单里的私人信息。

程序按仓库 LICENSE-TOOLS 授权，本文和示例数据按 CC BY-NC-SA 4.0 授权，作者 mtgh；商用须单独授权。
