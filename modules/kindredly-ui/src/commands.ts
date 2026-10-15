import { useInsertionEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import type { KCommandMap, KScreenHandle, KStandardCommands } from "./types";

/* TALKING TO A SWIFT SCREEN WITHOUT PROPS.

   Every prop change makes the native view convert its WHOLE props map and re-run the Swift body
   (see ios/Adapters/KCommandBus.swift), so state that changes often goes through the view's one
   imperative entry instead: command(name, args) on its ref. That covers focus and blur, text
   seeds (setText), scroll requests, playback and composer state.

     const ref = useRef<KScreenHandle>(null);
     const commands = useKCommands(ref, {
       blurOnUnmount: true,
       onViewAttach: () => commands.send("setText", { target: "body", value: draftRef.current }),
     });
     …
     commands.send("scrollTo", { key: "end", animated: true });
     <KConversationView ref={commands.ref} … />

   Give the view `commands.ref`, not the RefObject. It fills the RefObject too (blurThen and
   anything else reading ref.current keep working), and it is what sends the queue. A command
   sent before the view exists (in the render that mounts it, from a mount effect, or while a
   NativeSurface is still arming) is queued here and sent, in order, the moment the view attaches.
   That moment is the view's own commit, which under NativeSurface is NOT a commit of the screen
   that owns this hook: NativeSurface mounts the native branch later, through its own state, once
   surfacesReady() resolves. React attaches a class component's ref right after its
   componentDidMount, where expo sets the nativeTag the call needs
   (expo-modules-core NativeViewManagerAdapter.native.tsx:149-151), so the queue can go out from
   the ref callback itself. The Swift side then keeps each command until its SwiftUI view
   listens. Between the two, nothing sent early is lost and the order holds.
   A view handed the bare RefObject still gets its queue, but only after the owner's next commit.
   Under NativeSurface that may come late, with a stale setText landing on what was typed since.

   Call command() as a method, ref.current.command(...), never detached: expo finds the native
   view from `this` (see KScreenHandle in types.ts). Everything here calls it that way.

   Also here: useRev, the counter for the screens' `rev` prop. Kept free of React Native imports
   so `node modules/kindredly-ui/src/commands.test.ts` runs. */

/** How many commands wait for a view that doesn't exist yet; the oldest go first past this. */
export const COMMAND_QUEUE_LIMIT = 100;

export type KQueuedCommand = { name: string; args: Record<string, unknown> };

/** A FIFO of commands for a target that may not exist yet. Pure: the channel below wraps it. */
export type KCommandQueue = {
  /** Sends at once when the target exists and nothing waits ahead; queues otherwise. */
  send(target: KScreenHandle | null | undefined, name: string, args: Record<string, unknown>): void;
  /** Sends everything queued, in order, if the target exists. */
  flush(target: KScreenHandle | null | undefined): void;
  /** Drops everything queued. */
  clear(): void;
  /** How many wait. */
  readonly size: number;
};

function devLog(message: string, e: unknown) {
  // plain node (the tests) has no __DEV__
  if (typeof __DEV__ !== "undefined" && __DEV__) console.log(message, e);
}

/** Logged, never thrown: a command that fails (a view torn down mid-flight, a binary built
    before the view had the function) must not take the screen down. */
function deliver(target: KScreenHandle, command: KQueuedCommand) {
  if (typeof target.command !== "function") {
    console.warn(`[kindredly-ui] this view has no command(); dropped "${command.name}"`);
    return;
  }
  try {
    // as a method: expo finds the native view from `this`
    target.command(command.name, command.args).catch((e: unknown) => {
      console.warn(`[kindredly-ui] command "${command.name}" failed:`, e);
    });
  } catch (e) {
    console.warn(`[kindredly-ui] command "${command.name}" threw:`, e);
  }
}

export function createCommandQueue(limit = COMMAND_QUEUE_LIMIT): KCommandQueue {
  let queue: KQueuedCommand[] = [];
  const flush = (target: KScreenHandle | null | undefined) => {
    if (!target || queue.length === 0) return;
    const pending = queue;
    queue = [];
    for (const command of pending) deliver(target, command);
  };
  return {
    send(target, name, args) {
      const command = { name, args };
      if (target && queue.length === 0) {
        deliver(target, command);
        return;
      }
      queue.push(command);
      if (queue.length > limit) queue.splice(0, queue.length - limit);
      flush(target);
    },
    flush,
    clear() {
      queue = [];
    },
    get size() {
      return queue.length;
    },
  };
}

/** The RefObject a screen hands useKCommands (useRef<KScreenHandle>(null)). */
export type KHandleRef = { current: KScreenHandle | null };

export type UseKCommandsOptions = {
  /** Sends "blur" just before the view goes away, so a focused SwiftUI field is never removed
      while it holds the keyboard (expo issue 49348, the workaround @expo/ui uses in
      src/keyboard/index.tsx:174-187). That is when the screen unmounts, and when the view alone
      unmounts under a screen that stays (a NativeSurface swap); once per view either way. For
      every screen that holds a KField. */
  blurOnUnmount?: boolean;
  /** Called each time a NEW view attaches through `commands.ref` (its first mount and every
      remount: a NativeSurface swap, a rebuilt Host), right after the queue went out. Reseed
      whatever Swift holds in @State here, e.g. setText of the draft: a remounted view starts
      empty, and TS is where the words survive. Not called when the same view is attached again
      (a frozen screen coming back). The latest function passed is the one called. */
  onViewAttach?: () => void;
};

export type KCommandChannelConfig = UseKCommandsOptions & {
  /** filled by attach(); read by send() */
  ref: KHandleRef;
};

/** What useKCommands keeps for one screen view. Pure (no React), so the node test drives it the
    way React does: attach(view) as the ref callback, commit() after each owner commit,
    mount()/unmount() with the owner. */
export type KCommandChannel = {
  /** Sends now when the view exists, else queues. */
  send(name: string, args: Record<string, unknown>): void;
  /** Sends whatever is queued, if the view exists. */
  flush(): void;
  /** The ref callback: fills the RefObject, then sends the queue (and calls onViewAttach for a
      new view); on null, blurs the outgoing view if blurOnUnmount. Stable for the channel's life. */
  attach(instance: KScreenHandle | null): void;
  /** After each commit of the owner: the backstop for a view handed the bare RefObject. */
  commit(): void;
  /** The owner mounted (or came back). */
  mount(): void;
  /** The owner is unmounting: blurs the view if blurOnUnmount. */
  unmount(): void;
  /** The owner's latest options and ref; applied before its commit attaches any ref. */
  configure(config: KCommandChannelConfig): void;
};

export function createCommandChannel(
  config: KCommandChannelConfig,
  queue: KCommandQueue = createCommandQueue(),
): KCommandChannel {
  let cfg = config;
  // The last view seen. It tells a new view from the same one attached again, and it is what the
  // owner's unmount blurs when React has already let go of the ref.
  let lastSeen: KScreenHandle | null = null;
  // The view already sent the unmount blur, so the owner's unmount and the view's detach (both in
  // one deletion) don't send it twice.
  let blurred: KScreenHandle | null = null;

  const blurOnce = (target: KScreenHandle | null) => {
    if (!cfg.blurOnUnmount || !target || target === blurred) return;
    blurred = target;
    if (typeof target.command !== "function") return;
    try {
      // best effort: if the view is already gone this rejects, which is the expected outcome
      target.command("blur", {}).catch((e: unknown) => devLog("[kindredly-ui] unmount blur found no view:", e));
    } catch (e) {
      devLog("[kindredly-ui] unmount blur threw:", e);
    }
  };

  const see = (instance: KScreenHandle) => {
    const isNew = instance !== lastSeen;
    lastSeen = instance;
    queue.flush(instance);
    if (!isNew || !cfg.onViewAttach) return;
    try {
      cfg.onViewAttach();
    } catch (e) {
      console.warn("[kindredly-ui] onViewAttach threw:", e);
    }
  };

  return {
    send: (name, args) => queue.send(cfg.ref.current, name, args),
    flush: () => queue.flush(cfg.ref.current),
    attach: (instance) => {
      const outgoing = cfg.ref.current ?? lastSeen;
      cfg.ref.current = instance;
      if (instance) {
        blurred = null;
        see(instance);
      } else {
        blurOnce(outgoing);
      }
    },
    commit: () => {
      const target = cfg.ref.current;
      if (target) see(target);
    },
    mount: () => {
      blurred = null;
    },
    unmount: () => blurOnce(cfg.ref.current ?? lastSeen),
    configure: (next) => {
      cfg = next;
    },
  };
}

/** A typed sender for one screen view. */
export type KCommandSender<C extends KCommandMap = KStandardCommands> = {
  /** Sends a command now, or as soon as the view exists. */
  send<N extends keyof C & string>(name: N, args: C[N]): void;
  /** Sends whatever is queued, if the view exists (attaching the view and every commit of the
      screen already do this). */
  flush(): void;
  /** THE REF TO GIVE THE VIEW: <KComposeView ref={commands.ref} />. It fills the RefObject
      passed to useKCommands and sends the queue the moment the view attaches. Stable. */
  ref: (instance: KScreenHandle | null) => void;
};

/** The command channel of one screen view. Give the view `commands.ref`, which also fills `ref`
    for blurThen and anything else that reads ref.current. Typed by the screen's command map:
    useKCommands<KStandardCommands & { composer: ComposerArgs }>(ref). */
export function useKCommands<C extends KCommandMap = KStandardCommands>(
  ref: RefObject<KScreenHandle | null>,
  options?: UseKCommandsOptions,
): KCommandSender<C> {
  const holder = useRef<KCommandChannel | null>(null);
  if (holder.current == null) holder.current = createCommandChannel({ ref, ...options });
  const channel = holder.current;

  const blurOnUnmount = options?.blurOnUnmount ?? false;
  const onViewAttach = options?.onViewAttach;
  // Insertion effects run in the mutation phase, before the layout phase attaches refs, so the
  // ref callback in this very commit already sees the latest options.
  useInsertionEffect(() => {
    channel.configure({ ref, blurOnUnmount, onViewAttach });
  });

  useLayoutEffect(() => {
    channel.mount();
    return () => channel.unmount();
  }, [channel]);

  // After every commit of the owner, the backstop: a view handed the bare RefObject gets its
  // queue here. Through commands.ref the queue has already gone out by now.
  useLayoutEffect(() => {
    channel.commit();
  });

  return useMemo<KCommandSender<C>>(
    () => ({ send: channel.send, flush: channel.flush, ref: channel.attach }),
    [channel],
  );
}

/* THE `rev` COUNTER. A screen passes its heavy arrays (rows, cards, notes) memoised, and a rev
   that goes up whenever any of them changes, so Swift converts them once per rev:

     const rows = useMemo(() => buildRows(...), [threads, lang]);
     const rev = useRev(rows, faces);
     <KKindredsView rows={rows} faces={faces} rev={rev} … />

   A screen that sends no rev sends 0, and Swift caches nothing at 0 (KScreenProps.cached): it
   converts on every body run, which is correct but slower, and logs it once per slot in a debug
   build. useRev starts at 1 so that 0 keeps that meaning. */

export type KRevState = { values: readonly unknown[]; rev: number };

/** The next rev state: the same object while every value is the same (Object.is), else rev + 1. */
export function nextRev(prev: KRevState | null, values: readonly unknown[]): KRevState {
  if (!prev) return { values, rev: 1 };
  const same = prev.values.length === values.length && values.every((v, i) => Object.is(v, prev.values[i]));
  return same ? prev : { values, rev: prev.rev + 1 };
}

/** A number that goes up whenever any of `values` changes identity; pass the same values, in the
    same order, every render. Starts at 1 (0 means "no rev" to Swift). */
export function useRev(...values: unknown[]): number {
  const state = useRef<KRevState | null>(null);
  // Written during render on purpose. A discarded render can only cause an extra bump later,
  // never a missed one, and an extra bump costs Swift one re-conversion.
  state.current = nextRev(state.current, values);
  return state.current.rev;
}
