import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { View } from "react-native";
import { Introduction } from "../components/Introduction";
import { useWrenName } from "../lib/wren-name";
import { useAuth } from "../lib/auth";
import type { ThreadMessage } from "../lib/db";

/* dev only — the introduction ritual, with a made-up road, so it can be
   watched without waiting for two real signatures */
export default function IntroPreview() {
  const router = useRouter();
  const wren = useWrenName();
  const auth = useAuth();
  const [open, setOpen] = useState(true);
  if (!__DEV__) return <Redirect href="/" />;
  const day = (d: number, mine: boolean): ThreadMessage => ({ body: "…", mine, date: `2026-08-${String(d).padStart(2, "0")}T10:00:00Z`, kind: "text" } as ThreadMessage);
  const road = [day(2, true), day(4, false), day(6, true), day(9, false), day(11, true), day(12, false), day(15, true), day(18, false), day(20, true), day(24, false)];
  return (
    <View style={{ flex: 1 }}>
      <Introduction
        open={open}
        wren={wren}
        otherSeed="preview-other-3360"
        otherFace="f-02-tender-thinker"
        otherName="Marlow"
        otherArchetype="The Quiet Observer"
        myName={auth.handle || "fern"}
        road={road}
        mySeed={auth.user?.id || "me"}
        myFace={(auth.profile?.avatarId as string) || null}
        notice={{ stickerId: "straight_shooter", shared: true, supporting: 4, eligible: 5 }}
        since="2026-09-18T10:00:00Z"
        stamp="cant-sleep"
        onClose={() => {
          setOpen(false);
          router.back();
        }}
        onTalk={() => {
          setOpen(false);
          router.back();
        }}
      />
    </View>
  );
}
