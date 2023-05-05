import { fileURLToPath } from "url";
import { createRequire } from "node:module";

let actualDirName = fileURLToPath(new URL(".", import.meta.url));

const require = createRequire(import.meta.url);
const vitestPath = require.resolve("vitest").replace("/vitest/index.cjs", "/vitest/dist/node.js");

export { actualDirName, vitestPath };
