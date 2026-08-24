#!/usr/bin/env bun
/**
 * `bun run preview --env staging`
 *
 * Uploads a version per app without deploying it. Wrangler mints a
 * preview URL per version; CI posts them on the pull request
 * (docs/12-deployment.md).
 */
import { SERVICES, workerName } from "@seldon/foundation";
import { done, fail, heading, parseArgs, step } from "./lib/cli.js";
import { REPO_ROOT } from "./lib/config.js";
import { buildVersion, run } from "./lib/run.js";

const { env, services } = parseArgs(process.argv.slice(2));
const version = await buildVersion();

heading(`Uploading preview versions to ${env} at ${version}`);

const previews: { service: string; output: string }[] = [];
for (const service of services) {
  step(`${SERVICES[service].properName} -> ${workerName(service, env)}`);
  const result = await run(
    [
      "bunx",
      "wrangler",
      "versions",
      "upload",
      "--env",
      env,
      "--var",
      `BUILD_VERSION:${version}`,
    ],
    { cwd: `${REPO_ROOT}apps/${service}`, quiet: true },
  );
  if (result.code !== 0) fail(`preview upload failed for ${service}`);
  previews.push({ service, output: result.stdout });
}

// The preview URL is the last https:// token wrangler prints per app.
const summary = previews.map(({ service, output }) => {
  const url = [...output.matchAll(/https:\/\/\S+/g)].pop()?.[0] ?? "(no URL)";
  return `- **${service}** - ${url.replace(/[),.]+$/, "")}`;
});

console.log(`\n${summary.join("\n")}`);
await Bun.write(
  `${REPO_ROOT}preview-urls.md`,
  `### Preview versions (\`${version}\`)\n\n${summary.join("\n")}\n`,
);
done(`${previews.length} preview versions uploaded`);
