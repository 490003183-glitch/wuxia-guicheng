# 创作技能

这五套技能是 mtgh 在《雾峡轨城》创作流程中使用的技能的公开派生版。它们给支持 SKILL.md 的 AI 助手提供工作方法；不是点一下就自动生成成片的独立软件。小说、剧本、导演和空间各自保留职责与来源版本。

| 技能 | 用途 |
| --- | --- |
| [write-canon-novel-prose](write-canon-novel-prose/SKILL.md) | 规划、写作、修订小说与合订本 |
| [adapt-canon-novel-to-screenplay](adapt-canon-novel-to-screenplay/SKILL.md) | 指定小说逐项忠实改编为剧本 |
| [write-canon-screenplay-dialogue](write-canon-screenplay-dialogue/SKILL.md) | 没有小说母稿的原创剧本、剧本改写与对白审阅 |
| [direct-edit-canon-episode](direct-edit-canon-episode/SKILL.md) | 整集导演、生成组织、时长预算与预剪辑 |
| [manage-canon-spatial-continuity](manage-canon-spatial-continuity/SKILL.md) | 地点、路线、时间与空间版本关联 |

## 安装与开始

把上表五个文件夹一起复制到你的项目 `.agents/skills/` 下，保持它们互为同级目录。也可以不安装，直接让助手读取所需 SKILL.md。Python 工具仅依赖标准库，建议 Python 3.10 或更新版本。

首次使用先告诉助手三个路径：项目根目录、正式文本来源目录、草稿输出目录。可以直接使用本仓库的小说、剧本、角色和世界观目录作为只读来源。文档中的 `PROJECT_ROOT`、`CANON_ROOT`、`OUTPUT_ROOT` 是路径约定，助手需要替换为你实际指定的路径；脚本不读取这些变量，也没有指向作者电脑的默认目录。所有写文件工具必须显式提供输出参数。

例如：

```text
使用 $adapt-canon-novel-to-screenplay。
小说来源是我指定的 chapter.md，只依据这一份小说改编。
草稿输出到我指定的 drafts 目录，不修改小说。
```

只想阅读或诊断时不会自动写回。保存草稿、确认为正式版本、更新合订本、对外发布是不同操作；助手遵循本次明确授权范围。

## 依赖与使用边界

五套技能的必要方法和本地参考都在本目录内。角色语言习惯、演员指纹、完整知识库管理、复杂动作研究、资产库、Seedance 提示词编译及 LibTV 执行工具未随本目录打包；它们是可选的更深层流程。缺少时直接依据已确认角色资料和原稿，记录未知项，不捏造档案或声称完成平台生成。

空间浏览器在仓库的 `空间工具/`，展示数据不等于完整空间注册表。空间技能的只读检查器需要按其契约组织的 `current.json`、来源与行程数据，不能直接拿浏览器的 global.json 当注册表。

本次保留五个命令行工具：对白模式初筛、对白逐字对照、剧本来源过期检查、小说合订本生成、空间注册表审计。扫描通过只代表已检查的格式或数据条件成立，不代表文学质量、完整改编或物理可行性已获证明。

## 授权

技能文档、提示词和参考说明由 mtgh 按仓库的 CC BY-NC-SA 4.0 许可提供；`scripts/` 中的 Python 代码适用 [工具代码许可](../工具代码许可.md) 与 [LICENSE-TOOLS](../LICENSE-TOOLS)，即 mtgh Noncommercial Software License 1.0。商业使用须另获 mtgh 授权。复制安装时同时保留相关许可文本与署名。它们是允许非商业使用的公开工具，不是允许自由商用的开源软件许可。
