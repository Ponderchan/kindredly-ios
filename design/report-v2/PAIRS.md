# 报告第 6 张「你会合得来的人」— 12 型配对表（待 owner 批准）

草稿 2026-10-31。六对，两两互配（A→B 且 B→A），从 `lib/hatch-engine` 里每型的主导维度和它那句描述出发：每一对的两边强在不同维度，互相补完对方的句子。
批准前整份新报告都在开关 `reportwrapped` 后面（默认关）。改配对只动 `src/screens/report/wrapped-core.ts` 的 `PAIRS` 和 `rw.pair.*` 文案。

| 你的类型 | 配 | 为什么（英文原文，屏幕上从你的角度说） |
|---|---|---|
| The Night Courier（深夜信使） | The Window Watcher（窗边观察者） | you bring the 2am feelings. they bring the morning details. |
| The Window Watcher（窗边观察者） | The Night Courier（深夜信使） | you bring the morning details. they bring the 2am feelings. |
| The Pocket Archivist（口袋档案员） | The Slow Confetti（慢慢的彩纸屑） | you keep the small moments. they make them sparkle. |
| The Slow Confetti（慢慢的彩纸屑） | The Pocket Archivist（口袋档案员） | you make the small moments sparkle. they keep every one. |
| The Soft Cartographer（温柔的制图师） | The Deep Diver（深潜者） | you draw the map. they know how deep the water goes. |
| The Deep Diver（深潜者） | The Soft Cartographer（温柔的制图师） | you go deep. they know the way back up. |
| The Static Listener（杂音聆听者） | The Weather Reporter（天气播报员） | you hear the hum underneath. they say the forecast out loud. |
| The Weather Reporter（天气播报员） | The Static Listener（杂音聆听者） | you say it out loud. they hear what's under it. |
| The Unsent Editor（未寄出的编辑） | The Blunt Valentine（直球情人） | you find the perfect word. they make you hit send. |
| The Blunt Valentine（直球情人） | The Unsent Editor（未寄出的编辑） | you say it plain. they find the word that makes it stay. |
| The Ellipsis Keeper（省略号保管员） | The Margin Scribbler（页边涂写者） | you leave the door open. they write something in the gap. |
| The Margin Scribbler（页边涂写者） | The Ellipsis Keeper（省略号保管员） | you scribble in the margins. they leave you room. |

注：中文类型名是我这里的意译，方便看，App 里没有中文。其他八种语言的 why 句已写好（见 `src/data/strings-wrapped.ts` 的 `rw.pair.*`）。

可以考虑的替代：深夜信使也可以配「天气播报员」（夜里的情绪 × 白天的直说）；如果想要更“反差”的配对，可以改成按最弱维度互补。
