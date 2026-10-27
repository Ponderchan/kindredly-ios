/* Behaviour lock for the update prompt's parcel scene (components/update-parcel): the geometry and
   the beats both renderers draw from. Not wired to a runner; run by hand from the repo root:
     node src/components/update-parcel.test.ts */

import { BEATS, CARRY, FLY_FEET, PARCEL_ART, PARCEL_ART_RECORD, PERCH_FEET, PH, PIVOTS, PW, S, SCENE_H, STAMP, STARS, UPDATE_BANNER_ROOM, parcelSceneRecord, sceneGeometry, sceneWidth } from "./update-parcel.ts";

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

const W = sceneWidth(393); // an iPhone 15/16/17
const g = sceneGeometry(W);

ok("the scene is the window less the card's 8 on each side", W === 377);
ok("the parcel stands centred", near(g.restX + PW / 2, W / 2));
ok("its foot is on the ground (the box's foot at y 96)", near(g.restY + 96, g.ground));
ok("the ground is 14 over the scene's foot", g.ground === SCENE_H - 14);
ok("perched, her feet are on the lid, centred", near(g.perchX + PERCH_FEET.x, W / 2) && near(g.perchY + PERCH_FEET.y, g.restY + 9));
ok("landing, her flying feet come down where her perched feet stand", near(g.landX + FLY_FEET.x, W / 2) && near(g.landY + FLY_FEET.y, g.restY + 9));
ok("hovering, the parcel hangs from her feet 26 over its rest", near(g.hoverX + CARRY.dx, g.restX) && near(g.hoverY + CARRY.dy, g.restY - 26));
ok("she starts beyond the top right corner", g.startX > W && g.startY + S < 0);
ok("she rides the parcel's shake about its foot", near(g.perchX + g.perchOrigin[0], g.restX + PIVOTS.foot.x) && near(g.perchY + g.perchOrigin[1], g.ground));
ok("the stamp sits on the front, inside the box", STAMP.x >= 4 && STAMP.x + STAMP.w <= 116 && STAMP.y >= 26 && STAMP.y + STAMP.h <= 96 && PH === 100);
ok("an SE's scene is laid out the same way", (() => {
  const se = sceneGeometry(sceneWidth(375));
  return near(se.restX + PW / 2, 359 / 2) && se.restY === g.restY;
})());

ok("the arrival lands before the first shake", BEATS.start + BEATS.fly + BEATS.hover + BEATS.land + BEATS.settle < BEATS.start + BEATS.fly + BEATS.hover + BEATS.land + BEATS.firstShake);
ok("her curious look ends before the next shake can come", BEATS.curious < BEATS.shakeEvery[0]);
ok("every star finishes inside the burst", STARS.every((s) => s.delay + BEATS.starRun <= BEATS.stars));
ok("the App Store opens once the bow, the flaps and the hop are done", BEATS.open >= BEATS.bow && BEATS.open >= BEATS.flapDelay + BEATS.flap && BEATS.open >= 200 + 260);
ok("the banner's room is its 42 and the air round it", UPDATE_BANNER_ROOM === 4 + 42 + 6);

/* ── what Swift is sent ── */
{
  const r = parcelSceneRecord(W);
  ok("Swift's scene is the same geometry", r.restX === g.restX && r.perchY === g.perchY && r.landX === g.landX && r.startY === g.startY && r.ground === g.ground);
  ok("…with her shake pivot", r.perchOriginX === g.perchOrigin[0] && r.perchOriginY === g.perchOrigin[1]);
  ok("…the same beats", r.start === BEATS.start && r.land === BEATS.land && r.shakeMin === BEATS.shakeEvery[0] && r.shakeMax === BEATS.shakeEvery[1] && r.starRun === BEATS.starRun);
  ok("…and every star, with its tone", r.starList.length === STARS.length && r.starList.every((s, i) => s.tone === STARS[i].tone && s.delay === STARS[i].delay));
  ok("…in a record with no undefined field", Object.values(r).every((v) => v !== undefined));
  const a = PARCEL_ART_RECORD;
  ok("Swift's drawing is the same paths", a.front === PARCEL_ART.front && a.bowLoops === PARCEL_ART.bowLoops && a.star === PARCEL_ART.star);
  ok("…the stamp with a radius (a record field can't be missing)", a.stamp.r === 0 && a.stamp.w === STAMP.w);
  ok("…and the pivots", a.foot.x === PIVOTS.foot.x && a.knotPivot.y === PIVOTS.knot.y && a.flapRHinge.x === PIVOTS.flapR.x);
}

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
