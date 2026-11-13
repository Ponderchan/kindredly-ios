-- Wren's desk · the 1.0.9 post (what's new). Run ONCE in the Supabase SQL editor, and only
-- after 1.0.9 is approved AND live in the App Store (it says what's in 1.0.9; earlier builds get it too).
-- knock = true: every device with a push token gets it once; the push is the post's first line, in
-- the reader's language. The link makes 1.0.9 (binary 1.2.8) play its what's-new reel under the post
-- (news-reel/v1-0-9, only while the switches meplanet and afterfifteen are on); older builds show
-- the words alone, which is why they say what changed on their own.
-- Same day, suggested: turn the update prompt on for the older binaries (app_surfaces update_prompt).
-- Written natively in eight languages and read blind by native editors (2026-11-13).
insert into public.wren_posts (kind, body, body_i18n, link, knock)
values (
  'update',
$en$new version's out. i have a bedtime now.

ten letters a day, then today closes till 8. me opens on my planet, a stamp for every letter i've carried. and the new blue icon? that's me.$en$,
  jsonb_build_object(
    'es', $es$hay versión nueva. ya tengo hora de dormir.

diez cartas al día y luego Hoy cierra hasta las 8. la pestaña Yo ahora se abre en mi planeta, con un sello por cada carta que llevé. ¿y el ícono azul nuevo? soy yo.$es$,
    'pt', $pt$saiu versão nova. agora tenho hora de dormir.

dez cartas por dia, depois o Hoje fecha até as 8. a aba Eu agora abre direto no meu planeta, com um selo pra cada carta que eu entreguei. e o ícone azul novo? sou eu.$pt$,
    'id', $id$ada update baru. sekarang aku punya jam tidur.

sepuluh surat sehari, abis itu tab Hari ini tutup sampai jam 8 pagi. tab Saya sekarang langsung kebuka di planetku, satu perangko buat tiap surat yang udah kuantar. terus ikon biru yang baru? itu aku.$id$,
    'fr', $fr$nouvelle version dispo. j'ai une heure de coucher.

dix lettres par jour, puis Aujourd'hui ferme jusqu'à 8 h. l'onglet Moi s'ouvre maintenant sur ma planète, avec un timbre pour chaque lettre que j'ai livrée. et la nouvelle icône bleue ? c'est moi.$fr$,
    'de', $de$update ist da. jetzt hab ich ne schlafenszeit.

zehn briefe am tag, dann ist Heute bis 8 zu. im tab Ich wartet jetzt mein planet, mit einer briefmarke für jeden brief, den ich ausgetragen hab. und das neue blaue icon? das bin ich.$de$,
    'it', $it$è uscito l'aggiornamento. ora ho il coprifuoco.

dieci lettere al giorno, poi Oggi chiude fino alle 8. la scheda Io adesso si apre sul mio pianeta, con un francobollo per ogni lettera che ho consegnato. e la nuova icona blu? sono io.$it$,
    'ja', $ja$アプデきた。わたし、寝る時間決まった

手紙は1日10通まで。そのあと「今日」は朝8時までおやすみ。「わたし」タブを開くと、わたしの星。運んだ手紙の数だけ切手が貼ってある。で、新しいアイコン。青いとこからのぞいてるの、わたし。$ja$,
    'ko', $ko$업데이트 나왔어. 나 이제 통금 생겼어.

편지는 하루 10통까지. 그다음엔 ‘오늘’ 탭이 아침 8시까지 문 닫아. ‘나’ 탭을 열면 이제 내 행성부터 나와. 내가 배달한 편지마다 우표가 하나씩 붙어 있어. 아이콘도 바뀌었어. 파란 데서 빼꼼 보는 거, 나야.$ko$
  ),
  'kindredly:///news/1.0.9',
  true
);
