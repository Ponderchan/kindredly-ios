import type { LangResources } from "./types";

/* Korean resources — Korean as it is typed into a phone, 해요체 and 반말
   alike. Words carry their particles and endings, so every entry is met
   as a PREFIX of an 어절 (match: "prefix"): 피곤 takes 피곤해 / 피곤하고 /
   피곤했어요, 보고 싶 takes 보고 싶어 / 보고 싶다. A one-syllable entry only
   ever matches itself (나 is not 나무), so the pronouns are listed in
   their inflected forms. The hedges are the ones a Korean hand actually
   leans on — 그냥 / 좀 / 약간 / 뭔가 / 왠지 / ~것 같 — and ㅋㅋ / ㅎㅎ / ㅠㅠ are
   the steadiest fingerprint the language has. */
export const KO: LangResources = {
  match: "prefix",
  hedges: ["아마", "아마도", "글쎄", "그냥", "좀", "약간", "뭔가", "왠지", "것 같", "거 같", "듯이", "듯한", "듯해", "듯도", "살짝", "대충", "일단", "거의", "어쩌면", "혹시", "그런가", "그런지", "모르겠", "잘 모르", "아무튼", "어쨌든", "하여튼", "나름", "은근", "은근히", "웬만", "그럭저럭", "뭐랄까", "어떻게 보면", "어쩐지"],
  affectPos: ["행복", "기쁘", "기뻐", "기쁜", "좋아", "좋다", "좋은", "좋았", "사랑", "고마", "고맙", "감사", "설레", "설렘", "뿌듯", "편안", "편해", "따뜻", "따듯", "최고", "다행", "포근", "든든", "웃음", "웃었", "웃고", "재밌", "재미있", "신나", "즐거", "만족", "안심", "행운"],
  affectNeg: ["피곤", "지치", "지쳐", "지쳤", "슬프", "슬퍼", "슬픈", "슬펐", "외로", "외롭", "눈물", "울었", "울고", "울어", "무서", "무섭", "불안", "걱정", "아프", "아파", "아픈", "싫어", "싫다", "싫은", "화나", "화가", "짜증", "보고 싶", "보고싶", "그리워", "그립", "힘들", "힘든", "힘들었", "허전", "서운", "속상", "우울", "답답", "막막", "지겨", "후회", "부끄", "죄책감", "버거", "쓸쓸", "공허", "무기력"],
  laughter: /(ㅋㅋ+|ㅎㅎ+|하하+|헤헤+|호호+|크크+|킥킥)/,
  question: /[?？]|(까요|나요|니까|을까|ㄹ까|는지|은지|인지|냐|나\?)[?？.]?$/m,
  ownedFrame: /(느껴|느낌|기분|보고 싶|보고싶|사랑해|싫어|무서워|불안해|슬퍼|기뻐|외로워|힘들어|아파)/,
  distanceFrame: /(나를 보|나 자신을|밖에서 보|객관적으로|그런 사람|같은 사람|나라는 사람|내 모습을|스스로를)/,
  firstPerson: ["나는", "난", "내가", "나를", "날", "나도", "나한테", "나에게", "나의", "내", "나만", "나랑", "나와", "저는", "전", "제가", "저를", "저도", "제", "우리", "우린", "우리는", "우리가", "우리도"],
  outward: ["그들", "그는", "그가", "그녀", "사람들", "누군가", "모두", "다들", "세상", "밖에", "밖은", "밖으로", "거리", "길거리", "창문", "창밖", "방에", "방에서", "방이", "옆집", "남들", "타인", "친구"],
  abstract: /(의미|존재|관계|가치|감정|본질|자유|진실|인생|현실|삶|정체성|의식)/g,
  detailOpeners: /^(오늘|아침|어제|밤|비가|비는|창|방|밖|이|그|저|역|지하철|버스|길|하늘|커피|집|퇴근|출근|새벽|저녁|점심)/,
  quirks: (text, tokens) => {
    const q: string[] = [];
    // the laugh and the cry as consonant strings — the most Korean thing a
    // keyboard does
    if (/ㅋㅋ+/.test(text)) q.push("laugh-kk");
    if (/ㅎㅎ+/.test(text)) q.push("laugh-hh");
    if (/ㅠㅠ+|ㅜㅜ+|ㅠ_ㅠ|ㅜ_ㅜ/.test(text)) q.push("cry-yu");
    // the tilde as a tone of voice: 좋아~ / 그치~
    if ((text.match(/~/g) || []).length >= 2) q.push("tilde");
    // chat spellings — repeated to count as a quirk
    if (tokens.filter((t) => ["ㅇㅇ", "ㄱㄱ", "ㄴㄴ", "ㅇㅋ", "ㄹㅇ", "ㅈㅅ", "ㄱㅅ", "ㅊㅋ", "ㅂㅂ", "ㄷㄷ", "ㅎㅇ", "ㅃㅃ"].includes(t)).length >= 2) q.push("chat-spelling");
    // the hand that never closes a sentence with a full stop
    const lines = text.split(/\n+/).filter((l) => l.trim().length > 6);
    if (lines.length >= 2 && lines.every((l) => !/[.。!！?？]$/.test(l.trim()))) q.push("no-period");
    return q;
  },
  themes: [
    { theme: "missing_someone", words: ["보고 싶", "보고싶", "그리워", "그립", "생각나", "떠났", "멀리", "없으니", "빈자리", "연락"] },
    { theme: "tired", words: ["피곤", "지치", "지쳐", "지쳤", "힘들", "녹초", "기진맥진", "졸려", "졸리", "번아웃", "탈진"] },
    { theme: "family", words: ["엄마", "아빠", "어머니", "아버지", "가족", "부모님", "형", "누나", "오빠", "언니", "동생", "할머니", "할아버지"] },
    { theme: "work", words: ["일이", "일을", "회사", "직장", "상사", "팀장", "부장", "회의", "사무실", "야근", "출근", "퇴근", "알바", "학교", "수업", "과제", "시험"] },
    { theme: "sleep", words: ["잠이", "잠을", "잠들", "못 자", "못잤", "불면", "새벽", "밤새", "침대", "이불", "깼", "깨어", "졸려", "졸리"] },
    { theme: "loneliness", words: ["혼자", "외로", "외롭", "쓸쓸", "아무도", "고독", "홀로", "혼자서"] },
    { theme: "friendship", words: ["친구", "절친", "베프", "우정", "동창", "친구들"] },
    { theme: "love", words: ["사랑", "좋아하", "짝사랑", "썸", "남친", "여친", "남자친구", "여자친구", "데이트", "키스", "연애", "전남친", "전여친", "헤어졌", "헤어지"] },
    { theme: "home", words: ["집에", "집이", "집으로", "집은", "본가", "자취", "방에", "부엌", "주방", "현관", "베란다", "원룸"] },
    { theme: "memory", words: ["추억", "기억", "생각나", "어릴 때", "어렸을", "옛날", "그때", "예전", "그 시절", "어린 시절"] },
    { theme: "future", words: ["미래", "언젠가", "계획", "내일", "다음 주", "내년", "희망", "앞으로", "나중에", "곧"] },
    { theme: "small_win", words: ["드디어", "해냈", "끝났", "끝냈", "성공", "뿌듯", "합격", "이겼", "통과", "완성"] },
    { theme: "uncertainty", words: ["아마", "모르겠", "잘 모르", "헷갈", "막막", "불안", "어떡하", "어떻게 해야", "고민", "갈팡질팡", "확신이 없"] },
  ],
};
