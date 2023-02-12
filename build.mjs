import esbuild from "esbuild";
import { execSync } from "child_process";

const shouldWatch = process.env.DEV == "true";

const ctx = await esbuild[shouldWatch ? "context" : "build"]({
  entryPoints: ["./src/index.ts"],
  platform: "node",
  format: "cjs",
  target: "ES6",
  bundle: true,
  minify: !shouldWatch,
  external: ["esbuild", "'@vitest/browser", "@vitest/ui", "fsevents.node"],
  outdir: "dist",
  plugins: [
    {
      name: "dummy",
      setup(build) {
        build.onEnd(() => {
          console.log("Compiler rebuild", new Date().toLocaleString());
          try {
            execSync("tsc");
          } catch (error) {
            console.log(error.output?.[1]?.toString());
          }
        });
      },
    },
  ],
});

if (shouldWatch) {
  await ctx.watch();
}
