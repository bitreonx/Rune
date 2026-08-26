import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as NodeOS from "node:os";

export const HostProcessPlatform = Context.Reference<NodeJS.Platform>(
  "@rune/shared/hostProcess/HostProcessPlatform",
  {
    defaultValue: () => process.platform,
  },
);

export const HostProcessArchitecture = Context.Reference<NodeJS.Architecture>(
  "@rune/shared/hostProcess/HostProcessArchitecture",
  {
    defaultValue: () => process.arch,
  },
);

export const HostProcessHostname = Context.Reference<string>(
  "@rune/shared/hostProcess/HostProcessHostname",
  {
    defaultValue: () => NodeOS.hostname(),
  },
);

export const HostProcessEnvironment = Context.Reference<NodeJS.ProcessEnv>(
  "@rune/shared/hostProcess/HostProcessEnvironment",
  {
    defaultValue: () => process.env,
  },
);

export const HostProcessWorkingDirectory = Context.Reference<string>(
  "@rune/shared/hostProcess/HostProcessWorkingDirectory",
  {
    defaultValue: () => process.cwd(),
  },
);

export const HostProcessExecutablePath = Context.Reference<string>(
  "@rune/shared/hostProcess/HostProcessExecutablePath",
  {
    defaultValue: () => process.execPath,
  },
);

export const HostProcessArguments = Context.Reference<ReadonlyArray<string>>(
  "@rune/shared/hostProcess/HostProcessArguments",
  {
    defaultValue: () => process.argv,
  },
);

/** Undefined on platforms without POSIX uids (Windows). */
export const HostProcessUserId = Context.Reference<number | undefined>(
  "@rune/shared/hostProcess/HostProcessUserId",
  {
    defaultValue: () => process.getuid?.(),
  },
);

export const isHostWindows = Effect.map(HostProcessPlatform, (platform) => platform === "win32");
