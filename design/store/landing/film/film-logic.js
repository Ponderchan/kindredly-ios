/* The landing film's beats (web app/film/Film.jsx), on a clock this page owns.
   Timers, rAF, CSS animations and transitions all follow __advance(ms), so a
   frame is the same every time it is rendered; every hit is logged in
   __events for the sound track. The first beat is the poster. */
(function () {
  /* ── the clock ─────────────────────────────────────────────────────────── */
  let NOW = 0, seq = 0;
  const Q = [];
  window.setTimeout = (fn, ms) => { const id = ++seq; Q.push({ id, t: NOW + Math.max(0, +ms || 0), fn }); return id; };
  window.clearTimeout = (id) => { const i = Q.findIndex((x) => x.id === id); if (i >= 0) Q.splice(i, 1); };
  window.requestAnimationFrame = (fn) => window.setTimeout(() => fn(NOW), 16);
  const starts = new WeakMap();
  const sync = () => { for (const a of document.getAnimations()) { if (!starts.has(a)) { starts.set(a, NOW); a.pause(); } a.currentTime = Math.max(0, NOW - starts.get(a)); } };
  window.__advance = (ms) => {
    const end = NOW + ms;
    for (;;) {
      Q.sort((a, b) => a.t - b.t || a.id - b.id);
      const n = Q[0];
      if (!n || n.t > end) break;
      Q.shift(); NOW = n.t; sync();
      try { n.fn(); } catch (e) { console.error(e); }
      sync();
    }
    NOW = end; sync();
    return NOW;
  };
  const EV = (window.__events = []);
  const ev = (type, at, extra) => EV.push(Object.assign({ t: +(((at == null ? NOW : at)) / 1000).toFixed(3), type }, extra || {}));

  /* ── the film (as Film.jsx, data from DATA) ─────────────────────────────── */
  const NS = "http://www.w3.org/2000/svg";
  const TAG = { p: "path", c: "circle", e: "ellipse", r: "rect" };
  const isKeyline = (c) => !!c && /^#(fff|ffffff)$/i.test(String(c).trim());
  function shapes(list, vb, px, keylines) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + vb + " " + vb); svg.setAttribute("aria-hidden", "true");
    if (px) { svg.setAttribute("width", px); svg.setAttribute("height", px); }
    (list || []).forEach((sh) => {
      const e = document.createElementNS(NS, TAG[sh.t]);
      if (sh.t === "p") e.setAttribute("d", sh.d);
      if (sh.t === "c") { e.setAttribute("cx", sh.cx); e.setAttribute("cy", sh.cy); e.setAttribute("r", sh.r); }
      if (sh.t === "e") { e.setAttribute("cx", sh.cx); e.setAttribute("cy", sh.cy); e.setAttribute("rx", sh.rx); e.setAttribute("ry", sh.ry); }
      if (sh.t === "r") { e.setAttribute("x", sh.x); e.setAttribute("y", sh.y); e.setAttribute("width", sh.w); e.setAttribute("height", sh.h); if (sh.rx) e.setAttribute("rx", sh.rx); }
      if (sh.f) e.setAttribute("fill", sh.f);
      // her body keyline (white) is never drawn: no white ring on the courier
      if (sh.s && (keylines || !isKeyline(sh.s))) { e.setAttribute("stroke", sh.s); if (sh.sw) e.setAttribute("stroke-width", sh.sw); }
      if (sh.lc) e.setAttribute("stroke-linecap", sh.lc);
      if (sh.lj) e.setAttribute("stroke-linejoin", sh.lj);
      if (sh.o) e.setAttribute("opacity", sh.o);
      if (sh.tf) e.setAttribute("transform", sh.tf);
      if (sh.da) e.setAttribute("stroke-dasharray", sh.da);
      svg.appendChild(e);
    });
    return svg;
  }
  const wrenSym = (key, px) => shapes(DATA.wren[key] || DATA.wren["adult-happy"], 200, px, false);
  const FLY_EMPTY = (DATA.wren.fly || []).slice(0, -3);
  const artSvg = (id) => shapes(DATA.art[id], 64, 0, true);
  const T = () => DATA.fz;
  const $ = (id) => document.getElementById(id);

  const film = $("film"), filmPh = $("filmPh");
  const CANDY = ["#FFD84A", "#FF9ACB", "#8FEBC0", "#BDB5FF", "#C3E84F", "#FF9E5E"];
  const MONT = ["situationship", "overthinking", "hot-take", "not-over-it", "cringe", "tiny-win"];
  const MONT_G = ["pink", "lilac", "orange", "butter", "mint", "acid"];
  const GROUND = { butter: "#FFD84A", pink: "#FF9ACB", lilac: "#BDB5FF", mint: "#8FEBC0", acid: "#C3E84F", orange: "#FF9E5E", grey: "#D8D5E2", bird: "#5757EC", ink: "#1E1B35", launch: "#ECECFE", sky: "#8FCBFF" };
  const stage = $("fzStage"), touch = $("fzTouch"), bird = $("fzBird"), birdIn = $("fzBirdIn"), say = $("fzSay"), slam = $("fzSlam"), small = $("fzSmall"), burst = $("fzBurst");
  const scenes = {}; film.querySelectorAll(".fz-sc").forEach((el) => { scenes[el.dataset.s] = el; });
  const stampName = (id) => "#" + (DATA.stamps[id] ? DATA.stamps[id].name : id).toLowerCase();
  const mosaic = (el, px, dev, seed) => {
    const vis = new Set(DATA.faces[(seed || "no-4207-mara") + "@" + dev] || []), cell = px / 6.4, gap = cell * 0.28, sz = 5 * cell + 4 * gap;
    let out = '<svg viewBox="0 0 ' + sz + " " + sz + '" aria-hidden="true">';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      const on = vis.has(r + "," + c);
      out += '<rect x="' + (c * (cell + gap)).toFixed(2) + '" y="' + (r * (cell + gap)).toFixed(2) + '" width="' + cell.toFixed(2) + '" height="' + cell.toFixed(2) + '" rx="' + (cell * 0.12).toFixed(2) + '" fill="#1E1B35" opacity="' + (on ? 1 : 0.08) + '"/>';
    }
    el.innerHTML = out + "</svg>";
  };
  /* the page outside the phone wears the phone's ground */
  const ground = (g) => { stage.dataset.g = g; document.body.dataset.g = g; document.body.style.setProperty("--g", GROUND[g] || "#FFD84A"); };
  const setBird = (key) => { birdIn.replaceChildren(key === "fly-empty" ? shapes(FLY_EMPTY, 200, 96, false) : wrenSym(key, 96)); };
  let bx = 62, by = 30;
  const place = (x, y, sc, jump) => {
    if (jump) bird.classList.add("jump");
    else if (Math.hypot(x - bx, y - by) > 18) ev("whoosh");
    bx = x; by = y;
    bird.style.left = x + "%"; bird.style.top = y + "%"; bird.style.transform = "scale(" + (sc || 1) + ")";
    if (jump) { void bird.offsetWidth; bird.classList.remove("jump"); }
  };
  const speak = (text, x, y, tail) => {
    say.classList.remove("on");
    if (!text) return;
    say.textContent = text; say.style.left = x + "%"; say.style.top = y + "%";
    say.style.setProperty("--tail", (tail || 22) + "px"); say.style.setProperty("--o", (tail || 22) + "px 100%");
    ev("say");
    requestAnimationFrame(() => say.classList.add("on"));
  };
  const caption = (text, light, hl) => {
    slam.classList.remove("on"); slam.classList.toggle("light", !!light);
    if (!text) { slam.innerHTML = ""; return; }
    const parts = [];
    text.split("*").forEach((seg, j) => seg.split(" ").forEach((w) => w && parts.push([w, text.includes("*") ? j % 2 === 1 : parts.length === hl])));
    slam.innerHTML = parts.map(([w, lit], i) => '<span class="w' + (lit ? " hl" : "") + '" style="--i:' + i + '">' + w.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span>").join("");
    parts.forEach((p, i) => ev(p[1] ? "slamhl" : "slam", NOW + i * 75));
    void slam.offsetWidth; slam.classList.add("on");
  };
  const note = (text) => { small.classList.remove("on"); small.textContent = text || ""; if (text) requestAnimationFrame(() => small.classList.add("on")); };
  const shake = () => { ev("shake"); filmPh.classList.remove("shake"); void filmPh.offsetWidth; filmPh.classList.add("shake"); };
  const show = (s, g) => {
    Object.keys(scenes).forEach((k) => scenes[k].classList.toggle("on", k === s)); if (g) ground(g);
    bird.classList.remove("badge", "wilt", "gone", "drag", "posed"); birdIn.classList.remove("fl"); touch.classList.remove("on", "press");
    ev("cut", null, { g: g || stage.dataset.g });
    // the scene's pops and thwacks, at their CSS delays
    scenes[s].querySelectorAll(".fz-pop, .fz-thwack").forEach((el) => {
      const d = parseFloat(getComputedStyle(el).getPropertyValue("--d")) || 0;
      ev(el.classList.contains("fz-thwack") ? "thwack" : "pop", NOW + d);
    });
  };
  const roll = (s) => { const el = scenes[s]; el.classList.remove("go"); void el.offsetWidth; el.classList.add("go"); };
  const flap = () => { ev("flap"); birdIn.classList.remove("fl"); void birdIn.offsetWidth; birdIn.classList.add("fl"); };
  const touchAt = (x, y, jump) => {
    if (jump) touch.classList.add("jump");
    touch.style.left = x + "%"; touch.style.top = y + "%";
    if (jump) { void touch.offsetWidth; touch.classList.remove("jump"); }
  };
  const TICK = "sphinx of black quartz judge my vow";
  const tick = (n) => {
    const cell = (c, cls) => (c === " " ? " " : '<span class="' + cls + '">' + c + "</span>");
    $("fzTick").innerHTML = Array.from(TICK).map((c, k) => cell(c, k < n ? "d" : k === n ? "c" : "n")).join("");
  };
  let subs = [];
  const at = (ms, fn) => subs.push(setTimeout(fn, ms));
  const clearSubs = () => { subs.forEach(clearTimeout); subs = []; };

  function compose() {
    const t = T();
    $("fzDraftK").textContent = t.draftK; $("fzDraftT").textContent = t.draft; $("fzDel").textContent = t.del;
    $("fzLetT").textContent = t.draft; $("fzPosterT").textContent = t.draft;
    $("fzStamp1").replaceChildren(artSvg("almost-texted")); $("fzPosterS").replaceChildren(artSvg("almost-texted"));
    const st1 = DATA.stamps["almost-texted"];
    [$("fzTag1"), $("fzPosterTag")].forEach((tag) => { tag.textContent = stampName("almost-texted"); tag.style.background = st1.color; });
    $("fzYou").textContent = t.you;
    $("fzPairs").innerHTML = t.pairs.map((p, i) => '<div class="fz-pair"><span class="fz-tag fz-pop" style="background:' + CANDY[i] + ";--d:" + (320 + i * 260) + 'ms;--r:-2deg">' + p[0] + '</span><i>=</i><span class="fz-tag fz-pop" style="background:' + CANDY[i] + ";--d:" + (440 + i * 260) + 'ms;--r:2deg">' + p[1] + "</span></div>").join("");
    $("fzChip").textContent = t.chip;
    $("fzProfN").textContent = t.profN; $("fzProfM").textContent = t.profM;
    $("fzReplyT").textContent = t.reply;
    $("fzName").textContent = t.name;
    $("fzBadge").textContent = t.badge;
    $("fzCta").textContent = t.cta; $("fzFree").textContent = t.free;
    $("fzBurstT").textContent = t.yoink;
    $("fzTickK").textContent = t.tickK;
    film.querySelectorAll(".fz-mi").forEach((el) => mosaic(el, 30, 1, el.classList.contains("fz-mi-me") ? "you-the-writer" : "no-4207-mara"));
    film.querySelectorAll("[data-w]").forEach((el) => { el.textContent = t[el.dataset.w] || el.textContent; });
  }

  const BEATS = [
    /* the poster: frame 0, already at rest (it is the store's thumbnail) */
    { ms: 1300, run: () => {
      const t = T(); show("poster", "butter"); note(null);
      setBird("fly"); bird.classList.add("posed"); place(80, 15, 1.0, true);
      say.style.transition = "none"; slam.classList.add("instant");
      say.classList.remove("on"); say.textContent = t.s5; say.style.left = "28%"; say.style.top = "6%";
      say.style.setProperty("--tail", "150px"); say.classList.add("on");
      caption("come for a penpal. stay for a kindred spirit.", false, 7);
      EV.length = 0; ev("poster");
    } },
    { ms: 1800, run: () => {
      slam.classList.remove("instant");
      show("hatch", "launch"); speak(null); caption(null); note(null);  // the poster's bubble goes with the cut
      setTimeout(() => { say.style.transition = ""; }, 40);
      bird.classList.add("gone"); birdIn.replaceChildren(); roll("hatch");
      ev("knock", NOW + 180); ev("knock", NOW + 430); ev("knock", NOW + 600); ev("crack", NOW + 640); ev("hatch", NOW + 820);
      at(1120, () => { ev("chirp"); setBird("hatchling"); place(50, 42, 0.3, true); bird.classList.remove("gone"); requestAnimationFrame(() => place(50, 33, 0.9)); });
      at(1520, () => { setBird("fly"); place(135, 20, 1); });
    } },
    { ms: 2400, run: () => {
      const t = T(); show("draft", "butter"); scenes.draft.classList.remove("hit");
      setBird("fly"); place(135, 36, 1, true); speak(null); caption(null); note(null);
      ev("typing", NOW, { n: 8 });
      at(720, () => { place(83, 29, 0.92); scenes.draft.classList.add("hit"); });
      at(900, () => { shake(); ev("yoink"); burst.classList.remove("on"); void burst.offsetWidth; burst.classList.add("on"); setBird("adult-wink"); });
      at(1050, () => speak(t.s1, 58, 14, 60));
      at(1250, () => caption(t.c1, false, 3));
    } },
    { ms: 1900, run: () => {
      const t = T(); show("stamp", "pink"); speak(null);
      setBird("adult-delight"); place(80, 17, 0.85);
      at(300, () => shake());
      at(380, () => caption(t.c2)); at(500, () => note(t.m2));
    } },
    { ms: 2600, run: () => {
      const t = T(); show("match", "lilac"); note(null); caption(null);
      setBird("adult-curious"); place(86, 10, 0.72);
      at(1450, () => speak(t.s3, 44, 4, 110));
      at(1600, () => caption(t.c3, false, t.c3hl));
    } },
    { ms: 2000, run: () => {
      const t = T(); show("nopics", "mint"); speak(null); caption(null);
      setBird("adult-worry"); place(16, 12, 0.78);
      at(250, () => speak(t.s4, 29, 5, 18));
      at(660, () => shake());
      at(1050, () => ev("yeet"));
      at(1150, () => { caption(t.c4); speak(null); setBird("adult-happy"); });
    } },
    { ms: 2100, run: () => {
      const t = T(); show("reply", "butter"); caption(null);
      setBird("fly"); place(-30, 30, 1, true);
      at(40, () => place(78, 15, 0.95));
      at(300, () => speak(t.s5, 36, 5, 120));
      at(900, () => { caption(t.c5, false, 3); setBird("adult-happy"); });
    } },
    { ms: 1950, run: () => {
      const t = T(); speak(null); place(118, 20, 0.8); show("mont", MONT_G[0]); caption(t.c6, false, 0);
      MONT.forEach((id, k) => at(k * 325, () => {
        ground(MONT_G[k]); ev("stamp");
        $("fzMBox").replaceChildren(artSvg(id));
        const st = DATA.stamps[id], lab = $("fzMLab"); lab.textContent = stampName(id); lab.style.background = st ? st.color : "#1E1B35";
        scenes.mont.classList.remove("flash"); void scenes.mont.offsetWidth; scenes.mont.classList.add("flash");
      }));
    } },
    { ms: 2400, run: () => {
      const t = T(); show("reveal", "lilac"); speak(null);
      setBird("adult-delight"); place(84, 11, 0.78);
      [0.18, 0.38, 0.58, 0.78, 1].forEach((dev, k) => at(k * 280, () => { ev("count", null, { k }); mosaic($("fzFace"), 104, dev); $("fzCount").textContent = t.count.replace("{n}", String(k + 1)); }));
      at(350, () => caption(t.c7, false, 3));
      at(1520, () => shake());
      at(1650, () => speak(t.s7, 50, 3, 110));
    } },
    { ms: 2100, run: () => {
      const t = T(); show("drama", "grey"); caption(null);
      setBird("adult-sleepy"); place(50, 38, 1.4); bird.classList.add("wilt");
      ev("sad");
      at(200, () => speak(t.s8a, 18, 10, 40));
      at(380, () => caption(t.c8, false, 2));
      at(1150, () => { ground("butter"); ev("happy"); bird.classList.remove("wilt"); setBird("adult-happy"); shake(); speak(t.s8b, 30, 12, 40); });
    } },
    /* her day off: Free Flight — every right letter a wingbeat */
    { ms: 2800, run: () => {
      const t = T(); show("play", "sky"); speak(null); caption(null); note(null);
      setBird("fly-empty"); place(-20, 44, 0.62, true); roll("play");
      at(30, () => place(30, 44, 0.62));
      $("fzGates").textContent = "0"; tick(0);
      let when = 380;
      Array.from(TICK).slice(0, 20).forEach((c, k) => { at(when, () => { tick(k + 1); ev("key"); if (c !== " ") flap(); }); when += c === " " ? 110 : 165; });
      at(1300, () => { ev("gate"); $("fzGates").textContent = "1"; });
      at(2700, () => { ev("gate"); $("fzGates").textContent = "2"; });
      at(650, () => caption(t.c9, false, t.c9hl));
      at(950, () => note(t.n9));
    } },
    /* the end card — she's yours to handle: picked up, dragged, let go */
    { ms: 3000, run: () => {
      // on ink, not her own blue: she needs no white badge to be seen (owner: no white ring on Wren)
      show("end", "ink"); speak(null); caption(null); note(null);
      setBird("adult-happy"); place(50, 22, 1.45);
      at(850, () => { touchAt(74, 40, true); touch.classList.add("on"); });
      at(1050, () => touchAt(50, 22));
      at(1450, () => { ev("grab"); touch.classList.add("press"); bird.classList.add("drag"); });
      at(1520, () => { place(72, 31, 1.45); touchAt(72, 31); });
      at(1950, () => { ev("boing"); touch.classList.remove("on", "press"); bird.classList.remove("drag"); place(50, 22, 1.45); setBird("adult-delight"); });
      at(2500, () => setBird("adult-happy"));
      ev("end");
    } },
  ];
  window.__TOTAL = BEATS.reduce((n, b) => n + b.ms, 0);
  let i = -1;
  function run() {
    clearSubs();
    i += 1;
    if (i >= BEATS.length) return;  // the store film plays once and holds its end card
    BEATS[i].run();
    setTimeout(run, BEATS[i].ms);
  }
  const FACES = ['800 40px "Bricolage Grotesque"', '700 12px "IBM Plex Mono"', '600 12px "IBM Plex Mono"', 'italic 500 17px "Fraunces"', '400 14px "Instrument Sans"', '600 14px "Instrument Sans"'];
  window.__ready = Promise.all(FACES.map((f) => document.fonts.load(f))).then(() => document.fonts.ready).then(() => {
    compose();
    run();          // the poster is laid out at t = 0
    window.__advance(0);
    return window.__TOTAL;
  });
})();
