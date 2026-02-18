# 小说文件夹基本路径结构

在 `localapp` 前端中，小说项目的文件夹结构设计如下：

## 1. 根目录结构

项目根目录 (ProjectRoot) 包含以下核心文件和文件夹：

```text
ProjectRoot/
├── project.json         # [核心索引] 存储项目结构树、节点关系和元数据
├── vector_db/           # [NEW] 向量数据库存储目录 (用于AI上下文检索)
├── Settings/            # 世界设定 (直接映射到目录，存储角色、地点等设定)
│   ├── Characters/
│   │   └── Hero.md
│   └── Locations/
└── .trash/              # 回收站 (删除的文件会移动到此处)
```

## 2. 长篇小说结构 (Long Novel)

长篇小说模式下，内容和层级更加丰富，文件夹结构如下：

```text
├── contents/            # 正文内容目录
│   ├── vol-1/           # 卷文件夹 (对应 Volume 节点)
│   │   ├── sec-1/       # 篇文件夹 (对应 Section 节点)
│   │   │   └── chap-1.md # 章节正文文件
├── outlines/            # 大纲目录
│   ├── global_outline.md    # 作品总纲 (对应 Root 节点的大纲)
│   ├── vol-1/
│   │   ├── vol-1_outline.md # 卷大纲
│   │   └── sec-1/
│   │       ├── sec-1_outline.md  # 篇大纲
│   │       └── chap-1_outline.md # 章节细纲 (对应 Chapter 节点的大纲)
```

**命名规则**:
*   文件夹使用节点的 `id` 命名 (例如 `vol-1`, `sec-1`)。
*   文件通常命名为 `id.md` 或 `id_outline.md`。

## 3. 短篇小说结构 (Short Novel)

短篇小说模式结构相对扁平：

```text
├── contents/
│   └── chap-1.md        # 章节正文直接位于 contents 目录下
├── outlines/
│   ├── global_outline.md # 作品总纲
│   └── chap-1_outline.md # 章节大纲
```

## 4. project.json 结构示例

`project.json` 是项目的入口文件，定义了节点的层级关系。它不包含具体的正文内容，只包含元数据。

```json
{
  "projectMode": "LONG", 
  "version": "1.0.0",
  "createdAt": 1715000000000,
  "updatedAt": 1715000000000, 
  "lastOpenedId": "story-root",
  "nodes": {
    "story-root": {
      "id": "story-root",
      "type": "ROOT",
      "title": "未命名作品",
      "children": ["vol-1"],
      "lastModified": 1715000000000
    },
    "vol-1": {
      "id": "vol-1",
      "type": "VOLUME",
      "children": ["sec-1"]
    },
    "chap-1": {
      "id": "chap-1",
      "type": "CHAPTER",
      "title": "第一章",
      "wordCount": 0,
      "lastModified": 1715000000000
    }
  }
}
```
