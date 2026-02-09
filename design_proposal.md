# AI 润色高亮设计方案 (已定稿)

## 1. 选定方案：流光溢彩 (Magic Flow)

### 核心理念
采用 **Indigo (靛蓝) -> Fuchsia (紫红)** 的渐变光效，配合微弱的流动动画（Shimmer），营造出"AI 正在注入灵感"的魔法感。与仅表示"选中"的普通蓝色背景形成鲜明对比。

### 视觉规范

#### A. 颜色定义 (Color Palette)
- **背景 (Background)**: 高通透度渐变
  - 起始: `rgba(99, 102, 241, 0.15)` (Indigo-500 @ 15%)
  - 中段: `rgba(217, 70, 239, 0.15)` (Fuchsia-500 @ 15%)
  - 结束: `rgba(168, 85, 247, 0.15)` (Purple-500 @ 15%)
- **边框 (Border)**: 底部发光线
  - 颜色: `rgba(192, 132, 252, 0.6)` (Purple-400 @ 60%)
  - 样式: 仅作为装饰性下划线或微弱描边
- **光晕 (Glow)**:
  - 颜色: `rgba(139, 92, 246, 0.1)` (Violet-500 @ 10%)

#### B. 动画 (Animation)
- **流动 (Flow)**: 背景色位置缓慢移动，产生"呼吸"或"能量流动"的错觉。
- **进入 (Entrance/Sweep)**: 即使在静态预览中，也可以保留一个极慢的 `background-position` 循环，或者在鼠标悬停时加速。

#### C. 与普通选区对比
| 特性     | 普通选区 (Native Selection) | AI 润色高亮 (Magic Flow)         |
| :------- | :-------------------------- | :------------------------------- |
| **颜色** | 纯色 (蓝色/灰色)            | **紫/流光渐变** (Indigo/Fuchsia) |
| **纹理** | 平坦 (Flat)                 | **微弱噪点或光泽** (Shimmer)     |
| **动态** | 静态                        | **动态** (呼吸/流动)             |
| **含义** | "我选中了这段文字"          | "AI 正在优化这段文字"            |

## 2. 技术实现 (CSS Preview)

我们将更新 `src/index.css` 中的定义的 CSS 变量和类。

```css
:root {
  /* 定义新的魔法色系 */
  --ai-magic-bg-start: rgba(99, 102, 241, 0.12);
  --ai-magic-bg-mid:   rgba(217, 70, 239, 0.15);
  --ai-magic-bg-end:   rgba(168, 85, 247, 0.12);
  --ai-magic-border:   rgba(192, 132, 252, 0.5);
}

.ai-polish-preview-active .ai-polish-highlight {
  /* 基础样式 */
  background-image: linear-gradient(
    120deg, 
    var(--ai-magic-bg-start), 
    var(--ai-magic-bg-mid), 
    var(--ai-magic-bg-end)
  );
  background-size: 200% auto;
  border-bottom: 2px solid var(--ai-magic-border);
  color: inherit;
  border-radius: 2px;
  
  /* 动画 */
  animation: magic-shimmer 4s linear infinite;
}

@keyframes magic-shimmer {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

## 3. 后续步骤
- [ ] 更新 `src/index.css` 替换旧的 Amber 色系变量。
- [ ] 调整 `Editor.vue` (如果需要微调 class 逻辑)。
- [ ] 验证视觉效果。
