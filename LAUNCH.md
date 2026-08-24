# Kindredly iOS — 上线前清单

盘点于 2026-08-20。每一条都在代码里核实过,没有凭印象写的。
状态:开发者账号已有(个人版,已上线过 app),等当前版本过审后用 DUNS 转组织,
转成功后上 Kindredly。

---

## 0 · 顺序上的一个硬约束

**转组织账号大概率会更换 Team ID。**

Sign in with Apple 返回的用户标识(`sub`)是**按 team 作用域**的。Team ID 一变,
同一个真人下次登录会被当成全新用户,老账号回不去。同时受影响的还有 App Group、
Keychain access group、Universal Links(`TeamID.bundleid`)、推送证书。

Kindredly 还没上线、没有真实用户 —— 所以**先转、后上线**正好躲开迁移。反过来做要写迁移代码。

**推论:在转换完成前,不要做这些**

- 不建 Kindredly 的 App Store Connect 记录
- 不建 Sign in with Apple 的 Service ID
- 不建 IAP 商品 / 订阅组
- RevenueCat 里不接 App Store 凭据

这些都会绑定到旧 Team,转完可能要重做。

---

## 1 · MUST — 不做完会被拒,或根本上不了线

### 1.1 账号删除(App Store 5.1.1(v))— ✅ 完成,迁移已应用(2026-08-24)

产品决定已拍板:**(a) 信留下、彻底断开作者**。

- 服务端:`0009_account_deletion.sql` 已应用 —— `letters.author` /
  `threads.a/b` / `messages.sender` 从 CASCADE 改 SET NULL、禁止向 ghost 开新
  thread、`delete_account()` RPC 已存在(探测返回 401 需登录,不是 404)。
- 客户端:设置页 `Delete account` 行 + LeaveSheet 确认;成功后清空本地
  (只留火漆本子 `kindredly_journal`)并登出。已在模拟器上目视验证。
- **提审前仍要在真实账号上跑一次**(删掉一个测试账号,确认对面 thread 幸存)。
  我没有调用过 delete_account —— 只探测了它存在。

### 1.2 SAFETY 两行死链 — ✅ 完成(slice 169)

`Blocked & reported` 现在开一个真实界面(`src/app/blocked.tsx`):已拉黑作者列表
(以 MosaicId 呈现——读者唯一见过的身份)+ UNBLOCK,底部一行说明举报的去向。
用的是 0004 早就授了、但从没人调用过的 "read own blocks" / "remove own blocks"。
空状态已在设备上验证;有数据的列表行是按构造 + tsc 记账,没往生产写测试拉黑。

### 1.3 Terms / Privacy Policy 可达性 — ✅ 完成(slice 169)

更正早前的盘点:paywall 里 Terms 和 Privacy 链接**其实都有**(之前 grep 截断漏看了
Privacy 那行),3.1.2 本来就不缺。真正缺的是付费墙之外的可达性,现已补上:

- 设置页 SAFETY 面板:`Terms` / `Privacy policy` 两行,链到 kindredly.io(两页网站上都有)
- onboarding 登录步骤:按钮下方 "BY CONTINUING YOU AGREE TO THE TERMS & PRIVACY POLICY"
  ——包括 "Just looking"(匿名 ghost 也是账号)

### 1.4 IAP 完全没通电

```
src/lib/iap.ts:25   export const IAP_READY = Platform.OS === "ios" && !!RC_IOS_KEY;
```

`EXPO_PUBLIC_REVENUECAT_IOS_KEY` 在 `eas.json` 的 **development / preview / production
三个 profile 里全是空字符串**。所以 `IAP_READY === false`,付费墙渲染得出来但**点不动**。

IAP 在 v1 范围内(见 memory: build-decisions),所以这是必须项,不是可选项。

需要:RevenueCat 项目 + App Store Connect 订阅商品 + 把 key 填进 eas.json。
**顺序上必须等转组织之后**(见 §0)。

### 1.5 信池是空的 —— 既是审核风险也是产品风险

池子里 4 封信,其中 3 封是测试垃圾。

审核员打开 app 看到的是一个空邮局(`letters.tsx` 有 `THE POST IS CLOSED` + 倒计时的
冷启动分支)。这会撞上 **2.1 Minimum Functionality / App Completeness** —— 一个
"看起来没内容"的社交 app 是常见拒因。

这同时是最大的产品问题:新用户第一屏就是"没东西可读"。

需要:一批真实可读的开场信,数量足够撑过冷启动的头几天。

### 1.6 真机验证 Sign in with Apple

`ios/Kindredly/Kindredly.entitlements` 里有 `com.apple.developer.applesignin`,
`CODE_SIGN_ENTITLEMENTS` 在两个 configuration 里都引用了它 —— **接线是对的**,
签名之后一定会嵌进去。

但模拟器不强制代码签名,所以"签名后真机上能不能走通"至今没验证过。转组织之后
Team 变了更要重验一次。

### 1.7 Supabase 的 Apple provider 配置(待确认)

`SETUP.md` step 2。这一项本次没有核实,标为待确认。转组织后 Team ID / Key ID
若变化,这里的配置需要同步更新。

---

### 1.8 迁移 — ✅ 全部落地(2026-08-24)

用 app 自己的 anon key 探测发现**生产库当时停在 0005**,不是我以为的只差三张:
`0006`(windows)/`0007`(voice)/`0008`(reactions)/`0009`/`0010`/`0011` **六张
全部未应用**。这解释了几个看着像 bug 的现象 —— 池子每次拉取都走 pre-0007 回退、
接在三个界面里的 reactions 表根本不存在。

已打包成 `~/Desktop/kindredly/supabase/APPLY_0006_TO_0011.sql` 一次粘贴跑完,
重探确认六张全部生效,且 `0010` 已清干净未 reveal thread 上的旧快照名
(所以 `a_name` 非空从此只可能是"这个人签了名")。

**真实数据上已验证**(2026-08-24,单账号):迁移后冷启动不崩;Today 拉到真实
池子;`YOUR AURAS ARE CLOSE` 出现 → 夜间匹配器在工作;回了一封真实的信 →
`screen()` 过审、thread 真的建立、**回过的信离开池子**(01/03 → 01/02)、
Kindreds 出现真实 thread(虚空环外、2 格墨点、显示你写的那句、`WAITING ON THEM`)。

**仍未在真实数据上验证**:签名 → 引荐仪式 → 房间。需要两个真实账号各写 5 封,
owner 将在手机上用两个账号测。

## 2 · NEED TO DO — 上得了线,但会伤

### 2.1 一次完整的冷启动走查

至今**没有做过**从零到主循环的完整一遍。今天验证到的只是:Release 包冷装到干净模拟器
上不崩、onboarding 正常渲染。后面每一步都没走。

（今天已装好一台干净的 iPhone 17 Pro 模拟器,上面是真 Release 包,不是 dev client。）

### 2.2 清生产环境的测试数据

日记里、信池里、profile 里都有测试残留。

### 2.3 App Store Connect 侧的元数据(转组织后才能做)

- App Privacy 营养标签 —— 匿名账号 + UGC + 日记本地存储,如实填
- 年龄分级:陌生人之间的 UGC 通常需要 **17+**
- 截图、描述、关键词、支持网址
- 1.2 还要求**公开可见的联系方式**

`app.json` 里 `version: 1.0.0`,`buildNumber` 未设(靠 EAS `appVersionSource: remote`
自增)。`submit.production.ios.ascAppId` 为空。

### 2.4 摘掉多余的 push entitlement

`Kindredly.entitlements` 里有 `aps-environment: development`,但通知是**纯本地**的
(`src/lib/notify.ts` 只用 `scheduleNotificationAsync`,没有 push token)。

好消息:**不需要配 APNs**,少一整块活。坏消息:留着这个 entitlement 可能会被问
"你们的推送在哪"。建议移除。

### 2.5 本机装签名证书

`security find-identity -v -p codesigning` → `0 valid identities found`。
这不代表没账号,只代表这台 Mac 没装过证书。Xcode → Settings → Accounts 加上
Apple ID 即可,两分钟。

### 2.6 eas-cli 未安装

如果走 EAS 云构建:`npm i -g eas-cli`。`eas.json` 已经写好了三个 profile。
本地 Xcode Archive 也行,步骤更多、没有额外好处。

### 2.7 年龄门确认

`src/app/settings.tsx:29` 读 `profile.dob`,分档从 "18–24" 起 —— 说明 onboarding
采集了出生日期。但**没有验证它是否真的拦住 18 岁以下**,还是只是记录下来。

---

## 3 · 已经做完 / 不用担心

| 项 | 证据 |
|---|---|
| 本地构建链 | Ruby 4.0.6 · CocoaPods 1.17.0 · Xcode 26.6 · `ios/` 已 prebuild |
| **Release 构建** | `BUILD SUCCEEDED`,6.8MB `main.jsbundle` 打进包,不连 Metro |
| **冷启动** | 装到从没装过的模拟器上启动正常,字体加载,无崩溃 |
| Apple 登录 entitlement 接线 | entitlements 文件 + 两个 config 的 `CODE_SIGN_ENTITLEMENTS` |
| 提审必需文件 | `PrivacyInfo.xcprivacy` · icon · `ITSAppUsesNonExemptEncryption: false` |
| **举报 + 拉黑(1.2 的主体)** | `lib/db.ts` `reportContent` / `blockUser`,接 `reports`/`blocks` 表,三个不同举报人自动停用作者 |
| 年龄采集 | `profile.dob` |

1.2 最难的那部分(真实的举报/拉黑后端 + 自动处置)已经做完了,缺的只是**入口和收口**。

---

## 4 · 已拍板的产品决定

**删号时寄出的信怎么办?→ (a) 信留下,彻底断开作者**(owner,2026-08-24)。
收信人从来不知道作者是谁,断开后他们那侧毫无变化;撤信则是拿别人的体验去执行
你的退出。实现见 §1.1 / migration 0009。附带决定:火漆本子不随账号死——它从来
不属于账号("not even me" 反过来也成立),留在手机上;其余本地状态全部重置。

---

## 5 · 建议顺序

```
现在                        转组织完成后              提审前
─────────────────────      ──────────────────       ─────────────
1.1 账号删除                建 ASC 记录               真机验 Apple 登录
1.2 SAFETY 界面             建订阅商品                完整冷启动走查
1.3 Terms/Privacy 链接      接 RevenueCat + 填 key    清测试数据
1.5 写开场信(内容)         2.3 元数据                装签名证书
2.4 摘 push entitlement
```

左边一列**不依赖账号转换**,现在就能做完 —— 而且它们正好是拒审风险最高的四条。
