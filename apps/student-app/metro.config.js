// Metro config to avoid ESM builds on web.
// Some dependencies (e.g. devtools helpers) reference `import.meta`, which breaks
// when the bundle is loaded as a classic script by the Metro web template.
const { getDefaultConfig } = require("@expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

// Force zustand to use CJS builds (no `import.meta`).
const zustandCjsAliases = {
  zustand: path.join(__dirname, "node_modules", "zustand", "index.js"),
  "zustand/middleware": path.join(__dirname, "node_modules", "zustand", "middleware.js"),
  "zustand/middleware/persist": path.join(__dirname, "node_modules", "zustand", "middleware", "persist.js"),
  "zustand/middleware/immer": path.join(__dirname, "node_modules", "zustand", "middleware", "immer.js"),
  "zustand/middleware/subscribeWithSelector": path.join(
    __dirname,
    "node_modules",
    "zustand",
    "middleware",
    "subscribeWithSelector.js"
  ),
};

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  ...zustandCjsAliases,
};

module.exports = config;

