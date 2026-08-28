import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { resolveElectronLaunchCommand } from "./electron-launcher.mjs";

const __dirname = NodePath.dirname(NodeURL.fileURLToPath(import.meta.url));
const desktopDir = NodePath.resolve(__dirname, "..");
const defaultMainJs = NodePath.resolve(desktopDir, "dist-electron/main.cjs");
const mainArgumentIndex = process.argv.indexOf("--main");
const configuredMainJs =
  mainArgumentIndex >= 0
    ? process.argv[mainArgumentIndex + 1]
    : process.env.RUNE_DESKTOP_MAIN_ENTRY;
const mainJs = NodePath.resolve(desktopDir, configuredMainJs ?? defaultMainJs);

if (!NodeFS.existsSync(mainJs)) {
  console.error(`Desktop smoke test cannot find the built Electron entry: ${mainJs}`);
  process.exit(1);
}

const smokeHome =
  process.env.RUNE_DESKTOP_SMOKE_HOME ??
  NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "rune-desktop-smoke-"));
const ownsSmokeHome = process.env.RUNE_DESKTOP_SMOKE_HOME === undefined;

console.log("\nLaunching Electron smoke test...");

const electronCommand = resolveElectronLaunchCommand([mainJs]);
let output = "";
let ready = false;
let settled = false;
let timeout;
let cleanupAttempts = 0;
const child = NodeChildProcess.spawn(electronCommand.electronPath, electronCommand.args, {
  stdio: ["pipe", "pipe", "pipe"],
  cwd: desktopDir,
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: "",
    APPDATA: smokeHome,
    RUNE_HOME: smokeHome,
    RUNE_DESKTOP_SMOKE_TEST: "1",
    ELECTRON_ENABLE_LOGGING: "1",
  },
});

function finish(exitCode, message) {
  if (settled) return;
  settled = true;
  if (timeout !== undefined) clearTimeout(timeout);

  const complete = () => {
    if (ownsSmokeHome) {
      try {
        NodeFS.rmSync(smokeHome, { recursive: true, force: true });
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
        if ((code === "EPERM" || code === "EBUSY") && cleanupAttempts < 20) {
          cleanupAttempts += 1;
          setTimeout(complete, 100);
          return;
        }
        console.error(`Desktop smoke test could not clean up its isolated home: ${smokeHome}`);
      }
    }
    if (message !== undefined) console.error(message);
    process.exitCode = exitCode;
  };

  if (child.exitCode === null && child.signalCode === null) {
    child.once("exit", complete);
  } else {
    complete();
  }
}

child.stdout.on("data", (chunk) => {
  output += chunk.toString();
  if (!ready && output.includes("RUNE_DESKTOP_SMOKE_MAIN_VISIBLE")) {
    ready = true;
    child.kill();
  }
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

timeout = setTimeout(() => {
  child.kill();
  finish(
    1,
    "Desktop smoke test timed out before the main window became visible.\n\nFull output:\n" +
      output,
  );
}, 60_000);

child.once("error", (error) => {
  finish(1, `Desktop smoke test could not launch Electron: ${error.message}`);
});

child.on("exit", () => {
  const fatalPatterns = [
    "Cannot find module",
    "MODULE_NOT_FOUND",
    "Refused to execute",
    "Uncaught Error",
    "Uncaught TypeError",
    "Uncaught ReferenceError",
  ];
  const failures = fatalPatterns.filter((pattern) => output.includes(pattern));

  if (failures.length > 0) {
    finish(1, "\nDesktop smoke test failed:");
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    console.error("\nFull output:\n" + output);
    return;
  }

  if (!ready) {
    finish(
      1,
      "Desktop smoke test exited before reporting startup readiness.\n\nFull output:\n" + output,
    );
    return;
  }

  finish(0);
  console.log("Desktop smoke test passed.");
});
