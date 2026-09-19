# Writing aura · 五十张场景重做 · brief v2 (2026-09-19)

第一版是 160×120 像素画。放大到 3× 屏幕上发虚,也不像一张会被截图分享的画。
这一版换成**清晰的平面矢量风**(和信使卡上的地球、鸟的贴纸风同一家),尺寸按现在
真正用到的三个位置定。

---

## 1 · 尺寸

| 位置 | 显示尺寸 (pt) | 比例 | 要求 |
|---|---|---|---|
| Me 页 Aura 卡的画带(主用途) | 370 × 208 | **16:9** | 满幅,顶到卡边 |
| Writing Aura details · Portrait | 同上 | 16:9 | 同一张 |
| 分享卡(AuraTicket,会被截图发出去) | 299 × 156 | ≈ 1.92:1 | 上下各再裁掉 ~2.5% |
| 3–4 级的 sketch 版 | 同上 | 16:9 | **不用画**,由成品去色 + 淡紫单色化得到 |

**母版:2400 × 1350 px,16:9。** 3× 屏幕上画带是 1110 × 624 px,母版留了 2 倍余量,也够做商店截图和海报。

**安全区**:所有重要东西放在**中央 2400 × 1250**(上下各留 50 px 可被分享卡裁掉)。
另外画面中央 **1350 × 1350 的正方形**里要能读出这张画是什么——用户截图发到社交平台常被裁成方的。

**格式**:PNG(sRGB,无 alpha),或 WebP 无损。文件名 `{##}-{id}.png`,编号和 id 照 `aura-names.md` 的表(01 quiet-observer … 50 late-night-classic)。

---

## 2 · 风格

**平面矢量插画,干净的形状,轻微的软阴影和光,没有描边(或只有极细的深色描边)。**
参照物就在 app 里:信使卡的那颗地球(圆润的大陆、软渐变的天空)和 WrenBird 的贴纸感。
五十张要像**同一位插画师一周内画完的一套**——同一个人物、同一只鸟、同一支笔。

- **不要**:像素画、写实、3D 渲染、水彩纸纹、粗黑描边的卡通、任何文字/字母/数字/logo/UI/对话气泡。
- **要**:一眼能读的大轮廓,颜色块少而饱满,留白多,像一张好看的独立游戏静帧、像一张会被存下来当壁纸的图。

### 固定元素(每一张都要有)

| 元素 | 规格 |
|---|---|
| 人物 | **同一个人**:中性,短的深发 `#1E1B33`,纯色蓝上衣 `#3A3AF5`,与视线齐平、微微四分之三侧面;脸只有两只小眼睛,不画嘴不画细节 |
| 信使 | **每张都有那只鸟**:小的平面蓝鸟(圆身、奶白肚子、小橙喙 `#F2A33A`),停在自然的地方——桌角、窗台、床头、肩上 |
| 纸 | 画面里永远有纸:一封信、一本笔记、一张纸 |
| 地面 | 画到底,不透明;地面和墙是两个平色 |

### 调色(全套共用,每张 ≤ 10 个主色)

| 名 | 色 | 用途 |
|---|---|---|
| 纸白 | `#FFFFFF` | 所有纸 |
| 墨 | `#1E1B35` | 头发、少量细节 |
| 笔蓝 | `#3A3AF5` | 上衣、鸟身、信封上的邮票 |
| 天蓝 | `#5757EC` / `#A9C6F2` | 鸟的翅膀、窗外 |
| 珊瑚 | `#F2887E` | 唯一的暖点缀(杯子、一枚贴纸、一朵花) |
| 苔绿 | `#6DAE78` | 植物、窗外的树 |
| 黄铜 | `#D8A63F` | 灯光、鸟喙的暖、傍晚 |
| 薰衣草 | `#ECECFE` / `#DEDBF7` | 白天的墙和地(Quiet / Quick / Slow 的底) |
| 夜蓝 | `#2B2650` / `#1E1B35` | Late-night 的墙和地 |

---

## 3 · 构图

- 人物放在画面**偏左三分之一到中央**,右边留给窗 / 桌 / 世界,左右两侧各留 15% 呼吸——画带比分享卡宽,两边被裁也不心疼。
- 人物高度约占画面高度的 **45–55%**(比像素版大一圈:这张画要在 370 pt 宽的卡上一眼看清)。
- 地平线在画面 **62–70%** 高度处,五十张统一——这样五十张排在一起时地面是齐的。
- 光从窗来;Late-night 的光只从一盏灯来。

---

## 4 · Prompt 模板

`{SCENE}` 从第 5 节按名词取,`{TREATMENT}` 按形容词取。

```
Flat vector illustration, clean geometric shapes, soft even lighting with gentle shading, no outlines, no texture, no text. Wide 16:9 composition, generous negative space, subject in the left-centre third.

Palette: paper white #FFFFFF, ink #1E1B35, pen blue #3A3AF5, sky blue #5757EC, mist #A9C6F2, coral #F2887E, moss green #6DAE78, brass #D8A63F, lavender walls #ECECFE and floor #DEDBF7.

Scene: {SCENE}

Always: one gender-neutral person with short dark hair and a plain blue top, face reduced to two small eyes; a sheet of paper or notebook in the scene; a small round flat blue bird with a cream belly and a tiny orange beak perched somewhere natural.

Mood and light: {TREATMENT}

Style: like a resting frame from a beautiful indie game, calm, warm, slightly lonely, a picture someone would save as a wallpaper. Horizon at about two thirds down the frame.

No text, no letters, no numbers, no logos, no UI, no speech bubbles, no pixel art, no photorealism, no 3D render, no thick cartoon outlines, no watercolor texture.
```

工具要比例参数的:`--ar 16:9`。出图后按第 7 节检查。

---

## 5 · 五十张 · 逐张描述

先记住两张表,五十张 = 名词场景 × 形容词处理。

### 名词 → 场景(10)

| 名词 | 它说的是 | SCENE |
|---|---|---|
| Observer | 用词具体,写看得见的东西 | a person at a window with a small notebook, leaning in to look at something tiny on the sill — a cup, a leaf, a snail |
| Dreamer | 用词抽象,写想法 | a person lying on the floor looking up at the ceiling, headphones on, a notebook open on their chest, one plant in the corner |
| Storyteller | 从场景写到感受 | a person in a train seat by the window, one hand mid-gesture as if telling something, a notebook on the knee, fields passing outside |
| Minimalist | 一封信只写一件事 | a bare room: one desk, one lamp, one chair, one sheet of paper, the person sitting very straight |
| Reporter | 写外面的世界 | a person on a rooftop looking out over a city of simple blocks, a small notepad in hand, the world bigger than them |
| Diarist | 从里面写,"我"打头 | a person in bed under a blanket writing in a journal, the door closed, a bedside lamp |
| Overthinker | 先犹豫再下笔 | a person at a desk surrounded by crumpled and crossed-out drafts, pen held in the mouth, one clean sheet still empty |
| Truth-teller | 不绕弯,直接说 | two chairs at a kitchen table, the person has just pushed a letter across to the empty chair, both hands flat on the table |
| Original | 有自己的小癖好 | a person at a desk in front of a wall covered in stickers, cut-outs and pinned scraps, a collage in progress |
| Classic | 干净的传统文笔 | a proper wooden desk with a fountain pen and a neat stack of envelopes, the person writing with good posture |

### 形容词 → 处理(5)

| 形容词 | 它说的是 | TREATMENT |
|---|---|---|
| Quiet | 感受压在字底下 | muted lavender and mist tones, soft even daylight, nothing in motion, very few objects, stillness |
| Unfiltered | 感受直接说出来 | saturated pen blue with coral accents, energetic, a spill of marks on the paper, one thing knocked over, the bird mid-flap |
| Quick | 短句、急促 | bright cool morning light, a few soft motion lines, half-finished objects, a cup still steaming, the sense of hurry |
| Slow | 长句、匀速 | long late-afternoon shadows in warm brass and lavender, a cup gone cold, dust in the light, unhurried |
| Late-night | 一半以上的信在 22 点后寄出 | deep night blue walls and floor instead of lavender, one warm brass lamp as the only light, a moon in the window, everything else dim |

### 五十张

每行:编号 · id · 一句话形象(交给画的人看的),SCENE 和 TREATMENT 按上面两表拼进模板。

**Observer 观察者**
- 01 · quiet-observer · 午后的窗台,一个人凑近看窗台上的一片叶子,鸟停在窗框上,一切静止。
- 02 · unfiltered-observer · 同一个窗台,但笔记本上洒了一串鲜艳的记号,珊瑚色的杯子倒了,鸟正扑翅。
- 03 · quick-observer · 早晨的窗,人半站着匆匆记一笔,杯子还冒热气,窗外有淡淡的动线。
- 04 · slow-observer · 傍晚长影横过窗台,人慢慢看着,杯子早凉了,光里有尘。
- 05 · late-night-observer · 夜里的窗,窗外一轮月,只有一盏台灯照着窗台上那件小东西。

**Dreamer 空想者**
- 06 · quiet-dreamer · 一个人躺在地板上看天花板,耳机戴着,笔记本摊在胸口,角落一盆植物,鸟停在植物上。
- 07 · unfiltered-dreamer · 同样躺着,但天花板上仿佛有一片色块在飘,笔记本上写满,鸟在头顶飞。
- 08 · quick-dreamer · 早晨,人刚躺下还没放松,耳机线乱着,笔记本只写了一行。
- 09 · slow-dreamer · 傍晚的光斜斜铺过地板,人躺得很松,植物的影子拉得很长。
- 10 · late-night-dreamer · 夜里躺在地板,一盏落地灯,月光在天花板上,耳机的小灯亮着。

**Storyteller 讲故事的人**
- 11 · quiet-storyteller · 火车座位靠窗,人一只手轻轻比划,笔记本放膝上,窗外田野安静地过。
- 12 · unfiltered-storyteller · 同一节车厢,手势夸张,笔记本上的字冲出页面,窗外颜色饱和,鸟在座椅靠背上跳。
- 13 · quick-storyteller · 早班车,窗外飞速掠过的线,人讲得急,杯子搁在小桌上晃。
- 14 · slow-storyteller · 傍晚的慢车,金色的田野,人靠着窗慢慢讲,鸟睡在膝上的本子旁。
- 15 · late-night-storyteller · 夜车,车厢只有一盏暖灯,窗外全黑只有月亮,人低声讲着。

**Minimalist 极简者**
- 16 · quiet-minimalist · 空房间,一桌一灯一椅一纸,人坐得笔直,鸟停在灯罩上。
- 17 · unfiltered-minimalist · 空房间不变,但那唯一一张纸上有一大块珊瑚色的记号,鸟正落下。
- 18 · quick-minimalist · 早晨的空房,椅子还没坐正,纸只写了一半,杯子冒气。
- 19 · slow-minimalist · 傍晚,长影把空房分成两半,人坐着不动,纸上写完了。
- 20 · late-night-minimalist · 夜里的空房,只有台灯照亮那一张纸,窗里一弯月。

**Reporter 记者**
- 21 · quiet-reporter · 天台,人背对我们看着由简单方块组成的城市,手里小本子,鸟停在栏杆上。
- 22 · unfiltered-reporter · 同一个天台,风大,本子的纸页翻飞,城市里有几个亮的珊瑚色点,鸟迎风。
- 23 · quick-reporter · 清晨的天台,人正抬手记着什么,城市刚醒,一两条动线。
- 24 · slow-reporter · 傍晚天台,城市披着金色,人坐在边上慢慢写,影子很长。
- 25 · late-night-reporter · 夜里天台,城市只剩几扇亮窗和一轮月,人的本子被一盏小灯照着。

**Diarist 日记者**
- 26 · quiet-diarist · 床上,被子盖着,人在日记本上写,门关着,床头灯温柔,鸟在床头板上。
- 27 · unfiltered-diarist · 同一张床,枕头歪了,日记本上写得密密麻麻,一支笔掉在地上,鸟在被子上蹦。
- 28 · quick-diarist · 早晨,人半坐在床上急急写一段,被子还乱着,窗帘半开。
- 29 · slow-diarist · 傍晚,床上的光斜斜的,人靠着枕头慢慢写,杯子在床头凉了。
- 30 · late-night-diarist · 夜里,只有床头灯亮,门缝黑的,窗里有月,人在被子里写。

**Overthinker 想太多的人**
- 31 · quiet-overthinker · 桌上散着揉皱和划掉的草稿,人叼着笔,面前一张干净的白纸,鸟在纸堆上。
- 32 · unfiltered-overthinker · 草稿更多、更乱,有的飞到地上,人两手抱头,鸟在头顶飞。
- 33 · quick-overthinker · 早晨,草稿还少,人刚划掉一行,杯子冒着气。
- 34 · slow-overthinker · 傍晚,草稿堆得很高,长影,人靠在椅背上盯着那张白纸。
- 35 · late-night-overthinker · 深夜,台灯只照着那张白纸,四周的草稿都在暗处,窗里一轮月。

**Truth-teller 直说的人**
- 36 · quiet-truth-teller · 厨房桌子,两把椅子,人把一封信推到对面空椅前,两手平放桌上,鸟在椅背上。
- 37 · unfiltered-truth-teller · 同一张桌,信推得用力,杯子倒了,珊瑚色的液体流了一小滩,鸟惊起。
- 38 · quick-truth-teller · 早晨,人站着把信放到对面就要走,椅子还没推回去。
- 39 · slow-truth-teller · 傍晚,信推过去很久了,两杯茶都凉了,人还坐着。
- 40 · late-night-truth-teller · 夜里的厨房,顶灯没开,只有桌上一盏小灯照着那封信和对面的空椅。

**Original 独一份**
- 41 · quiet-original · 桌前一面墙贴满贴纸、剪报和便条,人安静地在拼一张拼贴,鸟停在一张贴纸上。
- 42 · unfiltered-original · 墙上的东西溢到桌上地上,颜色饱和,人手里举着刚剪下的一片,鸟叼着一角纸。
- 43 · quick-original · 早晨,墙上刚贴了几张,人正踮脚往上贴,胶带撕到一半。
- 44 · slow-original · 傍晚,墙上贴满了,人退后一步看,长影铺在墙上。
- 45 · late-night-original · 夜里,台灯照亮墙的一小块,贴纸在灯圈里,其余的墙在暗处。

**Classic 老派**
- 46 · quiet-classic · 一张正经的木桌,钢笔,一叠整齐的信封,人坐姿端正地写,鸟停在墨水瓶旁。
- 47 · unfiltered-classic · 同一张木桌,钢笔甩出一串墨点,信封堆被碰歪,鸟在桌角扑翅。
- 48 · quick-classic · 早晨,人笔走得快,一封信刚封好,杯子冒气。
- 49 · slow-classic · 傍晚,木桌上的光是黄铜色的,人一笔一划,信封一封封封好。
- 50 · late-night-classic · 夜里,绿罩台灯照着木桌,钢笔和信封在灯圈里,窗里一轮月。

---

## 6 · 两张填好的例子

**01 · Quiet Observer**

```
Flat vector illustration, clean geometric shapes, soft even lighting with gentle shading, no outlines, no texture, no text. Wide 16:9 composition, generous negative space, subject in the left-centre third.

Palette: paper white #FFFFFF, ink #1E1B35, pen blue #3A3AF5, sky blue #5757EC, mist #A9C6F2, coral #F2887E, moss green #6DAE78, brass #D8A63F, lavender walls #ECECFE and floor #DEDBF7.

Scene: a person at a window with a small notebook, leaning in to look at something tiny on the sill — a single green leaf.

Always: one gender-neutral person with short dark hair and a plain blue top, face reduced to two small eyes; a sheet of paper or notebook in the scene; a small round flat blue bird with a cream belly and a tiny orange beak perched on the window frame.

Mood and light: muted lavender and mist tones, soft even daylight, nothing in motion, very few objects, stillness.

Style: like a resting frame from a beautiful indie game, calm, warm, slightly lonely, a picture someone would save as a wallpaper. Horizon at about two thirds down the frame.

No text, no letters, no numbers, no logos, no UI, no speech bubbles, no pixel art, no photorealism, no 3D render, no thick cartoon outlines, no watercolor texture.
```

**35 · Late-night Overthinker**

```
Flat vector illustration, clean geometric shapes, soft lighting with gentle shading, no outlines, no texture, no text. Wide 16:9 composition, generous negative space, subject in the left-centre third.

Palette: paper white #FFFFFF, ink #1E1B35, pen blue #3A3AF5, sky blue #5757EC, mist #A9C6F2, coral #F2887E, moss green #6DAE78, brass #D8A63F, night blue walls #2B2650 and floor #1E1B35.

Scene: a person at a desk surrounded by crumpled and crossed-out drafts, pen held in the mouth, one clean sheet still empty in the centre of the desk.

Always: one gender-neutral person with short dark hair and a plain blue top, face reduced to two small eyes; a small round flat blue bird with a cream belly and a tiny orange beak perched on the pile of drafts.

Mood and light: deep night blue walls and floor, one warm brass desk lamp as the only light, its pool on the clean sheet, a crescent moon in the window, everything else dim.

Style: like a resting frame from a beautiful indie game, calm, warm, slightly lonely, a picture someone would save as a wallpaper. Horizon at about two thirds down the frame.

No text, no letters, no numbers, no logos, no UI, no speech bubbles, no pixel art, no photorealism, no 3D render, no thick cartoon outlines, no watercolor texture.
```

---

## 7 · 收图前的检查

1. 16:9,2400 × 1350;中央 1350 方形里能读出场景。
2. 缩到 370 pt 宽(约 1110 px)看:人物和鸟还能一眼认出。
3. 人物是同一个人(深短发、蓝上衣、两只眼);鸟在;纸在;上衣是笔蓝。
4. 地平线在 62–70% 高度;五十张并排地面要齐。
5. 画面里任何地方**没有文字**,包括纸上。
6. 去色后(3–4 级用)轮廓还清楚——形状靠色块而不是靠细线。
7. 同一名词的五张,一眼看得出是同一个房间;同一形容词的十张,一眼看得出是同一种光。
