# 创作技能

这些技能是 mtgh 在《雾峡轨城》创作流程中使用的技能的公开派生版，现有 11 套。SKILL.md 给 AI 助手提供工作方法，附带的命令行工具可单独运行；不会自动调用视频生成服务。小说、剧本、导演和空间各自保留职责与来源版本。

| 技能 | 用途 |
| --- | --- |
| [write-canon-novel-prose](write-canon-novel-prose/SKILL.md) | 规划、写作、修订小说与合订本 |
| [adapt-canon-novel-to-screenplay](adapt-canon-novel-to-screenplay/SKILL.md) | 指定小说逐项忠实改编为剧本 |
| [write-canon-screenplay-dialogue](write-canon-screenplay-dialogue/SKILL.md) | 没有小说母稿的原创剧本、剧本改写与对白审阅 |
| [direct-edit-canon-episode](direct-edit-canon-episode/SKILL.md) | 整集导演、生成组织、时长预算与预剪辑 |
| [manage-canon-spatial-continuity](manage-canon-spatial-continuity/SKILL.md) | 地点、路线、时间与空间版本关联 |
| [wuxia-seedance-scene-prompts](wuxia-seedance-scene-prompts/SKILL.md) | 场景计划编译、状态与提示词校验；附 [Markdown 阅读器](wuxia-seedance-scene-prompts/references/live-md-reader.md) |
| [compile-director-draft-to-seedance-package](compile-director-draft-to-seedance-package/SKILL.md) | 导演稿到制作包、对白与素材覆盖、剪辑交接校验 |
| [derive-director-asset-plan](derive-director-asset-plan/SKILL.md) | 从剧本和导演稿判断复用、补图或无图需求 |
| [wuxia-image-asset-prompts](wuxia-image-asset-prompts/SKILL.md) | 静态配图提示词、使用边界及交付网页 |
| [build-character-language-habits](build-character-language-habits/SKILL.md) | 角色语言习惯、对白重复检查与自备语料分析 |
| [optimize-ai-live-action-sci-fi-serial](optimize-ai-live-action-sci-fi-serial/SKILL.md) | 连续剧悬念、兑现、节奏及制作可行性诊断 |

## 安装与开始

把所需文件夹复制到你的项目 `.agents/skills/` 下，保持原来的文件夹名称。两个 Seedance 文件夹必须一起复制并保持同级，因为编译、交付与阅读器共享代码；其他技能按各自说明使用。也可以不安装，直接让助手读取所需 SKILL.md。Python 工具仅依赖标准库，建议 Python 3.10 或更新版本；JavaScript 工具使用 Node.js 22 或更新版本，无需安装 npm 依赖。

首次使用先告诉助手三个路径：项目根目录、正式文本来源目录、草稿输出目录。可以直接使用本仓库的小说、剧本、角色和世界观目录作为只读来源。文档中的 `PROJECT_ROOT`、`CANON_ROOT`、`OUTPUT_ROOT` 是路径约定，助手需要替换为你实际指定的路径；脚本不读取这些变量，也没有指向作者电脑的默认目录。所有写文件工具必须显式提供输出参数。

例如：

```text
使用 $adapt-canon-novel-to-screenplay。
小说来源是我指定的 chapter.md，只依据这一份小说改编。
草稿输出到我指定的 drafts 目录，不修改小说。
```

只想阅读或诊断时不会自动写回。保存草稿、确认为正式版本、更新合订本、对外发布是不同操作；助手遵循本次明确授权范围。

## 依赖与使用边界

演员指纹研究、完整知识库管理、复杂动作研究、资产库管理程序及 LibTV 执行工具未随本目录打包；它们是可选的更深层流程。缺少时直接依据已确认角色资料和原稿，记录未知项，不捏造档案或声称完成平台生成。角色语言分析不附 CPED 数据集；使用者自行提供有权使用的语料。阅读器只在本机读取文件，不需要 API 密钥。

空间浏览器在仓库的 `空间工具/`，展示数据不等于完整空间注册表。空间技能的只读检查器需要按其契约组织的 `current.json`、来源与行程数据，不能直接拿浏览器的 global.json 当注册表。

已有的对白初筛、对白逐字对照、剧本来源检查、合订本与空间审计工具继续提供，新增工具的命令见对应技能入口。扫描通过只代表已检查的格式或数据条件成立，不代表文学质量、完整改编或物理可行性已获证明。

## 授权

技能文档、提示词和参考说明由 mtgh 按仓库的 CC BY-NC-SA 4.0 许可提供；程序、测试代码及阅读器网页适用 [工具代码许可](../工具代码许可.md) 与 [LICENSE-TOOLS](../LICENSE-TOOLS)，即 mtgh Noncommercial Software License 1.0。商业使用须另获 mtgh 授权。复制安装时同时保留相关许可文本与署名。它们是允许非商业使用的公开工具，不是允许自由商用的开源软件许可。
