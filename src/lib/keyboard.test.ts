/* Behaviour lock for lib/keyboard's blur: the Swift screen's 'blur'
   command must be called AS A METHOD of the view ref's current value.
   Expo's view functions live on the native component's prototype and find
   their view through `this` (expo-modules-core
   NativeViewManagerAdapter.native.tsx, `this.nativeTag`); pulled off the
   ref and called bare, they reject and the field never lets go.

   Not wired to a runner; run by hand from the repo root with plain node
   (it strips the types itself from Node 22.18 / 23.6 on):
     node src/lib/keyboard.test.ts
   lib/keyboard imports React Native and expo, which node can't load, so
   this registers two tiny stand-ins for them (module.registerHooks, in
   this process only) before importing it. Every line prints ok/FAIL and
   the process exits non-zero if any fail. */

import { registerHooks } from "node:module";

type Stubs = {
  keyboardUp: boolean;
  dismissed: number;
  nativeDismissed: number;
  module: { dismissKeyboard?: () => Promise<void> } | null;
  warned: unknown[][];
};
const g = globalThis as unknown as { __kb: Stubs };
g.__kb = { keyboardUp: false, dismissed: 0, nativeDismissed: 0, module: null, warned: [] };

const STUBS: Record<string, string> = {
  "react-native": `export const Keyboard = {
    dismiss() { globalThis.__kb.dismissed++; },
    isVisible() { return globalThis.__kb.keyboardUp; },
  };`,
  expo: `export function requireOptionalNativeModule() { return globalThis.__kb.module; }`,
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in STUBS) return { url: "kb-stub:" + specifier, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("kb-stub:")) return { format: "module", source: STUBS[url.slice("kb-stub:".length)], shortCircuit: true };
    return next(url, context);
  },
});

const { blurTarget, blurThen, KEYBOARD_OUT_MS } = await import("./keyboard.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => { console.log((cond ? "ok  " : "FAIL") + " " + name); if (!cond) fails++; };
const realWarn = console.warn;
console.warn = (...a: unknown[]) => { g.__kb.warned.push(a); };
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/* a stand-in for the native component: `command` lives on the prototype
   and needs `this`, exactly like Expo's view functions */
class FakeView {
  nativeTag = 42;
  calls: { tag: number; name: string; args: unknown }[] = [];
  command(name: string, args: Record<string, unknown>): Promise<void> {
    if (!(this instanceof FakeView)) return Promise.reject(new Error("no view: called without `this`"));
    this.calls.push({ tag: this.nativeTag, name, args });
    return Promise.resolve();
  }
}

{
  const view = new FakeView();
  g.__kb.warned = [];
  blurTarget({ current: view });
  await tick();
  ok("blur reaches the view with `this` bound", view.calls.length === 1 && view.calls[0].tag === 42 && view.calls[0].name === "blur");
  ok("a bound call warns about nothing", g.__kb.warned.length === 0);
}
{
  // the bug this locks out: the same method called detached rejects
  const view = new FakeView();
  const detached = view.command;
  let rejected = false;
  await detached("blur", {}).catch(() => { rejected = true; });
  ok("(the stand-in really needs `this`)", rejected && view.calls.length === 0);
}
{
  const view = new FakeView();
  let ran = 0;
  g.__kb.keyboardUp = false;
  g.__kb.dismissed = 0;
  blurThen(() => { ran++; }, { current: view });
  await tick();
  ok("blurThen blurs the Swift field first", view.calls.length === 1 && view.calls[0].name === "blur");
  ok("blurThen dismisses React Native's keyboard too", g.__kb.dismissed === 1);
  ok("no keyboard up → fn runs at once", ran === 1);
}
{
  let ran = 0;
  g.__kb.keyboardUp = true;
  blurThen(() => { ran++; }, null);
  ok("keyboard up → fn waits for it to go", ran === 0);
  await new Promise<void>((r) => setTimeout(r, KEYBOARD_OUT_MS + 30));
  ok(`…and runs after KEYBOARD_OUT_MS (${KEYBOARD_OUT_MS}ms)`, ran === 1);
  g.__kb.keyboardUp = false;
}
{
  let ran = 0;
  blurThen(() => { ran++; }, undefined, { delayMs: 0 });
  ok("delayMs 0 → fn runs at once", ran === 1);
}
{
  let ran = 0;
  blurThen(() => { ran++; }, { current: null });
  blurThen(() => { ran++; }, { current: {} });
  ok("no screen, or a view without command → no throw, fn still runs", ran === 2);
}
{
  g.__kb.warned = [];
  blurTarget({ current: { command: () => Promise.reject(new Error("native said no")) } });
  await tick();
  ok("a rejected blur is warned about, not swallowed", g.__kb.warned.length === 1 && String(g.__kb.warned[0][0]).includes("blur command failed"));
  g.__kb.warned = [];
  blurTarget({ current: { command: () => { throw new Error("sync throw"); } } });
  ok("a throwing blur is warned about and doesn't escape", g.__kb.warned.length === 1);
}
{
  // the binary's KindredlyUI.dismissKeyboard, when it has one
  g.__kb.module = { dismissKeyboard: () => { g.__kb.nativeDismissed++; return Promise.resolve(); } };
  blurThen(() => {}, null);
  ok("KindredlyUI.dismissKeyboard is called when the binary has it", g.__kb.nativeDismissed === 1);
  g.__kb.module = { dismissKeyboard: () => Promise.reject(new Error("gone")) };
  g.__kb.warned = [];
  blurThen(() => {}, null);
  await tick();
  ok("its failure is warned about", g.__kb.warned.length === 1 && String(g.__kb.warned[0][0]).includes("dismissKeyboard failed"));
  g.__kb.module = {};
  let ran = 0;
  blurThen(() => { ran++; }, null);
  ok("a binary without it gets React Native's half and fn still runs", ran === 1);
}

console.warn = realWarn;
console.log(fails ? fails + " failed" : "all ok");
if (fails) process.exit(1);
