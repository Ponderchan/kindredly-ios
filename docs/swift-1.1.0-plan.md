# Kindredly iOS 1.1.0 = 纯 Swift:怎么搬(2026-11-13)

这是一份计划,不改任何代码。数字是 2026-11-13 在分支 `courier-planet` 上重新数的
(build 43 = 1.0.9 = binary 1.2.8 刚打完的那份代码),没有沿用
`docs/swift-coverage-2026-11-09.md` 里的数;两边的出入见 1.8。

读法:第 0 节是一页结论;第 1 节是清点;第 2 节起是计划。标「估计」的是估的,
标「未验证」的是没查实的,其余都是数出来或在代码里看到的。

---

## 0. 一页结论

**现状。** 页面几乎都已经是 Swift 画的,但 App 仍是一个 React Native(下面写 RN)程序:
导航、读写服务器、登录、内购、推送、热更新(OTA),以及约 **6.8 万行 TypeScript 逻辑**,
全在 RN 上跑。Swift 这边只有「画」,没有一行读服务器或读本机存储的代码。
RN 引擎加 JS 包在 build 43 里占 **28.4 MB / 71.6 MB**。

**做法。** 不另开分支重写再一次性替换,而是在现在这个 App 底下一层一层换,每一层都跟着
1.0.x 正常发版、在真实用户手机上跑过,最后 1.1.0 只做一件事:把已经没人用的 RN 拆掉。

**顺序(七步)。**

| 步 | 做什么 | 用户看得到吗 | 估计 |
|---|---|---|---|
| 0 | 打地基:Swift 逻辑包、Swift 测试、文案生成器、对照向量 | 否 | 3–5 天 |
| 1 | 本机存储换成 Swift 来读写(**文件原地不动、格式不变**) | 否 | 1 周 + 观察一个版本 |
| 2 | 纯计算搬到 Swift(写作引擎、气场、身份、信使状态、邮票) | 否 | 2–3 周 |
| 3 | 读写服务器搬到 Swift(登录状态仍由 JS 管) | 否 | 1.5–2 周 |
| 4 | 一页一页把「页面的逻辑」换成 Swift,每页有开关可退回 | 否(应当一模一样) | 5–8 周,分 5–6 批 |
| 5 | 登录、内购、推送、锁屏实时活动、录音/视频/相册 换成原生 | 否 | 2–3 周 |
| 6 | Swift 外壳(导航、深链、底栏、Duo 版式),先和 RN 外壳并存、按开关放量 | 否 | 2–3 周 |
| 7 | 拆掉 RN = **1.1.0** | 包变小、启动变快、没有 OTA | 1 周 + 审核 |

合计:最快约 10 周;按现在「一边发功能一边搬」的节奏,更可能 **3.5–4.5 个月**
(2027 年 3 月前后)。这是估计,最不准的是第 4 步和第 6 步。

**最大的三个风险。**

1. **本机数据**(日记、草稿、信使、93 个存储键):只存在手机上,而且**不在 iCloud 备份里**
   (见 1.7)。对策是根本不搬:Swift 直接读写 RN 现在用的那批文件,格式不变。
2. **登录状态**:搬丢了所有人被登出;游客是匿名账号,登出就永远找不回。对策是过渡期只有
   一方负责刷新登录,最后交接时把同一份记录导入,不重新登录。
3. **没有 OTA 了**:1.1.0 之后任何修复都要过审(通常 1–3 天)。对策是把「可以远程关掉某个
   功能」「可以远程改文案」先做好,再拆 RN;但「远程修逻辑 bug」这件事从此没有了。

另外两个要盯的:推送(现在登记的是 Expo 的 token,纯 Swift 拿到的是苹果的 token,服务器
发送方式要先改)和内购(key 的存放位置和打包检查要跟着改)。详见第 6 节。

---

## 1. 清点:今天还有什么跑在 RN / JS 上

### 1.1 TypeScript(`src/`,不含测试)

722 个文件、178,875 行;另有测试 133 个文件、17,693 行。

| 类别 | 文件 | 行 | 纯 Swift 时怎么处理 |
|---|---|---|---|
| **A. 逻辑**(要用 Swift 重写) | **335** | **68,333** | 重写 + 对照测试 |
| 　`src/lib`(含 6 个 `.tsx` 的 provider) | 191 | 32,655 | |
| 　`src/screens/**` 里的 `.ts`:model 38 个 13,490 行、hook 16 个 5,696 行、`*-core.ts` 1 个 646 行、其他 32 个 7,183 行 | 87 | 27,015 | |
| 　`src/components` 里的 `.ts` | 23 | 3,455 | |
| 　`src/data` 里不是文案的(心情、邮票、信纸、默认名词表、演示数据 1,060 行…) | 29 | 4,432 | 多数可用脚本转 |
| 　`src/theme` | 5 | 776 | 已有 `gen-theme-swift.mjs` |
| **B. 九语文案**(`strings*.ts` 等) | 57 | 36,201 | 脚本生成,不手抄 |
| **C. RN 画的页面和路由**(删,不重写) | 328 | 74,090 | 删除 |
| 　`src/screens/**` 的 `.tsx`(其中 onboarding 10,065) | 107 | 29,242 | |
| 　`src/components` 的 `.tsx` | 126 | 30,327 | |
| 　`src/app` 路由(正式 47 个含 3 个 layout;开发页 32 个 5,987 行;预览页 14 个 853 行) | 95 | 14,521 | |
| 锁屏实时活动的界面(`src/activities`,用 JSX 写的) | 2 | 251 | 用原生重写 |

C 里面有两类值得单独说:

- **50 个 `*Native*.tsx`「胶水」文件、12,054 行**:它们把 TS 的 model 翻成 Swift 页面要的
  数据、把 Swift 页面的点击转给路由。纯 Swift 时文件删掉,但其中「翻译」那部分工作(估计三四成)
  要在 Swift 里重做。
- **14 个名字带 `RN` 的备用页、5,816 行**(`TodayRN.tsx` 1,941 行最大),以及其他没带 `RN` 字样的
  备用页,都在 C 里,直接删。

A 里有 2–3 千行是只为「两边并存」服务的(`surfaces.ts` 719、`bird-images.ts` 652、
`swift-island.ts`、`dev-store.ts` 等),纯 Swift 后不需要重写。所以真正要用 Swift 重新表达的逻辑
**约 6.4–6.5 万行**。

逻辑按页面分(`src/screens/<页>` 里的 `.ts` 行数):chat 5,120 · today 4,053 · me 3,536 ·
onboarding 1,994 · compose 1,557 · kindreds 1,406 · notes 1,354 · settings 1,091 ·
edit-profile 955 · make-face 790 · report 762 · courier 751 · journal-entry 578 · paywall 547 ·
photo-roll 500 · wren-room 401 · aura 364 · 其余合计约 1,250。

`src/lib` 里的大块:`db.ts` 1,776(所有读写服务器)· `auth.tsx` 870 · 自定义邮票 1,077 ·
`surfaces.ts` 719 · `after-fifteen-core.ts` 673 · `local-push.ts` 661 · `stamp-frame.ts` 655 ·
`aura.ts` 586 · `hatch-engine.ts` 576 · `wren-lines.ts` 540 · 写作引擎目录 2,679 ·
身份(马赛克脸/磨砂窗/签名/默认名/星座)约 4,000。

### 1.2 Swift(`modules/kindredly-ui/ios`)

| | 文件 | 行 | 说明 |
|---|---|---|---|
| `Portable/` | 206 | 97,942 | 页面和部件。**没有一个文件 import Expo 或 React**,纯 Swift 时原样保留 |
| `Adapters/` | 52 | 15,515 | 把 JS 传来的数据接到 Portable 页面上(49 个 import Expo)。纯 Swift 时删掉,换成直接接线 |
| `KindredlyUIModule.swift` | 1 | 777 | Expo 模块注册。删 |
| `modules/kindredly-ui/src`(TS 包装) | 70 | 13,146 | 删 |

Swift 这边今天**没有**:Supabase 客户端、本机存储读写、登录、内购、推送。用到 `URLSession` 的只有
两个文件(图片加载)。已经在 Swift 里的逻辑只有零星几块:邮票框(`KStampFrame`,有对照测试)、
马赛克脸、磨砂窗、信使的画法(`KWrenBird` 509 行)、Free Flight 游戏、发信动画的时间轴、
日记成书/邮票导出。

### 1.3 用户今天还看得到的 RN(开关按默认值)

`src/lib/surfaces.ts` 的 `NATIVE_DEFAULTS` 现在有 **87 个开关,81 开、6 关**。
11-09 清单 A 表里的 20 项,经过 11-09 的第三批(24 个开关)之后只剩:

| 是什么 | 开关 | 为什么还是 RN |
|---|---|---|
| 日记单篇的语音卡 | `notevoice` 关 | Swift 版已写,等真机用真实语音测 |
| 日记单篇的视频 | `notefilm` 关 | 同上 |
| 写日记时点开照片的查看器 | `frameviewer` 关 | 同上 |
| Wren 帖子里的图片/视频 | `postmedia` 关 | 同上 |
| Duo 上压在页面角上的返回键(`components/FoldCornerKey.tsx`,99 行) | 无开关 | 只有 RN 版,只在折叠机上出现 |
| 各个 Swift 弹层外面的窗口和暗底 | — | 24 个文件用 RN 的 `Modal`,肉眼和原生一样 |
| 页面之间的切换、返回手势、弹出方式 | — | expo-router(170 个文件 import 它,330 处跳转) |

另外两个关着的开关是没上线的新功能(`reportwrapped`、`threadmute`),不是 RN 页面。

看不见、但仍由 RN 完成的:

- **Wren 和 30 张手绘头像的图**多数地方仍是 RN 在后台用 SVG 画好、截图给 Swift 用
  (`BirdSnapshots.tsx`、`FaceSnapshots.tsx`,42 个正式文件用到 `lib/bird-images`)。
  Swift 已有 `KWrenBird`,但只在信使星球、读完信几页等处直接画。
- 系统弹窗、分享、打开链接:界面是 iOS 原生的,调用在 JS 里(66 个文件)。
- 锁屏实时活动的两个界面用 JSX 写、由 expo-widgets 编进小组件扩展。

### 1.4 每个 Swift 页面背后的 RN 备用版

87 个开关分四类;其中 **79 个背后留着 RN 备用版**,`app_surfaces` 表里一行就能把那一处退回 RN:

- **整页 40 个**:room、chat、kindreds、today、compose、me、settings、editprofile、notes、paywall、
  myletters、reader、journalentry、aura、auracard、courier、onboarding、keepsakes、keepsake、
  mykindreds、editfield、blocked、help、writetous、kindredpage、wrenroom、report、voice、drafts、
  stampbook、lore、noteentry、noteday、photoroll、launch、authcallback、kindredsempty、freeflight,
  以及两个从来没有 RN 版的新功能:makeface、reportwrapped
- **底栏 1 个**:tabbar
- **弹层和整屏时刻 21 个**:ceremony、introritual、lightbox、songshelf、signsheet、leavesheet、
  reportsheet、signupsheet、toast、letterreader、wardrobeslip、parcel、growthmoment、identitynote、
  firstflight、wardrobesheet、plush、faceready、ratingsheet、fcreceipt、frameviewer
- **Swift 页里的小块 19 个**:recorder、audiocard、lettertravel、couriercard、auraart、hatch、
  obchick、obroutebird、obflight、composewren、notewren、facewren、myavatar、chatheader、inflight、
  notevoice、notefilm、postmedia、reels
- **功能开关 6 个**(不是「退回 RN」,关掉是退回旧的 Swift 样子或藏起功能):threadmute、
  meplanet、afterfifteen、kindredscatch、tabraised、duo

纯 Swift 之后这张表还在,但含义变了:**不再有「退回 RN」这条退路,只剩「关掉这个功能」**。

### 1.5 依赖的包(`package.json`,43 个)和它们在 Swift 里的替身

| 现在 | 用到的文件数 | 纯 Swift 用什么 |
|---|---|---|
| `expo-router` | 170 | SwiftUI `NavigationStack` + 自己的路由表 |
| `react-native-safe-area-context` 117、`react-native-svg` 97、`react-native-reanimated` 87、`react-native-gesture-handler` 9、`react-native-view-shot` 5、`lucide-react-native` 1、`react-native-screens`、`react-native-worklets`、`react`、`react-native` | — | 随 RN 页面一起删 |
| `@expo/ui` | 78 | 不需要(Swift 页面直接上屏) |
| `@react-native-async-storage/async-storage` | 26 + 45 个经 `scoped-store` | 自己的 Swift 存储,**读写同一批文件**(第 4 节第 1 步) |
| `@supabase/supabase-js` | 2(26 个文件直接用客户端) | 官方 Swift SDK `supabase-swift`(版本和接口开工时核对,未验证) |
| `react-native-purchases` | 1(`lib/iap.ts`) | RevenueCat 的原生 SDK。它今天就在包里(RN 版是它的外壳,主程序里 5.4 MB) |
| `expo-notifications` | 6 | `UserNotifications` + 直接向苹果登记 token |
| `expo-widgets` | 3 | 原生 ActivityKit / WidgetKit 扩展 |
| `expo-updates` | 只在 `app.json` 里配置 | **没有替身:OTA 到此为止** |
| `expo-apple-authentication` 2、`expo-web-browser` 2 | | `AuthenticationServices`(Apple 登录、Google 的网页往返) |
| `expo-file-system` | 10 | `FileManager` |
| `expo-audio` 3、`expo-video` 5 | | AVFoundation(`KVideoLayer`、`KVoiceCard` 已有) |
| `expo-image` 7、`expo-image-picker` 9、`expo-media-library` 6 | | 已有的 `KImage` / `KImageStore`、PhotosUI、Photos |
| `expo-haptics` 16、`expo-clipboard`、`expo-store-review`、`expo-linking`、`expo-blur`、`expo-linear-gradient`、`expo-glass-effect`、`expo-status-bar`、`expo-system-ui`、`expo-splash-screen`、`expo-constants`、`expo-application`、`expo-asset`、`expo-font`、`expo-dev-client`、`expo`、`react-native-url-polyfill` | | 系统自带的对应物,或不再需要 |

构建相关也跟着变:`expo prebuild` 生成的 `ios/` 换成一个提交进仓库的普通 Xcode 工程;
两个自写插件(`with-scene-lifecycle`、`with-strip-framework-symbols`)不再需要;
EAS 云端构建换成 Xcode 自己归档(本机或 Xcode Cloud),上传照旧用 Transporter。

### 1.6 和服务器的接触面(Swift 的数据层要覆盖的全部)

- Supabase 表:至少 25 张(threads、letters、messages、blocks、windows、thread_mutes、stamps、
  push_tokens、folds、fold_bodies、wren_mail、moments、faces、wren_posts、wren_answers、
  support_letters、reports、morning_pages、morning_feed、matches、live_activity_tokens、
  letters_daily、fingerprints、events、app_surfaces)。这是按单行写法搜出来的,跨行写法可能漏数。
- RPC:21 个(reply_to_letter、sign_thread、mark_letter_read、delete_account、take_back、
  my_read_letters、marks_for、member_marks_for、faces_for、my_faces、answer_pick、leave_pick,
  以及自定义邮票的 9 个)。
- 存储桶:4 个(faces、moments、stamps、voice-letters)。
- Cloudflare 接口:5 个(`/api/wren`、`/api/entitlement`、`/api/bump-letters`、`/api/face`、
  `/api/stamp-check`)。
- 实时订阅:1 处(`lib/live.ts`)。
- 登录方式:Apple、Google(网页往返)、邮件链接、匿名游客;游客升级成正式账号用 `linkIdentity`。

### 1.7 手机上存着的东西

- **93 个 `kindredly_*` 存储键。** 48 个在 `scoped-store.ts` 的 `OWNED_KEYS` 里(按账号分开存,
  游客登录后跟着搬进账号);约 20 个也按账号存但不跟着搬;约 25 个是整台手机共用的(语言、主题、
  启动看过没有、原生开关的缓存等)。
- **登录状态**也在同一个存储里(supabase-js 的 `sb-…-auth-token`)。
- **文件**:`Documents/` 下的 `journal/`(日记的照片、语音、视频)、`profile/`、`made-faces/`、
  `stamp-drafts/`、`stamp-originals/`、`stamp-pictures/`。
- **存储的实际位置和格式**(看的是 `RNCAsyncStorage.mm`):
  `Application Support/io.kindredly.app/RCTAsyncLocalStorage_V1/manifest.json`,一个大 JSON;
  超过 1024 个字符的值单独存成文件,文件名是键的 MD5。
- **这个目录默认不进 iCloud 备份**(`RNCAsyncStorage.mm:519-527`,`Info.plist` 里没有改它)。
  也就是说:日记的照片和语音在备份里,但日记的文字和目录不在。换手机从备份恢复的人,今天就会
  丢日记文字。这不是这次计划造成的,但搬的时候必须知道,见第 6 节风险 1。

### 1.8 和 11-09 清单的出入

| | 11-09 清单 | 今天重数 |
|---|---|---|
| 用户看得到的 RN | 20 项(A1–A20) | 4 项待真机测 + Duo 角上返回键 + 弹层外壳 + 导航 |
| 逻辑层 | 约 60,000 行、32 个模块 | 68,333 行、335 个文件(按 1.1 的口径;其中 2–3 千行不用重写) |
| 九语文案 | 约 32,000 行 | 36,201 行 |
| 开关 | 未计数 | 87 个,81 开 |
| 测试 | 未计数 | 133 个文件、17,693 行 |

多出来的部分一是口径不同(11-09 没说怎么数的),二是这四天新加的功能(读完信三页、信使星球、
接住一句、Duo 版式、日记成书)。清单 A1–A12、A15–A17、A19–A20 都已是 Swift 并默认打开
(A13、A14、A18 就是 1.3 节那 4 个等真机测的);清单里顺手查到的那个邮票教学卡 bug 已修
(CHANGELOG 有记)。

### 1.9 包的大小(build 43,解开 ipa 量的)

| 部分 | MB |
|---|---|
| 主程序(我们的 Swift 18 MB 左右、RevenueCat 5.4、其余是 Expo/RN 的小模块) | 33.8 |
| 框架(React 5.6、libavif 3.3、Hermes 2.3、ExpoModulesCore 2.0…) | 17.3 |
| JS 包 | 11.2 |
| 图片和字体 | 5.8 |
| 小组件扩展 | 2.6 |
| 其他 | 1.0 |
| **合计** | **71.6** |

框架 + JS 包 = 28.4 MB,拆 RN 时整块消失;主程序里还有 6–9 MB 是 Expo/RN 的模块和适配层,也会消失。
但 Swift 要多出逻辑代码(估计 5–9 MB)、九语文案(2–3 MB)、Supabase 的 Swift SDK(估计 2–4 MB,未实测)。
**估计 1.1.0 在手机上 46–54 MB,比现在小 18–25 MB。** 不是直接减 29 MB。

---

## 2. 对用户来说:什么不变,什么会变

**不变(这是验收标准,每一条都要测到):**

- 同一个 App(包名 `io.kindredly.app` 不变),从 App Store 正常更新,不用重装。
- 更新后**仍然是登录状态**;游客仍然是同一个游客。
- 日记、草稿、信使(名字、皮肤、成长阶段)、头像、自制邮票、看过/没看过的记录,全部原样。
- First Class 和已买的东西仍然有效;恢复购买照常。
- 推送照常,开关状态不变;锁屏实时活动照常。
- 九种语言、四种字体、五种外观,和现在一样。
- 每一页长得和现在一样(页面本来就是 Swift)。

**会变:**

- 包小约 18–25 MB(估计)。
- 冷启动应该更快(不用先启动 JS 引擎、读 11 MB 的 JS 包)。未测,不承诺数字。
- **没有 OTA。** 以后「今晚发个热更新」这件事不存在了,见第 8 节。
- `app_surfaces` 表里的「退回 RN」不存在了,只能「关掉某个功能」。
- 更新当晚正在锁屏上的实时活动会结束一次(旧扩展启动的活动,新扩展接不上)。

---

## 3. 过渡期的四条规矩

过渡期里同一个 App 里有两套逻辑(TS 和 Swift)。11-13 刚修的那个 bug
(两处同时改同一条本地记录,后写的把先写的盖掉:Meet Mist 重弹、Notes 看着是空的)
就是「两个写的人」造成的。下面四条是为了不再造出同一类 bug:

1. **一份存储,一个写的人。** 从第 1 步起,所有本机存储都经过同一个 Swift 存储,JS 也经它读写。
   不存在「JS 写一份、Swift 写一份」。
2. **一份登录状态,一个负责刷新的人。** 登录凭证会定期换新;两边都去换,先换的会让后换的失效,
   结果是被登出。所以第 6 步之前只有 JS 刷新,Swift 只是拿来用;外壳换成 Swift 后反过来。
3. **一页只有一个司机。** 一页在打开的那一刻决定是 JS 喂数据还是 Swift 喂数据,打开期间不换。
   开关行可以让它下次打开时退回 JS。
4. **搬完的页面,新功能只写 Swift 那一份。** 一页由 Swift 喂数据满一个版本、没被退回过,
   它的 TS 逻辑就冻结(只留着当退路,不再加东西),到 1.1.0 一起删。

第 4 条的代价要先说清:过渡期里给已搬页面加功能必须发新包(今天改页面本来也要新包,
只有纯逻辑和文案能 OTA);给没搬的页面加功能则要写两份或者先搬再加。

---

## 4. 顺序:七步

每一步都写:做什么、跟哪种版本走、怎么验、退路。

### 第 0 步 打地基(3–5 天,用户无感)

- 新建一个**不含界面的 Swift 包** `KindredlyCore`(放在 `modules/` 下,和 `Portable` 一样不许
  import Expo/React)。它能在 Mac 上用 `swift test` 几秒跑完,不需要模拟器。这是仓库里第一个
  真正的 Swift 测试目标(今天只有两个手工编译的小程序:`scripts/stamp-frame-golden.swift`、
  `scripts/stamp-export-check.swift`)。
- **对照向量的通用脚本**:让 TS 函数对一组固定输入算一遍,结果写成 JSON;TS 测试和 Swift 测试
  都必须重现它。仓库已经对磨砂窗、默认名、星座、笔迹签名、邮票框这样做了
  (`design/identity/*.vectors.json`、`design/stamps-v*/golden.json`),这一步把它变成每个模块都能用。
- **文案生成器**:把 `src/data/strings*.ts` 导成 Swift 能读的每语言一份数据文件。过渡期里
  TS 仍是唯一的源头,生成器在打包时跑;1.1.0 时源头才换成生成出来的那份。
- 把 `supabase-swift` 加进工程(只链接,不用)。

退路:这一步不改任何行为,没有需要退的东西。

### 第 1 步 本机存储换成 Swift 读写(1 周 + 观察一个版本)

这是整个计划里最重要的一个决定:**不迁移数据,只换读写的人。**

- 用 Swift 写一个存储,读写的就是 RN 现在用的那批文件、那个格式(1.7 节)。
  带上现在 TS 里的两样东西:按账号加后缀(`::<uid>`、`::anon`),和「同一个键的修改排队」
  (`scoped-update-core`)。
- JS 这边加一层薄壳:包里有 Swift 存储、开关也开着,就走 Swift;否则照旧走原来的包。
  supabase-js 的登录状态存储也指到这里(它只要求三个函数)。一次启动里只用其中一个,
  由启动时的开关决定,中途不换。
- 这样做的好处:**数据从头到尾没挪过地方**。开关关掉,下次启动 RN 原来的包读到的是同一批文件。
  到 1.1.0 时也没有「第一次打开要导入」这个最危险的动作。
- 以后(1.1.0 之后)想换更好的存储格式、把日记放进备份,再单独做,不和拆 RN 绑在一起。

怎么验:

- 用真实数据做测试样本:从模拟器和 owner 手机(Xcode 可以下载 App 的数据容器)取几份真实的存储
  目录,Swift 存储读出来必须和 RN 的包读出来逐字一致;写回去 RN 的包必须读得回来。样本要覆盖:
  超过 1024 字符的值、emoji 和九种语言的文字、带 `::uid` 的键、空目录、全新安装。
- 把 `scoped-update-core.test.ts`、`profile-local-core` 等现有测试的用例在 Swift 里各写一份。
- 开发版里先开,TestFlight 再开,正式版最后开(按 binary 版本写行)。

退路:`app_surfaces` 一行关掉,下次启动回到原来的包。数据是同一份,不会分叉。

### 第 2 步 纯计算搬到 Swift(2–3 周,用户无感,可与第 1、3 步同时做)

不碰存储、不碰网络、输入相同输出就相同的那部分,约 1.6–1.8 万行 TS:

- 写作引擎和它的词典、贴纸(`lib/writing-engine` 2,679 行)、气场/称号/报告(`aura.ts`、
  `usage-stickers.ts`、`report*.ts`、`voice.ts`)。
- 身份:马赛克脸、磨砂窗、笔迹签名、默认名、星座、代词(约 4,000 行)。**必须逐位一致**,
  否则所有人的笔友一夜之间换脸;网页也共用这套算法,所以对照向量是三方的合同。
- 信使的状态:成长阶段、饥饿、孵化、雏鸟动作、她说的话(`hatch-engine`、`wren-*`、`hunger`…,约 3,500 行)。
- 邮票的规则部分、日期/格式化、读完信的判定(`after-fifteen-core`)、付费墙出现规则(`fc-rollout-core`)等
  各种 `*-core.ts`。
- 30 张手绘头像和 Wren 的全部造型改由 Swift 直接画(SVG 路径用现有的 `scripts/art-path.mjs`
  那条路转成数据),替掉「RN 画、截图给 Swift」那条管线。Wren 要和现在一模一样:
  每个皮肤 × 配饰 × 成长阶段 × 姿势出一张对照图,和 RN 截的图逐张比。

怎么验:每个模块三道关——对照向量一致;它的 `*.test.ts` 里每个用例在 Swift 里有一份;
开发版里「影子比对」(同一份输入两边各算一次,不一致就记下来,**只比不用**)在 owner 的真实账号上干净。

退路:这一步的 Swift 代码不被任何页面使用(Wren 的画法除外,它已有 `composewren` 等开关),
出错不影响用户。

### 第 3 步 读写服务器搬到 Swift(1.5–2 周,用户无感)

- 把 `db.ts`(1,776 行)、`api.ts`、`net.ts`(超时规则:写 20 秒、上传 1 分钟)、`fail.ts`、
  `live.ts`(实时订阅)和相关的类型搬到 `KindredlyCore`。1.6 节那张清单就是验收范围。
- 登录凭证从第 1 步的共同存储里读;**Swift 不刷新**,快过期时请 JS 刷新(规矩 2)。
- 先做读,再做写;写操作逐个对照 `db.ts` 的错误处理(不许出现「接住错误返回空」——
  这个仓库为它付过两次代价)。

怎么验:对着线上库的测试账号,Swift 和 TS 各取一次同样的数据,转成同一种 JSON 比;
写操作在测试账号上各做一遍,比服务器上的结果。超时和断网:模拟器里断网各测一遍。

退路:还没有页面用它。

### 第 4 步 一页一页换「页面的逻辑」(5–8 周,5–6 批,每批跟一个 1.0.x)

每一页的做法相同:

- 在 Swift 里写这一页的「数据来源」(读存储、读服务器、算出页面要的那份数据)。
  `Portable` 里的页面本来就只认一份普通的 Swift 数据,而且这些数据类型都能直接比较是否相等。
- 适配层加一种模式:数据不从 JS 来,从 Swift 的数据来源来;JS 只负责「把这页挂上来」和
  「用户点了要跳去别处」(导航到第 6 步才换)。
- 每页一个新开关(比如 `core.kindreds`),默认关,验过再开;一行可以退回 JS 喂数据。
- **影子比对**:开发版和 TestFlight 里,JS 喂数据的同时让 Swift 也算一份,两份数据直接比,
  哪个字段不一样记下来。干净了才开开关。

顺序:从「错了代价最小、只读」的页开始,到「每天都用、会写数据」的页结束。

| 批 | 页面 | 这批的 TS 逻辑量 | 为什么排这里 |
|---|---|---|---|
| 1 | Lore、Drafts、邮票册、Voice、My kindreds、Keepsakes、My letters、Help、Blocked、Write to us、Appearance、Settings | 约 2,000 行 | 小、几乎只读,用来把这套做法走通 |
| 2 | Aura、报告、信使页、星球页、Me、编辑资料 | 约 6,500 行 | 读得多写得少;Me 是最复杂的只读页 |
| 3 | Notes、单篇日记、写日记、相册选图、日记成书 | 约 3,000 行 + `lib/journal*` 1,500 | **只在本机、最不能丢**,所以等前两批证明了存储读写再做 |
| 4 | Kindreds、聊天/房间、读信页、知己页、签名、介绍仪式、Wren 的房间 | 约 7,000 行 | 实时消息、未读、发送 |
| 5 | Today、写信、读完信三页、更新提示 | 约 6,500 行 | 每个人每天的主路径,放在做法最熟的时候 |
| 6 | Onboarding、自制头像、自制邮票、付费页的展示部分 | 约 3,500 行 + 邮票/头像管线 2,600 | 新用户第一眼 + 和登录/内购挨着,紧接第 5 步 |

两条写数据时的硬规矩:

- **Swift 不能丢掉自己不认识的字段。** 两边读写同一条 JSON 记录:如果 Swift 读进来、改一个字段、
  写回去时把 TS 写的其他字段丢了,退回 JS 时就坏了。每条记录都要有「原样带回去」的测试。
- **Swift 第一次改写一个由 JS 写过的键之前,把旧值另存一份**(日记已有 `kindredly_journal_rescue`
  这个做法)。只对日记、草稿、信使、头像这些丢不起的键做。

### 第 5 步 系统服务换成原生(2–3 周;和第 4 步后几批重叠)

这些东西的「主人」只能有一个,而且要跟着外壳一起换手(第 6 步)。这一步是把 Swift 版写好、
测好、放进包里,由外壳决定用哪一套。

- **登录**(`auth.tsx` 870 行):Apple、Google、邮件链接、游客、游客升级、删号、登出;
  登录后「游客的本机数据搬进账号」(`adoptGuestBucket`)和「老版本的无主数据认领」(`claimLegacyKeys`)。
  交接时 Swift 从共同存储里读出 JS 留下的登录记录接着用,不让人重新登录。
- **内购**(`iap.ts` 308 行 + `entitlement.tsx`):直接调 RevenueCat 原生 SDK。同一个 key、
  同一个用户标识(现在传的是 Supabase 的账号 id;没传时用的是 RevenueCat 自己的匿名 id,
  它本来就存在原生 SDK 里,换调用方式不会变)。两个权益名不变:`plus`、`journal_book`。
  key 从 JS 包里挪到工程配置里。
- **推送**:分两半。
  - 服务器这半**提前做、而且可以用 OTA 做**:让现在的 App 在登记 Expo token 的同时,也登记苹果的
    设备 token;服务器(`functions/api/push-drain.js`,现在发到 Expo;`functions/_lib/apns.js`
    已经能直连苹果,锁屏实时活动在用)改成有苹果 token 就直连苹果。这样在还有 OTA 和 RN 的时候,
    就把「直连苹果」在所有人身上跑通了。
  - App 这半:Swift 登记同一个苹果 token、处理点通知跳到哪一页、每天 8 点的本地敲门
    (`local-push.ts` 661 行 + 九语文案 746 行)、角标数字。
- **锁屏实时活动和小组件**:用原生重写两个活动(LetterOut、DayClosed)。活动类型的名字、
  服务器推过来的字段、App Group 的名字必须和现在一致,否则服务器推的更新对不上。
- **媒体**:录音、播放、视频、相册选图、存图到相册。部件已有 Swift 版,这里是把「录」和「播」
  本身也换掉;4 个还关着的媒体开关在这一步之前必须真机测完打开。
- 触感、剪贴板、评分请求、分享、打开链接:小,顺手。

### 第 6 步 Swift 外壳,先并存再放量(2–3 周)

- 用 SwiftUI 做导航:替掉 47 个路由文件和 330 处跳转;深链(`kindredly://…`)、推送点进来、
  邮件登录回跳;弹出方式(付费页是卡片、自制邮票是全屏、写信从下往上)照现在的;
  Duo 的竖栏、两页版式、半折姿势(`lib/fold*.ts` 约 600 行的规则)。
- **关键做法:出一个「两个外壳都在」的版本。** 启动时先由一小段原生代码决定:用 Swift 外壳
  (完全不启动 RN),还是照旧启动 RN。默认 RN;`app_surfaces` 的行按比例把人切到 Swift 外壳;
  连续两次启动闪退自动回 RN(这个机制今天在 JS 里有,要在原生启动代码里再做一份)。
  这样「没有 RN 的 Kindredly」先在真实用户身上跑满一个版本,出问题一行退回,JS 那边还能 OTA。
- 外壳决定谁是「主人」:Swift 外壳下,登录刷新、内购、推送都用第 5 步的原生版;RN 外壳下照旧。
  两种外壳之间来回切时登录状态要能互相接上(两边读写同一条记录,格式差异写一个小转换,未验证)。
- 这一步有一个**没验证的前提**:Expo SDK 57 允许「原生代码先起来、按条件不启动 RN」。
  开工前先花一两天做个最小试验。如果做不到,退而求其次:用 TestFlight 专用的纯 Swift 包 +
  App Store 分阶段发布来代替「按比例放量」,风险更高一些,其他步骤不变。

### 第 7 步 拆掉 RN = 1.1.0(1 周 + 审核)

到这一步,所有人已经在 Swift 外壳上跑了一个版本,所以 1.1.0 **应当不改变任何行为**,只是删东西:

- 删 `src/`(约 19.2 万行 TS,含测试)、`modules/kindredly-ui/src`、`Adapters/`、Expo 和 RN 的全部依赖、
  `app.json` / `eas.json` / `metro.config.js` / `plugins/`。
- `ios/` 换成提交进仓库的普通 Xcode 工程:签名、推送、Apple 登录、App Group、小组件扩展都在工程里
  配好(不再有「prebuild --clean 把签名团队抹掉」这类事)。
- 文案的源头换成生成出来的那份;276 张 WebP 图片从 JS 包里搬进 App 的资源。
- 开发用的页面(32 个开发页、14 个预览页)换成一个只在调试版出现的菜单;哪些留、哪些不要,届时列表给 owner 看。
- 发版前照旧拆包检查(登录用的 Supabase 地址、内购的 `appl_` key、审核账号),只是检查的位置
  从 JS 包换成 `Info.plist` 和主程序。
- 分阶段发布(7 天),盯着崩溃和登录/内购/推送三个数字。

---

## 5. 哪些能「一页一页搬、同时照常发版」,哪些不能

**能(每一项都有开关、可单独退回):**

- 第 1 步的存储(一个开关)。
- 第 2 步的每个计算模块(没有页面在用,不需要开关)。
- 第 4 步的每一页(每页一个 `core.*` 开关)。
- Wren 和头像的画法(已有开关)。
- 推送改直连苹果(服务器一侧,按 token 类型分流,可随时改回)。

**不能,只能整体换手一次:**

- 导航外壳(第 6 步)。它和「谁刷新登录、谁管内购、谁收推送」绑在一起。
  所以才要「两个外壳并存、按比例放量」来把这一次换手变成可退的。
- 拆 RN 本身(第 7 步)。拆了就没有 OTA,也没有 RN 备用页。

---

## 6. 高风险清单

| # | 风险 | 做错的后果 | 怎么防 | 怎么验 |
|---|---|---|---|---|
| 1 | **本机数据**:93 个键、日记只在手机上且不在 iCloud 备份里 | 日记、草稿、信使丢失,无法恢复 | 不迁移:Swift 读写原来的文件和格式(第 1 步);改写丢不起的键前先另存旧值;不丢不认识的字段 | 真实存储目录做样本,读写往返逐字一致;owner 手机的数据容器单独测一遍 |
| 2 | **登录状态** | 所有人被登出;游客永远找不回 | 一个刷新的人(规矩 2);交接时读同一条记录,不重新登录 | 测试表:Apple / Google / 邮件 / 游客 × 更新前已登录 → 更新后仍登录;游客更新后仍是同一个 id;凭证已过期时更新;断网时更新;更新前点的邮件链接更新后打开(预期:需要重发一次) |
| 3 | **内购** | 付了钱没开通;或已付费的人变回免费 | 同一个 RevenueCat SDK、key、用户标识、权益名;key 的位置进拆包检查 | TestFlight 沙盒:新买、恢复购买、已订阅者更新后仍有效、日记成书单买、游客买完再登录;服务器 webhook 不变,看 `subscriptions` 表 |
| 4 | **推送** | 收不到;或同一条收两遍(Expo 的旧 token 和苹果 token 同时有效) | 服务器先改、趁还有 OTA 时跑通;同一台设备只留一种 token | 推送结果表里按 token 类型看送达;真机:8 点敲门、新信、知己消息、关掉开关后确实不来 |
| 5 | **没有 OTA** | 逻辑 bug 要等审核 1–3 天。10-25 到 11-12 这三周里发过至少 5 次 OTA(督促更新弹窗两次、万圣节装扮、11-10 登录后的日记、11-12 每天十封) | 见第 8 节 | — |
| 6 | **身份算法逐位一致**(脸、窗、签名、默认名) | 所有人的笔友换脸换名;和网页对不上 | 对照向量是 App、网页、Swift 三方合同,向量文件的 sha 锁在测试里 | 现有 4 份向量 + 给马赛克脸补一份 |
| 7 | **锁屏实时活动** | 服务器推的更新对不上,活动卡在旧状态 | 类型名、字段、App Group 不变 | 真机:发信 → 活动出现 → 服务器推「已读」→ 活动更新;更新当晚旧活动结束属预期 |
| 8 | **两套逻辑并存期间的分叉** | 同一个 bug 修了 TS 忘了 Swift(或反过来) | 规矩 3、4;影子比对;搬完的页冻结 TS | 每个版本发之前看影子比对的记录是否为空 |
| 9 | **远程开关失去「退回 RN」** | 1.1.0 之后 Swift 页面出 bug 只能关功能或等审核 | 第 6 步的并存版本里把每一页在 Swift 外壳下跑够;保留功能开关 | — |
| 10 | **构建方式整体更换** | 签名、推送权限、小组件扩展、App Group 配错,包传不上去或功能静默失效 | 第 6 步就用新工程打 TestFlight 包,不等到第 7 步 | 拆包检查清单(SDK 版本、场景声明、权限、`appl_`、Supabase 地址) |

---

## 7. 怎么测

**现有的 node 测试就是规格书。** 133 个 `*.test.ts`、17,693 行,其中 131 个不依赖 RN,
直接 `node src/lib/xxx.test.ts` 就能跑(lib 56、screens 40、components 13、data 22、theme 2)。
它们大多数测的正是要搬的那批逻辑。

每搬一个模块,在 Swift 里对应三样:

1. **对照向量**:TS 算出标准答案写成 JSON,TS 测试和 Swift 测试都必须重现。答案文件的 sha 锁在
   两边的测试里,谁悄悄改了就红。
2. **同名的 Swift 测试**:`xxx.test.ts` 里的每个用例在 `KindredlyCore` 的测试里有一份,
   用 `swift test` 在 Mac 上跑,整套应在一分钟内。
3. **影子比对**(开发版和 TestFlight):真实账号、真实数据下,TS 和 Swift 各算一份,只比不用。

「搬完」的定义:三样都过,并且在 owner 的账号上影子比对干净。

界面本身不用重测(页面没变),但每批第 4 步的页面要在模拟器上把主要入口点一遍
(登录态和游客各一遍——11-02 那次「只用访客测过、登录用户全站白屏」的教训同样适用)。
不打包也能做的检查照旧可用:`design/courier-planet/checks/typecheck-module.sh`(整层类型检查,约 1 分钟)、
`render-fast.sh`(把 SwiftUI 渲染成图,十几秒一张)。

**必须真机、必须 owner 在场的**(模拟器做不了):Apple 登录、沙盒内购、推送、锁屏实时活动、
录音和相机、Duo 的真实折叠。每一项在第 5、6 步各列一张勾选表,放进当版的 `docs/test-*.md`。

---

## 8. OTA 没了以后

拆掉 RN 就没有热更新。这不是可以绕开的技术细节:苹果不允许 App 下载并执行新的原生代码,
「纯 Swift」和「能热更新逻辑」不能同时成立。

今天 OTA 在做的事,和之后各自的去处:

| 今天用 OTA 做的 | 之后 |
|---|---|
| 修逻辑 bug、改规则(11-10 登录后看不到自己的日记、11-12 每天十封和「信只来一次」;11-13 本地记录互相覆盖的修复也是 JS,可以 OTA) | 发新包过审。紧急时可申请加急审核 |
| 改文案、修翻译 | **可以保留**:做一张服务器上的「文案覆盖表」,App 启动时取,盖在包里的文案上。数据不是代码,合规。建议在第 6 步之前做好 |
| 节日装扮(万圣节) | 提前放进包里,由日期或服务器的行打开;或者把装扮做成可下载的数据 |
| 把出问题的 Swift 页面退回 RN | 没有了。只能关功能(`app_surfaces` 继续用,Swift 直接读) |
| 督促更新的包裹弹窗 | 保留,而且更重要:没有 OTA 之后,让人尽快装新包是唯一的修复通道 |

所以拆 RN 之前要先具备:功能开关(Swift 读 `app_surfaces`)、文案覆盖表、督促更新、
App Store 分阶段发布的习惯、一个愿意先装 TestFlight 的小圈子。

---

## 9. 量和时间(估计)

| 步 | 要搬的 TS | 新写的 Swift(估计) | 时间(估计) | 把握 |
|---|---|---|---|---|
| 0 地基 | — | 约 1,500 行 + 3 个脚本 | 3–5 天 | 高 |
| 1 存储 | 约 1,000 行 | 1,200–1,800 | 1 周 + 观察一版 | 高(格式已读过源码) |
| 2 纯计算 | 16,000–18,000 | 13,000–16,000 | 2–3 周 | 中高(有测试、有向量) |
| 3 数据层 | 约 4,500 | 4,000–5,000 | 1.5–2 周 | 中 |
| 4 逐页 | 约 27,000(页面)+ 约 10,000(lib 余下的)+ 胶水里的翻译 | 30,000–38,000 | 5–8 周 | **低**:量最大,每批要等一个版本 |
| 5 系统服务 | 约 4,000 + 锁屏活动 | 5,000–7,000 + 服务器推送改动 | 2–3 周 | 中:靠真机测,靠 owner 的时间 |
| 6 外壳 | 路由 47 个文件、约 600 行版式规则 | 4,000–6,000 | 2–3 周 | **低**:「按条件不启动 RN」未验证 |
| 7 拆除 | 删约 19.2 万行 TS、1.6 万行适配层 | 新 Xcode 工程 | 1 周 + 审核 | 中 |
| **合计** | 约 6.4 万行逻辑 | **5.8–7.5 万行 Swift** | 串行 15–23 周;能重叠的重叠后 **10–17 周** | |

说明:

- 这一个月把页面搬成 Swift(约 11 万行)用了四周左右,但那是「画」——对不对一眼看得出来。
  逻辑不一样:写得快,难的是证明它和原来一模一样,而且每一批要在真实用户手机上待满一个版本。
  所以瓶颈是版本数(至少 6–7 个 1.0.x),不是行数。
- 上面没算:这期间继续做新功能占掉的时间(Duo、收费颗粒度、日记成书等);owner 真机测试的等待。
- 第 2、4 步的量适合拆给多个 agent 并行(模块之间互不相干、各有测试),但 token 花费会明显超过
  平时的节省模式,开工前应按批报预算。

---

## 10. 考虑过、没有采用的做法

- **另开分支整体重写,写完一次替换。** 主分支每周都在加功能,分支会越离越远;全部新逻辑第一次
  见到真实用户,恰好是在没有 OTA、没有 RN 退路的那个版本上。不采用。
- **第一次打开 1.1.0 时把 RN 的存储导入到新格式。** 这是 11-09 清单里默认的做法,也是最容易
  丢日记的一个动作(只有一次机会,且那份数据不在 iCloud 备份里)。改成第 1 步的「不搬」。
- **留一个很小的 JS 引擎专门跑逻辑以保住 OTA。** 那就不是纯 Swift,包也小不了多少。不采用。

---

## 11. 没查实的、需要开工时先确认的

- `supabase-swift` 的当前版本、接口、它保存登录记录的格式——没有上网核对。
- Expo SDK 57 下「原生先启动、按条件不启动 RN」是否可行(第 6 步的前提)——没有试。
- 1.9 节「拆完之后的包大小」和「冷启动更快」是估算,没有实测。
- 服务器仓库只确认了两点:`push-drain.js` 发到 Expo,`_lib/apns.js` 存在。发送逻辑本身没读。
- 1.6 节的表数是按单行写法搜的,可能少数。
- Swift 版 Wren 在全部皮肤/配饰/阶段/姿势下是否已和 RN 版一致——没有逐张比。
- 这次没有跑那 133 个 node 测试,只数了它们。
- 版本号怎么排(App Store 1.1.0 对应 binary 几)没有涉及;`app_surfaces` 的行和
  `STORE_OF_BINARY` 都按 binary 版本写,1.1.0 时要加行。
