// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

/* .claude/ holds agent worktrees, each a whole checkout with its own
   node_modules: left in, Metro crawls and watches every copy (and resolves
   duplicate modules from them) until it falls over. Nothing the app ships
   lives there. */
config.resolver.blockList = [...config.resolver.blockList, /[\\/]\.claude[\\/].*/];

module.exports = config;
