import type { LangResources } from "./types";

/* Japanese resources — Japanese as it is thumbed into a phone, plain form
   and です/ます alike. No spaces, so every entry is met as a SUBSTRING
   (match: "substring"); entries are stems, written so they sit inside
   their conjugations: 疲れ takes 疲れた / 疲れてる / 疲れました, 嬉し
   takes 嬉しい / 嬉しかった. The hedges are the real ones — たぶん / かも
   / なんか / 気がする / みたい / 一応 — and the laughter is w / 笑 / 草,
   which is the most stable fingerprint a Japanese hand has. */
export const JA: LangResources = {
  match: "substring",
  // stems chosen so one entry covers its family and no two overlap: かも
  // takes かもしれない, と思っ takes 思った / 思って; bare かな is left out
  // (it is inside かなり and かなしい) and のかな / かなあ stand for it
  hedges: ["たぶん", "多分", "かも", "なんか", "なんとなく", "気がす", "気がし", "と思う", "と思っ", "みたい", "っぽい", "一応", "まあ", "まぁ", "わりと", "けっこう", "結構", "なんだか", "ちょっと", "とりあえず", "どうやら", "らしい", "のかな", "かなあ", "かなぁ", "たしか", "確か", "ような気", "はず"],
  affectPos: ["嬉し", "うれし", "楽し", "たのし", "好き", "幸せ", "しあわせ", "ありがた", "安心", "最高", "優し", "やさし", "温か", "あたたか", "あったか", "落ち着", "ほっとし", "ワクワク", "わくわく", "ドキドキ", "笑顔", "感謝", "誇らし", "愛し", "愛お", "心地よ", "気持ちい", "よかった", "良かった"],
  affectNeg: ["疲れ", "つかれ", "しんど", "悲し", "かなし", "寂し", "淋し", "さびし", "さみし", "泣", "怖", "こわ", "不安", "心配", "痛", "嫌い", "きらい", "苦し", "くるし", "辛", "つら", "ムカつ", "むかつ", "イライラ", "いらいら", "会いたい", "虚し", "むなし", "憂鬱", "ゆううつ", "落ち込", "だるい", "ひとり", "一人ぼっち", "孤独", "後悔", "恥ずかし", "罪悪感", "限界"],
  laughter: /(www+|ｗｗ+|w{2,}$|笑|（笑）|\(笑\)|草|わら)/i,
  question: /[?？]|(かな|のか|だろうか|でしょうか|ですか|ますか|なの)[?？。]?$/m,
  ownedFrame: /(気持ち|感じ|寂しい|さびしい|さみしい|会いたい|好き|嫌い|怖い|こわい|不安|悲しい|嬉しい|うれしい|つらい|辛い|しんどい)/,
  distanceFrame: /(客観的に|外から見|という人間|ような人間|みたいな人|自分という|自分を見て|自分を眺め)/,
  firstPerson: ["私", "わたし", "あたし", "僕", "ぼく", "俺", "おれ", "自分"],
  outward: ["彼女", "彼は", "彼が", "彼の", "みんな", "皆", "世界", "外に", "外は", "外へ", "街", "窓", "部屋", "誰か", "あの人", "周り", "他人", "友達", "人たち", "人々", "隣"],
  abstract: /(性|観|論|念|主義|意識|価値|意味|存在|関係|感情|人生|自由|真実|本質)/g,
  detailOpeners: /^(今日|今朝|昨日|昨夜|夜|朝|雨|窓|部屋|外|この|その|あの|駅|電車|道|空|コーヒー|台所|机|ベランダ|帰り道|夕方|朝の)/,
  quirks: (text) => {
    const q: string[] = [];
    // the w's and the 笑 — an actual laugh has a shape here
    if (/w{2,}|ｗ{2,}|（笑）|\(笑\)|草/.test(text)) q.push("laugh-w");
    // the drawn-out vowel: すごーい / ねー / だよー
    if ((text.match(/[ぁ-ゖァ-ヺ]ー(?![ァ-ヺ])/g) || []).length >= 2) q.push("elongation");
    // the tilde as a tone of voice: よね〜 / だよ~
    if ((text.match(/[〜~]/g) || []).length >= 2) q.push("tilde");
    // spoken endings written down: 〜だよね / 〜じゃん / 〜っす
    if ((text.match(/(だよね|じゃん|っす|だわ|のよ|かしら)/g) || []).length >= 2) q.push("spoken-ending");
    // the hand that never closes a sentence with 。
    const lines = text.split(/\n+/).filter((l) => l.trim().length > 6);
    if (lines.length >= 2 && lines.every((l) => !/[。.!！?？]$/.test(l.trim()))) q.push("no-period");
    return q;
  },
  themes: [
    { theme: "missing_someone", words: ["会いたい", "会えな", "恋し", "いなくな", "遠く", "離れ", "帰ってこ", "思い出す", "あなたがいな"] },
    { theme: "tired", words: ["疲れ", "つかれ", "しんど", "だるい", "限界", "へとへと", "くたくた", "眠い", "ねむい"] },
    { theme: "family", words: ["お母さん", "母親", "母さん", "お父さん", "父親", "父さん", "家族", "両親", "お兄ちゃん", "お姉ちゃん", "兄貴", "姉ちゃん", "妹が", "弟が", "おばあちゃん", "おじいちゃん", "祖母", "祖父", "親に", "親が", "親と"] },
    { theme: "work", words: ["仕事", "職場", "上司", "会議", "オフィス", "シフト", "バイト", "同僚", "残業", "会社", "学校", "授業", "レポート"] },
    { theme: "sleep", words: ["眠れ", "寝れ", "寝た", "睡眠", "不眠", "夜中", "深夜", "布団", "ベッド", "夜更かし", "目が覚め", "眠い", "ねむい"] },
    { theme: "loneliness", words: ["ひとり", "一人", "孤独", "寂し", "淋し", "さびし", "さみし", "誰もいな", "独り"] },
    { theme: "friendship", words: ["友達", "友だち", "親友", "友人", "ダチ", "仲間", "友情"] },
    { theme: "love", words: ["好き", "恋", "愛し", "愛して", "彼氏", "彼女", "デート", "キス", "付き合", "片思い", "元カレ", "元カノ", "推し"] },
    { theme: "home", words: ["家に", "家で", "家の中", "うちに帰", "部屋", "実家", "台所", "キッチン", "玄関", "ベランダ", "アパート", "帰り"] },
    { theme: "memory", words: ["思い出", "記憶", "覚えて", "子供の頃", "子どもの頃", "昔", "あの頃", "小さい頃", "懐かし"] },
    { theme: "future", words: ["未来", "将来", "いつか", "計画", "予定", "明日", "来週", "来年", "希望", "そのうち", "これから"] },
    { theme: "small_win", words: ["やっと", "できた", "終わっ", "達成", "誇らし", "うまくいっ", "合格", "勝った", "やり遂げ"] },
    { theme: "uncertainty", words: ["たぶん", "多分", "わからな", "分からな", "迷っ", "迷い", "不安", "どうしよう", "かもしれ", "自信がな", "モヤモヤ", "もやもや"] },
  ],
};
