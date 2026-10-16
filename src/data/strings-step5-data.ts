import { strings } from "../lib/i18n";

/* THE DATA LAYER'S NEW WORDS (10a step 5, slice "data").
   ────────────────────────────────────────────────────────────────────────
   Why a write didn't go, when retrying can't help: the letter or the room
   is no longer reachable, or this account may not send. All nine languages: step 6 wrote
   the eight beside English as those languages. Registered by lib/fail, which is
   what shows them; screens that read the keys themselves (Today removing
   a letter it can't answer) import lib/fail anyway.

   Kept deliberately ambiguous between "they left" and "a block stands
   between you": the reader is never told they were blocked. An expired
   session reuses cp.signin.*, which all nine languages already have. */
strings(
  {
    // replying to a pool letter on Today (reply_to_letter refused it)
    "ld.unreachable.title": "This letter can't be answered",
    "ld.unreachable.body": "Its writer took it back or isn't here any more. It's off your desk now.",
    // writing into a correspondence that has closed
    "fail.closed.title": "This one has closed",
    "fail.closed.body": "There's no one at the other end any more. Everything already written stays here.",
    // the account may not send (0004 suspension)
    "fail.suspended.title": "Sending is paused",
    "fail.suspended.body": "This account can't send right now. If that seems wrong, write to us from Settings.",
    // the dismiss button beside "Sign in" on an expired-session alert
    "fail.notNow": "Not now",
  },
  /* ── es ── */
  {
    "ld.unreachable.title": "Ya no se puede responder a esta carta",
    "ld.unreachable.body": "Quien la escribió la retiró o ya no está por aquí. La quitamos de tu escritorio.",
    "fail.closed.title": "La puerta se cerró",
    "fail.closed.body": "Ya no hay nadie al otro lado. Todo lo escrito se queda aquí.",
    "fail.suspended.title": "Los envíos están en pausa",
    "fail.suspended.body": "Esta cuenta no puede enviar nada por ahora. Si crees que es un error, escríbenos desde Ajustes.",
    "fail.notNow": "Ahora no",
  },
  /* ── pt ── */
  {
    "ld.unreachable.title": "Não dá para responder esta carta",
    "ld.unreachable.body": "Quem escreveu retirou a carta ou não está mais aqui. Ela já saiu da sua mesa.",
    "fail.closed.title": "Esta correspondência chegou ao fim",
    "fail.closed.body": "Não há mais ninguém do outro lado. Tudo o que já foi escrito continua aqui.",
    "fail.suspended.title": "O envio está pausado",
    "fail.suspended.body": "Esta conta não pode enviar no momento. Se achar que é um engano, escreva para nós em Ajustes.",
    "fail.notNow": "Agora não",
  },
  /* ── id ── */
  {
    "ld.unreachable.title": "Surat ini tak bisa dibalas",
    "ld.unreachable.body": "Penulisnya menarik surat ini kembali, atau sudah tak ada di sini lagi. Surat itu sudah diangkat dari mejamu.",
    "fail.closed.title": "Yang ini sudah tertutup",
    "fail.closed.body": "Sudah tak ada siapa-siapa di ujung sana. Semua yang sudah ditulis tetap ada di sini.",
    "fail.suspended.title": "Pengiriman dijeda",
    "fail.suspended.body": "Akun ini sedang tak bisa mengirim. Kalau menurutmu ini keliru, tulis surat untuk kami lewat Pengaturan.",
    "fail.notNow": "Nanti saja",
  },
  /* ── fr ── */
  {
    "ld.unreachable.title": "On ne peut plus répondre à cette lettre",
    "ld.unreachable.body": "Son auteur l'a reprise ou n'est plus là. Elle a quitté ton bureau.",
    "fail.closed.title": "Cette correspondance est close",
    "fail.closed.body": "Il n'y a plus personne à l'autre bout. Tout ce que vous vous êtes écrit reste ici.",
    "fail.suspended.title": "L'envoi est en pause",
    "fail.suspended.body": "Ce compte ne peut rien envoyer pour le moment. Si tu penses que c'est une erreur, écris-nous depuis les Réglages.",
    "fail.notNow": "Pas maintenant",
  },
  /* ── de ── */
  {
    "ld.unreachable.title": "Dieser Brief lässt sich nicht beantworten",
    "ld.unreachable.body": "Er wurde zurückgenommen, oder wer ihn geschrieben hat, ist nicht mehr hier. Er ist jetzt von deinem Tisch verschwunden.",
    "fail.closed.title": "Dieser Briefwechsel ist geschlossen",
    "fail.closed.body": "Am anderen Ende ist niemand mehr. Alles, was schon geschrieben wurde, bleibt hier.",
    "fail.suspended.title": "Senden ist pausiert",
    "fail.suspended.body": "Dieses Konto kann gerade nichts senden. Wenn dir das falsch vorkommt, schreib uns über die Einstellungen.",
    "fail.notNow": "Nicht jetzt",
  },
  /* ── it ── */
  {
    "ld.unreachable.title": "A questa lettera non si può rispondere",
    "ld.unreachable.body": "Chi l'ha scritta l'ha ripresa, o non è più qui. È stata tolta dalla tua scrivania.",
    "fail.closed.title": "Questa corrispondenza è chiusa",
    "fail.closed.body": "Dall'altra parte non c'è più nessuno. Tutto quello che vi siete già scritti resta qui.",
    "fail.suspended.title": "Invio in pausa",
    "fail.suspended.body": "Al momento questo account non può inviare lettere. Se ti sembra un errore, scrivici dalle Impostazioni.",
    "fail.notNow": "Non ora",
  },
  /* ── ja ── */
  {
    "ld.unreachable.title": "この手紙には返事できません",
    "ld.unreachable.body": "書き手が手紙を取り下げたか、もうここにいません。机からは片づけておきました。",
    "fail.closed.title": "ここはもう閉まっています",
    "fail.closed.body": "向こう側には、もう誰もいません。これまでに書いたものは、すべてここに残ります。",
    "fail.suspended.title": "送信は一時停止中",
    "fail.suspended.body": "いまはこのアカウントから送信できません。間違いだと思ったら、設定の「わたしたちに書く」から知らせてください。",
    "fail.notNow": "あとで",
  },
  /* ── ko ── */
  {
    "ld.unreachable.title": "이 편지엔 답할 수 없어요",
    "ld.unreachable.body": "쓴 사람이 편지를 거뒀거나 더는 여기 없어요. 책상에서 치워 뒀어요.",
    "fail.closed.title": "이 대화는 닫혔어요",
    "fail.closed.body": "저편엔 이제 아무도 없어요. 이미 쓴 것은 모두 여기 남아요.",
    "fail.suspended.title": "보내기가 멈춰 있어요",
    "fail.suspended.body": "지금은 이 계정으로 보낼 수 없어요. 잘못된 것 같다면 설정에서 저희에게 써 주세요.",
    "fail.notNow": "나중에",
  },
);
