export type HostCommandPlatform = "win32" | "darwin" | "linux";

export interface HostCommandProfile {
  readonly platform: HostCommandPlatform;
  readonly preferredShellDialect: "powershell" | "bash";
  readonly shellExecutable?: string;
  readonly packageManagerExecutable: {
    readonly pnpm: string;
    readonly npm: string;
    readonly npx: string;
  };
  readonly pathSeparator: "/" | "\\";
}

const asSupportedPlatform = (platform: NodeJS.Platform): HostCommandPlatform => {
  if (platform === "win32") return "win32";
  if (platform === "darwin") return "darwin";
  return "linux";
};

/**
 * Return host facts for model/runtime instructions. These values are derived
 * from the process host; callers must never accept an equivalent object from a
 * model or from user-authored prompt text.
 */
export const getHostCommandProfile = (
  platform: NodeJS.Platform | HostCommandPlatform = process.platform,
): HostCommandProfile => {
  const supportedPlatform = asSupportedPlatform(platform as NodeJS.Platform);
  if (supportedPlatform === "win32") {
    return {
      platform: "win32",
      preferredShellDialect: "powershell",
      shellExecutable: "pwsh.exe",
      packageManagerExecutable: { pnpm: "pnpm.cmd", npm: "npm.cmd", npx: "npx.cmd" },
      pathSeparator: "\\",
    };
  }

  return {
    platform: supportedPlatform,
    preferredShellDialect: "bash",
    packageManagerExecutable: { pnpm: "pnpm", npm: "npm", npx: "npx" },
    pathSeparator: "/",
  };
};

export const hostCommandProfile = getHostCommandProfile;
