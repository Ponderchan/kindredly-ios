/* THE CHAT ROW (owner, 2026-10-11: "all 下面的那些 chats 做成 2a 一样的，不要区分
   wren"). One look for every row under ALL — Wren's, a kindred's, a pen
   pal's — taken from the prototype (design 2a): a 52pt round face, the name
   and the time on one line, two lines of their last words under it, a blue
   badge when it's on you, a hairline that starts where the words do. The
   colours are the prototype's own. */
export const ROW = {
  ink: "#1E1B35",
  muted: "#7A7694",
  time: "#8A86A3",
  line: "#EEEDF5",
  blue: "#3A34D6",
  palBg: "#F1F0F8",
  wrenBg: "#EEEDFB",
  face: 52,
  gap: 14,
  pad: 16,
} as const;

export const rowName = { fontSize: 17, fontWeight: "600" as const, color: ROW.ink };
export const rowTime = (on: boolean) => ({ fontSize: 13, color: on ? ROW.blue : ROW.time });
export const rowPreview = { fontSize: 15, lineHeight: 20, color: ROW.muted };
export const rowBadge = { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: ROW.blue, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 2 };
export const rowBadgeText = { fontSize: 12, fontWeight: "600" as const, color: "#FFFFFF" };
