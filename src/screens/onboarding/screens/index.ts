import type { ComponentType } from "react";
import type { ScreenId } from "../flow";
import type { ObScreenProps } from "../types";
import S01Doorstep from "./S01Doorstep";
import S02Egg from "./S02Egg";
import S03Birthday from "./S03Birthday";
import S04Pronoun from "./S04Pronoun";
import S05Face from "./S05Face";
import S06Envelope from "./S06Envelope";
import S07Letter from "./S07Letter";
import S08Stamp from "./S08Stamp";
import S09Hatch from "./S09Hatch";
import S10Name from "./S10Name";
import S11Address from "./S11Address";
import S12Flight from "./S12Flight";
import S13Knock from "./S13Knock";

/* THE SCREEN REGISTRY: one component per screen of the storyboard, each in
   its own file, each owned by one screen agent (CONTRACT.md). A side state
   is drawn by its screen's component (props.side), not registered here. */
export const SCREEN_COMPONENTS: Readonly<Record<ScreenId, ComponentType<ObScreenProps>>> = {
  doorstep: S01Doorstep,
  egg: S02Egg,
  birthday: S03Birthday,
  pronoun: S04Pronoun,
  face: S05Face,
  envelope: S06Envelope,
  letter: S07Letter,
  stamp: S08Stamp,
  hatch: S09Hatch,
  name: S10Name,
  address: S11Address,
  flight: S12Flight,
  knock: S13Knock,
};
