# 网页同步计划：iOS 1.0.9 → 网页 app 和 landing（2026-11-13）

只读核对，两边都没改代码。

- iOS 这边看的是 `docs/CHANGELOG.md` 的 Unreleased，加上 build 42 以来的 73 个提交（`5e3d125b..86d4aad0`，分支 `courier-planet`）。
- 网页看的是 `~/Desktop/claude 项目/kindredly` 的 `main` 分支（tip `01f8ec8`）。
- **什么算线上**：网页仓库里的 git 标签 `live` 标的是生产环境最后一次部署用的提交（`scripts/release-guard.mjs:8`）。现在 `live` = `4810994`（11-12）。在它下面的提交 = 已上线；在它之后的 = 已提交、没上线。数据库里跑没跑过哪条 SQL，仓库里看不出来，下面照 iOS changelog 的记录写。
- 只在手机上才有意义的东西不列：iPhone Duo、Live Activities、震动、底栏和 +、包体积、启动动画本身、本地记录排队的修复。

## 一、已经同步的

| 项 | 网页 | 依据 |
|---|---|---|
| 每天 10 封、读过的信不再来、一人一封 | 已上线 | `43529af`、`8a33e74`、`b1def8d` 都在 `live` 下面 |
| landing 写 10 封 | 已上线 | `app/landing/copy/inside.js:18` |
| 网页页头和标签页图标 = 整只 Wren（和 App 图标故意不同） | 已上线 | `4aa16b2` 在 `live` 下面，`app/site/WrenMark.jsx` |
| 主屏/PWA 图标换成钴蓝 Wren，300 张分享卡也换了 | **已提交，没上线** | `01f8ec8` 在 `live` 之后 |
| First Class 按天出现（D3/D7/D15/D30） | 已有（更早做的） | `app/zine/fc-moments.jsx` |
| 四种信件字体（System / Newsreader / EB Garamond / SF Mono） | 已有 | `app/zine/parts.jsx:33` |
| 自制头像三选一 | 已有 | `app/zine/MakeFace.jsx` |
| Wren 动态带图片/短片（0050） | 已有 | `app/zine/KindredChat.jsx` 的 `PostMedia` |

## 二、对照表

优先级：**必须** = 不做两端就对不上，或者会说错话；**好有** = 补上更好；**跳过** = 网页不需要或这次不做。
大小：S 半天以内，M 一两天，L 要先设计，再做两天以上。

### 品牌

| # | 项 | iOS 1.0.9 | 网页 app | landing | 优先级 | 大小 |
|---|---|---|---|---|---|---|
| 1 | 钴蓝 Wren App 图标 | 新包里 | 主屏/PWA 图标已提交（`01f8ec8`）没上线；`public/site.webmanifest` 的 `theme_color` 还是旧的 `#5B55FF` | 页脚 App 区用 `icon-512.png`（`Closing.jsx:289`），跟同一个提交一起换 | 必须 | 已做好，只差部署（+ manifest 一个色值） |
| 2 | Wren 正脸头像（`assets/wren-avatar.png`）：Kindreds 列表、她房间的顶部、空状态卡 | JS + 新图 | **缺**：列表行是侧身鸟 `<Bird size={30}>`（`app/zine/Kindreds.jsx:121`），她的房间顶部是 `<Bird size={52}>`（`app/zine/KindredChat.jsx:729`） | 不涉及 | 必须 | S |
| 3 | 启动 = 钴蓝上一封信、Wren 从信里探头；注册页蓝色改钴蓝；注册邮票 = 钴蓝窗 + 探头 Wren | 新包里 | 网页没有启动动画；`/join` 还是 Post Blue（`app/onboarding/Story.jsx` 4 处、`Onboarding.jsx` 1 处） | 不涉及 | 改颜色和邮票：好有；动画：跳过 | S |

### 规则和文案

| # | 项 | iOS 1.0.9 | 网页 app | landing | 优先级 | 大小 |
|---|---|---|---|---|---|---|
| 4 | 性别标记只给 kindreds 看；标记新样式（粉/浅蓝小圆上的白字 + 星座 emoji） | JS + 新包 | **缺**：笔友行照样画对方的标记（`Kindreds.jsx:155` `who.marks`），还是灰色线条画法。资料页的新说法在分支 `marks-kindreds-web`（`2c89f21`），没合进 main、没上线。服务器的 `0052_marks_kindreds_only.sql` 等 owner 跑：跑完之后，所有端 30 分钟内都不再给陌生人看标记，旧版网页也一样 | **会说错**：`/safety` 写着 "♀ or ♂ only if you turn it on"（`app/spoke/pages.js:293`，十语在 `l10n-src/spoke-safety.json` 和各语言文件里）。0052 一跑这句就不对了 | 必须，和 0052 同一天 | S–M（含十语） |
| 5 | 1.0.9 的 Wren 公告（`design/whats-new-1.0.9/post.sql`，owner 等上架后跑） | 1.2.8 在公告下面播动画 | **会出错**：网页把每条公告都显示出来，还给链接配一个 "Open ↗" 按钮（`KindredChat.jsx:734`）。这条的链接是 `kindredly:///news/1.0.9`，网页上点了打不开。正文说 "me opens on my planet"，网页的 Me 还没有星球 | — | 必须，owner 跑 SQL 之前要做 | S（网页不显示 `kindredly://` 链接）；正文的问题等第二批做完 Me 就自然成立 |
| 6 | 「Things you kept」（原 Moments you kept / Lore）：信里、房间里留下的句子，加上读完信那几页留下的小知识 | JS | **缺**：网页根本没有"留下来"这个功能（全仓库搜不到） | — | 好有，要跟第 8 项的 Keep 一起做。iOS 也只存在本机（`src/lib/lore.ts`），网页存 localStorage 就行，两端不用同步 | M |
| 7 | Wren 那句话改成 "your letter's out. no one has written back yet" | OTA | 还是 "still hunting for the right window"（`app/engine/post-copy.js`） | — | 好有 | S（十语） |

### 页面

| # | 项 | iOS 1.0.9 | 网页 app | landing | 优先级 | 大小 |
|---|---|---|---|---|---|---|
| 8 | **Today 读完最后一封之后**：三页（邮筒 / 小票 / 睡前）轮着出，每页留一件小东西（Keep），10 秒内可以撤销，底下一条 Free Flight，读完和写信算同一个连续天数 | 新包，开关 `afterfifteen` 默认开 | **部分**：只有一张收工页 `DeskClear`（`app/zine/Today.jsx:486`）：Wren 在明天的信袋上、今天读了几封写了几封、8:00 来新信、写信 / Kindreds / 重读今天的。Free Flight 网页已经有（`FreeFlight.jsx`），但只在信使页的休息日能玩 | 可以说"每天有个结尾"，但网页做完之前要标明是 iPhone | 必须（1.0.9 主打这个，公告也这么说） | L |
| 9 | **Me**：星球当封面（每封信一枚邮票、灯、她在干什么）；下面是名字 + 性别星座条 + 两个数字；她的工牌卡（成长旅程 + flight log）；文心和写作报告两块并排；First Class | 新包，开关 `meplanet` 默认开 | **部分**：`app/zine/Me.jsx` 还是 4a：铭牌，`CourierCard` 有 flight diary（`engine/flight-log.js`），文心和报告"摞成一摞"，fc-moments。**没有星球** | 网页没做之前不宣传网页有星球 | 必须 | L |
| 10 | Kindreds 轨道（中间是自己的圆头像，内圈知己，陌生人越近越大；圆 = 有名字，方 = 陌生人） | 新包 | **没有轨道**：网页 Kindreds 是 owner 11-02 定的两段列表 | — | 轨道：跳过（列表是网页定稿）。只对一下"圆 = 有名字、方 = 陌生人"：列表里的 `Face` 也要这样 | S（只对规则） |
| 11 | Kindreds 空状态「接住一句」（今天桌上的信，开头一句飘过，点开 → 放走 / 回信） | 新包，开关 `kindredscatch` | **缺**：只有一行字 "Answer a letter on the desk and a stranger appears here."（`Kindreds.jsx:164`） | — | 好有 | M |
| 12 | Notes 日历按 iOS 月历排（圆格、标题句首大写、今天是强调色小胶囊） | 新包 | **部分**：`app/zine/Sealed.jsx:216` 的日历已经有心情脸，但格子是方的，今天用的是青柠胶囊 | — | 好有 | S |
| 13 | Notes 搜索、改一页、导出文字 | 1.0.9 | **缺** | — | 好有 | M |
| 14 | Settings › Appearance 单独一页（上面一封样信，五种外观 + 四种字体，点了马上变） | 新包 | **部分**：`app/zine/Profile.jsx:336` 只有四种字体，没有样信。网页只有浅色（`app/zine/theme.js:21` `color-scheme:light`） | — | 样信预览：好有；五种外观：跳过（网页还没有深色） | S |
| 15 | 几个小功能：Kindreds 搜索、点陌生人名字出「为什么看不到是谁写的」、生日那天信使的信和生日邮票、+ 里「继续草稿」 | 1.0.9 | 都缺；草稿网页已有（`/me/drafts`） | — | 好有 | 各 S |

### 外观

| # | 项 | iOS 1.0.9 | 网页 app | landing | 优先级 | 大小 |
|---|---|---|---|---|---|---|
| 16 | 平：信卡去掉紫边；实物也不要厚阴影（底色 + 发丝线，圆角 24） | 新包 | **缺**：网页 zine 里还有 66 处硬偏移阴影（`box-shadow:Npx Mpx 0 …`，主要是 `--lift #E2DEF6` 那种淡紫偏移）：`theme.js` 13、`Kindreds.jsx` 13、`Me.jsx` 12、`Today.jsx` 11、`Sealed.jsx` 8，其余零星。这就是 owner 在 iOS 上说"紫色的底哪里来的 去掉吧"的那个东西 | landing 早就没有了（`DESIGN.md` 规则 1） | 必须 | S–M |
| 17 | 页面顶部的键统一成白胶囊 + 细线，按下去有玻璃泡 | 新包 | 网页 `PageBar` 右边的按钮各页各样 | — | 好有（跟 16 一起做） | S |
| 18 | 深色改成中性黑 | 新包 | 网页没有深色 | — | 跳过（网页加深色是单独一件事） | — |
| 19 | 珍珠玻璃 Next / Reply | 新包 | 网页读信是列表 + 正文，没有这两个键 | — | 跳过 | — |

### 不搬到网页的

日记成书、邮票存贴纸、打印邮票（First Class，iOS 在本机生成；单买 1.0.9 关掉了）、对话静音（1.0.9 里是关的）、Newsreader 在 Swift 页的修复、Duo、Live Activities、底栏、启动动画。

## 三、建议顺序

**第一批：1.0.9 上架当天，和 `01f8ec8` 一起部署（都是小活，半天到一天）**

1. 部署 `01f8ec8`（图标 + 分享卡）；`site.webmanifest` 的 `theme_color` 改成钴蓝；`/join` 的底色改成钴蓝（#3）。
2. Wren 正脸头像，换两处（#2）。
3. 网页上不给 `kindredly://` 链接配按钮（#5）。owner 跑 1.0.9 公告 SQL 之前必须上线。
4. 性别：把 `marks-kindreds-web` 的资料页文案合进来；陌生人那行不画标记；`/safety` 那句十语一起改；新标记样式（#4）。和 0052 同一天上。
5. Wren 那句话（#7）。
6. Kindreds、Notes 和公共的 `theme.js` 先去掉硬阴影（#16 的一半）。Today 和 Me 留到第二批跟改版一起去。
7. 部署前照老规矩，用登录态 `?preview=1&demo=1` 把主要页面点一遍。

**第二批：先设计再做（owner 11-13 让我设计网页的读信页和 Me 页）**

1. 读信页：读完之后的三页按网页两栏改（邮筒 / 小票 / 睡前）+ 每页留一件小东西 + 撤销 + Free Flight 条（#8）。顺带把「Things you kept」做出来，留下的东西才有地方放（#6）。
2. Me：星球封面、文心和报告并排、工牌卡 + flight log（#9）。
3. 这两页去掉硬阴影，顶部键统一（#16 剩下的一半、#17）。
4. 做完以后，1.0.9 公告里"今天到 8 点关门、Me 打开是我的星球"这两句在网页上也成立了。

**第三批：好有，排在后面**

Kindreds「接住一句」（#11）；Notes 月历、搜索、改一页、导出（#12、#13）；Appearance 样信预览（#14）；第 15 项那几个小功能；`/join` 的注册邮票换成钴蓝窗（#3 剩下的部分）。

## 四、landing：能说什么，不能说什么

规矩还是 `DESIGN.md` 那三条：没有大黑立体；只用 app 自己的素材；**只说真有的功能**（两端核对过代码）。

**能说 / 应该说**

- 每天 10 封（已经写了，别再出现 15）。
- 新图标：跟 `01f8ec8` 一起上线。页头 Wren 照旧，网站和 App 故意不一样。
- `/safety`：陌生人看不到你的性别，只有 kindreds 看得到。要等 0052 跑完、第一批第 4 项上线以后再说。
- "每天有个结尾：读完 10 封，今天到 8 点关门"，"Me 打开是她的星球，你寄过的每封信都是一枚邮票"：iPhone 1.0.9 上架后可以写，但要标 iPhone；网页第二批做完以后才能不标。
- "有名字的人是圆脸，陌生人是方的磨砂窗"：两端都是这样。手绘脸只给 kindreds 看，规则 3 本来就这么要求。

**不能说**

- 网页有深色、五种外观。
- 网页有星球、三张收工页（第二批之前）。
- 「Things you kept」在网页上（第二批之前）。
- 日记成书可以单买（1.0.9 关了，`a501be52`）；对话静音（关着）。
- 打开开关陌生人就能看到 ♀/♂（0052 以后就是错的）。
- Duo、Live Activities：不宣传。

**landing 这次要不要设计**：换图标、换头像、改 `/safety` 那句，不用设计。"每天有个结尾"要设计一小块，放在 Inside 现有的卡片里，比如 "ten letters a day" 那张黄卡下面接一个关门的小画面，用 app 自己的收工页素材，不另起新版式。等 iPhone 1.0.9 上架以后再做。大小 S–M。
