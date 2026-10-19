/* The receipt's once-per-transaction store (lib/fc-receipt). Run by hand from the repo root:
     node src/lib/fc-receipt.test.ts
   AsyncStorage is swapped for an in-memory map (and, for one case, one that throws). */

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "@react-native-async-storage/async-storage")
      return {
        url:
          "data:text/javascript," +
          encodeURIComponent(
            "const m=new Map();export default{getItem:async k=>{if(globalThis.__throw)throw new Error('x');return m.has(k)?m.get(k):null},setItem:async(k,v)=>{if(globalThis.__throw)throw new Error('x');m.set(k,v)}}",
          ),
        shortCircuit: true,
      };
    return next(specifier, context);
  },
});

const R = await import("./fc-receipt.ts");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log((cond ? "ok  " : "FAIL") + " " + name);
  if (!cond) fails++;
};
const log = console.log;

ok("parseSeen: junk is empty", R.parseSeen("{") .length === 0 && R.parseSeen('{"a":1}').length === 0 && R.parseSeen(null).length === 0);
ok("parseSeen: keeps strings only", JSON.stringify(R.parseSeen('["a",1,"",null,"b"]')) === '["a","b"]');
ok("withSeen: moves to last, no duplicate", JSON.stringify(R.withSeen(["a", "b", "c"], "a")) === '["b","c","a"]');
ok("withSeen: caps at 50", R.withSeen(Array.from({ length: 50 }, (_, i) => `k${i}`), "new").length === 50 && R.withSeen(Array.from({ length: 50 }, (_, i) => `k${i}`), "new")[0] === "k1");
ok("receiptKey: the transaction id", R.receiptKey({ transactionId: "200001" }, "$rc_annual", 5) === "200001");
ok("receiptKey: product@time without one", R.receiptKey({ productId: "kindredly.annual" }, "$rc_annual", 5) === "kindredly.annual@5" && R.receiptKey({}, "$rc_annual", 5) === "$rc_annual@5");

ok("first time: claim shows", (await R.claimReceipt("t1")) === true);
ok("second time: claim doesn't", (await R.claimReceipt("t1")) === false);
ok("another transaction shows", (await R.claimReceipt("t2")) === true);
ok("seen reads back", (await R.receiptSeen("t1")) && (await R.receiptSeen("t2")) && !(await R.receiptSeen("t3")));

console.log = () => {};
(globalThis as any).__throw = true;
const shown = await R.claimReceipt("t1");
(globalThis as any).__throw = false;
console.log = log;
ok("store unreadable: shows anyway", shown === true);

if (fails) {
  console.log(`\n${fails} failed`);
  process.exit(1);
}
console.log("\nall passed");
