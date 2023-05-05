const vitestPath = require.resolve("vitest").replace("/vitest/index.cjs", "/vitest/dist/node.js");
const actualDirName = __dirname;

export { vitestPath, actualDirName };
