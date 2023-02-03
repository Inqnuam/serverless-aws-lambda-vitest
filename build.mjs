import esbuild from "esbuild";
const shouldWatch = process.env.DEV == "true";
import { execSync } from "child_process";

const compileDeclarations = () => {
  try {
    execSync("tsc");
  } catch (error) {
    console.log(error.output?.[1]?.toString());
  }
};

const watch = {
  watch: shouldWatch && {
    onRebuild: () => {
      console.log("Compiler rebuild", new Date().toLocaleString());
      compileDeclarations();
    },
  },
};

await esbuild.build({
  entryPoints: [`./src/index.ts`],
  platform: "node",
  format: "cjs",
  bundle: true,
  minify: !shouldWatch,
  external: ["esbuild", "'@vitest/browser", "@vitest/ui", "fsevents.node"],
  outdir: "dist",
  ...watch,
});

compileDeclarations();
