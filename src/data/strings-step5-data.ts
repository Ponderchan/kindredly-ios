import { strings } from "../lib/i18n";

/* THE DATA LAYER'S NEW WORDS (10a step 5, slice "data").
   ────────────────────────────────────────────────────────────────────────
   Why a write didn't go, when retrying can't help: the letter or the room
   is no longer reachable, or this account may not send. English only for
   now — step 6 writes the eight other languages as those languages, and
   t() falls back to English until then. Registered by lib/fail, which is
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
  {},
  {},
  {},
);
