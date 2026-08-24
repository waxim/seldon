/** Child-process helpers. Everything shells out to wrangler or pulumi. */
export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

export async function run(
  command: string[],
  options: { cwd?: string; env?: Record<string, string>; quiet?: boolean } = {},
): Promise<RunResult> {
  const proc = Bun.spawn(command, {
    ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
    env: { ...process.env, ...options.env },
    stdout: options.quiet ? "pipe" : "inherit",
    stderr: "pipe",
  });

  const [stdout, stderr, code] = await Promise.all([
    options.quiet ? new Response(proc.stdout).text() : Promise.resolve(""),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (!options.quiet && stderr) process.stderr.write(stderr);
  return { code, stdout, stderr };
}

export async function mustRun(
  command: string[],
  options?: Parameters<typeof run>[1],
): Promise<RunResult> {
  const result = await run(command, options);
  if (result.code !== 0) {
    throw new Error(
      `${command.join(" ")} exited ${result.code}${
        result.stderr ? `\n${result.stderr.trim()}` : ""
      }`,
    );
  }
  return result;
}

/** The commit CI stamps into every Worker's BUILD_VERSION. */
export async function buildVersion(): Promise<string> {
  const fromCi = process.env.GITHUB_SHA;
  if (fromCi) return fromCi.slice(0, 12);
  const result = await run(["git", "rev-parse", "--short=12", "HEAD"], {
    quiet: true,
  });
  return result.code === 0 ? result.stdout.trim() : "unknown";
}
