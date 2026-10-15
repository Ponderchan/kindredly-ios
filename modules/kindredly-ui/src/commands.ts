import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import type { KCommandMap, KScreenHandle, KStandardCommands } from "./types";

/* TALKING TO A SWIFT SCREEN WITHOUT PROPS.

   Every prop change makes the native view convert its WHOLE props map and re-run the Swift body
   (see ios/Adapters/KCommandBus.swift), so state that changes often goes through the view's one
   imperative entry instead: command(name, args) on its ref. That covers focus and blur, text
   seeds (setText), scroll requests, playback and composer state.

     const ref = useRef<KScreenHandle>(null);
     const commands = useKCommands(ref, { blurOnUnmount: true });
     …
     commands.send("scrollTo", { key: "end", animated: true });
     <KConversationView ref={ref} … />

   A command sent before the view exists (in the render that mounts it, or from an effect that
   runs first) is queued here and sent, in order, right after the commit that attaches the ref.
   The Swift side then keeps it until its SwiftUI view listens. Between the two, nothing sent in
   the mounting render is lost and the order holds.

   Also here: useRev, the counter for the screens' `rev` prop. Kept free of React Native imports
   so `node modules/kindredly-ui/src/commands.test.ts` runs. */

/** How many commands wait for a view that doesn't exist yet; the oldest go first past this. */
export const COMMAND_QUEUE_LIMIT = 100;

export type KQueuedCommand = { name: string; args: Record<string, unknown> };

/** A FIFO of commands for a target that may not exist yet. Pure: the hook below wraps it. */
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

/** Logged, never thrown: a command that fails (a view torn down mid-flight, a binary built
    before the view had the function) must not take the screen down. */
function deliver(target: KScreenHandle, command: KQueuedCommand) {
  if (typeof target.command !== "function") {
    console.warn(`[kindredly-ui] this view has no command(); dropped "${command.name}"`);
    return;
  }
  try {
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

/** A typed sender for one screen view. */
export type KCommandSender<C extends KCommandMap = KStandardCommands> = {
  /** Sends a command now, or as soon as the view exists. */
  send<N extends keyof C & string>(name: N, args: C[N]): void;
  /** Sends whatever is queued, if the view exists (the hook already does this after every commit). */
  flush(): void;
};

export type UseKCommandsOptions = {
  /** Sends "blur" just before the view unmounts, so a focused SwiftUI field is never removed
      while it holds the keyboard (expo issue 49348, the workaround @expo/ui uses in
      src/keyboard/index.tsx:174-187). For every screen that holds a KField. */
  blurOnUnmount?: boolean;
};

/** The command channel of the view `ref` points at. Pass the same ref to the view. Typed by the
    screen's command map: useKCommands<KStandardCommands & { composer: ComposerArgs }>(ref). */
export function useKCommands<C extends KCommandMap = KStandardCommands>(
  ref: RefObject<KScreenHandle | null>,
  options?: UseKCommandsOptions,
): KCommandSender<C> {
  const queueRef = useRef<KCommandQueue | null>(null);
  if (queueRef.current == null) queueRef.current = createCommandQueue();
  const queue = queueRef.current;
  // the last view seen, for the unmount blur: by then React may have let go of the ref
  const lastTarget = useRef<KScreenHandle | null>(null);

  // After every commit: the ref is attached before layout effects run, so whatever was sent
  // during the render that mounted the view goes out now, before the first paint.
  useLayoutEffect(() => {
    if (ref.current) lastTarget.current = ref.current;
    queue.flush(ref.current);
  });

  const blurOnUnmount = options?.blurOnUnmount ?? false;
  useLayoutEffect(() => {
    if (!blurOnUnmount) return;
    return () => {
      const target = ref.current ?? lastTarget.current;
      if (!target || typeof target.command !== "function") return;
      // best effort: if the view is already gone this rejects, which is the expected outcome
      target.command("blur", {}).catch((e: unknown) => {
        if (__DEV__) console.log("[kindredly-ui] unmount blur found no view:", e);
      });
    };
  }, [blurOnUnmount, ref]);

  return useMemo<KCommandSender<C>>(
    () => ({
      send: (name, args) => queue.send(ref.current, name, args),
      flush: () => queue.flush(ref.current),
    }),
    [queue, ref],
  );
}

/* THE `rev` COUNTER. A screen passes its heavy arrays (rows, cards, notes) memoised, and a rev
   that goes up whenever any of them changes, so Swift converts them once per rev:

     const rows = useMemo(() => buildRows(...), [threads, lang]);
     const rev = useRev(rows, faces);
     <KKindredsView rows={rows} faces={faces} rev={rev} … />  */

export type KRevState = { values: readonly unknown[]; rev: number };

/** The next rev state: the same object while every value is the same (Object.is), else rev + 1. */
export function nextRev(prev: KRevState | null, values: readonly unknown[]): KRevState {
  if (!prev) return { values, rev: 1 };
  const same = prev.values.length === values.length && values.every((v, i) => Object.is(v, prev.values[i]));
  return same ? prev : { values, rev: prev.rev + 1 };
}

/** A number that goes up whenever any of `values` changes identity; pass the same values, in the
    same order, every render. Starts at 1. */
export function useRev(...values: unknown[]): number {
  const state = useRef<KRevState | null>(null);
  // Written during render on purpose. A discarded render can only cause an extra bump later,
  // never a missed one, and an extra bump costs Swift one re-conversion.
  state.current = nextRev(state.current, values);
  return state.current.rev;
}
