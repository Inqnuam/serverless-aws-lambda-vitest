import type { SlsAwsLambdaPlugin } from "serverless-aws-lambda/defineConfig";
let vite;

interface IVitestPlugin {
  configFile: string;
}

const vitestPlugin = (options: IVitestPlugin) => {
  const config: SlsAwsLambdaPlugin = {
    name: "vitest-plugin",
    offline: {
      onReady: async function (port) {
        if (!options?.configFile) {
          throw new Error("Vitest config file path is required");
        }
        const { createVitest } = await import(`file://${process.cwd()}/node_modules/vitest/dist/node.js`);
        vite = await createVitest(
          "test",
          {
            config: options.configFile,
          },
          {
            test: {
              watch: true,
              watchExclude: [".aws_lambda", "src", "serverless.yml", "node_modules", ".git"],
              env: {
                LOCAL_PORT: String(port),
              },
            },
          }
        );
        await vite.start();
      },
    },
    buildCallback: async function (result, isRebuild) {
      if (isRebuild) {
        vite.rerunFiles();
      }
    },
  };

  return config;
};

export default vitestPlugin;

export { vitestPlugin };
