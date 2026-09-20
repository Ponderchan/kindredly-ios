import type { Lang } from "./i18n";

/* STORE MODE — dev builds only (owner, 2026-09-20: "take the screenshots
   yourself"). The route /dev-store?l=xx switches the language, turns this
   on, and the screens that have demo data show it — in that language —
   regardless of what the account holds. Nothing here ships: every use is
   behind __DEV__, and the demo text is only what the six store screens
   need. */

export let storeMode = false;
export let storePhotos: { uri: string; ratio: number }[] = [];

export function setStoreMode(on: boolean): void {
  storeMode = on;
}
export function setStorePhotos(p: { uri: string; ratio: number }[]): void {
  storePhotos = p;
}

export type DemoText = { letter: string; writeBack: string; compose: string; b1: string; b2: string; b3: string; b4: string; b5: string; ask: string; welcome: string; line: string };

export const DEMO_TEXT: Record<Lang, DemoText> = {
  en: {
    letter: "My mother sold the house last month. I found out from my sister, in a text, between two other texts about nothing at all. Everyone keeps saying it's just a house, as if a house were a small thing, as if I hadn't learned to read at that table.",
    writeBack: "I read this twice on the bus and missed my stop.",
    compose: "I keep a list of things I would say to you if you were still here. It's getting long. Today I added the thing about the kettle, which you would have found stupid, which is why I added it.",
    b1: "So it turns out we both kept the box marked KITCHEN. Solidarity.",
    b2: "Still not unpacked. Three years. I think it's load-bearing now.",
    b3: "Ours has a burn mark shaped like Portugal on the table inside it.",
    b4: "Mine has my initials under the lid. I checked before the move. Still there.",
    b5: "That's the whole letter, isn't it. Two people who never unpacked a box.",
    ask: "when do I get to see who they are?",
    welcome: "Welcome. I'm Wren, the courier. I carry every letter here. This is where I'll say so when something in Kindredly changes, and where you can write to the people who make it.",
    line: "the light did this on the kitchen wall for exactly four minutes",
  },
  es: {
    letter: "Mi madre vendió la casa el mes pasado. Me enteré por mi hermana, en un mensaje, entre otros dos mensajes sobre nada. Todos siguen diciendo que es solo una casa, como si una casa fuera poca cosa, como si yo no hubiera aprendido a leer en esa mesa.",
    writeBack: "Lo leí dos veces en el bus y me pasé de parada.",
    compose: "Tengo una lista de cosas que te diría si siguieras aquí. Se está haciendo larga. Hoy añadí lo de la tetera, que te habría parecido una tontería, y por eso lo añadí.",
    b1: "Resulta que los dos guardamos la caja que dice COCINA. Solidaridad.",
    b2: "Sigue sin desempacar. Tres años. Creo que ya sostiene la casa.",
    b3: "La nuestra tiene una quemadura con forma de Portugal en la mesa de dentro.",
    b4: "La mía tiene mis iniciales bajo la tapa. Lo comprobé antes de la mudanza. Siguen ahí.",
    b5: "Esa es toda la carta, ¿no? Dos personas que no quieren desempacar una caja.",
    ask: "¿cuándo puedo ver quién es?",
    welcome: "Bienvenido. Soy Wren, la mensajera. Llevo todas las cartas de aquí. Aquí avisaré cuando algo cambie en Kindredly, y aquí puedes escribirles a las personas que lo hacen.",
    line: "la luz hizo esto en la pared de la cocina durante exactamente cuatro minutos",
  },
  pt: {
    letter: "Minha mãe vendeu a casa mês passado. Fiquei sabendo pela minha irmã, numa mensagem, entre outras duas mensagens sobre nada. Todo mundo fica dizendo que é só uma casa, como se casa fosse pouca coisa, como se eu não tivesse aprendido a ler naquela mesa.",
    writeBack: "Li duas vezes no ônibus e perdi o ponto.",
    compose: "Tenho uma lista de coisas que eu te diria se você ainda estivesse aqui. Está ficando longa. Hoje acrescentei a da chaleira, que você acharia uma bobagem, e por isso acrescentei.",
    b1: "Então a gente dois guardou a caixa escrita COZINHA. Solidariedade.",
    b2: "Ainda sem desempacotar. Três anos. Acho que agora ela sustenta a casa.",
    b3: "A nossa tem uma marca de queimado em forma de Portugal na mesa lá dentro.",
    b4: "A minha tem minhas iniciais embaixo da tampa. Conferi antes da mudança. Ainda estão lá.",
    b5: "É a carta inteira, né. Duas pessoas que não querem desempacotar uma caixa.",
    ask: "quando eu vou ver quem é?",
    welcome: "Bem-vindo. Sou a Wren, a mensageira. Levo todas as cartas daqui. É aqui que aviso quando algo muda no Kindredly, e onde você pode escrever para as pessoas que fazem o app.",
    line: "a luz fez isso na parede da cozinha por exatamente quatro minutos",
  },
  id: {
    letter: "Ibuku menjual rumah bulan lalu. Aku tahu dari kakakku, lewat pesan, di antara dua pesan lain tentang hal yang tak penting. Semua orang terus bilang itu cuma rumah, seolah rumah itu hal kecil, seolah aku tidak belajar membaca di meja itu.",
    writeBack: "Kubaca dua kali di bus sampai kelewatan halte.",
    compose: "Aku menyimpan daftar hal yang akan kukatakan padamu kalau kamu masih di sini. Makin panjang. Hari ini kutambah soal ketel, yang pasti kamu anggap konyol, dan justru karena itu kutambahkan.",
    b1: "Ternyata kita berdua sama-sama menyimpan kardus bertulis DAPUR. Solidaritas.",
    b2: "Masih belum dibongkar. Tiga tahun. Kurasa sekarang dia menyangga rumah.",
    b3: "Punyaku ada bekas gosong berbentuk Portugal di meja di dalamnya.",
    b4: "Punyaku ada inisialku di bawah tutupnya. Kucek sebelum pindahan. Masih ada.",
    b5: "Itu seluruh suratnya, kan. Dua orang yang kardusnya tidak dibongkar.",
    ask: "kapan aku bisa lihat siapa dia?",
    welcome: "Selamat datang. Aku Wren, kurirnya. Aku membawa setiap surat di sini. Di sinilah aku memberi tahu kalau ada yang berubah di Kindredly, dan di sini kamu bisa menulis ke orang-orang yang membuatnya.",
    line: "cahaya bikin begini di dinding dapur selama tepat empat menit",
  },
  fr: {
    letter: "Ma mère a vendu la maison le mois dernier. Je l'ai appris par ma sœur, par texto, entre deux autres textos qui ne parlaient de rien. Tout le monde répète que ce n'est qu'une maison, comme si une maison était une petite chose, comme si je n'avais pas appris à lire à cette table.",
    writeBack: "Je l'ai lue deux fois dans le bus et j'ai raté mon arrêt.",
    compose: "Je tiens une liste des choses que je te dirais si tu étais encore là. Elle s'allonge. Aujourd'hui j'ai ajouté l'histoire de la bouilloire, que tu aurais trouvée idiote, et c'est pour ça que je l'ai ajoutée.",
    b1: "Donc on a tous les deux gardé le carton marqué CUISINE. Solidarité.",
    b2: "Toujours pas déballé. Trois ans. Je crois qu'il porte la maison maintenant.",
    b3: "Le nôtre a une brûlure en forme de Portugal sur la table qui est dedans.",
    b4: "Le mien a mes initiales sous le couvercle. J'ai vérifié avant le déménagement. Toujours là.",
    b5: "C'est toute la lettre, non ? Deux personnes qui n'ont jamais déballé un carton.",
    ask: "quand est-ce que je vois qui c'est ?",
    welcome: "Bienvenue. Je suis Wren, la messagère. Je porte toutes les lettres d'ici. C'est ici que je le dirai quand quelque chose change dans Kindredly, et ici que tu peux écrire à ceux qui le font.",
    line: "la lumière a fait ça sur le mur de la cuisine pendant exactement quatre minutes",
  },
  de: {
    letter: "Meine Mutter hat letzten Monat das Haus verkauft. Ich habe es von meiner Schwester erfahren, per Nachricht, zwischen zwei anderen Nachrichten über gar nichts. Alle sagen dauernd, es sei nur ein Haus, als wäre ein Haus eine Kleinigkeit, als hätte ich nicht an diesem Tisch lesen gelernt.",
    writeBack: "Zweimal im Bus gelesen und die Haltestelle verpasst.",
    compose: "Ich führe eine Liste mit Dingen, die ich dir sagen würde, wenn du noch da wärst. Sie wird lang. Heute kam die Sache mit dem Wasserkocher dazu, die du albern gefunden hättest, und genau deshalb steht sie jetzt drauf.",
    b1: "Wir haben also beide den Karton mit KÜCHE drauf behalten. Solidarität.",
    b2: "Immer noch nicht ausgepackt. Drei Jahre. Ich glaube, er trägt inzwischen das Haus.",
    b3: "In unserem liegt der Tisch mit dem Brandfleck in Form von Portugal.",
    b4: "In meinem stehen meine Initialen unter dem Deckel. Vor dem Umzug nachgesehen. Noch da.",
    b5: "Das ist der ganze Brief, oder? Zwei Leute, die einen Karton nie ausgepackt haben.",
    ask: "wann sehe ich, wer das ist?",
    welcome: "Willkommen. Ich bin Wren, die Botin. Ich trage hier jeden Brief. Hier sage ich es, wenn sich in Kindredly etwas ändert, und hier kannst du den Leuten schreiben, die es machen.",
    line: "das Licht hat das genau vier Minuten lang an der Küchenwand gemacht",
  },
  it: {
    letter: "Mia madre ha venduto la casa il mese scorso. L'ho saputo da mia sorella, in un messaggio, tra altri due messaggi sul nulla. Tutti continuano a dire che è solo una casa, come se una casa fosse una cosa da poco, come se non avessi imparato a leggere a quel tavolo.",
    writeBack: "L'ho letta due volte sul bus e ho perso la fermata.",
    compose: "Tengo una lista di cose che ti direi se fossi ancora qui. Si sta allungando. Oggi ho aggiunto quella del bollitore, che avresti trovato stupida, ed è per questo che l'ho aggiunta.",
    b1: "Quindi abbiamo tenuto entrambi lo scatolone con scritto CUCINA. Solidarietà.",
    b2: "Ancora da aprire. Tre anni. Credo che ormai regga la casa.",
    b3: "Nel nostro c'è il tavolo con la bruciatura a forma di Portogallo.",
    b4: "Nel mio ci sono le mie iniziali sotto il coperchio. Ho controllato prima del trasloco. Ci sono ancora.",
    b5: "È tutta qui la lettera, no? Due persone che non vogliono aprire uno scatolone.",
    ask: "quando vedo chi è?",
    welcome: "Benvenuto. Sono Wren, la messaggera. Porto ogni lettera di qui. È qui che lo dico quando qualcosa cambia in Kindredly, e qui puoi scrivere alle persone che lo fanno.",
    line: "la luce ha fatto così sul muro della cucina per esattamente quattro minuti",
  },
  ja: {
    letter: "先月、母が家を売った。妹からの一通のメッセージで知った。どうでもいい二通のメッセージのあいだに挟まって。みんな「ただの家でしょ」と言い続ける。家が小さなものであるかのように。私があのテーブルで字を覚えたことなんて、なかったかのように。",
    writeBack: "バスの中で二度読んで、降りる駅を乗り過ごした。",
    compose: "あなたがまだここにいたら言うことのリストを持っている。だんだん長くなる。今日はやかんのことを足した。あなたなら「くだらない」と言っただろうから、足した。",
    b1: "つまり、ふたりとも「台所」と書いた箱をそのまま取ってあるわけだ。連帯。",
    b2: "まだ開けてない。三年。もう家を支えてる気がする。",
    b3: "うちのは、中のテーブルにポルトガルの形の焦げ跡がある。",
    b4: "私のは、蓋の裏にイニシャル。引っ越しの前に確かめた。まだあった。",
    b5: "それがこの手紙のすべてだよね。箱を開けないふたり。",
    ask: "相手が誰か、いつ見られるの?",
    welcome: "ようこそ。伝書鳥の Wren です。ここのすべての手紙を運んでいます。Kindredly に変化があったらここで伝えます。つくっている人たちに書くのもここから。",
    line: "台所の壁に、光がきっかり四分間だけこうしていた",
  },
  ko: {
    letter: "지난달 엄마가 집을 팔았다. 언니의 문자로 알았다. 아무것도 아닌 문자 두 개 사이에 끼어서. 다들 그냥 집일 뿐이라고 한다. 집이 작은 것이라도 되는 것처럼, 내가 그 식탁에서 글을 배운 적이 없는 것처럼.",
    writeBack: "버스에서 두 번 읽다가 내릴 정류장을 놓쳤어요.",
    compose: "네가 아직 여기 있다면 해 줄 말들의 목록을 갖고 있어. 점점 길어져. 오늘은 주전자 얘기를 더했어. 너라면 유치하다고 했겠지. 그래서 더했어.",
    b1: "그러니까 우리 둘 다 '부엌'이라고 쓴 상자를 그대로 뒀다는 거네. 연대.",
    b2: "아직도 안 풀었어. 삼 년. 이제 집을 떠받치고 있는 것 같아.",
    b3: "우리 건 안에 든 식탁에 포르투갈 모양 탄 자국이 있어.",
    b4: "내 건 뚜껑 밑에 내 이니셜이 있어. 이사 전에 확인했어. 아직 있더라.",
    b5: "그게 이 편지의 전부지, 그렇지? 상자를 안 여는 두 사람.",
    ask: "상대가 누군지 언제 볼 수 있어요?",
    welcome: "환영해요. 저는 전령새 Wren이에요. 여기 모든 편지를 제가 날라요. Kindredly에 변화가 있으면 여기서 말할게요. 만드는 사람들에게 쓰는 것도 여기서.",
    line: "부엌 벽에 빛이 딱 사 분 동안 이렇게 있었다",
  },
};
