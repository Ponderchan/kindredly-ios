// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

/* .claude/ holds agent worktrees, each a whole checkout with its own
   node_modules: left in, Metro crawls and watches every copy (and resolves
   duplicate modules from them) until it falls over. Nothing the app ships
   lives there. Only THIS project's .claude/ is blocked, so Metro started
   from inside a worktree (which lives under .claude/worktrees/) still sees
   its own files. */
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
config.resolver.blockList = [...config.resolver.blockList, new RegExp("^" + escape(path.join(__dirname, ".claude")) + "[\\\\/].*")];

/* Started from a worktree (<repo>/.claude/worktrees/<name>), Metro's upward node_modules lookup
   also reaches the outer checkout's node_modules, and a native module bundled twice registers
   its view twice ("Tried to register two views with the same name"). Keep it to this tree's. */
const outer = __dirname.split(path.sep + ".claude" + path.sep + "worktrees" + path.sep)[0];
if (outer !== __dirname) {
  config.resolver.blockList = [...config.resolver.blockList, new RegExp("^" + escape(path.join(outer, "node_modules")) + "[\\\\/].*")];
}

module.exports = config;
