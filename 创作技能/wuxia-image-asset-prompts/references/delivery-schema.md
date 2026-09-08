# 网页交付清单

assets 顺序即执行顺序。以下必填字段保留；没有参考图时 references 为空数组。示例为接口演示，不是正式剧情。

```json
{"title":"配图示例","assets":[{"id":"DEMO-SCN-001","name":"维修间","source":"当前剧本 S01","dependency":"已确认布局","background":"连续空间","aspect_ratio":"21:9","checkpoint":"结构核对后用于派生","acceptance_criteria":["通道畅通","电柜在出口左侧"],"references":[],"upload_settings":{"priority":"按条目顺序","strength":"结构准确优先","fallback":"保留关键空间关系"},"prompt":"写实维修间，21:9 连续空间。电柜位于出口左侧，中间通道畅通。右上角标 DEMO-SCN-001 和维修间。"}]}
```

已有图片引用：

```json
{"id":"DEMO-REF-001","name":"已授权空间参考","path":"/absolute/project/reference.jpg","locks":"出口与通道拓扑","do_not_inherit":"辅助线和临时物体"}
```

path 替换为当前操作系统实际存在的绝对路径，支持 png/jpg/jpeg/webp/avif/gif。跨电脑需更新路径。

尚未生成的上游依赖在未来上传位置使用：

```json
{"instruction":"加入已生成并确认的 DEMO-SCN-001 成图","locks":"已确认空间结构","do_not_inherit":"与当前状态无关的灯光"}
```

同一引用的 path 与 instruction 只能提供一个。说明不会进入复制路径列表。缺字段、重复 ID 或图片不存在使渲染失败。

公开派生版：mtgh，CC BY-NC-SA 4.0。
