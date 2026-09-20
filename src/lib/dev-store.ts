import type { Lang } from "./i18n";
import type { Aura } from "./aura";
import type { ResolvedSticker } from "./writing-engine/stickers";

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

export type DemoText = { letter: string; writeBack: string; compose: string; b1: string; b2: string; b3: string; b4: string; b5: string; ask: string; welcome: string; line: string; j2: string; j3: string; j4: string; j5: string; j6: string };

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
    j2: "I said no to something today and the world did not end. I keep checking. It really didn't.",
    j3: "3am thoughts, recorded so I'd stop thinking them.",
    j4: "Mum called. We talked about nothing for an hour. Nothing is my favourite thing to talk about with her.",
    j5: "Long day. The kind where nothing happens and you're tired anyway. Made soup, didn't eat it, ate toast standing up at the counter. I think I'm fine. I think that's the whole entry, and I think that's allowed.",
    j6: "the sea did that thing again. filmed it so I'd believe it later.",
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
    j2: "Hoy dije que no a algo y el mundo no se acabó. Sigo comprobándolo. De verdad que no.",
    j3: "Pensamientos de las 3 de la mañana, grabados para dejar de pensarlos.",
    j4: "Llamó mamá. Hablamos de nada durante una hora. Nada es mi tema favorito con ella.",
    j5: "Día largo. De esos en que no pasa nada y aun así acabas cansada. Hice sopa, no me la comí, comí tostadas de pie en la cocina. Creo que estoy bien. Creo que esa es toda la entrada, y creo que se puede.",
    j6: "el mar volvió a hacer eso. lo grabé para creérmelo después.",
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
    j2: "Hoje eu disse não a uma coisa e o mundo não acabou. Fico conferindo. Não acabou mesmo.",
    j3: "Pensamentos das 3 da manhã, gravados para eu parar de pensar neles.",
    j4: "Mãe ligou. Falamos de nada por uma hora. Nada é meu assunto favorito com ela.",
    j5: "Dia longo. Daqueles em que nada acontece e mesmo assim você acaba cansada. Fiz sopa, não comi, comi torrada em pé na pia. Acho que estou bem. Acho que isso é a entrada inteira, e acho que pode.",
    j6: "o mar fez aquilo de novo. filmei pra acreditar depois.",
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
    j2: "Hari ini aku bilang tidak pada sesuatu dan dunia tidak kiamat. Aku terus mengecek. Benar-benar tidak.",
    j3: "Pikiran jam 3 pagi, direkam supaya berhenti kupikirkan.",
    j4: "Ibu telepon. Kami ngobrol soal bukan apa-apa selama sejam. Bukan apa-apa itu topik favoritku dengannya.",
    j5: "Hari yang panjang. Yang tidak ada apa-apanya tapi tetap capek. Bikin sup, tidak dimakan, makan roti panggang sambil berdiri di dapur. Kurasa aku baik-baik saja. Kurasa itu seluruh catatannya, dan kurasa itu boleh.",
    j6: "laut melakukan hal itu lagi. kurekam supaya nanti percaya.",
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
    j2: "Aujourd'hui j'ai dit non à quelque chose et le monde ne s'est pas arrêté. Je vérifie encore. Vraiment pas.",
    j3: "Pensées de 3h du matin, enregistrées pour arrêter d'y penser.",
    j4: "Maman a appelé. On a parlé de rien pendant une heure. Rien, c'est mon sujet préféré avec elle.",
    j5: "Longue journée. De celles où il ne se passe rien et où on est fatiguée quand même. J'ai fait une soupe, je ne l'ai pas mangée, j'ai mangé une tartine debout dans la cuisine. Je crois que ça va. Je crois que c'est toute l'entrée, et je crois qu'on a le droit.",
    j6: "la mer a encore fait ce truc. je l'ai filmé pour y croire plus tard.",
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
    j2: "Heute habe ich zu etwas Nein gesagt, und die Welt ist nicht untergegangen. Ich prüfe es immer wieder. Ist sie wirklich nicht.",
    j3: "Gedanken um 3 Uhr nachts, aufgenommen, damit ich sie nicht mehr denken muss.",
    j4: "Mama hat angerufen. Wir haben eine Stunde über nichts geredet. Nichts ist mein Lieblingsthema mit ihr.",
    j5: "Langer Tag. So einer, an dem nichts passiert und man trotzdem müde ist. Suppe gekocht, nicht gegessen, Toast im Stehen an der Küchenzeile gegessen. Ich glaube, es geht mir gut. Ich glaube, das ist der ganze Eintrag, und ich glaube, das darf so sein.",
    j6: "das Meer hat es wieder getan. gefilmt, damit ich es später glaube.",
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
    j2: "Oggi ho detto di no a una cosa e il mondo non è finito. Continuo a controllare. Davvero no.",
    j3: "Pensieri delle 3 di notte, registrati per smettere di pensarli.",
    j4: "Ha chiamato mamma. Abbiamo parlato di niente per un'ora. Il niente è il mio argomento preferito con lei.",
    j5: "Giornata lunga. Di quelle in cui non succede niente e sei stanca lo stesso. Ho fatto la zuppa, non l'ho mangiata, ho mangiato un toast in piedi in cucina. Credo di stare bene. Credo che sia tutta qui la pagina, e credo che si possa.",
    j6: "il mare ha rifatto quella cosa. l'ho filmato per crederci dopo.",
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
    j2: "今日、あることに「いいえ」と言った。世界は終わらなかった。何度も確かめている。本当に終わらなかった。",
    j3: "午前3時の考えごと。考えるのをやめるために録音した。",
    j4: "母から電話。一時間、何でもないことを話した。何でもないことが、母と話すいちばん好きな話題。",
    j5: "長い一日。何も起きないのに疲れる種類の。スープを作って、食べなくて、台所で立ったままトーストを食べた。たぶん大丈夫。たぶんこれが今日の全部で、たぶんそれでいい。",
    j6: "海がまたあれをやった。あとで信じられるように撮った。",
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
    j2: "오늘 어떤 일에 아니라고 말했는데 세상이 끝나지 않았다. 계속 확인하고 있다. 정말 안 끝났다.",
    j3: "새벽 3시의 생각들. 그만 생각하려고 녹음했다.",
    j4: "엄마가 전화했다. 한 시간 동안 아무것도 아닌 얘기를 했다. 아무것도 아닌 것이 엄마랑 하는 얘기 중 제일 좋다.",
    j5: "긴 하루. 아무 일도 없는데 그래도 피곤한 종류의. 국을 끓였고, 안 먹었고, 부엌에 서서 토스트를 먹었다. 괜찮은 것 같다. 이게 오늘 일기의 전부인 것 같고, 그래도 되는 것 같다.",
    j6: "바다가 또 그걸 했다. 나중에 믿으려고 찍어 뒀다.",
  },
};

/* a formed Writing Aura for the Me and Aura shots — the "named" rung of
   app/aura-preview, so the card is what a reader sees after fourteen
   letters rather than a guest's two */
const stk = (stickerId: string, dimension: string, state: ResolvedSticker["state"], supporting = 4, eligible = 5): ResolvedSticker =>
  ({ stickerId, traitId: "concrete_detail", dimension, state, supporting, eligible, evidence: [], since: "2026-09-10" }) as unknown as ResolvedSticker;
export function storeAura(): Aura {
  const home = [stk("detail_collector", "vocabulary", "established", 5, 5), stk("straight_shooter", "sentence", "established"), stk("quiet_type", "emotion", "established")];
  const texts = Object.values(DEMO_TEXT).flatMap((d) => [d.letter, d.compose, d.b2, d.b4]);
  return {
    phase: "formed",
    pieces: 15,
    texts,
    pieceText: {},
    lastWrittenAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    formed: 0.8,
    dims: [],
    locked: [],
    sealed: [],
    sources: { letters: 14, sealed: 0, conversations: 0 },
    usage: ["night_writer"].map((id) => ({ id, group: "time", private: false, n: 3 })),
    stickers: { home, byDimension: Object.fromEntries(home.map((h) => [h.dimension, h])), board: home, title: { state: "formed", noun: "observer", adjective: "quiet", basis: [] } },
  } as unknown as Aura;
}
