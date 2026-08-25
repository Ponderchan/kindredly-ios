# Kindredly Wren Visual Growth System
## 9D Writing Aura → Wren 外形映射与美术资产规范

> 目标：把 **Writing Aura** 与 **Wren** 真正连接起来，让每个用户的 Wren 不是随机宠物，也不是 AI 临时生成的图片，而是由用户真实写作风格驱动、由预制美术资产稳定组合出来的“个人信使”。

---

# 1. 核心原则

Wren 的视觉身份由四层组成：

```text
WREN SPECIES CORE
固定物种骨架
↓
VOICE MORPH
Writing Aura 决定她“怎么长”
↓
JOURNEY MARKS
真实送信经历决定她“留下什么”
↓
COSMETICS
用户选择 / 付费决定她“今天怎么穿”
```

四层必须严格分开。

## 1.1 Species Core
保证每一只 Wren 都一眼属于 Kindredly。

固定：
- 基础脸型
- 眼睛结构
- 嘴型
- 基础身体比例区间
- 翅膀骨骼位置
- 配件 anchor
- silhouette 识别度

## 1.2 Voice Morph
由用户长期稳定的 **Writing Aura 9D** 决定。

它控制：
- 身体比例
- 羽冠
- 尾羽
- 翅膀开放度
- 表情基调
- 羽毛纹理
- 特殊 mark
- idle behavior
- flight trail

## 1.3 Journey Marks
由真实产品事件决定。

例如：
- First Flight
- First Reply
- First Kindred
- Name Exchange
- Night Flight
- repeated word

它们变成：
- keepsakes
- ribbons
- seals
- tags
- worn mail bag
- 纪念羽毛

## 1.4 Cosmetics
由用户主动选择或购买。

例如：
- skin
- hat
- scarf
- bag
- seal theme
- trail skin

Cosmetics 不能改变 Writing Aura，也不能改变匹配、送达、曝光。

---

# 2. Hatch 初生 Wren 的组成逻辑

Hatch 时不能直接使用完整 9D Writing Aura，因为 onboarding 只有一条或极少量文字，数据不足。

建议：

```text
Hatch Visual =
70% Fixed Wren Species
+ 20% Onboarding First Writing Signals
+ 10% Egg Birthmark
```

| 阶段 | 变化依据 | 权重 | 能改什么 |
|---|---|---:|---|
| Hatch 初生 | 固定 Wren species | 70% | 基础身体、脸、眼睛、翅膀、品牌 silhouette |
| Hatch 初生 | onboarding feed words | 20% | 1–2 个高置信视觉特征 |
| Hatch 初生 | 用户选的蛋壳 | 10% | birthmark / accent / shell charm |

## 2.1 Hatch 时只能读取“容易判断”的 early signals
优先：
- 平均句长
- 短句比例
- 节奏变化
- 标点密度
- concrete vs abstract
- 情绪直接 vs 含蓄
- 是否有明显 formatting / quirk

## 2.2 Hatch 只允许表现 1–2 个最强 signal

例如用户写：

> I fixed the chair today.  
> Nobody will ever know how much that meant.

系统可能判断：
- Sentence Style：short/direct
- Emotion：implicit
- Word Choice：concrete

但 Hatchling 只选最高置信的 1–2 个：

```text
body = compact
face = quiet
```

其余全部 default。

## 2.3 Hatch 阶段禁止
不要：
- 完整 9D morphology
- 最终 Writing Aura archetype
- 9维全显示
- 100% personality
- 完全不同 species
- AI 临时生成一只新鸟

Hatch 只是 first impression，不是 final identity。

---

# 3. Egg Choice → Birthmark

用户选蛋壳只能留下“出生痕迹”，不能影响人格。

| Egg Shell | 可保留 Birthmark | 不允许影响 |
|---|---|---|
| Moon | 淡紫脚环 / 月牙小点 | body / tail / personality |
| Moss | 一根绿色小羽毛 | Aura type |
| Paper | 米白壳片 charm | morphology |
| Static | 紫蓝 pixel mark | behavior |
| Dusk | 尾尖轻微色差 | personality |
| Bloom | cheek/wing 花瓣小点 | Aura score |

建议：

```text
Birthmark visual weight <= 10%
```

---

# 4. Me Tab 长期 Wren 的变化依据

进入产品以后，用户不再主动“喂 Wren”。

正常使用本身就是输入：
- 写公开信
- reply
- thread 内通信
- Kindred conversation
- 形成 Kindred
- 真实 writing pieces

长期 Wren 外形主要由：

```text
真实 Writing Aura → Voice Morph
真实 Journey Events → Keepsakes / History Marks
用户选择 / 付费 → Cosmetics
```

| 阶段 | 数据来源 | 作用 |
|---|---|---|
| Hatchling | onboarding seed + 少量真实 writing | 轻微个性化 |
| Fledge | 稳定中的 Writing Aura | 开始明显个性化 |
| Wren | 稳定 9D Writing Aura + Journey history | 完整个人 Wren |
| Evolving | 长期 Writing Aura 变化 | subtle mutation |

---

# 5. Character Evolution 比例

## Hatchling
```text
70% shared species
30% user influence
```

特征：
- 身体更圆
- 尾巴短
- 羽冠小
- 只表现 1–2 个个性特征
- 配件支持有限

## Fledge
```text
50% shared species
50% stable Writing Aura
```

特征：
- body morph 更明显
- tail 开始分化
- marking 开始出现
- 3–5 个 Aura traits 可见

## Wren
```text
40% shared species
60% Writing Aura + Journey history
```

特征：
- 完整 morphology
- full tail
- full markings
- stable flight trail
- full accessory support

## Evolving
成熟后不再变成“更高级物种”。

只做：
- small mutation
- tail 轻微变化
- tuft 变化
- marking 变化
- idle behavior 变化
- flight trail 节奏变化

---

# 6. 9D Writing Aura → Wren 外形完整映射

这是美术与工程最核心的映射。

| Aura Dimension | 用户写作含义 | 控制 Wren 部位 | 视觉轴 | 5 档资产建议 | 动态影响 |
|---|---|---|---|---|---|
| Word Choice | concrete ↔ abstract / ornate | feather texture | crisp ↔ dreamy | crisp / clean / neutral / textured / dreamy | aura glow softness |
| Sentence Style | short/direct ↔ long/layered | body proportion | compact ↔ elongated | compact / short / balanced / long / elongated | breathing amplitude |
| Rhythm | steady ↔ varied/bursty | tuft + idle tempo | flat ↔ wild | flat / soft / neutral / lively / wild | idle animation speed |
| Punctuation | sparse ↔ expressive | flight trail | clean ↔ expressive | line / dotted / broken / rhythmic / expressive | flight cadence |
| Flow | linear ↔ branching/circling | tail | straight ↔ branching | straight / slight curve / curve / fork / branching | turning curve |
| Little Words | firm/direct ↔ hedged/qualifying | idle behavior | decisive ↔ hesitant | forward / tilt / think / double tilt / hesitate | head tilt / pause |
| Emotion | implicit ↔ explicit | eyes / face baseline | restrained ↔ expressive | restrained / quiet / neutral / warm / expressive | reaction intensity |
| Quirks | conventional ↔ distinctive | markings / asymmetry | none ↔ unusual | none / dot / feather / asymmetry / mutation | special idle |
| Shape | compact block ↔ fragmented/open | wing openness | tucked ↔ wide | tucked / relaxed / neutral / open / wide | resting silhouette |

---

# 7. 每个维度的 5 Bucket 规则

内部值仍然可以是 0–100。

视觉只使用 5 档：

```text
0–19
20–39
40–59
60–79
80–100
```

不要为每个数值单独画资产。

---

# 8. Sentence Style → Body

| Bucket | Score | Asset | 视觉 |
|---|---:|---|---|
| 1 | 0–19 | compact | 最短最紧凑 |
| 2 | 20–39 | short | 偏紧凑 |
| 3 | 40–59 | balanced | 默认 Wren |
| 4 | 60–79 | long | 身体稍舒展 |
| 5 | 80–100 | elongated | 最修长但仍保持 species silhouette |

---

# 9. Rhythm → Tuft

| Bucket | Score | Asset | 视觉 |
|---|---:|---|---|
| 1 | 0–19 | flat | 羽冠低、动作稳定 |
| 2 | 20–39 | soft | 微弯 |
| 3 | 40–59 | neutral | 默认 |
| 4 | 60–79 | lively | 羽冠抬起 |
| 5 | 80–100 | wild | 明显分叉、跳动感 |

---

# 10. Flow → Tail

| Bucket | Score | Asset | 视觉 |
|---|---:|---|---|
| 1 | 0–19 | straight | 直短尾 |
| 2 | 20–39 | slight_curve | 微弯 |
| 3 | 40–59 | curve | 标准曲尾 |
| 4 | 60–79 | fork | 轻分叉 |
| 5 | 80–100 | branching | 多层分叉 |

---

# 11. Emotion → Face Baseline

注意：Emotion 不是当前 mood，它是用户长期表达情绪的方式。

| Bucket | Score | Asset | 视觉 |
|---|---:|---|---|
| 1 | 0–19 | restrained | 眼神克制、cheek 很淡 |
| 2 | 20–39 | quiet | 柔和安静 |
| 3 | 40–59 | neutral | 默认 |
| 4 | 60–79 | warm | 更有表情 |
| 5 | 80–100 | expressive | baseline 更明显 |

Mood（happy / worried / curious）是另一个即时状态系统。

---

# 12. Quirks → Special Marking

这是最适合形成“个人 Wren”的维度。

| Bucket | Score | Asset | 视觉 |
|---|---:|---|---|
| 1 | 0–19 | none | 无特殊 mark |
| 2 | 20–39 | dot | 小点 / 小羽纹 |
| 3 | 40–59 | feather | 一根独特羽毛 |
| 4 | 60–79 | asymmetry | 左右不对称 |
| 5 | 80–100 | mutation | 特殊尾尖 / crooked feather / rare mark |

不要做 `LEGENDARY 0.7%`。

用户看到的是：

> Otis grew something unusual.

---

# 13. Shape → Wings

| Bucket | Score | Asset |
|---|---:|---|
| 1 | 0–19 | tucked |
| 2 | 20–39 | relaxed |
| 3 | 40–59 | neutral |
| 4 | 60–79 | open |
| 5 | 80–100 | wide |

---

# 14. Punctuation → Flight Trail

Punctuation 最适合作为动态而非身体部件。

| Bucket | Score | Trail |
|---|---:|---|
| 1 | 0–19 | clean continuous |
| 2 | 20–39 | lightly dotted |
| 3 | 40–59 | broken |
| 4 | 60–79 | rhythmic |
| 5 | 80–100 | highly expressive |

不要直接画 `?! ...`，而是抽象成：
- line breaks
- dots
- pulse
- spacing

---

# 15. Little Words → Idle Behavior

用户经常使用：
- maybe
- just
- actually
- kind of
- perhaps
- still

这不代表“犹豫人格”，只作为无意识语言习惯。

| Bucket | Idle |
|---|---|
| firm | 正视前方 |
| slight | 小歪头 |
| balanced | 默认 |
| thoughtful | 歪头 + pause |
| qualifying | 双歪头 + 小停顿 |

---

# 16. Word Choice → Feather Texture

| Bucket | Texture |
|---|---|
| concrete strong | crisp |
| concrete | clean |
| balanced | neutral |
| abstract | textured |
| abstract strong | dreamy |

注意：不要让 texture 把 Wren 变成另一种画风。

只是：
- edge softness
- subtle feather pattern
- glow density

---

# 17. 视觉变化不能每封信都触发

必须有 Change Threshold。

推荐：

```text
某维度跨越 bucket
AND
confidence >= 0.70
AND
连续 3 次 Aura update 都保持在新 bucket
```

才允许替换对应视觉资产。

例如：

```text
Rhythm:
58 → 61 → 65 → 68
```

第一次 61 不变化。

连续三次稳定在 60–79 后：

```text
tuft_neutral
→
tuft_lively
```

UI 可以触发：

> Otis changed.

这样 Wren 不会每写一句就抖来抖去。

---

# 18. Journey Events → Keepsakes

Writing Aura 决定她“长什么样”。

Journey 决定她“经历过什么”。

| Event | Trigger | Keepsake / Mark |
|---|---|---|
| First Flight | 第一封公开信 | first-flight tag |
| First Reply | 第一次回复 | envelope charm |
| Night Flight | 夜间真实送信 | moon pin |
| First Name Enclosed | 第一次封名字 | signature ribbon |
| Mutual Name Exchange | 双签完成 | brass seal |
| First Kindred | 第一个 Kindred | Kindred badge |
| 10 Letters | 10 封真实送达 | worn mail tag |
| 50 Letters | 50 封 | worn satchel detail |
| Repeated Word | 真实重复词 | word card |
| Long Flight | 达到真实时长阈值 | travel feather |
| Anniversary | 一年 | annual seal |

这些不能买。

这些是 history receipts。

---

# 19. Cosmetics

Cosmetics 是独立层。

| Slot | 免费 | Earned | Premium |
|---|---|---|---|
| Look | Sticker | milestone Plush | Ink / Pixel / Clay / Glow |
| Head | Bare | journey item | hat / flower / shades |
| Neck | none | ribbon | scarf / seasonal |
| Body | default | journey sash | coat / vest |
| Bag | standard | worn bag | premium bag |
| Trail Skin | default | earned skin | stardust / seasonal |
| Seal | default | first Kindred seal | wax themes |

## 重要

Writing Aura 决定 `trail rhythm`。

Premium 只能决定 `trail skin`。

例如：

```text
Aura trail = dotted
Premium skin = stardust
```

最终：

```text
stardust dotted trail
```

---

# 20. 美术资产生产方式

绝对不要预画 50–100 只完整鸟。

要做 modular asset library。

推荐结构：

```text
WREN
├── body
├── body_texture
├── head
├── eyes
├── tuft
├── back_wing
├── front_wing
├── tail
├── quirk_mark
├── birthmark
├── neck_item
├── body_item
├── bag
├── head_item
├── particles
└── trail
```

---

# 21. SVG 渲染 Layer Order

建议固定：

```text
00_shadow
01_body
02_body_texture
03_tail
04_back_wing
05_front_wing
06_head
07_face
08_tuft
09_quirk_mark
10_birthmark
11_neck_item
12_body_item
13_bag
14_head_item
15_particles
16_trail
```

所有部件必须：
- 相同 viewBox
- 相同 anchor
- 相同 pivot
- 可以自由组合
- 不穿模

---

# 22. Asset Naming Convention

例如：

```text
wren_body_hatch_compact_01.svg
wren_body_fledge_balanced_03.svg
wren_body_adult_elongated_05.svg

wren_tuft_hatch_soft_02.svg
wren_tuft_adult_lively_04.svg

wren_tail_adult_branching_05.svg

wren_quirk_crooked_feather_04.svg

wren_birthmark_moon_01.svg

wren_trail_dotted_02.svg
```

---

# 23. Launch Character Matrix

建议美术先交这套 Matrix，不要先画整鸟。

## BODY
`compact / short / balanced / long / elongated`

## TUFT
`flat / soft / neutral / lively / wild`

## TAIL
`straight / slight curve / curve / fork / branching`

## WINGS
`tucked / relaxed / neutral / open / wide`

## FACE
`restrained / quiet / neutral / warm / expressive`

## QUIRK
`none / dot / special feather / asymmetry / mutation`

## TEXTURE
`crisp / clean / neutral / textured / dreamy`

## TRAIL
`clean / dotted / broken / rhythmic / expressive`

---

# 24. Launch 资产数量建议

| Asset Group | Hatchling | Fledge | Wren | Total |
|---|---:|---:|---:|---:|
| Body | 3 | 5 | 5 | 13 |
| Tuft | 3 | 5 | 5 | 13 |
| Tail | 2 | 4 | 5 | 11 |
| Wings | 3 | 5 | 5 | 13 |
| Face baseline | 3 | 5 | 5 | 13 |
| Quirk marks | 2 | 4 | 8 | 14 |
| Birthmarks | 6 | reuse | reuse | 6 |
| Flight trails | 1 | 3 | 5 | 9 |
| Idle animations | 3 | 5 | 5 | 13 |
| Journey keepsakes | — | — | — | 10–15 |
| Default cosmetics | — | — | — | 12–18 |
| Premium cosmetics | — | — | — | 20–30 |

重点：这不是 100 只 Wren，而是约 80–100 个可组合零件。

---

# 25. Example：一个真实用户怎么被组合

用户 Writing Aura：

```text
Word Choice      28
Sentence Style   22
Rhythm           81
Punctuation      33
Flow             68
Little Words     46
Emotion          31
Quirks           74
Shape            39
```

映射结果：

```text
Word Choice 28
→ texture_clean_02

Sentence Style 22
→ body_short_02

Rhythm 81
→ tuft_wild_05

Punctuation 33
→ trail_dotted_02

Flow 68
→ tail_fork_04

Little Words 46
→ idle_think_03

Emotion 31
→ face_quiet_02

Quirks 74
→ quirk_asymmetry_04

Shape 39
→ wing_relaxed_02
```

最终视觉：

> 身体偏紧凑、羽冠非常活跃、尾羽轻微分叉、眼神安静、左右有一点不对称、翅膀较放松，飞行时带轻微断点轨迹。

如果 Egg = Moon：

```text
+ moon birthmark
```

如果用户已获得 First Kindred：

```text
+ brass seal keepsake
```

如果用户购买 Ink Look：

```text
+ same Wren rendered in Ink skin
```

Writing Aura 本身完全不改变。

---

# 26. AI 与美术的职责边界

## AI / Writing Engine

只输出 Writing Aura 数据。

例如：

```json
{
  "word_choice": 28,
  "sentence_style": 22,
  "rhythm": 81,
  "punctuation": 33,
  "flow": 68,
  "little_words": 46,
  "emotion": 31,
  "quirks": 74,
  "shape": 39
}
```

AI 不生成 Wren 图片。
AI 不选择衣服。
AI 不随机设计新物种。

---

# 27. Visual Mapper

规则引擎把数字映射到 asset。

例如：

```text
sentence_style 22
→ body_short_02

rhythm 81
→ tuft_wild_05

flow 68
→ tail_fork_04

quirks 74
→ quirk_asymmetry_04
```

---

# 28. Wren Appearance Config

最终客户端收到：

```json
{
  "stage": "fledge",
  "body": "short_02",
  "texture": "clean_02",
  "tuft": "wild_05",
  "tail": "fork_04",
  "wings": "relaxed_02",
  "face": "quiet_02",
  "quirk": "asymmetry_04",
  "birthmark": "moon_01",
  "trail": "dotted_02",
  "idle": "think_03",
  "look": "sticker",
  "dress": {
    "head": "headphones",
    "neck": null,
    "body": null,
    "bag": "default_mailbag"
  },
  "journey_marks": [
    "first_flight_tag",
    "first_reply_charm"
  ]
}
```

客户端按 layer 组合即可。

---

# 29. 整个生成 Pipeline

```text
User Writing
↓
Writing Aura Engine
↓
9D Vector
↓
Confidence / Stability
↓
Visual Mapper
↓
WrenAppearanceConfig
↓
Pre-drawn SVG Asset Library
↓
SwiftUI / Client Layer Composer
↓
User's Wren
```

一句话：

> **AI 算 Wren 的 DNA；美术预制 Wren 的基因零件；客户端把它们拼成用户自己的 Wren。**

---

# 30. 最终美术必须理解的四句话

1. 每个人的 Wren 不是 AI 现场画出来的。
2. 每个人的 Wren 也不是从 20 只固定鸟里随机抽出来的。
3. 所有人属于同一个 Wren species，但不同 Writing Aura 会改变部件组合。
4. 最终 Wren = Species + Voice Morph + Birthmark + Journey Marks + Cosmetics。

这就是完整的 Wren character production system。
