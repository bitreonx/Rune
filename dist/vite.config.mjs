import "./rolldown-runtime-C7HZzL1F.mjs";
import { _ as defaultAllowedOrigins, a as DEFAULT_ASSETS_INLINE_LIMIT, c as DEFAULT_EXTERNAL_CONDITIONS, d as ENV_PUBLIC_PATH, f as FS_PREFIX, g as __toESM$2, h as __require$2, i as CSS_LANGS_RE, l as DEFAULT_PREVIEW_PORT, m as __commonJSMin$1, n as CLIENT_ENTRY, o as DEFAULT_DEV_PORT, p as KNOWN_ASSET_TYPES, r as CLIENT_PUBLIC_PATH, s as DEFAULT_EXTENSIONS, t as CLIENT_DIR, u as ENV_ENTRY, v as require_picocolors } from "./logger-BlPxwo1T.mjs";
import { builtinModules, createRequire } from "node:module";
import * as NodePath from "node:path";
import path, { posix, sep } from "node:path";
import * as NodeFS from "node:fs";
import fs, { readFileSync } from "node:fs";
import * as NodeURL from "node:url";
import { fileURLToPath } from "node:url";
import nodeos__default from "node:os";
import "node:readline";
import fsp, { constants } from "node:fs/promises";
import * as NodeUtil from "node:util";
import { format, formatWithOptions, inspect, promisify, styleText } from "node:util";
import { isMainThread } from "node:worker_threads";
import g$1 from "node:process";
import * as tty from "node:tty";
import { isatty } from "node:tty";
import childProcess, { execFile } from "node:child_process";
import { win32 } from "path";
import { createRequire as createRequire$1 } from "module";
import assert from "node:assert";
import v8 from "node:v8";
import { Buffer as Buffer$1 } from "node:buffer";
const VITE_PLUS_VERSION = process.env.VP_VERSION || "0.2.2";
const VITEST_VERSION = "4.1.9";
process.env.VP_OVERRIDE_PACKAGES ? JSON.parse(process.env.VP_OVERRIDE_PACKAGES) : `${VITE_PLUS_VERSION}`;
createRequire(import.meta.url);
process.versions.node, process.release.name;
//#endregion
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/rolldown/shared/binding-BmkJW3Wy.mjs
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require$1 = /* #__PURE__ */ (() => createRequire(import.meta.url))();
var require_webcontainer_fallback = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const fs = __require$1("node:fs");
	const childProcess = __require$1("node:child_process");
	const version = JSON.parse(fs.readFileSync(__require$1.resolve("rolldown/package.json"), "utf-8")).version;
	const baseDir = `/tmp/rolldown-${version}`;
	const bindingEntry = `${baseDir}/node_modules/vite-plus/binding/rolldown-binding.wasi.cjs`;
	if (!fs.existsSync(bindingEntry)) {
		const bindingPkg = `vite-plus/binding@${version}`;
		fs.rmSync(baseDir, {
			recursive: true,
			force: true
		});
		fs.mkdirSync(baseDir, { recursive: true });
		console.log(`[rolldown] Downloading ${bindingPkg} on WebContainer...`);
		childProcess.execFileSync("pnpm", ["i", bindingPkg], {
			cwd: baseDir,
			stdio: "inherit"
		});
	}
	module.exports = __require$1(bindingEntry);
}));
var require_binding = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { readFileSync } = __require$1("fs");
	let nativeBinding = null;
	const loadErrors = [];
	const isMusl = () => {
		let musl = false;
		if (process.platform === "linux") {
			musl = isMuslFromFilesystem();
			if (musl === null) musl = isMuslFromReport();
			if (musl === null) musl = isMuslFromChildProcess();
		}
		return musl;
	};
	const isFileMusl = (f) => f.includes("libc.musl-") || f.includes("ld-musl-");
	const isMuslFromFilesystem = () => {
		try {
			return readFileSync("/usr/bin/ldd", "utf-8").includes("musl");
		} catch {
			return null;
		}
	};
	const isMuslFromReport = () => {
		let report = null;
		if (process.report && typeof process.report.getReport === "function") {
			process.report.excludeNetwork = true;
			report = process.report.getReport();
		}
		if (!report) return null;
		if (report.header && report.header.glibcVersionRuntime) return false;
		if (Array.isArray(report.sharedObjects)) {
			if (report.sharedObjects.some(isFileMusl)) return true;
		}
		return false;
	};
	const isMuslFromChildProcess = () => {
		try {
			return __require$1("child_process").execSync("ldd --version", { encoding: "utf8" }).includes("musl");
		} catch (e) {
			return false;
		}
	};
	function requireNative() {
		if (process.env.NAPI_RS_NATIVE_LIBRARY_PATH) try {
			return __require$1(process.env.NAPI_RS_NATIVE_LIBRARY_PATH);
		} catch (err) {
			loadErrors.push(err);
		}
		else if (process.platform === "android") if (process.arch === "arm64") {
			try {
				return __require$1("./rolldown-binding.android-arm64.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else if (process.arch === "arm") {
			try {
				return __require$1("./rolldown-binding.android-arm-eabi.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on Android ${process.arch}`));
		else if (process.platform === "win32") if (process.arch === "x64") if (process.config && process.config.variables && process.config.variables.shlib_suffix === "dll.a" || process.config && process.config.variables && process.config.variables.node_target_type === "shared_library") {
			try {
				return __require$1("./rolldown-binding.win32-x64-gnu.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else {
			try {
				return __require$1("./rolldown-binding.win32-x64-msvc.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		}
		else if (process.arch === "ia32") {
			try {
				return __require$1("./rolldown-binding.win32-ia32-msvc.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else if (process.arch === "arm64") {
			try {
				return __require$1("./rolldown-binding.win32-arm64-msvc.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on Windows: ${process.arch}`));
		else if (process.platform === "darwin") {
			try {
				return __require$1("./rolldown-binding.darwin-universal.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
			if (process.arch === "x64") {
				try {
					return __require$1("./rolldown-binding.darwin-x64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require$1("vite-plus/binding");
					const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
					if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm64") {
				try {
					return __require$1("./rolldown-binding.darwin-arm64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require$1("vite-plus/binding");
					const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
					if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on macOS: ${process.arch}`));
		} else if (process.platform === "freebsd") if (process.arch === "x64") {
			try {
				return __require$1("./rolldown-binding.freebsd-x64.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else if (process.arch === "arm64") {
			try {
				return __require$1("./rolldown-binding.freebsd-arm64.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on FreeBSD: ${process.arch}`));
		else if (process.platform === "linux") if (process.arch === "x64") if (isMusl()) {
			try {
				return __require$1("./rolldown-binding.linux-x64-musl.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else {
			try {
				return __require$1("../rolldown-binding.linux-x64-gnu.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		}
		else if (process.arch === "arm64") if (isMusl()) {
			try {
				return __require$1("./rolldown-binding.linux-arm64-musl.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else {
			try {
				return __require$1("./rolldown-binding.linux-arm64-gnu.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		}
		else if (process.arch === "arm") if (isMusl()) {
			try {
				return __require$1("./rolldown-binding.linux-arm-musleabihf.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else {
			try {
				return __require$1("./rolldown-binding.linux-arm-gnueabihf.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		}
		else if (process.arch === "loong64") if (isMusl()) {
			try {
				return __require$1("./rolldown-binding.linux-loong64-musl.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else {
			try {
				return __require$1("./rolldown-binding.linux-loong64-gnu.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		}
		else if (process.arch === "riscv64") if (isMusl()) {
			try {
				return __require$1("./rolldown-binding.linux-riscv64-musl.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else {
			try {
				return __require$1("./rolldown-binding.linux-riscv64-gnu.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		}
		else if (process.arch === "ppc64") {
			try {
				return __require$1("./rolldown-binding.linux-ppc64-gnu.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else if (process.arch === "s390x") {
			try {
				return __require$1("./rolldown-binding.linux-s390x-gnu.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on Linux: ${process.arch}`));
		else if (process.platform === "openharmony") if (process.arch === "arm64") {
			try {
				return __require$1("./rolldown-binding.openharmony-arm64.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else if (process.arch === "x64") {
			try {
				return __require$1("./rolldown-binding.openharmony-x64.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else if (process.arch === "arm") {
			try {
				return __require$1("./rolldown-binding.openharmony-arm.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require$1("vite-plus/binding");
				const bindingPackageVersion = __require$1("vite-plus/binding/package.json").version;
				if (bindingPackageVersion !== "0.2.2" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.2 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
		} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on OpenHarmony: ${process.arch}`));
		else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported OS: ${process.platform}, architecture: ${process.arch}`));
	}
	nativeBinding = requireNative();
	const forceWasi = process.env.NAPI_RS_FORCE_WASI === "true" || process.env.NAPI_RS_FORCE_WASI === "error";
	if (!nativeBinding || forceWasi) {
		let wasiBinding = null;
		let wasiBindingError = null;
		try {
			wasiBinding = __require$1("../rolldown-binding.wasi.cjs");
			nativeBinding = wasiBinding;
		} catch (err) {
			if (forceWasi) wasiBindingError = err;
		}
		if (!nativeBinding || forceWasi) try {
			wasiBinding = __require$1("vite-plus/binding");
			nativeBinding = wasiBinding;
		} catch (err) {
			if (forceWasi) {
				if (!wasiBindingError) wasiBindingError = err;
				else wasiBindingError.cause = err;
				loadErrors.push(err);
			}
		}
		if (process.env.NAPI_RS_FORCE_WASI === "error" && !wasiBinding) {
			const error = /* @__PURE__ */ new Error("WASI binding not found and NAPI_RS_FORCE_WASI is set to error");
			error.cause = wasiBindingError;
			throw error;
		}
	}
	if (!nativeBinding && globalThis.process?.versions?.["webcontainer"]) try {
		nativeBinding = require_webcontainer_fallback();
	} catch (err) {
		loadErrors.push(err);
	}
	if (!nativeBinding) {
		if (loadErrors.length > 0) {
			const error = /* @__PURE__ */ new Error("Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory.");
			error.cause = loadErrors.reduce((err, cur) => {
				cur.cause = err;
				return cur;
			});
			throw error;
		}
		throw new Error(`Failed to load native binding`);
	}
	module.exports = nativeBinding;
	module.exports.LegalCommentsMode = nativeBinding.LegalCommentsMode;
	module.exports.minify = nativeBinding.minify;
	module.exports.minifySync = nativeBinding.minifySync;
	module.exports.Severity = nativeBinding.Severity;
	module.exports.ParseResult = nativeBinding.ParseResult;
	module.exports.ExportExportNameKind = nativeBinding.ExportExportNameKind;
	module.exports.ExportImportNameKind = nativeBinding.ExportImportNameKind;
	module.exports.ExportLocalNameKind = nativeBinding.ExportLocalNameKind;
	module.exports.ImportNameKind = nativeBinding.ImportNameKind;
	module.exports.parse = nativeBinding.parse;
	module.exports.parseSync = nativeBinding.parseSync;
	module.exports.rawTransferSupported = nativeBinding.rawTransferSupported;
	module.exports.ResolverFactory = nativeBinding.ResolverFactory;
	module.exports.EnforceExtension = nativeBinding.EnforceExtension;
	module.exports.ModuleType = nativeBinding.ModuleType;
	module.exports.sync = nativeBinding.sync;
	module.exports.HelperMode = nativeBinding.HelperMode;
	module.exports.isolatedDeclaration = nativeBinding.isolatedDeclaration;
	module.exports.isolatedDeclarationSync = nativeBinding.isolatedDeclarationSync;
	module.exports.moduleRunnerTransform = nativeBinding.moduleRunnerTransform;
	module.exports.moduleRunnerTransformSync = nativeBinding.moduleRunnerTransformSync;
	module.exports.transform = nativeBinding.transform;
	module.exports.transformSync = nativeBinding.transformSync;
	module.exports.BindingBundleEndEventData = nativeBinding.BindingBundleEndEventData;
	module.exports.BindingBundleErrorEventData = nativeBinding.BindingBundleErrorEventData;
	module.exports.BindingBundler = nativeBinding.BindingBundler;
	module.exports.BindingCallableBuiltinPlugin = nativeBinding.BindingCallableBuiltinPlugin;
	module.exports.BindingChunkingContext = nativeBinding.BindingChunkingContext;
	module.exports.BindingDecodedMap = nativeBinding.BindingDecodedMap;
	module.exports.BindingDevEngine = nativeBinding.BindingDevEngine;
	module.exports.BindingLoadPluginContext = nativeBinding.BindingLoadPluginContext;
	module.exports.BindingMagicString = nativeBinding.BindingMagicString;
	module.exports.BindingModuleInfo = nativeBinding.BindingModuleInfo;
	module.exports.BindingNormalizedOptions = nativeBinding.BindingNormalizedOptions;
	module.exports.BindingOutputAsset = nativeBinding.BindingOutputAsset;
	module.exports.BindingOutputChunk = nativeBinding.BindingOutputChunk;
	module.exports.BindingPluginContext = nativeBinding.BindingPluginContext;
	module.exports.BindingRenderedChunk = nativeBinding.BindingRenderedChunk;
	module.exports.BindingRenderedChunkMeta = nativeBinding.BindingRenderedChunkMeta;
	module.exports.BindingRenderedModule = nativeBinding.BindingRenderedModule;
	module.exports.BindingSourceMap = nativeBinding.BindingSourceMap;
	module.exports.BindingTransformPluginContext = nativeBinding.BindingTransformPluginContext;
	module.exports.BindingWatcher = nativeBinding.BindingWatcher;
	module.exports.BindingWatcherBundler = nativeBinding.BindingWatcherBundler;
	module.exports.BindingWatcherChangeData = nativeBinding.BindingWatcherChangeData;
	module.exports.BindingWatcherEvent = nativeBinding.BindingWatcherEvent;
	module.exports.ParallelJsPluginRegistry = nativeBinding.ParallelJsPluginRegistry;
	module.exports.TraceSubscriberGuard = nativeBinding.TraceSubscriberGuard;
	module.exports.TsconfigCache = nativeBinding.TsconfigCache;
	module.exports.BindingAttachDebugInfo = nativeBinding.BindingAttachDebugInfo;
	module.exports.BindingBuiltinPluginName = nativeBinding.BindingBuiltinPluginName;
	module.exports.BindingChunkModuleOrderBy = nativeBinding.BindingChunkModuleOrderBy;
	module.exports.BindingErrorStage = nativeBinding.BindingErrorStage;
	module.exports.BindingLogLevel = nativeBinding.BindingLogLevel;
	module.exports.BindingPluginOrder = nativeBinding.BindingPluginOrder;
	module.exports.BindingPropertyReadSideEffects = nativeBinding.BindingPropertyReadSideEffects;
	module.exports.BindingPropertyWriteSideEffects = nativeBinding.BindingPropertyWriteSideEffects;
	module.exports.BindingRebuildStrategy = nativeBinding.BindingRebuildStrategy;
	module.exports.collapseSourcemaps = nativeBinding.collapseSourcemaps;
	module.exports.enhancedTransform = nativeBinding.enhancedTransform;
	module.exports.enhancedTransformSync = nativeBinding.enhancedTransformSync;
	module.exports.FilterTokenKind = nativeBinding.FilterTokenKind;
	module.exports.initTraceSubscriber = nativeBinding.initTraceSubscriber;
	module.exports.registerPlugins = nativeBinding.registerPlugins;
	module.exports.resolveTsconfig = nativeBinding.resolveTsconfig;
	module.exports.shutdownAsyncRuntime = nativeBinding.shutdownAsyncRuntime;
	module.exports.startAsyncRuntime = nativeBinding.startAsyncRuntime;
}));
require_binding();
require_binding();
//#endregion
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/rolldown/shared/error-BlQ0-ek7.mjs
require_binding();
//#endregion
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/rolldown/shared/resolve-tsconfig-CdIAR1Eb.mjs
var import_binding$5 = /* @__PURE__ */ __toESM(require_binding(), 1);
typeof process === "object" && process.versions?.pnp;
typeof process === "object" && process.versions?.pnp;
import_binding$5.TsconfigCache;
//#endregion
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/rolldown/utils-index.mjs
const mergedLeafVisitorTypeIds = [], mergedEnterVisitorTypeIds = [], mergedExitVisitorTypeIds = [];
for (let i = 27; i !== 0; i--) mergedLeafVisitorTypeIds.push(0);
for (let i = 138; i !== 0; i--) {
	mergedEnterVisitorTypeIds.push(0);
	mergedExitVisitorTypeIds.push(0);
}
mergedLeafVisitorTypeIds.length = 0;
mergedEnterVisitorTypeIds.length = 0;
mergedExitVisitorTypeIds.length = 0;
//#endregion
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/rolldown/shared/bindingify-input-options-Cmm60vfj.mjs
var import_binding$4 = /* @__PURE__ */ __toESM(require_binding(), 1);
const LAZY_FIELDS_KEY = Symbol("__lazy_fields__");
/**
* Base class for classes that use `@lazyProp` decorated properties.
*
* **Design Pattern in Rolldown:**
* This is a common pattern in Rolldown due to its three-layer architecture:
* TypeScript API → NAPI Bindings → Rust Core
*
* **Why we use getters:**
* For performance - to lazily fetch data from Rust bindings only when needed,
* rather than eagerly fetching all data during object construction.
*
* **The problem:**
* Getters defined on class prototypes are non-enumerable by default, which breaks:
* - Object spread operators ({...obj})
* - Object.keys() and similar methods
* - Standard JavaScript object semantics
*
* **The solution:**
* This base class automatically converts `@lazyProp` decorated getters into
* own enumerable getters on each instance during construction.
*
* **Result:**
* Objects get both lazy-loading performance benefits AND plain JavaScript object behavior.
*
* @example
* ```typescript
* class MyClass extends PlainObjectLike {
*   @lazyProp
*   get myProp() {
*     return fetchFromRustBinding();
*   }
* }
* ```
*/
var PlainObjectLike = class {
	constructor() {
		setupLazyProperties(this);
	}
};
/**
* Set up lazy properties as own getters on an instance.
* This is called automatically by the `PlainObjectLike` base class constructor.
*
* @param instance - The instance to set up lazy properties on
* @internal
*/
function setupLazyProperties(instance) {
	const lazyFields = instance.constructor[LAZY_FIELDS_KEY];
	if (!lazyFields) return;
	for (const [propertyKey, originalGetter] of lazyFields.entries()) {
		let cachedValue;
		let hasValue = false;
		Object.defineProperty(instance, propertyKey, {
			get() {
				if (!hasValue) {
					cachedValue = originalGetter.call(this);
					hasValue = true;
				}
				return cachedValue;
			},
			enumerable: true,
			configurable: true
		});
	}
}
/**
* Get all lazy field names from a class instance.
*
* @param instance - Instance to inspect
* @returns Set of lazy property names
*/
function getLazyFields(instance) {
	const lazyFields = instance.constructor[LAZY_FIELDS_KEY];
	return lazyFields ? new Set(lazyFields.keys()) : /* @__PURE__ */ new Set();
}
/**
* Decorator that marks a getter as lazy-evaluated and cached.
*
* **What "lazy" means here:**
* 1. Data is lazily fetched from Rust bindings only when the property is accessed (not eagerly on construction)
* 2. Once fetched, the data is cached for subsequent accesses (performance optimization)
* 3. Despite being a getter, it behaves like a plain object property (enumerable, appears in Object.keys())
*
* **Important**: Properties decorated with `@lazyProp` are defined as own enumerable
* properties on each instance (not on the prototype). This ensures they:
* - Appear in Object.keys() and Object.getOwnPropertyNames()
* - Are included in object spreads ({...obj})
* - Are enumerable in for...in loops
*
* Classes using this decorator must extend `PlainObjectLike` base class.
*
* @example
* ```typescript
* class MyClass extends PlainObjectLike {
*   @lazyProp
*   get expensiveValue() {
*     return someExpensiveComputation();
*   }
* }
* ```
*/
function lazyProp(target, propertyKey, descriptor) {
	if (!target.constructor[LAZY_FIELDS_KEY]) target.constructor[LAZY_FIELDS_KEY] = /* @__PURE__ */ new Map();
	const originalGetter = descriptor.get;
	target.constructor[LAZY_FIELDS_KEY].set(propertyKey, originalGetter);
	return {
		enumerable: false,
		configurable: true
	};
}
function transformAssetSource(bindingAssetSource) {
	return bindingAssetSource.inner;
}
function __decorate(decorators, target, key, desc) {
	var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
	if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
	else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
	return c > 3 && r && Object.defineProperty(target, key, r), r;
}
var OutputAssetImpl = class extends PlainObjectLike {
	bindingAsset;
	type = "asset";
	constructor(bindingAsset) {
		super();
		this.bindingAsset = bindingAsset;
	}
	get fileName() {
		return this.bindingAsset.getFileName();
	}
	get originalFileName() {
		return this.bindingAsset.getOriginalFileName() || null;
	}
	get originalFileNames() {
		return this.bindingAsset.getOriginalFileNames();
	}
	get name() {
		return this.bindingAsset.getName() ?? void 0;
	}
	get names() {
		return this.bindingAsset.getNames();
	}
	get source() {
		return transformAssetSource(this.bindingAsset.getSource());
	}
	__rolldown_external_memory_handle__(keepDataAlive) {
		if (keepDataAlive) this.#evaluateAllLazyFields();
		return this.bindingAsset.dropInner();
	}
	#evaluateAllLazyFields() {
		for (const field of getLazyFields(this)) this[field];
	}
};
__decorate([lazyProp], OutputAssetImpl.prototype, "fileName", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "originalFileName", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "originalFileNames", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "name", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "names", null);
__decorate([lazyProp], OutputAssetImpl.prototype, "source", null);
function transformToRenderedModule(bindingRenderedModule) {
	return {
		get code() {
			return bindingRenderedModule.code;
		},
		get renderedLength() {
			return bindingRenderedModule.code?.length || 0;
		},
		get renderedExports() {
			return bindingRenderedModule.renderedExports;
		}
	};
}
function transformChunkModules(modules) {
	const result = {};
	for (let i = 0; i < modules.values.length; i++) {
		let key = modules.keys[i];
		const mod = modules.values[i];
		result[key] = transformToRenderedModule(mod);
	}
	return result;
}
var OutputChunkImpl = class extends PlainObjectLike {
	bindingChunk;
	type = "chunk";
	constructor(bindingChunk) {
		super();
		this.bindingChunk = bindingChunk;
	}
	get fileName() {
		return this.bindingChunk.getFileName();
	}
	get name() {
		return this.bindingChunk.getName();
	}
	get exports() {
		return this.bindingChunk.getExports();
	}
	get isEntry() {
		return this.bindingChunk.getIsEntry();
	}
	get facadeModuleId() {
		return this.bindingChunk.getFacadeModuleId() || null;
	}
	get isDynamicEntry() {
		return this.bindingChunk.getIsDynamicEntry();
	}
	get sourcemapFileName() {
		return this.bindingChunk.getSourcemapFileName() || null;
	}
	get preliminaryFileName() {
		return this.bindingChunk.getPreliminaryFileName();
	}
	get code() {
		return this.bindingChunk.getCode();
	}
	get modules() {
		return transformChunkModules(this.bindingChunk.getModules());
	}
	get imports() {
		return this.bindingChunk.getImports();
	}
	get dynamicImports() {
		return this.bindingChunk.getDynamicImports();
	}
	get moduleIds() {
		return this.bindingChunk.getModuleIds();
	}
	get map() {
		const mapString = this.bindingChunk.getMap();
		return mapString ? transformToRollupSourceMap(mapString) : null;
	}
	__rolldown_external_memory_handle__(keepDataAlive) {
		if (keepDataAlive) this.#evaluateAllLazyFields();
		return this.bindingChunk.dropInner();
	}
	#evaluateAllLazyFields() {
		for (const field of getLazyFields(this)) this[field];
	}
};
__decorate([lazyProp], OutputChunkImpl.prototype, "fileName", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "name", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "exports", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "isEntry", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "facadeModuleId", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "isDynamicEntry", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "sourcemapFileName", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "preliminaryFileName", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "code", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "modules", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "imports", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "dynamicImports", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "moduleIds", null);
__decorate([lazyProp], OutputChunkImpl.prototype, "map", null);
function transformToRollupSourceMap(map) {
	const obj = {
		...JSON.parse(map),
		toString() {
			return JSON.stringify(obj);
		},
		toUrl() {
			return `data:application/json;charset=utf-8;base64,${Buffer.from(obj.toString(), "utf-8").toString("base64")}`;
		}
	};
	return obj;
}
function transformToRollupOutputChunk(bindingChunk) {
	return new OutputChunkImpl(bindingChunk);
}
function transformToRollupOutputAsset(bindingAsset) {
	return new OutputAssetImpl(bindingAsset);
}
function transformToRollupOutput(output) {
	const { chunks, assets } = output;
	return { output: [...chunks.map((chunk) => transformToRollupOutputChunk(chunk)), ...assets.map((asset) => transformToRollupOutputAsset(asset))] };
}
var NormalizedInputOptionsImpl = class extends PlainObjectLike {
	onLog;
	inputPlugins;
	inner;
	constructor(inner, onLog, inputPlugins) {
		super();
		this.onLog = onLog;
		this.inputPlugins = inputPlugins;
		this.inner = inner;
	}
	get shimMissingExports() {
		return this.inner.shimMissingExports;
	}
	get input() {
		return this.inner.input;
	}
	get cwd() {
		return this.inner.cwd;
	}
	get platform() {
		return this.inner.platform;
	}
	get context() {
		return this.inner.context;
	}
	get plugins() {
		return this.inputPlugins;
	}
};
__decorate([lazyProp], NormalizedInputOptionsImpl.prototype, "shimMissingExports", null);
__decorate([lazyProp], NormalizedInputOptionsImpl.prototype, "input", null);
__decorate([lazyProp], NormalizedInputOptionsImpl.prototype, "cwd", null);
__decorate([lazyProp], NormalizedInputOptionsImpl.prototype, "platform", null);
__decorate([lazyProp], NormalizedInputOptionsImpl.prototype, "context", null);
var NormalizedOutputOptionsImpl = class extends PlainObjectLike {
	inner;
	outputOptions;
	normalizedOutputPlugins;
	constructor(inner, outputOptions, normalizedOutputPlugins) {
		super();
		this.inner = inner;
		this.outputOptions = outputOptions;
		this.normalizedOutputPlugins = normalizedOutputPlugins;
	}
	get dir() {
		return this.inner.dir ?? void 0;
	}
	get entryFileNames() {
		return this.inner.entryFilenames || this.outputOptions.entryFileNames;
	}
	get chunkFileNames() {
		return this.inner.chunkFilenames || this.outputOptions.chunkFileNames;
	}
	get assetFileNames() {
		return this.inner.assetFilenames || this.outputOptions.assetFileNames;
	}
	get format() {
		return this.inner.format;
	}
	get exports() {
		return this.inner.exports;
	}
	get sourcemap() {
		return this.inner.sourcemap;
	}
	get sourcemapBaseUrl() {
		return this.inner.sourcemapBaseUrl ?? void 0;
	}
	get shimMissingExports() {
		return this.inner.shimMissingExports;
	}
	get name() {
		return this.inner.name ?? void 0;
	}
	get file() {
		return this.inner.file ?? void 0;
	}
	get codeSplitting() {
		return this.inner.codeSplitting;
	}
	/**
	* @deprecated Use `codeSplitting` instead.
	*/
	get inlineDynamicImports() {
		return !this.inner.codeSplitting;
	}
	get dynamicImportInCjs() {
		return this.inner.dynamicImportInCjs;
	}
	get externalLiveBindings() {
		return this.inner.externalLiveBindings;
	}
	get banner() {
		return normalizeAddon(this.outputOptions.banner);
	}
	get footer() {
		return normalizeAddon(this.outputOptions.footer);
	}
	get postBanner() {
		return normalizeAddon(this.outputOptions.postBanner);
	}
	get postFooter() {
		return normalizeAddon(this.outputOptions.postFooter);
	}
	get intro() {
		return normalizeAddon(this.outputOptions.intro);
	}
	get outro() {
		return normalizeAddon(this.outputOptions.outro);
	}
	get esModule() {
		return this.inner.esModule;
	}
	get extend() {
		return this.inner.extend;
	}
	get globals() {
		return this.inner.globals || this.outputOptions.globals;
	}
	get paths() {
		return this.outputOptions.paths;
	}
	get hashCharacters() {
		return this.inner.hashCharacters;
	}
	get sourcemapDebugIds() {
		return this.inner.sourcemapDebugIds;
	}
	get sourcemapExcludeSources() {
		return this.inner.sourcemapExcludeSources;
	}
	get sourcemapIgnoreList() {
		return this.outputOptions.sourcemapIgnoreList;
	}
	get sourcemapPathTransform() {
		return this.outputOptions.sourcemapPathTransform;
	}
	get minify() {
		let ret = this.inner.minify;
		if (typeof ret === "object" && ret !== null) {
			delete ret["codegen"];
			delete ret["module"];
			delete ret["sourcemap"];
		}
		return ret;
	}
	get legalComments() {
		return this.inner.legalComments;
	}
	get comments() {
		const c = this.inner.comments;
		return {
			legal: c.legal ?? true,
			annotation: c.annotation ?? true,
			jsdoc: c.jsdoc ?? true
		};
	}
	get polyfillRequire() {
		return this.inner.polyfillRequire;
	}
	get plugins() {
		return this.normalizedOutputPlugins;
	}
	get preserveModules() {
		return this.inner.preserveModules;
	}
	get preserveModulesRoot() {
		return this.inner.preserveModulesRoot;
	}
	get virtualDirname() {
		return this.inner.virtualDirname;
	}
	get topLevelVar() {
		return this.inner.topLevelVar ?? false;
	}
	get minifyInternalExports() {
		return this.inner.minifyInternalExports ?? false;
	}
};
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "dir", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "entryFileNames", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "chunkFileNames", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "assetFileNames", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "format", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "exports", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemap", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemapBaseUrl", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "shimMissingExports", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "name", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "file", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "codeSplitting", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "inlineDynamicImports", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "dynamicImportInCjs", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "externalLiveBindings", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "banner", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "footer", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "postBanner", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "postFooter", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "intro", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "outro", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "esModule", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "extend", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "globals", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "paths", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "hashCharacters", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemapDebugIds", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemapExcludeSources", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemapIgnoreList", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "sourcemapPathTransform", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "minify", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "legalComments", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "comments", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "polyfillRequire", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "plugins", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "preserveModules", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "preserveModulesRoot", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "virtualDirname", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "topLevelVar", null);
__decorate([lazyProp], NormalizedOutputOptionsImpl.prototype, "minifyInternalExports", null);
function normalizeAddon(value) {
	if (typeof value === "function") return value;
	return () => value || "";
}
Object.defineProperty(import_binding$4.BindingMagicString.prototype, "isRolldownMagicString", {
	value: true,
	writable: false,
	configurable: false
});
function assertString(content, msg) {
	if (typeof content !== "string") throw new TypeError(msg);
}
const nativeAppend = import_binding$4.BindingMagicString.prototype.append;
const nativePrepend = import_binding$4.BindingMagicString.prototype.prepend;
const nativeAppendLeft = import_binding$4.BindingMagicString.prototype.appendLeft;
const nativeAppendRight = import_binding$4.BindingMagicString.prototype.appendRight;
const nativePrependLeft = import_binding$4.BindingMagicString.prototype.prependLeft;
const nativePrependRight = import_binding$4.BindingMagicString.prototype.prependRight;
const nativeOverwrite = import_binding$4.BindingMagicString.prototype.overwrite;
const nativeUpdate = import_binding$4.BindingMagicString.prototype.update;
import_binding$4.BindingMagicString.prototype.append = function(content) {
	assertString(content, "outro content must be a string");
	return nativeAppend.call(this, content);
};
import_binding$4.BindingMagicString.prototype.prepend = function(content) {
	assertString(content, "outro content must be a string");
	return nativePrepend.call(this, content);
};
import_binding$4.BindingMagicString.prototype.appendLeft = function(index, content) {
	assertString(content, "inserted content must be a string");
	return nativeAppendLeft.call(this, index, content);
};
import_binding$4.BindingMagicString.prototype.appendRight = function(index, content) {
	assertString(content, "inserted content must be a string");
	return nativeAppendRight.call(this, index, content);
};
import_binding$4.BindingMagicString.prototype.prependLeft = function(index, content) {
	assertString(content, "inserted content must be a string");
	return nativePrependLeft.call(this, index, content);
};
import_binding$4.BindingMagicString.prototype.prependRight = function(index, content) {
	assertString(content, "inserted content must be a string");
	return nativePrependRight.call(this, index, content);
};
import_binding$4.BindingMagicString.prototype.overwrite = function(start, end, content, options) {
	assertString(content, "replacement content must be a string");
	return nativeOverwrite.call(this, start, end, content, options);
};
import_binding$4.BindingMagicString.prototype.update = function(start, end, content, options) {
	assertString(content, "replacement content must be a string");
	return nativeUpdate.call(this, start, end, content, options);
};
const nativeReplace = import_binding$4.BindingMagicString.prototype.replace;
const nativeReplaceAll = import_binding$4.BindingMagicString.prototype.replaceAll;
import_binding$4.BindingMagicString.prototype.replace = function(searchValue, replacement) {
	if (typeof searchValue === "string") return nativeReplace.call(this, searchValue, replacement);
	if (searchValue.global) searchValue.lastIndex = 0;
	const lastMatchEnd = this.replaceRegex(searchValue, replacement);
	if (searchValue.global) searchValue.lastIndex = 0;
	else if (searchValue.sticky) searchValue.lastIndex = lastMatchEnd === -1 ? 0 : lastMatchEnd;
	return this;
};
import_binding$4.BindingMagicString.prototype.replaceAll = function(searchValue, replacement) {
	if (typeof searchValue === "string") return nativeReplaceAll.call(this, searchValue, replacement);
	if (!searchValue.global) throw new TypeError("MagicString.prototype.replaceAll called with a non-global RegExp argument");
	searchValue.lastIndex = 0;
	this.replaceRegex(searchValue, replacement);
	searchValue.lastIndex = 0;
	return this;
};
import_binding$4.BindingMagicString;
fsp.appendFile, fsp.copyFile, fsp.mkdir, fsp.mkdtemp, fsp.readdir, fsp.readFile, fsp.realpath, fsp.rename, fsp.rmdir, fsp.stat, fsp.lstat, fsp.unlink, fsp.writeFile;
require_binding();
const ENUMERATED_INPUT_PLUGIN_HOOK_NAMES = [
	"options",
	"buildStart",
	"resolveId",
	"load",
	"transform",
	"moduleParsed",
	"buildEnd",
	"onLog",
	"resolveDynamicImport",
	"closeBundle",
	"closeWatcher",
	"watchChange"
];
const ENUMERATED_OUTPUT_PLUGIN_HOOK_NAMES = [
	"augmentChunkHash",
	"outputOptions",
	"renderChunk",
	"renderStart",
	"renderError",
	"writeBundle",
	"generateBundle"
];
const ENUMERATED_PLUGIN_HOOK_NAMES = [
	...ENUMERATED_INPUT_PLUGIN_HOOK_NAMES,
	...ENUMERATED_OUTPUT_PLUGIN_HOOK_NAMES,
	"footer",
	"banner",
	"intro",
	"outro"
];
ENUMERATED_PLUGIN_HOOK_NAMES[0], ENUMERATED_PLUGIN_HOOK_NAMES[0], ENUMERATED_PLUGIN_HOOK_NAMES[1], ENUMERATED_PLUGIN_HOOK_NAMES[1], ENUMERATED_PLUGIN_HOOK_NAMES[2], ENUMERATED_PLUGIN_HOOK_NAMES[2], ENUMERATED_PLUGIN_HOOK_NAMES[3], ENUMERATED_PLUGIN_HOOK_NAMES[3], ENUMERATED_PLUGIN_HOOK_NAMES[4], ENUMERATED_PLUGIN_HOOK_NAMES[4], ENUMERATED_PLUGIN_HOOK_NAMES[5], ENUMERATED_PLUGIN_HOOK_NAMES[5], ENUMERATED_PLUGIN_HOOK_NAMES[6], ENUMERATED_PLUGIN_HOOK_NAMES[6], ENUMERATED_PLUGIN_HOOK_NAMES[7], ENUMERATED_PLUGIN_HOOK_NAMES[7], ENUMERATED_PLUGIN_HOOK_NAMES[8], ENUMERATED_PLUGIN_HOOK_NAMES[8], ENUMERATED_PLUGIN_HOOK_NAMES[9], ENUMERATED_PLUGIN_HOOK_NAMES[9], ENUMERATED_PLUGIN_HOOK_NAMES[10], ENUMERATED_PLUGIN_HOOK_NAMES[10], ENUMERATED_PLUGIN_HOOK_NAMES[11], ENUMERATED_PLUGIN_HOOK_NAMES[11], ENUMERATED_PLUGIN_HOOK_NAMES[12], ENUMERATED_PLUGIN_HOOK_NAMES[12], ENUMERATED_PLUGIN_HOOK_NAMES[13], ENUMERATED_PLUGIN_HOOK_NAMES[13], ENUMERATED_PLUGIN_HOOK_NAMES[14], ENUMERATED_PLUGIN_HOOK_NAMES[14], ENUMERATED_PLUGIN_HOOK_NAMES[15], ENUMERATED_PLUGIN_HOOK_NAMES[15], ENUMERATED_PLUGIN_HOOK_NAMES[16], ENUMERATED_PLUGIN_HOOK_NAMES[16], ENUMERATED_PLUGIN_HOOK_NAMES[17], ENUMERATED_PLUGIN_HOOK_NAMES[17], ENUMERATED_PLUGIN_HOOK_NAMES[18], ENUMERATED_PLUGIN_HOOK_NAMES[18], ENUMERATED_PLUGIN_HOOK_NAMES[19], ENUMERATED_PLUGIN_HOOK_NAMES[19], ENUMERATED_PLUGIN_HOOK_NAMES[20], ENUMERATED_PLUGIN_HOOK_NAMES[20], ENUMERATED_PLUGIN_HOOK_NAMES[21], ENUMERATED_PLUGIN_HOOK_NAMES[21], ENUMERATED_PLUGIN_HOOK_NAMES[22], ENUMERATED_PLUGIN_HOOK_NAMES[22];
const DEFAULT_CONFIG = {
	lang: void 0,
	message: void 0,
	abortEarly: void 0,
	abortPipeEarly: void 0
};
/**
* Returns the global configuration.
*
* @param config The config to merge.
*
* @returns The configuration.
*/
/* @__NO_SIDE_EFFECTS__ */
function getGlobalConfig(config$1) {
	if (!config$1 && true) return DEFAULT_CONFIG;
	return {
		lang: config$1?.lang ?? void 0,
		message: config$1?.message,
		abortEarly: config$1?.abortEarly ?? void 0,
		abortPipeEarly: config$1?.abortPipeEarly ?? void 0
	};
}
/**
* Stringifies an unknown input to a literal or type string.
*
* @param input The unknown input.
*
* @returns A literal or type string.
*
* @internal
*/
/* @__NO_SIDE_EFFECTS__ */
function _stringify(input) {
	const type = typeof input;
	if (type === "string") return `"${input}"`;
	if (type === "number" || type === "bigint" || type === "boolean") return `${input}`;
	if (type === "object" || type === "function") return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
	return type;
}
/**
* Adds an issue to the dataset.
*
* @param context The issue context.
* @param label The issue label.
* @param dataset The input dataset.
* @param config The configuration.
* @param other The optional props.
*
* @internal
*/
function _addIssue(context, label, dataset, config$1, other) {
	const input = other && "input" in other ? other.input : dataset.value;
	const expected = other?.expected ?? context.expects ?? null;
	const received = other?.received ?? /* @__PURE__ */ _stringify(input);
	const issue = {
		kind: context.kind,
		type: context.type,
		input,
		expected,
		received,
		message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
		requirement: context.requirement,
		path: other?.path,
		issues: other?.issues,
		lang: config$1.lang,
		abortEarly: config$1.abortEarly,
		abortPipeEarly: config$1.abortPipeEarly
	};
	const isSchema = context.kind === "schema";
	const message$1 = other?.message ?? context.message ?? (context.reference, issue.lang, void 0) ?? (isSchema ? (issue.lang, void 0) : null) ?? config$1.message ?? (issue.lang, void 0);
	if (message$1 !== void 0) issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
	if (isSchema) dataset.typed = false;
	if (dataset.issues) dataset.issues.push(issue);
	else dataset.issues = [issue];
}
const _standardCache = /* @__PURE__ */ new WeakMap();
/**
* Returns the Standard Schema properties.
*
* @param context The schema context.
*
* @returns The Standard Schema properties.
*/
/* @__NO_SIDE_EFFECTS__ */
function _getStandardProps(context) {
	let cached = _standardCache.get(context);
	if (!cached) {
		cached = {
			version: 1,
			vendor: "valibot",
			validate(value$1) {
				return context["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig());
			}
		};
		_standardCache.set(context, cached);
	}
	return cached;
}
/**
* Disallows inherited object properties and prevents object prototype
* pollution by disallowing certain keys.
*
* @param object The object to check.
* @param key The key to check.
*
* @returns Whether the key is allowed.
*
* @internal
*/
/* @__NO_SIDE_EFFECTS__ */
function _isValidObjectKey(object$1, key) {
	return Object.prototype.hasOwnProperty.call(object$1, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
}
/**
* Joins multiple `expects` values with the given separator.
*
* @param values The `expects` values.
* @param separator The separator.
*
* @returns The joined `expects` property.
*
* @internal
*/
/* @__NO_SIDE_EFFECTS__ */
function _joinExpects(values$1, separator) {
	const list = [...new Set(values$1)];
	if (list.length > 1) return `(${list.join(` ${separator} `)})`;
	return list[0] ?? "never";
}
/**
* A Valibot error with useful information.
*/
var ValiError = class extends Error {
	/**
	* Creates a Valibot error with useful information.
	*
	* @param issues The error issues.
	*/
	constructor(issues) {
		super(issues[0].message);
		this.name = "ValiError";
		this.issues = issues;
	}
};
/* @__NO_SIDE_EFFECTS__ */
function args(schema) {
	return {
		kind: "transformation",
		type: "args",
		reference: args,
		async: false,
		schema,
		"~run"(dataset, config$1) {
			const func = dataset.value;
			dataset.value = (...args_) => {
				const argsDataset = this.schema["~run"]({ value: args_ }, config$1);
				if (argsDataset.issues) throw new ValiError(argsDataset.issues);
				return func(...argsDataset.value);
			};
			return dataset;
		}
	};
}
/**
* Creates an await transformation action.
*
* @returns An await action.
*/
/* @__NO_SIDE_EFFECTS__ */
function awaitAsync() {
	return {
		kind: "transformation",
		type: "await",
		reference: awaitAsync,
		async: true,
		async "~run"(dataset) {
			dataset.value = await dataset.value;
			return dataset;
		}
	};
}
/**
* Creates a description metadata action.
*
* @param description_ The description text.
*
* @returns A description action.
*/
/* @__NO_SIDE_EFFECTS__ */
function description(description_) {
	return {
		kind: "metadata",
		type: "description",
		reference: description,
		description: description_
	};
}
/* @__NO_SIDE_EFFECTS__ */
function returns(schema) {
	return {
		kind: "transformation",
		type: "returns",
		reference: returns,
		async: false,
		schema,
		"~run"(dataset, config$1) {
			const func = dataset.value;
			dataset.value = (...args_) => {
				const returnsDataset = this.schema["~run"]({ value: func(...args_) }, config$1);
				if (returnsDataset.issues) throw new ValiError(returnsDataset.issues);
				return returnsDataset.value;
			};
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function returnsAsync(schema) {
	return {
		kind: "transformation",
		type: "returns",
		reference: returnsAsync,
		async: false,
		schema,
		"~run"(dataset, config$1) {
			const func = dataset.value;
			dataset.value = async (...args_) => {
				const returnsDataset = await this.schema["~run"]({ value: await func(...args_) }, config$1);
				if (returnsDataset.issues) throw new ValiError(returnsDataset.issues);
				return returnsDataset.value;
			};
			return dataset;
		}
	};
}
const ABORT_EARLY_CONFIG = { abortEarly: true };
/**
* Returns the fallback value of the schema.
*
* @param schema The schema to get it from.
* @param dataset The output dataset if available.
* @param config The config if available.
*
* @returns The fallback value.
*/
/* @__NO_SIDE_EFFECTS__ */
function getFallback(schema, dataset, config$1) {
	return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
}
/**
* Returns the default value of the schema.
*
* @param schema The schema to get it from.
* @param dataset The input dataset if available.
* @param config The config if available.
*
* @returns The default value.
*/
/* @__NO_SIDE_EFFECTS__ */
function getDefault(schema, dataset, config$1) {
	return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
}
/**
* Checks if the input matches the schema. By using a type predicate, this
* function can be used as a type guard.
*
* @param schema The schema to be used.
* @param input The input to be tested.
*
* @returns Whether the input matches the schema.
*/
/* @__NO_SIDE_EFFECTS__ */
function is(schema, input) {
	return !schema["~run"]({ value: input }, ABORT_EARLY_CONFIG).issues;
}
/**
* Creates an any schema.
*
* Hint: This schema function exists only for completeness and is not
* recommended in practice. Instead, `unknown` should be used to accept
* unknown data.
*
* @returns An any schema.
*/
/* @__NO_SIDE_EFFECTS__ */
function any() {
	return {
		kind: "schema",
		type: "any",
		reference: any,
		expects: "any",
		async: false,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset) {
			dataset.typed = true;
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function array(item, message$1) {
	return {
		kind: "schema",
		type: "array",
		reference: array,
		expects: "Array",
		async: false,
		item,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			const input = dataset.value;
			if (Array.isArray(input)) {
				dataset.typed = true;
				dataset.value = [];
				for (let key = 0; key < input.length; key++) {
					const value$1 = input[key];
					const itemDataset = this.item["~run"]({ value: value$1 }, config$1);
					if (itemDataset.issues) {
						const pathItem = {
							type: "array",
							origin: "value",
							input,
							key,
							value: value$1
						};
						for (const issue of itemDataset.issues) {
							if (issue.path) issue.path.unshift(pathItem);
							else issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = itemDataset.issues;
						if (config$1.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					if (!itemDataset.typed) dataset.typed = false;
					dataset.value.push(itemDataset.value);
				}
			} else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function boolean(message$1) {
	return {
		kind: "schema",
		type: "boolean",
		reference: boolean,
		expects: "boolean",
		async: false,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (typeof dataset.value === "boolean") dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function custom(check$1, message$1) {
	return {
		kind: "schema",
		type: "custom",
		reference: custom,
		expects: "unknown",
		async: false,
		check: check$1,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (this.check(dataset.value)) dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function function_(message$1) {
	return {
		kind: "schema",
		type: "function",
		reference: function_,
		expects: "Function",
		async: false,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (typeof dataset.value === "function") dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function instance(class_, message$1) {
	return {
		kind: "schema",
		type: "instance",
		reference: instance,
		expects: class_.name,
		async: false,
		class: class_,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (dataset.value instanceof this.class) dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function literal(literal_, message$1) {
	return {
		kind: "schema",
		type: "literal",
		reference: literal,
		expects: /* @__PURE__ */ _stringify(literal_),
		async: false,
		literal: literal_,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (dataset.value === this.literal) dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function never(message$1) {
	return {
		kind: "schema",
		type: "never",
		reference: never,
		expects: "never",
		async: false,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			_addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function nullish(wrapped, default_) {
	return {
		kind: "schema",
		type: "nullish",
		reference: nullish,
		expects: `(${wrapped.expects} | null | undefined)`,
		async: false,
		wrapped,
		default: default_,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (dataset.value === null || dataset.value === void 0) {
				if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
				if (dataset.value === null || dataset.value === void 0) {
					dataset.typed = true;
					return dataset;
				}
			}
			return this.wrapped["~run"](dataset, config$1);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function number(message$1) {
	return {
		kind: "schema",
		type: "number",
		reference: number,
		expects: "number",
		async: false,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (typeof dataset.value === "number" && !isNaN(dataset.value)) dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function object(entries$1, message$1) {
	return {
		kind: "schema",
		type: "object",
		reference: object,
		expects: "Object",
		async: false,
		entries: entries$1,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const key in this.entries) {
					const valueSchema = this.entries[key];
					if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
						const value$1 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
						const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
						if (valueDataset.issues) {
							const pathItem = {
								type: "object",
								origin: "value",
								input,
								key,
								value: value$1
							};
							for (const issue of valueDataset.issues) {
								if (issue.path) issue.path.unshift(pathItem);
								else issue.path = [pathItem];
								dataset.issues?.push(issue);
							}
							if (!dataset.issues) dataset.issues = valueDataset.issues;
							if (config$1.abortEarly) {
								dataset.typed = false;
								break;
							}
						}
						if (!valueDataset.typed) dataset.typed = false;
						dataset.value[key] = valueDataset.value;
					} else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
					else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
						_addIssue(this, "key", dataset, config$1, {
							input: void 0,
							expected: `"${key}"`,
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						if (config$1.abortEarly) break;
					}
				}
			} else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function optional(wrapped, default_) {
	return {
		kind: "schema",
		type: "optional",
		reference: optional,
		expects: `(${wrapped.expects} | undefined)`,
		async: false,
		wrapped,
		default: default_,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (dataset.value === void 0) {
				if (this.default !== void 0) dataset.value = /* @__PURE__ */ getDefault(this, dataset, config$1);
				if (dataset.value === void 0) {
					dataset.typed = true;
					return dataset;
				}
			}
			return this.wrapped["~run"](dataset, config$1);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function promise(message$1) {
	return {
		kind: "schema",
		type: "promise",
		reference: promise,
		expects: "Promise",
		async: false,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (dataset.value instanceof Promise) dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function record(key, value$1, message$1) {
	return {
		kind: "schema",
		type: "record",
		reference: record,
		expects: "Object",
		async: false,
		key,
		value: value$1,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const entryKey in input) if (/* @__PURE__ */ _isValidObjectKey(input, entryKey)) {
					const entryValue = input[entryKey];
					const keyDataset = this.key["~run"]({ value: entryKey }, config$1);
					if (keyDataset.issues) {
						const pathItem = {
							type: "object",
							origin: "key",
							input,
							key: entryKey,
							value: entryValue
						};
						for (const issue of keyDataset.issues) {
							issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = keyDataset.issues;
						if (config$1.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					const valueDataset = this.value["~run"]({ value: entryValue }, config$1);
					if (valueDataset.issues) {
						const pathItem = {
							type: "object",
							origin: "value",
							input,
							key: entryKey,
							value: entryValue
						};
						for (const issue of valueDataset.issues) {
							if (issue.path) issue.path.unshift(pathItem);
							else issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = valueDataset.issues;
						if (config$1.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					if (!keyDataset.typed || !valueDataset.typed) dataset.typed = false;
					if (keyDataset.typed) dataset.value[keyDataset.value] = valueDataset.value;
				}
			} else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function strictObject(entries$1, message$1) {
	return {
		kind: "schema",
		type: "strict_object",
		reference: strictObject,
		expects: "Object",
		async: false,
		entries: entries$1,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			const input = dataset.value;
			if (input && typeof input === "object") {
				dataset.typed = true;
				dataset.value = {};
				for (const key in this.entries) {
					const valueSchema = this.entries[key];
					if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== void 0) {
						const value$1 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
						const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
						if (valueDataset.issues) {
							const pathItem = {
								type: "object",
								origin: "value",
								input,
								key,
								value: value$1
							};
							for (const issue of valueDataset.issues) {
								if (issue.path) issue.path.unshift(pathItem);
								else issue.path = [pathItem];
								dataset.issues?.push(issue);
							}
							if (!dataset.issues) dataset.issues = valueDataset.issues;
							if (config$1.abortEarly) {
								dataset.typed = false;
								break;
							}
						}
						if (!valueDataset.typed) dataset.typed = false;
						dataset.value[key] = valueDataset.value;
					} else if (valueSchema.fallback !== void 0) dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
					else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
						_addIssue(this, "key", dataset, config$1, {
							input: void 0,
							expected: `"${key}"`,
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						if (config$1.abortEarly) break;
					}
				}
				if (!dataset.issues || !config$1.abortEarly) {
					for (const key in input) if (!(key in this.entries)) {
						_addIssue(this, "key", dataset, config$1, {
							input: key,
							expected: "never",
							path: [{
								type: "object",
								origin: "key",
								input,
								key,
								value: input[key]
							}]
						});
						break;
					}
				}
			} else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function string(message$1) {
	return {
		kind: "schema",
		type: "string",
		reference: string,
		expects: "string",
		async: false,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (typeof dataset.value === "string") dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function tuple(items, message$1) {
	return {
		kind: "schema",
		type: "tuple",
		reference: tuple,
		expects: "Array",
		async: false,
		items,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			const input = dataset.value;
			if (Array.isArray(input)) {
				dataset.typed = true;
				dataset.value = [];
				for (let key = 0; key < this.items.length; key++) {
					const value$1 = input[key];
					const itemDataset = this.items[key]["~run"]({ value: value$1 }, config$1);
					if (itemDataset.issues) {
						const pathItem = {
							type: "array",
							origin: "value",
							input,
							key,
							value: value$1
						};
						for (const issue of itemDataset.issues) {
							if (issue.path) issue.path.unshift(pathItem);
							else issue.path = [pathItem];
							dataset.issues?.push(issue);
						}
						if (!dataset.issues) dataset.issues = itemDataset.issues;
						if (config$1.abortEarly) {
							dataset.typed = false;
							break;
						}
					}
					if (!itemDataset.typed) dataset.typed = false;
					dataset.value.push(itemDataset.value);
				}
			} else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function undefined_(message$1) {
	return {
		kind: "schema",
		type: "undefined",
		reference: undefined_,
		expects: "undefined",
		async: false,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (dataset.value === void 0) dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/**
* Returns the sub issues of the provided datasets for the union issue.
*
* @param datasets The datasets.
*
* @returns The sub issues.
*
* @internal
*/
/* @__NO_SIDE_EFFECTS__ */
function _subIssues(datasets) {
	let issues;
	if (datasets) for (const dataset of datasets) if (issues) for (const issue of dataset.issues) issues.push(issue);
	else issues = dataset.issues;
	return issues;
}
/* @__NO_SIDE_EFFECTS__ */
function union(options, message$1) {
	return {
		kind: "schema",
		type: "union",
		reference: union,
		expects: /* @__PURE__ */ _joinExpects(options.map((option) => option.expects), "|"),
		async: false,
		options,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			let validDataset;
			let typedDatasets;
			let untypedDatasets;
			for (const schema of this.options) {
				const optionDataset = schema["~run"]({ value: dataset.value }, config$1);
				if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
				else typedDatasets = [optionDataset];
				else {
					validDataset = optionDataset;
					break;
				}
				else if (untypedDatasets) untypedDatasets.push(optionDataset);
				else untypedDatasets = [optionDataset];
			}
			if (validDataset) return validDataset;
			if (typedDatasets) {
				if (typedDatasets.length === 1) return typedDatasets[0];
				_addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
				dataset.typed = true;
			} else if (untypedDatasets?.length === 1) return untypedDatasets[0];
			else _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function unionAsync(options, message$1) {
	return {
		kind: "schema",
		type: "union",
		reference: unionAsync,
		expects: /* @__PURE__ */ _joinExpects(options.map((option) => option.expects), "|"),
		async: true,
		options,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		async "~run"(dataset, config$1) {
			let validDataset;
			let typedDatasets;
			let untypedDatasets;
			for (const schema of this.options) {
				const optionDataset = await schema["~run"]({ value: dataset.value }, config$1);
				if (optionDataset.typed) if (optionDataset.issues) if (typedDatasets) typedDatasets.push(optionDataset);
				else typedDatasets = [optionDataset];
				else {
					validDataset = optionDataset;
					break;
				}
				else if (untypedDatasets) untypedDatasets.push(optionDataset);
				else untypedDatasets = [optionDataset];
			}
			if (validDataset) return validDataset;
			if (typedDatasets) {
				if (typedDatasets.length === 1) return typedDatasets[0];
				_addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(typedDatasets) });
				dataset.typed = true;
			} else if (untypedDatasets?.length === 1) return untypedDatasets[0];
			else _addIssue(this, "type", dataset, config$1, { issues: /* @__PURE__ */ _subIssues(untypedDatasets) });
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function void_(message$1) {
	return {
		kind: "schema",
		type: "void",
		reference: void_,
		expects: "void",
		async: false,
		message: message$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			if (dataset.value === void 0) dataset.typed = true;
			else _addIssue(this, "type", dataset, config$1);
			return dataset;
		}
	};
}
/**
* Creates a modified copy of an object schema that does not contain the
* selected entries.
*
* @param schema The schema to omit from.
* @param keys The selected entries.
*
* @returns An object schema.
*/
/* @__NO_SIDE_EFFECTS__ */
function omit(schema, keys) {
	const entries$1 = { ...schema.entries };
	for (const key of keys) delete entries$1[key];
	return {
		...schema,
		entries: entries$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function partial(schema, keys) {
	const entries$1 = {};
	for (const key in schema.entries) entries$1[key] = !keys || keys.includes(key) ? /* @__PURE__ */ optional(schema.entries[key]) : schema.entries[key];
	return {
		...schema,
		entries: entries$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function pipe(...pipe$1) {
	return {
		...pipe$1[0],
		pipe: pipe$1,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		"~run"(dataset, config$1) {
			for (const item of pipe$1) if (item.kind !== "metadata") {
				if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
					dataset.typed = false;
					break;
				}
				if (!dataset.issues || !config$1.abortEarly && !config$1.abortPipeEarly) dataset = item["~run"](dataset, config$1);
			}
			return dataset;
		}
	};
}
/* @__NO_SIDE_EFFECTS__ */
function pipeAsync(...pipe$1) {
	return {
		...pipe$1[0],
		pipe: pipe$1,
		async: true,
		get "~standard"() {
			return /* @__PURE__ */ _getStandardProps(this);
		},
		async "~run"(dataset, config$1) {
			for (const item of pipe$1) if (item.kind !== "metadata") {
				if (dataset.issues && (item.kind === "schema" || item.kind === "transformation")) {
					dataset.typed = false;
					break;
				}
				if (!dataset.issues || !config$1.abortEarly && !config$1.abortPipeEarly) dataset = await item["~run"](dataset, config$1);
			}
			return dataset;
		}
	};
}
/**
* Cross-platform styleText utility that works in both Node.js and browser environments
* In Node.js, it uses the native `styleText` from `node:util`
* In browser, it provides empty styling functions for compatibility
*/
function styleText$1(...args) {
	return styleText(...args);
}
const StringOrRegExpSchema = /* @__PURE__ */ union([/* @__PURE__ */ string(), /* @__PURE__ */ instance(RegExp)]);
function vFunction() {
	return /* @__PURE__ */ function_();
}
const LogLevelSchema = /* @__PURE__ */ union([
	/* @__PURE__ */ literal("debug"),
	/* @__PURE__ */ literal("info"),
	/* @__PURE__ */ literal("warn")
]);
const LogLevelOptionSchema = /* @__PURE__ */ union([LogLevelSchema, /* @__PURE__ */ literal("silent")]);
const LogLevelWithErrorSchema = /* @__PURE__ */ union([LogLevelSchema, /* @__PURE__ */ literal("error")]);
const RollupLogSchema = /* @__PURE__ */ any();
const RollupLogWithStringSchema = /* @__PURE__ */ union([RollupLogSchema, /* @__PURE__ */ string()]);
const InputOptionSchema = /* @__PURE__ */ union([
	/* @__PURE__ */ string(),
	/* @__PURE__ */ array(/* @__PURE__ */ string()),
	/* @__PURE__ */ record(/* @__PURE__ */ string(), /* @__PURE__ */ string())
]);
const ExternalOptionFunctionSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([
	/* @__PURE__ */ string(),
	/* @__PURE__ */ optional(/* @__PURE__ */ string()),
	/* @__PURE__ */ boolean()
])), /* @__PURE__ */ returns(/* @__PURE__ */ nullish(/* @__PURE__ */ boolean())));
const ExternalOptionSchema = /* @__PURE__ */ union([
	StringOrRegExpSchema,
	/* @__PURE__ */ array(StringOrRegExpSchema),
	ExternalOptionFunctionSchema
]);
const ModuleTypesSchema = /* @__PURE__ */ record(/* @__PURE__ */ string(), /* @__PURE__ */ union([
	/* @__PURE__ */ literal("asset"),
	/* @__PURE__ */ literal("base64"),
	/* @__PURE__ */ literal("binary"),
	/* @__PURE__ */ literal("copy"),
	/* @__PURE__ */ literal("css"),
	/* @__PURE__ */ literal("dataurl"),
	/* @__PURE__ */ literal("empty"),
	/* @__PURE__ */ literal("js"),
	/* @__PURE__ */ literal("json"),
	/* @__PURE__ */ literal("jsx"),
	/* @__PURE__ */ literal("text"),
	/* @__PURE__ */ literal("ts"),
	/* @__PURE__ */ literal("tsx")
]));
const TransformOptionsSchema = /* @__PURE__ */ object({
	assumptions: /* @__PURE__ */ optional(/* @__PURE__ */ object({
		ignoreFunctionLength: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		noDocumentAll: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		objectRestNoSymbols: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		pureGetters: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		setPublicClassFields: /* @__PURE__ */ optional(/* @__PURE__ */ boolean())
	})),
	typescript: /* @__PURE__ */ optional(/* @__PURE__ */ object({
		jsxPragma: /* @__PURE__ */ optional(/* @__PURE__ */ string()),
		jsxPragmaFrag: /* @__PURE__ */ optional(/* @__PURE__ */ string()),
		onlyRemoveTypeImports: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		allowNamespaces: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		allowDeclareFields: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		removeClassFieldsWithoutInitializer: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		optimizeConstEnums: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		optimizeEnums: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		declaration: /* @__PURE__ */ optional(/* @__PURE__ */ object({
			stripInternal: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
			sourcemap: /* @__PURE__ */ optional(/* @__PURE__ */ boolean())
		})),
		rewriteImportExtensions: /* @__PURE__ */ optional(/* @__PURE__ */ union([
			/* @__PURE__ */ literal("rewrite"),
			/* @__PURE__ */ literal("remove"),
			/* @__PURE__ */ boolean()
		]))
	})),
	helpers: /* @__PURE__ */ optional(/* @__PURE__ */ object({ mode: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ literal("Runtime"), /* @__PURE__ */ literal("External")])) })),
	decorator: /* @__PURE__ */ optional(/* @__PURE__ */ object({
		legacy: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		emitDecoratorMetadata: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		strictNullChecks: /* @__PURE__ */ optional(/* @__PURE__ */ boolean())
	})),
	jsx: /* @__PURE__ */ optional(/* @__PURE__ */ union([
		/* @__PURE__ */ literal(false),
		/* @__PURE__ */ literal("preserve"),
		/* @__PURE__ */ literal("react"),
		/* @__PURE__ */ literal("react-jsx"),
		/* @__PURE__ */ strictObject({
			runtime: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ literal("classic"), /* @__PURE__ */ literal("automatic")])), /* @__PURE__ */ description("Which runtime to use")),
			development: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Development specific information")),
			throwIfNamespace: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Toggles whether to throw an error when a tag name uses an XML namespace")),
			pure: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Mark JSX elements and top-level React method calls as pure for tree shaking.")),
			importSource: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Import the factory of element and fragment if mode is classic")),
			pragma: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Jsx element transformation")),
			pragmaFrag: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Jsx fragment transformation")),
			refresh: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ any()])), /* @__PURE__ */ description("Enable react fast refresh"))
		})
	])),
	target: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ string(), /* @__PURE__ */ array(/* @__PURE__ */ string())])), /* @__PURE__ */ description("The JavaScript target environment")),
	define: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ record(/* @__PURE__ */ string(), /* @__PURE__ */ string())), /* @__PURE__ */ description("Define global variables (syntax: key:value,key2:value2)")),
	inject: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ record(/* @__PURE__ */ string(), /* @__PURE__ */ union([/* @__PURE__ */ string(), /* @__PURE__ */ tuple([/* @__PURE__ */ string(), /* @__PURE__ */ string()])]))), /* @__PURE__ */ description("Inject import statements on demand")),
	dropLabels: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string())), /* @__PURE__ */ description("Remove labeled statements with these label names")),
	plugins: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ object({
		styledComponents: /* @__PURE__ */ optional(/* @__PURE__ */ any()),
		taggedTemplateEscape: /* @__PURE__ */ optional(/* @__PURE__ */ boolean())
	})), /* @__PURE__ */ description("Third-party plugins to use"))
});
const WatcherFileWatcherOptionsSchema = /* @__PURE__ */ strictObject({
	usePolling: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Use polling-based file watching instead of native OS events")),
	pollInterval: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ number()), /* @__PURE__ */ description("Poll interval in milliseconds (only used when usePolling is true)")),
	compareContentsForPolling: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Compare file contents for poll-based watchers (only used when usePolling is true)")),
	useDebounce: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Use debounced event delivery at the filesystem level")),
	debounceDelay: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ number()), /* @__PURE__ */ description("Debounce delay in milliseconds (only used when useDebounce is true)")),
	debounceTickRate: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ number()), /* @__PURE__ */ description("Tick rate in milliseconds for debouncer (only used when useDebounce is true)"))
});
const WatcherOptionsSchema = /* @__PURE__ */ strictObject({
	chokidar: /* @__PURE__ */ optional(/* @__PURE__ */ never(`The "watch.chokidar" option is deprecated, please use "watch.watcher" instead of it`)),
	exclude: /* @__PURE__ */ optional(/* @__PURE__ */ union([StringOrRegExpSchema, /* @__PURE__ */ array(StringOrRegExpSchema)])),
	include: /* @__PURE__ */ optional(/* @__PURE__ */ union([StringOrRegExpSchema, /* @__PURE__ */ array(StringOrRegExpSchema)])),
	watcher: /* @__PURE__ */ optional(WatcherFileWatcherOptionsSchema),
	notify: /* @__PURE__ */ optional(WatcherFileWatcherOptionsSchema),
	skipWrite: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Skip the bundle.write() step")),
	buildDelay: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ number()), /* @__PURE__ */ description("Throttle watch rebuilds")),
	clearScreen: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to clear the screen when a rebuild is triggered")),
	onInvalidate: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(vFunction()), /* @__PURE__ */ description("An optional function that will be called immediately every time a module changes that is part of the build."))
});
const ChecksOptionsSchema = /* @__PURE__ */ strictObject({
	circularDependency: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when detecting circular dependency")),
	eval: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when detecting uses of direct `eval`s")),
	missingGlobalName: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when the `output.globals` option is missing when needed")),
	missingNameOptionForIifeExport: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when the `output.name` option is missing when needed")),
	invalidAnnotation: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when a `#__PURE__` / `@__PURE__` annotation has no effect due to its position")),
	mixedExports: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when the way to export values is ambiguous")),
	unresolvedEntry: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when an entrypoint cannot be resolved")),
	unresolvedImport: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when an import cannot be resolved")),
	filenameConflict: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when files generated have the same name with different contents")),
	commonJsVariableInEsm: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when a CommonJS variable is used in an ES module")),
	importIsUndefined: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when an imported variable is not exported")),
	emptyImportMeta: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when `import.meta` is not supported with the output format and is replaced with an empty object (`{}`)")),
	toleratedTransform: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when detecting tolerated transform")),
	cannotCallNamespace: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when a namespace is called as a function")),
	configurationFieldConflict: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when a config value is overridden by another config value with a higher priority")),
	preferBuiltinFeature: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when a plugin that is covered by a built-in feature is used")),
	couldNotCleanDirectory: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when Rolldown could not clean the output directory")),
	pluginTimings: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when plugins take significant time during the build process")),
	duplicateShebang: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when both the code and postBanner contain shebang")),
	unsupportedTsconfigOption: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when a tsconfig option or combination of options is not supported")),
	ineffectiveDynamicImport: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when a module is dynamically imported but also statically imported, making the dynamic import ineffective for code splitting")),
	largeBarrelModules: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit info logs when a barrel module has a very large number of re-exports (more than 5000)")),
	sourcemapBroken: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to emit warnings when a plugin transforms code without generating a sourcemap"))
});
const MinifyOptionsSchema = /* @__PURE__ */ strictObject({
	compress: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ strictObject({
		target: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ string(), /* @__PURE__ */ array(/* @__PURE__ */ string())])),
		dropConsole: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		dropDebugger: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		keepNames: /* @__PURE__ */ optional(/* @__PURE__ */ strictObject({
			function: /* @__PURE__ */ boolean(),
			class: /* @__PURE__ */ boolean()
		})),
		unused: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ literal("keep_assign")])),
		joinVars: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		sequences: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		dropLabels: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string())),
		maxIterations: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
		treeshake: /* @__PURE__ */ optional(/* @__PURE__ */ strictObject({
			annotations: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
			manualPureFunctions: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string())),
			propertyReadSideEffects: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ literal("always")])),
			propertyWriteSideEffects: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
			unknownGlobalSideEffects: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
			invalidImportSideEffects: /* @__PURE__ */ optional(/* @__PURE__ */ boolean())
		}))
	})])),
	mangle: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ strictObject({
		toplevel: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		keepNames: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ strictObject({
			function: /* @__PURE__ */ boolean(),
			class: /* @__PURE__ */ boolean()
		})])),
		debug: /* @__PURE__ */ optional(/* @__PURE__ */ boolean())
	})])),
	codegen: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ strictObject({
		removeWhitespace: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		legalComments: /* @__PURE__ */ optional(/* @__PURE__ */ union([
			/* @__PURE__ */ literal("none"),
			/* @__PURE__ */ literal("inline"),
			/* @__PURE__ */ literal("eof"),
			/* @__PURE__ */ literal("external"),
			/* @__PURE__ */ strictObject({ linked: /* @__PURE__ */ string() })
		]))
	})]))
});
const ResolveOptionsSchema = /* @__PURE__ */ strictObject({
	alias: /* @__PURE__ */ optional(/* @__PURE__ */ record(/* @__PURE__ */ string(), /* @__PURE__ */ union([
		/* @__PURE__ */ literal(false),
		/* @__PURE__ */ string(),
		/* @__PURE__ */ array(/* @__PURE__ */ string())
	]))),
	aliasFields: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ array(/* @__PURE__ */ string()))),
	conditionNames: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string())),
	extensionAlias: /* @__PURE__ */ optional(/* @__PURE__ */ record(/* @__PURE__ */ string(), /* @__PURE__ */ array(/* @__PURE__ */ string()))),
	exportsFields: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ array(/* @__PURE__ */ string()))),
	extensions: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string())),
	mainFields: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string())),
	mainFiles: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string())),
	modules: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string())),
	symlinks: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
	tsconfigFilename: /* @__PURE__ */ optional(/* @__PURE__ */ string())
});
const TreeshakingOptionsSchema = /* @__PURE__ */ strictObject({
	moduleSideEffects: /* @__PURE__ */ optional(/* @__PURE__ */ any()),
	annotations: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
	manualPureFunctions: /* @__PURE__ */ optional(/* @__PURE__ */ custom((input) => /* @__PURE__ */ is(/* @__PURE__ */ array(/* @__PURE__ */ string()), input), "string array")),
	unknownGlobalSideEffects: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
	invalidImportSideEffects: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
	commonjs: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
	propertyReadSideEffects: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ literal(false), /* @__PURE__ */ literal("always")])),
	propertyWriteSideEffects: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ literal(false), /* @__PURE__ */ literal("always")]))
});
const OptimizationOptionsSchema = /* @__PURE__ */ strictObject({
	inlineConst: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ strictObject({
		mode: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ literal("all"), /* @__PURE__ */ literal("smart")])),
		pass: /* @__PURE__ */ optional(/* @__PURE__ */ number())
	})])), /* @__PURE__ */ description("Enable crossmodule constant inlining")),
	pifeForModuleWrappers: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Use PIFE pattern for module wrappers"))
});
const LogOrStringHandlerSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([LogLevelWithErrorSchema, RollupLogWithStringSchema])));
const OnLogSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([
	LogLevelSchema,
	RollupLogSchema,
	LogOrStringHandlerSchema
])));
const OnwarnSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([RollupLogSchema, /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([/* @__PURE__ */ union([RollupLogWithStringSchema, /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ returns(RollupLogWithStringSchema))])])))])));
const DevModeSchema = /* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ strictObject({
	port: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
	host: /* @__PURE__ */ optional(/* @__PURE__ */ string()),
	implement: /* @__PURE__ */ optional(/* @__PURE__ */ string()),
	lazy: /* @__PURE__ */ optional(/* @__PURE__ */ boolean())
})]);
const InputOptionsSchema = /* @__PURE__ */ strictObject({
	input: /* @__PURE__ */ optional(InputOptionSchema),
	plugins: /* @__PURE__ */ optional(/* @__PURE__ */ custom(() => true)),
	external: /* @__PURE__ */ optional(ExternalOptionSchema),
	makeAbsoluteExternalsRelative: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ literal("ifRelativeSource")])),
	resolve: /* @__PURE__ */ optional(ResolveOptionsSchema),
	cwd: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Current working directory")),
	platform: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([
		/* @__PURE__ */ literal("browser"),
		/* @__PURE__ */ literal("neutral"),
		/* @__PURE__ */ literal("node")
	])), /* @__PURE__ */ description(`Platform for which the code should be generated (node, ${styleText$1("underline", "browser")}, neutral)`)),
	shimMissingExports: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Create shim variables for missing exports")),
	treeshake: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), TreeshakingOptionsSchema])),
	optimization: /* @__PURE__ */ optional(OptimizationOptionsSchema),
	logLevel: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(LogLevelOptionSchema), /* @__PURE__ */ description(`Log level (${styleText$1("dim", "silent")}, ${styleText$1(["underline", "gray"], "info")}, debug, ${styleText$1("yellow", "warn")})`)),
	onLog: /* @__PURE__ */ optional(OnLogSchema),
	onwarn: /* @__PURE__ */ optional(OnwarnSchema),
	moduleTypes: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(ModuleTypesSchema), /* @__PURE__ */ description("Module types for customized extensions")),
	experimental: /* @__PURE__ */ optional(/* @__PURE__ */ strictObject({
		viteMode: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		resolveNewUrlToAsset: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		devMode: /* @__PURE__ */ optional(DevModeSchema),
		chunkModulesOrder: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ literal("module-id"), /* @__PURE__ */ literal("exec-order")])),
		attachDebugInfo: /* @__PURE__ */ optional(/* @__PURE__ */ union([
			/* @__PURE__ */ literal("none"),
			/* @__PURE__ */ literal("simple"),
			/* @__PURE__ */ literal("full")
		])),
		chunkImportMap: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ object({
			baseUrl: /* @__PURE__ */ optional(/* @__PURE__ */ string()),
			fileName: /* @__PURE__ */ optional(/* @__PURE__ */ string())
		})])),
		onDemandWrapping: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		incrementalBuild: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		nativeMagicString: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		chunkOptimization: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ strictObject({
			mergeCommonChunks: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
			avoidRedundantChunkLoads: /* @__PURE__ */ optional(/* @__PURE__ */ boolean())
		})])),
		lazyBarrel: /* @__PURE__ */ optional(/* @__PURE__ */ boolean())
	})),
	transform: /* @__PURE__ */ optional(TransformOptionsSchema),
	watch: /* @__PURE__ */ optional(/* @__PURE__ */ union([WatcherOptionsSchema, /* @__PURE__ */ literal(false)])),
	checks: /* @__PURE__ */ optional(ChecksOptionsSchema),
	devtools: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ object({ sessionId: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Used to name the build.")) })), /* @__PURE__ */ description("Enable debug mode. Emit debug information to disk. This might slow down the build process significantly.")),
	preserveEntrySignatures: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([
		/* @__PURE__ */ literal("strict"),
		/* @__PURE__ */ literal("allow-extension"),
		/* @__PURE__ */ literal("exports-only"),
		/* @__PURE__ */ literal(false)
	]))),
	context: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("The value of `this` at the top level of each module.")),
	tsconfig: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ string()])), /* @__PURE__ */ description("Path to the tsconfig.json file."))
});
const InputCliOverrideSchema = /* @__PURE__ */ strictObject({
	input: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string())), /* @__PURE__ */ description("Entry file")),
	external: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string())), /* @__PURE__ */ description("Comma-separated list of module ids to exclude from the bundle `<module-id>,...`")),
	treeshake: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("enable treeshaking")),
	makeAbsoluteExternalsRelative: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Prevent normalization of external imports")),
	preserveEntrySignatures: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ literal(false)), /* @__PURE__ */ description("Avoid facade chunks for entry points")),
	context: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("The entity top-level `this` represents."))
});
const InputCliOptionsSchema = /* @__PURE__ */ omit(/* @__PURE__ */ strictObject({
	...InputOptionsSchema.entries,
	...InputCliOverrideSchema.entries
}), [
	"plugins",
	"onwarn",
	"onLog",
	"resolve",
	"experimental",
	"watch"
]);
const ModuleFormatSchema = /* @__PURE__ */ union([
	/* @__PURE__ */ literal("es"),
	/* @__PURE__ */ literal("cjs"),
	/* @__PURE__ */ literal("esm"),
	/* @__PURE__ */ literal("module"),
	/* @__PURE__ */ literal("commonjs"),
	/* @__PURE__ */ literal("iife"),
	/* @__PURE__ */ literal("umd")
]);
const AddonFunctionSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([/* @__PURE__ */ custom(() => true)])), /* @__PURE__ */ returnsAsync(/* @__PURE__ */ unionAsync([/* @__PURE__ */ string(), /* @__PURE__ */ pipeAsync(/* @__PURE__ */ promise(), /* @__PURE__ */ awaitAsync(), /* @__PURE__ */ string())])));
const ChunkFileNamesFunctionSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([/* @__PURE__ */ custom(() => true)])), /* @__PURE__ */ returns(/* @__PURE__ */ string()));
const ChunkFileNamesSchema = /* @__PURE__ */ union([/* @__PURE__ */ string(), ChunkFileNamesFunctionSchema]);
const AssetFileNamesFunctionSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([/* @__PURE__ */ custom(() => true)])), /* @__PURE__ */ returns(/* @__PURE__ */ string()));
const AssetFileNamesSchema = /* @__PURE__ */ union([/* @__PURE__ */ string(), AssetFileNamesFunctionSchema]);
const SanitizeFileNameFunctionSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([/* @__PURE__ */ string()])), /* @__PURE__ */ returns(/* @__PURE__ */ string()));
const SanitizeFileNameSchema = /* @__PURE__ */ union([/* @__PURE__ */ boolean(), SanitizeFileNameFunctionSchema]);
const GlobalsFunctionSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([/* @__PURE__ */ string()])), /* @__PURE__ */ returns(/* @__PURE__ */ string()));
const PathsFunctionSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([/* @__PURE__ */ string()])), /* @__PURE__ */ returns(/* @__PURE__ */ string()));
const ManualChunksFunctionSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([/* @__PURE__ */ string(), /* @__PURE__ */ object({})])), /* @__PURE__ */ returns(/* @__PURE__ */ nullish(/* @__PURE__ */ string())));
const AdvancedChunksNameFunctionSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([/* @__PURE__ */ string(), /* @__PURE__ */ object({})])), /* @__PURE__ */ returns(/* @__PURE__ */ nullish(/* @__PURE__ */ string())));
const AdvancedChunksTestFunctionSchema = /* @__PURE__ */ pipe(vFunction(), /* @__PURE__ */ args(/* @__PURE__ */ tuple([/* @__PURE__ */ string()])), /* @__PURE__ */ returns(/* @__PURE__ */ union([
	/* @__PURE__ */ boolean(),
	/* @__PURE__ */ void_(),
	/* @__PURE__ */ undefined_()
])));
const AdvancedChunksSchema = /* @__PURE__ */ strictObject({
	includeDependenciesRecursively: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
	minSize: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
	maxSize: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
	minModuleSize: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
	maxModuleSize: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
	minShareCount: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
	groups: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ strictObject({
		name: /* @__PURE__ */ union([/* @__PURE__ */ string(), AdvancedChunksNameFunctionSchema]),
		test: /* @__PURE__ */ optional(/* @__PURE__ */ union([StringOrRegExpSchema, AdvancedChunksTestFunctionSchema])),
		priority: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
		minSize: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
		minShareCount: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
		maxSize: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
		minModuleSize: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
		maxModuleSize: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
		entriesAware: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		entriesAwareMergeThreshold: /* @__PURE__ */ optional(/* @__PURE__ */ number()),
		includeDependenciesRecursively: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		tags: /* @__PURE__ */ optional(/* @__PURE__ */ array(/* @__PURE__ */ string()))
	})))
});
const GeneratedCodeOptionsSchema = /* @__PURE__ */ strictObject({
	symbols: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to use Symbol.toStringTag for namespace objects")),
	preset: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ literal("es5"), /* @__PURE__ */ literal("es2015")])),
	profilerNames: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Whether to add readable names to internal variables for profiling purposes"))
});
const OutputOptionsSchema = /* @__PURE__ */ strictObject({
	dir: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Output directory, defaults to `dist` if `file` is not set")),
	file: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Single output file")),
	exports: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([
		/* @__PURE__ */ literal("auto"),
		/* @__PURE__ */ literal("named"),
		/* @__PURE__ */ literal("default"),
		/* @__PURE__ */ literal("none")
	])), /* @__PURE__ */ description(`Specify a export mode (${styleText$1("underline", "auto")}, named, default, none)`)),
	hashCharacters: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([
		/* @__PURE__ */ literal("base64"),
		/* @__PURE__ */ literal("base36"),
		/* @__PURE__ */ literal("hex")
	])), /* @__PURE__ */ description("Use the specified character set for file hashes")),
	format: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(ModuleFormatSchema), /* @__PURE__ */ description(`Output format of the generated bundle (supports ${styleText$1("underline", "esm")}, cjs, and iife)`)),
	sourcemap: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([
		/* @__PURE__ */ boolean(),
		/* @__PURE__ */ literal("inline"),
		/* @__PURE__ */ literal("hidden")
	])), /* @__PURE__ */ description(`Generate sourcemap (\`-s inline\` for inline, or \`-s\` for \`.map\` file)`)),
	sourcemapBaseUrl: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Base URL used to prefix sourcemap paths")),
	sourcemapDebugIds: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Inject sourcemap debug IDs")),
	sourcemapExcludeSources: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Exclude source content from sourcemaps")),
	sourcemapIgnoreList: /* @__PURE__ */ optional(/* @__PURE__ */ union([
		/* @__PURE__ */ boolean(),
		/* @__PURE__ */ custom(() => true),
		StringOrRegExpSchema
	])),
	sourcemapPathTransform: /* @__PURE__ */ optional(/* @__PURE__ */ custom(() => true)),
	banner: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ string(), AddonFunctionSchema])),
	footer: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ string(), AddonFunctionSchema])),
	postBanner: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ string(), AddonFunctionSchema])),
	postFooter: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ string(), AddonFunctionSchema])),
	intro: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ string(), AddonFunctionSchema])),
	outro: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ string(), AddonFunctionSchema])),
	extend: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Extend global variable defined by name in IIFE / UMD formats")),
	esModule: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ literal("if-default-prop")])),
	assetFileNames: /* @__PURE__ */ optional(AssetFileNamesSchema),
	entryFileNames: /* @__PURE__ */ optional(ChunkFileNamesSchema),
	chunkFileNames: /* @__PURE__ */ optional(ChunkFileNamesSchema),
	sanitizeFileName: /* @__PURE__ */ optional(SanitizeFileNameSchema),
	minify: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([
		/* @__PURE__ */ boolean(),
		/* @__PURE__ */ literal("dce-only"),
		MinifyOptionsSchema
	])), /* @__PURE__ */ description("Minify the bundled file")),
	name: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Name for UMD / IIFE format outputs")),
	globals: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ record(/* @__PURE__ */ string(), /* @__PURE__ */ string()), GlobalsFunctionSchema])), /* @__PURE__ */ description("Global variable of UMD / IIFE dependencies (syntax: `key:value`)")),
	paths: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ record(/* @__PURE__ */ string(), /* @__PURE__ */ string()), PathsFunctionSchema])), /* @__PURE__ */ description("Maps external module IDs to paths")),
	generatedCode: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ partial(GeneratedCodeOptionsSchema)), /* @__PURE__ */ description("Generated code options")),
	externalLiveBindings: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("external live bindings")),
	inlineDynamicImports: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Inline dynamic imports")),
	dynamicImportInCjs: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Dynamic import in CJS output")),
	manualChunks: /* @__PURE__ */ optional(ManualChunksFunctionSchema),
	codeSplitting: /* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), AdvancedChunksSchema])),
	advancedChunks: /* @__PURE__ */ optional(AdvancedChunksSchema),
	legalComments: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ literal("none"), /* @__PURE__ */ literal("inline")])), /* @__PURE__ */ description("Control legal comments in the output")),
	comments: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ strictObject({
		legal: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		annotation: /* @__PURE__ */ optional(/* @__PURE__ */ boolean()),
		jsdoc: /* @__PURE__ */ optional(/* @__PURE__ */ boolean())
	})])), /* @__PURE__ */ description("Control comments in the output")),
	plugins: /* @__PURE__ */ optional(/* @__PURE__ */ custom(() => true)),
	polyfillRequire: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Disable require polyfill injection")),
	hoistTransitiveImports: /* @__PURE__ */ optional(/* @__PURE__ */ literal(false)),
	preserveModules: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Preserve module structure")),
	preserveModulesRoot: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Put preserved modules under this path at root level")),
	virtualDirname: /* @__PURE__ */ optional(/* @__PURE__ */ string()),
	minifyInternalExports: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Minify internal exports")),
	topLevelVar: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Rewrite top-level declarations to use `var`.")),
	cleanDir: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Clean output directory before emitting output")),
	keepNames: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Keep function and class names after bundling")),
	strictExecutionOrder: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Lets modules be executed in the order they are declared.")),
	strict: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ literal("auto")])), /* @__PURE__ */ description("Whether to always output `\"use strict\"` directive in non-ES module outputs."))
});
const getAddonDescription = (placement, wrapper) => {
	return `Code to insert the ${styleText$1("bold", placement)} of the bundled file (${styleText$1("bold", wrapper)} the wrapper function)`;
};
const OutputCliOverrideSchema = /* @__PURE__ */ strictObject({
	assetFileNames: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Name pattern for asset files")),
	entryFileNames: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Name pattern for emitted entry chunks")),
	chunkFileNames: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("Name pattern for emitted secondary chunks")),
	sanitizeFileName: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Sanitize file name")),
	banner: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description(getAddonDescription("top", "outside"))),
	footer: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description(getAddonDescription("bottom", "outside"))),
	postBanner: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("A string to prepend to the top of each chunk. Applied after the `renderChunk` hook and minification")),
	postFooter: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description("A string to append to the bottom of each chunk. Applied after the `renderChunk` hook and minification")),
	intro: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description(getAddonDescription("top", "inside"))),
	outro: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ string()), /* @__PURE__ */ description(getAddonDescription("bottom", "inside"))),
	esModule: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Always generate `__esModule` marks in non-ESM formats, defaults to `if-default-prop` (use `--no-esModule` to always disable)")),
	globals: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ record(/* @__PURE__ */ string(), /* @__PURE__ */ string())), /* @__PURE__ */ description("Global variable of UMD / IIFE dependencies (syntax: `key:value`)")),
	codeSplitting: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ union([/* @__PURE__ */ boolean(), /* @__PURE__ */ strictObject({
		minSize: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ number()), /* @__PURE__ */ description("Minimum size of the chunk")),
		minShareCount: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ number()), /* @__PURE__ */ description("Minimum share count of the chunk"))
	})])), /* @__PURE__ */ description("Code splitting options (true, false, or object)")),
	advancedChunks: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ strictObject({
		minSize: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ number()), /* @__PURE__ */ description("Minimum size of the chunk")),
		minShareCount: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ number()), /* @__PURE__ */ description("Minimum share count of the chunk"))
	})), /* @__PURE__ */ description("Deprecated: use codeSplitting instead")),
	minify: /* @__PURE__ */ pipe(/* @__PURE__ */ optional(/* @__PURE__ */ boolean()), /* @__PURE__ */ description("Minify the bundled file"))
});
const OutputCliOptionsSchema = /* @__PURE__ */ omit(/* @__PURE__ */ strictObject({
	...OutputOptionsSchema.entries,
	...OutputCliOverrideSchema.entries
}), [
	"sourcemapIgnoreList",
	"sourcemapPathTransform",
	"plugins",
	"hoistTransitiveImports"
]);
({
	...InputCliOptionsSchema.entries,
	...OutputCliOptionsSchema.entries
});
var RolldownOutputImpl = class extends PlainObjectLike {
	bindingOutputs;
	constructor(bindingOutputs) {
		super();
		this.bindingOutputs = bindingOutputs;
	}
	get output() {
		return transformToRollupOutput(this.bindingOutputs).output;
	}
	__rolldown_external_memory_handle__(keepDataAlive) {
		const results = this.output.map((item) => item.__rolldown_external_memory_handle__(keepDataAlive));
		if (!results.every((r) => r.freed)) {
			const reasons = results.filter((r) => !r.freed).map((r) => r.reason).filter(Boolean);
			return {
				freed: false,
				reason: `Failed to free ${reasons.length} item(s): ${reasons.join("; ")}`
			};
		}
		return { freed: true };
	}
};
__decorate([lazyProp], RolldownOutputImpl.prototype, "output", null);
const LogLevels = {
	silent: Number.NEGATIVE_INFINITY,
	fatal: 0,
	error: 0,
	warn: 1,
	log: 2,
	info: 3,
	success: 3,
	fail: 3,
	ready: 3,
	start: 3,
	box: 3,
	debug: 4,
	trace: 5,
	verbose: Number.POSITIVE_INFINITY
};
const LogTypes = {
	silent: { level: -1 },
	fatal: { level: LogLevels.fatal },
	error: { level: LogLevels.error },
	warn: { level: LogLevels.warn },
	log: { level: LogLevels.log },
	info: { level: LogLevels.info },
	success: { level: LogLevels.success },
	fail: { level: LogLevels.fail },
	ready: { level: LogLevels.info },
	start: { level: LogLevels.info },
	box: { level: LogLevels.info },
	debug: { level: LogLevels.debug },
	trace: { level: LogLevels.trace },
	verbose: { level: LogLevels.verbose }
};
function isPlainObject$1(value) {
	if (value === null || typeof value !== "object") return false;
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) return false;
	if (Symbol.iterator in value) return false;
	if (Symbol.toStringTag in value) return Object.prototype.toString.call(value) === "[object Module]";
	return true;
}
function _defu(baseObject, defaults, namespace = ".", merger) {
	if (!isPlainObject$1(defaults)) return _defu(baseObject, {}, namespace, merger);
	const object = Object.assign({}, defaults);
	for (const key in baseObject) {
		if (key === "__proto__" || key === "constructor") continue;
		const value = baseObject[key];
		if (value === null || value === void 0) continue;
		if (merger && merger(object, key, value, namespace)) continue;
		if (Array.isArray(value) && Array.isArray(object[key])) object[key] = [...value, ...object[key]];
		else if (isPlainObject$1(value) && isPlainObject$1(object[key])) object[key] = _defu(value, object[key], (namespace ? `${namespace}.` : "") + key.toString(), merger);
		else object[key] = value;
	}
	return object;
}
function createDefu(merger) {
	return (...arguments_) => arguments_.reduce((p, c) => _defu(p, c, "", merger), {});
}
const defu = createDefu();
function isPlainObject(obj) {
	return Object.prototype.toString.call(obj) === "[object Object]";
}
function isLogObj(arg) {
	if (!isPlainObject(arg)) return false;
	if (!arg.message && !arg.args) return false;
	if (arg.stack) return false;
	return true;
}
let paused = false;
const queue = [];
var Consola = class Consola {
	options;
	_lastLog;
	_mockFn;
	/**
	* Creates an instance of Consola with specified options or defaults.
	*
	* @param {Partial<ConsolaOptions>} [options={}] - Configuration options for the Consola instance.
	*/
	constructor(options = {}) {
		const types = options.types || LogTypes;
		this.options = defu({
			...options,
			defaults: { ...options.defaults },
			level: _normalizeLogLevel(options.level, types),
			reporters: [...options.reporters || []]
		}, {
			types: LogTypes,
			throttle: 1e3,
			throttleMin: 5,
			formatOptions: {
				date: true,
				colors: false,
				compact: true
			}
		});
		for (const type in types) {
			const defaults = {
				type,
				...this.options.defaults,
				...types[type]
			};
			this[type] = this._wrapLogFn(defaults);
			this[type].raw = this._wrapLogFn(defaults, true);
		}
		if (this.options.mockFn) this.mockTypes();
		this._lastLog = {};
	}
	/**
	* Gets the current log level of the Consola instance.
	*
	* @returns {number} The current log level.
	*/
	get level() {
		return this.options.level;
	}
	/**
	* Sets the minimum log level that will be output by the instance.
	*
	* @param {number} level - The new log level to set.
	*/
	set level(level) {
		this.options.level = _normalizeLogLevel(level, this.options.types, this.options.level);
	}
	/**
	* Displays a prompt to the user and returns the response.
	* Throw an error if `prompt` is not supported by the current configuration.
	*
	* @template T
	* @param {string} message - The message to display in the prompt.
	* @param {T} [opts] - Optional options for the prompt. See {@link PromptOptions}.
	* @returns {promise<T>} A promise that infer with the prompt options. See {@link PromptOptions}.
	*/
	prompt(message, opts) {
		if (!this.options.prompt) throw new Error("prompt is not supported!");
		return this.options.prompt(message, opts);
	}
	/**
	* Creates a new instance of Consola, inheriting options from the current instance, with possible overrides.
	*
	* @param {Partial<ConsolaOptions>} options - Optional overrides for the new instance. See {@link ConsolaOptions}.
	* @returns {ConsolaInstance} A new Consola instance. See {@link ConsolaInstance}.
	*/
	create(options) {
		const instance = new Consola({
			...this.options,
			...options
		});
		if (this._mockFn) instance.mockTypes(this._mockFn);
		return instance;
	}
	/**
	* Creates a new Consola instance with the specified default log object properties.
	*
	* @param {InputLogObject} defaults - Default properties to include in any log from the new instance. See {@link InputLogObject}.
	* @returns {ConsolaInstance} A new Consola instance. See {@link ConsolaInstance}.
	*/
	withDefaults(defaults) {
		return this.create({
			...this.options,
			defaults: {
				...this.options.defaults,
				...defaults
			}
		});
	}
	/**
	* Creates a new Consola instance with a specified tag, which will be included in every log.
	*
	* @param {string} tag - The tag to include in each log of the new instance.
	* @returns {ConsolaInstance} A new Consola instance. See {@link ConsolaInstance}.
	*/
	withTag(tag) {
		return this.withDefaults({ tag: this.options.defaults.tag ? this.options.defaults.tag + ":" + tag : tag });
	}
	/**
	* Adds a custom reporter to the Consola instance.
	* Reporters will be called for each log message, depending on their implementation and log level.
	*
	* @param {ConsolaReporter} reporter - The reporter to add. See {@link ConsolaReporter}.
	* @returns {Consola} The current Consola instance.
	*/
	addReporter(reporter) {
		this.options.reporters.push(reporter);
		return this;
	}
	/**
	* Removes a custom reporter from the Consola instance.
	* If no reporter is specified, all reporters will be removed.
	*
	* @param {ConsolaReporter} reporter - The reporter to remove. See {@link ConsolaReporter}.
	* @returns {Consola} The current Consola instance.
	*/
	removeReporter(reporter) {
		if (reporter) {
			const i = this.options.reporters.indexOf(reporter);
			if (i !== -1) return this.options.reporters.splice(i, 1);
		} else this.options.reporters.splice(0);
		return this;
	}
	/**
	* Replaces all reporters of the Consola instance with the specified array of reporters.
	*
	* @param {ConsolaReporter[]} reporters - The new reporters to set. See {@link ConsolaReporter}.
	* @returns {Consola} The current Consola instance.
	*/
	setReporters(reporters) {
		this.options.reporters = Array.isArray(reporters) ? reporters : [reporters];
		return this;
	}
	wrapAll() {
		this.wrapConsole();
		this.wrapStd();
	}
	restoreAll() {
		this.restoreConsole();
		this.restoreStd();
	}
	/**
	* Overrides console methods with Consola logging methods for consistent logging.
	*/
	wrapConsole() {
		for (const type in this.options.types) {
			if (!console["__" + type]) console["__" + type] = console[type];
			console[type] = this[type].raw;
		}
	}
	/**
	* Restores the original console methods, removing Consola overrides.
	*/
	restoreConsole() {
		for (const type in this.options.types) if (console["__" + type]) {
			console[type] = console["__" + type];
			delete console["__" + type];
		}
	}
	/**
	* Overrides standard output and error streams to redirect them through Consola.
	*/
	wrapStd() {
		this._wrapStream(this.options.stdout, "log");
		this._wrapStream(this.options.stderr, "log");
	}
	_wrapStream(stream, type) {
		if (!stream) return;
		if (!stream.__write) stream.__write = stream.write;
		stream.write = (data) => {
			this[type].raw(String(data).trim());
		};
	}
	/**
	* Restores the original standard output and error streams, removing the Consola redirection.
	*/
	restoreStd() {
		this._restoreStream(this.options.stdout);
		this._restoreStream(this.options.stderr);
	}
	_restoreStream(stream) {
		if (!stream) return;
		if (stream.__write) {
			stream.write = stream.__write;
			delete stream.__write;
		}
	}
	/**
	* Pauses logging, queues incoming logs until resumed.
	*/
	pauseLogs() {
		paused = true;
	}
	/**
	* Resumes logging, processing any queued logs.
	*/
	resumeLogs() {
		paused = false;
		const _queue = queue.splice(0);
		for (const item of _queue) item[0]._logFn(item[1], item[2]);
	}
	/**
	* Replaces logging methods with mocks if a mock function is provided.
	*
	* @param {ConsolaOptions["mockFn"]} mockFn - The function to use for mocking logging methods. See {@link ConsolaOptions["mockFn"]}.
	*/
	mockTypes(mockFn) {
		const _mockFn = mockFn || this.options.mockFn;
		this._mockFn = _mockFn;
		if (typeof _mockFn !== "function") return;
		for (const type in this.options.types) {
			this[type] = _mockFn(type, this.options.types[type]) || this[type];
			this[type].raw = this[type];
		}
	}
	_wrapLogFn(defaults, isRaw) {
		return (...args) => {
			if (paused) {
				queue.push([
					this,
					defaults,
					args,
					isRaw
				]);
				return;
			}
			return this._logFn(defaults, args, isRaw);
		};
	}
	_logFn(defaults, args, isRaw) {
		if ((defaults.level || 0) > this.level) return false;
		const logObj = {
			date: /* @__PURE__ */ new Date(),
			args: [],
			...defaults,
			level: _normalizeLogLevel(defaults.level, this.options.types)
		};
		if (!isRaw && args.length === 1 && isLogObj(args[0])) Object.assign(logObj, args[0]);
		else logObj.args = [...args];
		if (logObj.message) {
			logObj.args.unshift(logObj.message);
			delete logObj.message;
		}
		if (logObj.additional) {
			if (!Array.isArray(logObj.additional)) logObj.additional = logObj.additional.split("\n");
			logObj.args.push("\n" + logObj.additional.join("\n"));
			delete logObj.additional;
		}
		logObj.type = typeof logObj.type === "string" ? logObj.type.toLowerCase() : "log";
		logObj.tag = typeof logObj.tag === "string" ? logObj.tag : "";
		const resolveLog = (newLog = false) => {
			const repeated = (this._lastLog.count || 0) - this.options.throttleMin;
			if (this._lastLog.object && repeated > 0) {
				const args2 = [...this._lastLog.object.args];
				if (repeated > 1) args2.push(`(repeated ${repeated} times)`);
				this._log({
					...this._lastLog.object,
					args: args2
				});
				this._lastLog.count = 1;
			}
			if (newLog) {
				this._lastLog.object = logObj;
				this._log(logObj);
			}
		};
		clearTimeout(this._lastLog.timeout);
		const diffTime = this._lastLog.time && logObj.date ? logObj.date.getTime() - this._lastLog.time.getTime() : 0;
		this._lastLog.time = logObj.date;
		if (diffTime < this.options.throttle) try {
			const serializedLog = JSON.stringify([
				logObj.type,
				logObj.tag,
				logObj.args
			]);
			const isSameLog = this._lastLog.serialized === serializedLog;
			this._lastLog.serialized = serializedLog;
			if (isSameLog) {
				this._lastLog.count = (this._lastLog.count || 0) + 1;
				if (this._lastLog.count > this.options.throttleMin) {
					this._lastLog.timeout = setTimeout(resolveLog, this.options.throttle);
					return;
				}
			}
		} catch {}
		resolveLog(true);
	}
	_log(logObj) {
		for (const reporter of this.options.reporters) reporter.log(logObj, { options: this.options });
	}
};
function _normalizeLogLevel(input, types = {}, defaultLevel = 3) {
	if (input === void 0) return defaultLevel;
	if (typeof input === "number") return input;
	if (types[input] && types[input].level !== void 0) return types[input].level;
	return defaultLevel;
}
Consola.prototype.add = Consola.prototype.addReporter;
Consola.prototype.remove = Consola.prototype.removeReporter;
Consola.prototype.clear = Consola.prototype.removeReporter;
Consola.prototype.withScope = Consola.prototype.withTag;
Consola.prototype.mock = Consola.prototype.mockTypes;
Consola.prototype.pause = Consola.prototype.pauseLogs;
Consola.prototype.resume = Consola.prototype.resumeLogs;
function createConsola$1(options = {}) {
	return new Consola(options);
}
function parseStack(stack, message) {
	const cwd = process.cwd() + sep;
	return stack.split("\n").splice(message.split("\n").length).map((l) => l.trim().replace("file://", "").replace(cwd, ""));
}
function writeStream(data, stream) {
	return (stream.__write || stream.write).call(stream, data);
}
const bracket = (x) => x ? `[${x}]` : "";
var BasicReporter = class {
	formatStack(stack, message, opts) {
		const indent = "  ".repeat((opts?.errorLevel || 0) + 1);
		return indent + parseStack(stack, message).join(`
${indent}`);
	}
	formatError(err, opts) {
		const message = err.message ?? formatWithOptions(opts, err);
		const stack = err.stack ? this.formatStack(err.stack, message, opts) : "";
		const level = opts?.errorLevel || 0;
		const causedPrefix = level > 0 ? `${"  ".repeat(level)}[cause]: ` : "";
		const causedError = err.cause ? "\n\n" + this.formatError(err.cause, {
			...opts,
			errorLevel: level + 1
		}) : "";
		return causedPrefix + message + "\n" + stack + causedError;
	}
	formatArgs(args, opts) {
		return formatWithOptions(opts, ...args.map((arg) => {
			if (arg && typeof arg.stack === "string") return this.formatError(arg, opts);
			return arg;
		}));
	}
	formatDate(date, opts) {
		return opts.date ? date.toLocaleTimeString() : "";
	}
	filterAndJoin(arr) {
		return arr.filter(Boolean).join(" ");
	}
	formatLogObj(logObj, opts) {
		const message = this.formatArgs(logObj.args, opts);
		if (logObj.type === "box") return "\n" + [
			bracket(logObj.tag),
			logObj.title && logObj.title,
			...message.split("\n")
		].filter(Boolean).map((l) => " > " + l).join("\n") + "\n";
		return this.filterAndJoin([
			bracket(logObj.type),
			bracket(logObj.tag),
			message
		]);
	}
	log(logObj, ctx) {
		return writeStream(this.formatLogObj(logObj, {
			columns: ctx.options.stdout.columns || 0,
			...ctx.options.formatOptions
		}) + "\n", logObj.level < 2 ? ctx.options.stderr || process.stderr : ctx.options.stdout || process.stdout);
	}
};
const { env = {}, argv = [], platform: platform$1 = "" } = typeof process === "undefined" ? {} : process;
const isDisabled = "NO_COLOR" in env || argv.includes("--no-color");
const isForced = "FORCE_COLOR" in env || argv.includes("--color");
const isWindows$2 = platform$1 === "win32";
const isDumbTerminal = env.TERM === "dumb";
const isCompatibleTerminal = tty && tty.isatty && tty.isatty(1) && env.TERM && !isDumbTerminal;
const isCI = "CI" in env && ("GITHUB_ACTIONS" in env || "GITLAB_CI" in env || "CIRCLECI" in env);
const isColorSupported = !isDisabled && (isForced || isWindows$2 && !isDumbTerminal || isCompatibleTerminal || isCI);
function replaceClose(index, string, close, replace, head = string.slice(0, Math.max(0, index)) + replace, tail = string.slice(Math.max(0, index + close.length)), next = tail.indexOf(close)) {
	return head + (next < 0 ? tail : replaceClose(next, tail, close, replace));
}
function clearBleed(index, string, open, close, replace) {
	return index < 0 ? open + string + close : open + replaceClose(index, string, close, replace) + close;
}
function filterEmpty(open, close, replace = open, at = open.length + 1) {
	return (string) => string || !(string === "" || string === void 0) ? clearBleed(("" + string).indexOf(close, at), string, open, close, replace) : "";
}
function init$2(open, close, replace) {
	return filterEmpty(`\x1B[${open}m`, `\x1B[${close}m`, replace);
}
const colorDefs = {
	reset: init$2(0, 0),
	bold: init$2(1, 22, "\x1B[22m\x1B[1m"),
	dim: init$2(2, 22, "\x1B[22m\x1B[2m"),
	italic: init$2(3, 23),
	underline: init$2(4, 24),
	inverse: init$2(7, 27),
	hidden: init$2(8, 28),
	strikethrough: init$2(9, 29),
	black: init$2(30, 39),
	red: init$2(31, 39),
	green: init$2(32, 39),
	yellow: init$2(33, 39),
	blue: init$2(34, 39),
	magenta: init$2(35, 39),
	cyan: init$2(36, 39),
	white: init$2(37, 39),
	gray: init$2(90, 39),
	bgBlack: init$2(40, 49),
	bgRed: init$2(41, 49),
	bgGreen: init$2(42, 49),
	bgYellow: init$2(43, 49),
	bgBlue: init$2(44, 49),
	bgMagenta: init$2(45, 49),
	bgCyan: init$2(46, 49),
	bgWhite: init$2(47, 49),
	blackBright: init$2(90, 39),
	redBright: init$2(91, 39),
	greenBright: init$2(92, 39),
	yellowBright: init$2(93, 39),
	blueBright: init$2(94, 39),
	magentaBright: init$2(95, 39),
	cyanBright: init$2(96, 39),
	whiteBright: init$2(97, 39),
	bgBlackBright: init$2(100, 49),
	bgRedBright: init$2(101, 49),
	bgGreenBright: init$2(102, 49),
	bgYellowBright: init$2(103, 49),
	bgBlueBright: init$2(104, 49),
	bgMagentaBright: init$2(105, 49),
	bgCyanBright: init$2(106, 49),
	bgWhiteBright: init$2(107, 49)
};
function createColors(useColor = isColorSupported) {
	return useColor ? colorDefs : Object.fromEntries(Object.keys(colorDefs).map((key) => [key, String]));
}
const colors = createColors();
function getColor$1(color, fallback = "reset") {
	return colors[color] || colors[fallback];
}
const ansiRegex$1 = [String.raw`[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d\/#&.:=?%@~_]*)*)?\u0007)`, String.raw`(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))`].join("|");
function stripAnsi$1(text) {
	return text.replace(new RegExp(ansiRegex$1, "g"), "");
}
const boxStylePresets = {
	solid: {
		tl: "┌",
		tr: "┐",
		bl: "└",
		br: "┘",
		h: "─",
		v: "│"
	},
	double: {
		tl: "╔",
		tr: "╗",
		bl: "╚",
		br: "╝",
		h: "═",
		v: "║"
	},
	doubleSingle: {
		tl: "╓",
		tr: "╖",
		bl: "╙",
		br: "╜",
		h: "─",
		v: "║"
	},
	doubleSingleRounded: {
		tl: "╭",
		tr: "╮",
		bl: "╰",
		br: "╯",
		h: "─",
		v: "║"
	},
	singleThick: {
		tl: "┏",
		tr: "┓",
		bl: "┗",
		br: "┛",
		h: "━",
		v: "┃"
	},
	singleDouble: {
		tl: "╒",
		tr: "╕",
		bl: "╘",
		br: "╛",
		h: "═",
		v: "│"
	},
	singleDoubleRounded: {
		tl: "╭",
		tr: "╮",
		bl: "╰",
		br: "╯",
		h: "═",
		v: "│"
	},
	rounded: {
		tl: "╭",
		tr: "╮",
		bl: "╰",
		br: "╯",
		h: "─",
		v: "│"
	}
};
const defaultStyle = {
	borderColor: "white",
	borderStyle: "rounded",
	valign: "center",
	padding: 2,
	marginLeft: 1,
	marginTop: 1,
	marginBottom: 1
};
function box(text, _opts = {}) {
	const opts = {
		..._opts,
		style: {
			...defaultStyle,
			..._opts.style
		}
	};
	const textLines = text.split("\n");
	const boxLines = [];
	const _color = getColor$1(opts.style.borderColor);
	const borderStyle = { ...typeof opts.style.borderStyle === "string" ? boxStylePresets[opts.style.borderStyle] || boxStylePresets.solid : opts.style.borderStyle };
	if (_color) for (const key in borderStyle) borderStyle[key] = _color(borderStyle[key]);
	const paddingOffset = opts.style.padding % 2 === 0 ? opts.style.padding : opts.style.padding + 1;
	const height = textLines.length + paddingOffset;
	const width = Math.max(...textLines.map((line) => stripAnsi$1(line).length), opts.title ? stripAnsi$1(opts.title).length : 0) + paddingOffset;
	const widthOffset = width + paddingOffset;
	const leftSpace = opts.style.marginLeft > 0 ? " ".repeat(opts.style.marginLeft) : "";
	if (opts.style.marginTop > 0) boxLines.push("".repeat(opts.style.marginTop));
	if (opts.title) {
		const title = _color ? _color(opts.title) : opts.title;
		const left = borderStyle.h.repeat(Math.floor((width - stripAnsi$1(opts.title).length) / 2));
		const right = borderStyle.h.repeat(width - stripAnsi$1(opts.title).length - stripAnsi$1(left).length + paddingOffset);
		boxLines.push(`${leftSpace}${borderStyle.tl}${left}${title}${right}${borderStyle.tr}`);
	} else boxLines.push(`${leftSpace}${borderStyle.tl}${borderStyle.h.repeat(widthOffset)}${borderStyle.tr}`);
	const valignOffset = opts.style.valign === "center" ? Math.floor((height - textLines.length) / 2) : opts.style.valign === "top" ? height - textLines.length - paddingOffset : height - textLines.length;
	for (let i = 0; i < height; i++) if (i < valignOffset || i >= valignOffset + textLines.length) boxLines.push(`${leftSpace}${borderStyle.v}${" ".repeat(widthOffset)}${borderStyle.v}`);
	else {
		const line = textLines[i - valignOffset];
		const left = " ".repeat(paddingOffset);
		const right = " ".repeat(width - stripAnsi$1(line).length);
		boxLines.push(`${leftSpace}${borderStyle.v}${left}${line}${right}${borderStyle.v}`);
	}
	boxLines.push(`${leftSpace}${borderStyle.bl}${borderStyle.h.repeat(widthOffset)}${borderStyle.br}`);
	if (opts.style.marginBottom > 0) boxLines.push("".repeat(opts.style.marginBottom));
	return boxLines.join("\n");
}
const r = Object.create(null), i = (e) => globalThis.process?.env || import.meta.env || globalThis.Deno?.env.toObject() || globalThis.__env__ || (e ? r : globalThis), o = new Proxy(r, {
	get(e, s) {
		return i()[s] ?? r[s];
	},
	has(e, s) {
		return s in i() || s in r;
	},
	set(e, s, E) {
		const B = i(true);
		return B[s] = E, true;
	},
	deleteProperty(e, s) {
		if (!s) return false;
		const E = i(true);
		return delete E[s], true;
	},
	ownKeys() {
		const e = i(true);
		return Object.keys(e);
	}
}), t = typeof process < "u" && process.env && process.env.NODE_ENV || "", f = [
	["APPVEYOR"],
	[
		"AWS_AMPLIFY",
		"AWS_APP_ID",
		{ ci: true }
	],
	["AZURE_PIPELINES", "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"],
	["AZURE_STATIC", "INPUT_AZURE_STATIC_WEB_APPS_API_TOKEN"],
	["APPCIRCLE", "AC_APPCIRCLE"],
	["BAMBOO", "bamboo_planKey"],
	["BITBUCKET", "BITBUCKET_COMMIT"],
	["BITRISE", "BITRISE_IO"],
	["BUDDY", "BUDDY_WORKSPACE_ID"],
	["BUILDKITE"],
	["CIRCLE", "CIRCLECI"],
	["CIRRUS", "CIRRUS_CI"],
	[
		"CLOUDFLARE_PAGES",
		"CF_PAGES",
		{ ci: true }
	],
	["CODEBUILD", "CODEBUILD_BUILD_ARN"],
	["CODEFRESH", "CF_BUILD_ID"],
	["DRONE"],
	["DRONE", "DRONE_BUILD_EVENT"],
	["DSARI"],
	["GITHUB_ACTIONS"],
	["GITLAB", "GITLAB_CI"],
	["GITLAB", "CI_MERGE_REQUEST_ID"],
	["GOCD", "GO_PIPELINE_LABEL"],
	["LAYERCI"],
	["HUDSON", "HUDSON_URL"],
	["JENKINS", "JENKINS_URL"],
	["MAGNUM"],
	["NETLIFY"],
	[
		"NETLIFY",
		"NETLIFY_LOCAL",
		{ ci: false }
	],
	["NEVERCODE"],
	["RENDER"],
	["SAIL", "SAILCI"],
	["SEMAPHORE"],
	["SCREWDRIVER"],
	["SHIPPABLE"],
	["SOLANO", "TDDIUM"],
	["STRIDER"],
	["TEAMCITY", "TEAMCITY_VERSION"],
	["TRAVIS"],
	["VERCEL", "NOW_BUILDER"],
	[
		"VERCEL",
		"VERCEL",
		{ ci: false }
	],
	[
		"VERCEL",
		"VERCEL_ENV",
		{ ci: false }
	],
	["APPCENTER", "APPCENTER_BUILD_ID"],
	[
		"CODESANDBOX",
		"CODESANDBOX_SSE",
		{ ci: false }
	],
	[
		"CODESANDBOX",
		"CODESANDBOX_HOST",
		{ ci: false }
	],
	["STACKBLITZ"],
	["STORMKIT"],
	["CLEAVR"],
	["ZEABUR"],
	[
		"CODESPHERE",
		"CODESPHERE_APP_ID",
		{ ci: true }
	],
	["RAILWAY", "RAILWAY_PROJECT_ID"],
	["RAILWAY", "RAILWAY_SERVICE_ID"],
	["DENO-DEPLOY", "DENO_DEPLOYMENT_ID"],
	[
		"FIREBASE_APP_HOSTING",
		"FIREBASE_APP_HOSTING",
		{ ci: true }
	]
];
function b() {
	if (globalThis.process?.env) for (const e of f) {
		const s = e[1] || e[0];
		if (globalThis.process?.env[s]) return {
			name: e[0].toLowerCase(),
			...e[2]
		};
	}
	return globalThis.process?.env?.SHELL === "/bin/jsh" && globalThis.process?.versions?.webcontainer ? {
		name: "stackblitz",
		ci: false
	} : {
		name: "",
		ci: false
	};
}
const l = b();
l.name;
function n(e) {
	return e ? e !== "false" : false;
}
const I = globalThis.process?.platform || "", T = n(o.CI) || l.ci !== false, a = n(globalThis.process?.stdout && globalThis.process?.stdout.isTTY), g = n(o.DEBUG), R = t === "test" || n(o.TEST);
o.MINIMAL;
const A$1 = /^win/i.test(I);
!n(o.NO_COLOR) && (n(o.FORCE_COLOR) || (a || A$1) && o.TERM);
const C$1 = (globalThis.process?.versions?.node || "").replace(/^v/, "") || null;
Number(C$1?.split(".")[0]);
const y = globalThis.process || Object.create(null), _ = { versions: {} };
new Proxy(y, { get(e, s) {
	if (s === "env") return o;
	if (s in e) return e[s];
	if (s in _) return _[s];
} });
const c = globalThis.process?.release?.name === "node", O = !!globalThis.Bun || !!globalThis.process?.versions?.bun, D = !!globalThis.Deno, L = !!globalThis.fastly, S = !!globalThis.Netlify, u = !!globalThis.EdgeRuntime, N = globalThis.navigator?.userAgent === "Cloudflare-Workers", F = [
	[S, "netlify"],
	[u, "edge-light"],
	[N, "workerd"],
	[L, "fastly"],
	[D, "deno"],
	[O, "bun"],
	[c, "node"]
];
function G() {
	const e = F.find((s) => s[0]);
	if (e) return { name: e[1] };
}
G()?.name;
function ansiRegex({ onlyFirst = false } = {}) {
	const pattern = [`[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))`, "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"].join("|");
	return new RegExp(pattern, onlyFirst ? void 0 : "g");
}
const regex = ansiRegex();
function stripAnsi(string) {
	if (typeof string !== "string") throw new TypeError(`Expected a \`string\`, got \`${typeof string}\``);
	return string.replace(regex, "");
}
function isAmbiguous(x) {
	return x === 161 || x === 164 || x === 167 || x === 168 || x === 170 || x === 173 || x === 174 || x >= 176 && x <= 180 || x >= 182 && x <= 186 || x >= 188 && x <= 191 || x === 198 || x === 208 || x === 215 || x === 216 || x >= 222 && x <= 225 || x === 230 || x >= 232 && x <= 234 || x === 236 || x === 237 || x === 240 || x === 242 || x === 243 || x >= 247 && x <= 250 || x === 252 || x === 254 || x === 257 || x === 273 || x === 275 || x === 283 || x === 294 || x === 295 || x === 299 || x >= 305 && x <= 307 || x === 312 || x >= 319 && x <= 322 || x === 324 || x >= 328 && x <= 331 || x === 333 || x === 338 || x === 339 || x === 358 || x === 359 || x === 363 || x === 462 || x === 464 || x === 466 || x === 468 || x === 470 || x === 472 || x === 474 || x === 476 || x === 593 || x === 609 || x === 708 || x === 711 || x >= 713 && x <= 715 || x === 717 || x === 720 || x >= 728 && x <= 731 || x === 733 || x === 735 || x >= 768 && x <= 879 || x >= 913 && x <= 929 || x >= 931 && x <= 937 || x >= 945 && x <= 961 || x >= 963 && x <= 969 || x === 1025 || x >= 1040 && x <= 1103 || x === 1105 || x === 8208 || x >= 8211 && x <= 8214 || x === 8216 || x === 8217 || x === 8220 || x === 8221 || x >= 8224 && x <= 8226 || x >= 8228 && x <= 8231 || x === 8240 || x === 8242 || x === 8243 || x === 8245 || x === 8251 || x === 8254 || x === 8308 || x === 8319 || x >= 8321 && x <= 8324 || x === 8364 || x === 8451 || x === 8453 || x === 8457 || x === 8467 || x === 8470 || x === 8481 || x === 8482 || x === 8486 || x === 8491 || x === 8531 || x === 8532 || x >= 8539 && x <= 8542 || x >= 8544 && x <= 8555 || x >= 8560 && x <= 8569 || x === 8585 || x >= 8592 && x <= 8601 || x === 8632 || x === 8633 || x === 8658 || x === 8660 || x === 8679 || x === 8704 || x === 8706 || x === 8707 || x === 8711 || x === 8712 || x === 8715 || x === 8719 || x === 8721 || x === 8725 || x === 8730 || x >= 8733 && x <= 8736 || x === 8739 || x === 8741 || x >= 8743 && x <= 8748 || x === 8750 || x >= 8756 && x <= 8759 || x === 8764 || x === 8765 || x === 8776 || x === 8780 || x === 8786 || x === 8800 || x === 8801 || x >= 8804 && x <= 8807 || x === 8810 || x === 8811 || x === 8814 || x === 8815 || x === 8834 || x === 8835 || x === 8838 || x === 8839 || x === 8853 || x === 8857 || x === 8869 || x === 8895 || x === 8978 || x >= 9312 && x <= 9449 || x >= 9451 && x <= 9547 || x >= 9552 && x <= 9587 || x >= 9600 && x <= 9615 || x >= 9618 && x <= 9621 || x === 9632 || x === 9633 || x >= 9635 && x <= 9641 || x === 9650 || x === 9651 || x === 9654 || x === 9655 || x === 9660 || x === 9661 || x === 9664 || x === 9665 || x >= 9670 && x <= 9672 || x === 9675 || x >= 9678 && x <= 9681 || x >= 9698 && x <= 9701 || x === 9711 || x === 9733 || x === 9734 || x === 9737 || x === 9742 || x === 9743 || x === 9756 || x === 9758 || x === 9792 || x === 9794 || x === 9824 || x === 9825 || x >= 9827 && x <= 9829 || x >= 9831 && x <= 9834 || x === 9836 || x === 9837 || x === 9839 || x === 9886 || x === 9887 || x === 9919 || x >= 9926 && x <= 9933 || x >= 9935 && x <= 9939 || x >= 9941 && x <= 9953 || x === 9955 || x === 9960 || x === 9961 || x >= 9963 && x <= 9969 || x === 9972 || x >= 9974 && x <= 9977 || x === 9979 || x === 9980 || x === 9982 || x === 9983 || x === 10045 || x >= 10102 && x <= 10111 || x >= 11094 && x <= 11097 || x >= 12872 && x <= 12879 || x >= 57344 && x <= 63743 || x >= 65024 && x <= 65039 || x === 65533 || x >= 127232 && x <= 127242 || x >= 127248 && x <= 127277 || x >= 127280 && x <= 127337 || x >= 127344 && x <= 127373 || x === 127375 || x === 127376 || x >= 127387 && x <= 127404 || x >= 917760 && x <= 917999 || x >= 983040 && x <= 1048573 || x >= 1048576 && x <= 1114109;
}
function isFullWidth(x) {
	return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
}
function isWide(x) {
	return x >= 4352 && x <= 4447 || x === 8986 || x === 8987 || x === 9001 || x === 9002 || x >= 9193 && x <= 9196 || x === 9200 || x === 9203 || x === 9725 || x === 9726 || x === 9748 || x === 9749 || x >= 9776 && x <= 9783 || x >= 9800 && x <= 9811 || x === 9855 || x >= 9866 && x <= 9871 || x === 9875 || x === 9889 || x === 9898 || x === 9899 || x === 9917 || x === 9918 || x === 9924 || x === 9925 || x === 9934 || x === 9940 || x === 9962 || x === 9970 || x === 9971 || x === 9973 || x === 9978 || x === 9981 || x === 9989 || x === 9994 || x === 9995 || x === 10024 || x === 10060 || x === 10062 || x >= 10067 && x <= 10069 || x === 10071 || x >= 10133 && x <= 10135 || x === 10160 || x === 10175 || x === 11035 || x === 11036 || x === 11088 || x === 11093 || x >= 11904 && x <= 11929 || x >= 11931 && x <= 12019 || x >= 12032 && x <= 12245 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12353 && x <= 12438 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12773 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 42124 || x >= 42128 && x <= 42182 || x >= 43360 && x <= 43388 || x >= 44032 && x <= 55203 || x >= 63744 && x <= 64255 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 94176 && x <= 94180 || x === 94192 || x === 94193 || x >= 94208 && x <= 100343 || x >= 100352 && x <= 101589 || x >= 101631 && x <= 101640 || x >= 110576 && x <= 110579 || x >= 110581 && x <= 110587 || x === 110589 || x === 110590 || x >= 110592 && x <= 110882 || x === 110898 || x >= 110928 && x <= 110930 || x === 110933 || x >= 110948 && x <= 110951 || x >= 110960 && x <= 111355 || x >= 119552 && x <= 119638 || x >= 119648 && x <= 119670 || x === 126980 || x === 127183 || x === 127374 || x >= 127377 && x <= 127386 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x === 127568 || x === 127569 || x >= 127584 && x <= 127589 || x >= 127744 && x <= 127776 || x >= 127789 && x <= 127797 || x >= 127799 && x <= 127868 || x >= 127870 && x <= 127891 || x >= 127904 && x <= 127946 || x >= 127951 && x <= 127955 || x >= 127968 && x <= 127984 || x === 127988 || x >= 127992 && x <= 128062 || x === 128064 || x >= 128066 && x <= 128252 || x >= 128255 && x <= 128317 || x >= 128331 && x <= 128334 || x >= 128336 && x <= 128359 || x === 128378 || x === 128405 || x === 128406 || x === 128420 || x >= 128507 && x <= 128591 || x >= 128640 && x <= 128709 || x === 128716 || x >= 128720 && x <= 128722 || x >= 128725 && x <= 128727 || x >= 128732 && x <= 128735 || x === 128747 || x === 128748 || x >= 128756 && x <= 128764 || x >= 128992 && x <= 129003 || x === 129008 || x >= 129292 && x <= 129338 || x >= 129340 && x <= 129349 || x >= 129351 && x <= 129535 || x >= 129648 && x <= 129660 || x >= 129664 && x <= 129673 || x >= 129679 && x <= 129734 || x >= 129742 && x <= 129756 || x >= 129759 && x <= 129769 || x >= 129776 && x <= 129784 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
}
function validate(codePoint) {
	if (!Number.isSafeInteger(codePoint)) throw new TypeError(`Expected a code point, got \`${typeof codePoint}\`.`);
}
function eastAsianWidth(codePoint, { ambiguousAsWide = false } = {}) {
	validate(codePoint);
	if (isFullWidth(codePoint) || isWide(codePoint) || ambiguousAsWide && isAmbiguous(codePoint)) return 2;
	return 1;
}
const emojiRegex = () => {
	return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE])))?))?|\uDC6F(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE89\uDE8F-\uDEC2\uDEC6\uDECE-\uDEDC\uDEDF-\uDEE9]|\uDD3C(?:\u200D[\u2640\u2642]\uFE0F?|\uD83C[\uDFFB-\uDFFF])?|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
};
const segmenter = globalThis.Intl?.Segmenter ? new Intl.Segmenter() : { segment: (str) => str.split("") };
const defaultIgnorableCodePointRegex = /^\p{Default_Ignorable_Code_Point}$/u;
function stringWidth$1(string, options = {}) {
	if (typeof string !== "string" || string.length === 0) return 0;
	const { ambiguousIsNarrow = true, countAnsiEscapeCodes = false } = options;
	if (!countAnsiEscapeCodes) string = stripAnsi(string);
	if (string.length === 0) return 0;
	let width = 0;
	const eastAsianWidthOptions = { ambiguousAsWide: !ambiguousIsNarrow };
	for (const { segment: character } of segmenter.segment(string)) {
		const codePoint = character.codePointAt(0);
		if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) continue;
		if (codePoint >= 8203 && codePoint <= 8207 || codePoint === 65279) continue;
		if (codePoint >= 768 && codePoint <= 879 || codePoint >= 6832 && codePoint <= 6911 || codePoint >= 7616 && codePoint <= 7679 || codePoint >= 8400 && codePoint <= 8447 || codePoint >= 65056 && codePoint <= 65071) continue;
		if (codePoint >= 55296 && codePoint <= 57343) continue;
		if (codePoint >= 65024 && codePoint <= 65039) continue;
		if (defaultIgnorableCodePointRegex.test(character)) continue;
		if (emojiRegex().test(character)) {
			width += 2;
			continue;
		}
		width += eastAsianWidth(codePoint, eastAsianWidthOptions);
	}
	return width;
}
function isUnicodeSupported() {
	const { env } = g$1;
	const { TERM, TERM_PROGRAM } = env;
	if (g$1.platform !== "win32") return TERM !== "linux";
	return Boolean(env.WT_SESSION) || Boolean(env.TERMINUS_SUBLIME) || env.ConEmuTask === "{cmd::Cmder}" || TERM_PROGRAM === "Terminus-Sublime" || TERM_PROGRAM === "vscode" || TERM === "xterm-256color" || TERM === "alacritty" || TERM === "rxvt-unicode" || TERM === "rxvt-unicode-256color" || env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
const TYPE_COLOR_MAP = {
	info: "cyan",
	fail: "red",
	success: "green",
	ready: "green",
	start: "magenta"
};
const LEVEL_COLOR_MAP = {
	0: "red",
	1: "yellow"
};
const unicode = isUnicodeSupported();
const s = (c, fallback) => unicode ? c : fallback;
const TYPE_ICONS = {
	error: s("✖", "×"),
	fatal: s("✖", "×"),
	ready: s("✔", "√"),
	warn: s("⚠", "‼"),
	info: s("ℹ", "i"),
	success: s("✔", "√"),
	debug: s("⚙", "D"),
	trace: s("→", "→"),
	fail: s("✖", "×"),
	start: s("◐", "o"),
	log: ""
};
function stringWidth(str) {
	if (!(typeof Intl === "object") || !Intl.Segmenter) return stripAnsi$1(str).length;
	return stringWidth$1(str);
}
var FancyReporter = class extends BasicReporter {
	formatStack(stack, message, opts) {
		const indent = "  ".repeat((opts?.errorLevel || 0) + 1);
		return `
${indent}` + parseStack(stack, message).map((line) => "  " + line.replace(/^at +/, (m) => colors.gray(m)).replace(/\((.+)\)/, (_, m) => `(${colors.cyan(m)})`)).join(`
${indent}`);
	}
	formatType(logObj, isBadge, opts) {
		const typeColor = TYPE_COLOR_MAP[logObj.type] || LEVEL_COLOR_MAP[logObj.level] || "gray";
		if (isBadge) return getBgColor(typeColor)(colors.black(` ${logObj.type.toUpperCase()} `));
		const _type = typeof TYPE_ICONS[logObj.type] === "string" ? TYPE_ICONS[logObj.type] : logObj.icon || logObj.type;
		return _type ? getColor(typeColor)(_type) : "";
	}
	formatLogObj(logObj, opts) {
		const [message, ...additional] = this.formatArgs(logObj.args, opts).split("\n");
		if (logObj.type === "box") return box(characterFormat(message + (additional.length > 0 ? "\n" + additional.join("\n") : "")), {
			title: logObj.title ? characterFormat(logObj.title) : void 0,
			style: logObj.style
		});
		const date = this.formatDate(logObj.date, opts);
		const coloredDate = date && colors.gray(date);
		const isBadge = logObj.badge ?? logObj.level < 2;
		const type = this.formatType(logObj, isBadge, opts);
		const tag = logObj.tag ? colors.gray(logObj.tag) : "";
		let line;
		const left = this.filterAndJoin([type, characterFormat(message)]);
		const right = this.filterAndJoin(opts.columns ? [tag, coloredDate] : [tag]);
		const space = (opts.columns || 0) - stringWidth(left) - stringWidth(right) - 2;
		line = space > 0 && (opts.columns || 0) >= 80 ? left + " ".repeat(space) + right : (right ? `${colors.gray(`[${right}]`)} ` : "") + left;
		line += characterFormat(additional.length > 0 ? "\n" + additional.join("\n") : "");
		if (logObj.type === "trace") {
			const _err = /* @__PURE__ */ new Error("Trace: " + logObj.message);
			line += this.formatStack(_err.stack || "", _err.message);
		}
		return isBadge ? "\n" + line + "\n" : line;
	}
};
function characterFormat(str) {
	return str.replace(/`([^`]+)`/gm, (_, m) => colors.cyan(m)).replace(/\s+_([^_]+)_\s+/gm, (_, m) => ` ${colors.underline(m)} `);
}
function getColor(color = "white") {
	return colors[color] || colors.white;
}
function getBgColor(color = "bgWhite") {
	return colors[`bg${color[0].toUpperCase()}${color.slice(1)}`] || colors.bgWhite;
}
function createConsola(options = {}) {
	let level = _getDefaultLogLevel();
	if (process.env.CONSOLA_LEVEL) level = Number.parseInt(process.env.CONSOLA_LEVEL) ?? level;
	return createConsola$1({
		level,
		defaults: { level },
		stdout: process.stdout,
		stderr: process.stderr,
		prompt: (...args) => import("./prompt-Bgj-uEyc-CQl3VrsW.mjs").then((m) => m.prompt(...args)),
		reporters: options.reporters || [options.fancy ?? !(T || R) ? new FancyReporter() : new BasicReporter()],
		...options
	});
}
function _getDefaultLogLevel() {
	if (g) return LogLevels.debug;
	if (R) return LogLevels.warn;
	return LogLevels.info;
}
createConsola();
process.env.ROLLDOWN_TEST ? createTestingLogger() : createConsola({ formatOptions: { date: false } });
function createTestingLogger() {
	const types = [
		"silent",
		"fatal",
		"error",
		"warn",
		"log",
		"info",
		"success",
		"fail",
		"ready",
		"start",
		"box",
		"debug",
		"trace",
		"verbose"
	];
	const ret = Object.create(null);
	for (const type of types) ret[type] = (...args) => console.log(...args);
	return ret;
}
Symbol.asyncDispose ??= Symbol("Symbol.asyncDispose");
//#endregion
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/rolldown/shared/watch-ECGr-_QS.mjs
/**
* This is not the set of all possible signals.
*
* It IS, however, the set of all signals that trigger
* an exit on either Linux or BSD systems.  Linux is a
* superset of the signal names supported on BSD, and
* the unknown signals just fail to register, so we can
* catch that easily enough.
*
* Windows signals are a different set, since there are
* signals that terminate Windows processes, but don't
* terminate (or don't even exist) on Posix systems.
*
* Don't bother with SIGKILL.  It's uncatchable, which
* means that we can't fire any callbacks anyway.
*
* If a user does happen to register a handler on a non-
* fatal signal like SIGWINCH or something, and then
* exit, it'll end up firing `process.emit('exit')`, so
* the handler will be fired anyway.
*
* SIGBUS, SIGFPE, SIGSEGV and SIGILL, when not raised
* artificially, inherently leave the process in a
* state from which it is not safe to try and enter JS
* listeners.
*/
const signals = [];
signals.push("SIGHUP", "SIGINT", "SIGTERM");
if (process.platform !== "win32") signals.push("SIGALRM", "SIGABRT", "SIGVTALRM", "SIGXCPU", "SIGXFSZ", "SIGUSR2", "SIGTRAP", "SIGSYS", "SIGQUIT", "SIGIOT");
if (process.platform === "linux") signals.push("SIGIO", "SIGPOLL", "SIGPWR", "SIGSTKFLT");
const processOk = (process) => !!process && typeof process === "object" && typeof process.removeListener === "function" && typeof process.emit === "function" && typeof process.reallyExit === "function" && typeof process.listeners === "function" && typeof process.kill === "function" && typeof process.pid === "number" && typeof process.on === "function";
const kExitEmitter = Symbol.for("signal-exit emitter");
const global$1 = globalThis;
const ObjectDefineProperty = Object.defineProperty.bind(Object);
var Emitter = class {
	emitted = {
		afterExit: false,
		exit: false
	};
	listeners = {
		afterExit: [],
		exit: []
	};
	count = 0;
	id = Math.random();
	constructor() {
		if (global$1[kExitEmitter]) return global$1[kExitEmitter];
		ObjectDefineProperty(global$1, kExitEmitter, {
			value: this,
			writable: false,
			enumerable: false,
			configurable: false
		});
	}
	on(ev, fn) {
		this.listeners[ev].push(fn);
	}
	removeListener(ev, fn) {
		const list = this.listeners[ev];
		const i = list.indexOf(fn);
		/* c8 ignore start */
		if (i === -1) return;
		/* c8 ignore stop */
		if (i === 0 && list.length === 1) list.length = 0;
		else list.splice(i, 1);
	}
	emit(ev, code, signal) {
		if (this.emitted[ev]) return false;
		this.emitted[ev] = true;
		let ret = false;
		for (const fn of this.listeners[ev]) ret = fn(code, signal) === true || ret;
		if (ev === "exit") ret = this.emit("afterExit", code, signal) || ret;
		return ret;
	}
};
var SignalExitBase = class {};
const signalExitWrap = (handler) => {
	return {
		onExit(cb, opts) {
			return handler.onExit(cb, opts);
		},
		load() {
			return handler.load();
		},
		unload() {
			return handler.unload();
		}
	};
};
var SignalExitFallback = class extends SignalExitBase {
	onExit() {
		return () => {};
	}
	load() {}
	unload() {}
};
var SignalExit = class extends SignalExitBase {
	/* c8 ignore start */
	#hupSig = process$1.platform === "win32" ? "SIGINT" : "SIGHUP";
	/* c8 ignore stop */
	#emitter = new Emitter();
	#process;
	#originalProcessEmit;
	#originalProcessReallyExit;
	#sigListeners = {};
	#loaded = false;
	constructor(process) {
		super();
		this.#process = process;
		this.#sigListeners = {};
		for (const sig of signals) this.#sigListeners[sig] = () => {
			const listeners = this.#process.listeners(sig);
			let { count } = this.#emitter;
			/* c8 ignore start */
			const p = process;
			if (typeof p.__signal_exit_emitter__ === "object" && typeof p.__signal_exit_emitter__.count === "number") count += p.__signal_exit_emitter__.count;
			/* c8 ignore stop */
			if (listeners.length === count) {
				this.unload();
				const ret = this.#emitter.emit("exit", null, sig);
				/* c8 ignore start */
				const s = sig === "SIGHUP" ? this.#hupSig : sig;
				if (!ret) process.kill(process.pid, s);
			}
		};
		this.#originalProcessReallyExit = process.reallyExit;
		this.#originalProcessEmit = process.emit;
	}
	onExit(cb, opts) {
		/* c8 ignore start */
		if (!processOk(this.#process)) return () => {};
		/* c8 ignore stop */
		if (this.#loaded === false) this.load();
		const ev = opts?.alwaysLast ? "afterExit" : "exit";
		this.#emitter.on(ev, cb);
		return () => {
			this.#emitter.removeListener(ev, cb);
			if (this.#emitter.listeners["exit"].length === 0 && this.#emitter.listeners["afterExit"].length === 0) this.unload();
		};
	}
	load() {
		if (this.#loaded) return;
		this.#loaded = true;
		this.#emitter.count += 1;
		for (const sig of signals) try {
			const fn = this.#sigListeners[sig];
			if (fn) this.#process.on(sig, fn);
		} catch (_) {}
		this.#process.emit = (ev, ...a) => {
			return this.#processEmit(ev, ...a);
		};
		this.#process.reallyExit = (code) => {
			return this.#processReallyExit(code);
		};
	}
	unload() {
		if (!this.#loaded) return;
		this.#loaded = false;
		signals.forEach((sig) => {
			const listener = this.#sigListeners[sig];
			/* c8 ignore start */
			if (!listener) throw new Error("Listener not defined for signal: " + sig);
			/* c8 ignore stop */
			try {
				this.#process.removeListener(sig, listener);
			} catch (_) {}
			/* c8 ignore stop */
		});
		this.#process.emit = this.#originalProcessEmit;
		this.#process.reallyExit = this.#originalProcessReallyExit;
		this.#emitter.count -= 1;
	}
	#processReallyExit(code) {
		/* c8 ignore start */
		if (!processOk(this.#process)) return 0;
		this.#process.exitCode = code || 0;
		/* c8 ignore stop */
		this.#emitter.emit("exit", this.#process.exitCode, null);
		return this.#originalProcessReallyExit.call(this.#process, this.#process.exitCode);
	}
	#processEmit(ev, ...args) {
		const og = this.#originalProcessEmit;
		if (ev === "exit" && processOk(this.#process)) {
			if (typeof args[0] === "number") this.#process.exitCode = args[0];
			/* c8 ignore start */
			const ret = og.call(this.#process, ev, ...args);
			/* c8 ignore start */
			this.#emitter.emit("exit", this.#process.exitCode, null);
			/* c8 ignore stop */
			return ret;
		} else return og.call(this.#process, ev, ...args);
	}
};
const process$1 = globalThis.process;
const { onExit: onExit$1, load: load$1, unload } = signalExitWrap(processOk(process$1) ? new SignalExit(process$1) : new SignalExitFallback());
function onExit(...args) {
	if (typeof process === "object" && process.versions.webcontainer) {
		process.on("exit", (code) => {
			args[0](code, null);
		});
		return;
	}
	onExit$1(...args);
}
require_binding();
//#endregion
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/rolldown/index.mjs
var import_binding$1 = /* @__PURE__ */ __toESM(require_binding(), 1);
if (isMainThread) {
	const subscriberGuard = (0, import_binding$1.initTraceSubscriber)();
	onExit(() => {
		subscriberGuard?.close();
	});
}
//#endregion
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/rolldown/experimental-index.mjs
var import_binding = /* @__PURE__ */ __toESM(require_binding(), 1);
import_binding.BindingRebuildStrategy;
import_binding.ResolverFactory;
import_binding.isolatedDeclaration;
import_binding.isolatedDeclarationSync;
import_binding.moduleRunnerTransform;
//#endregion
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/vite/node/module-runner.js
let SOURCEMAPPING_URL$1 = "sourceMa";
SOURCEMAPPING_URL$1 += "ppingURL";
typeof process < "u" && process.platform;
(async function() {}).constructor;
new TextDecoder();
typeof Buffer == "function" && Buffer.from;
var chars$2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", intToChar$2 = /* @__PURE__ */ new Uint8Array(64), charToInt$2 = /* @__PURE__ */ new Uint8Array(128);
for (let i = 0; i < chars$2.length; i++) {
	let c = chars$2.charCodeAt(i);
	intToChar$2[i] = c, charToInt$2[c] = i;
}
RegExp(`//# ${SOURCEMAPPING_URL$1}=data:application/json;base64,(.+)`);
Error.prepareStackTrace;
const customizationHookNamespace$1 = "vite-module-runner:import-meta-resolve/v1/";
`${JSON.stringify(customizationHookNamespace$1)}${JSON.stringify(customizationHookNamespace$1)}`;
new Proxy({}, { get(_, p) {
	throw Error(`[module runner] Dynamic access of "import.meta.env" is not supported. Please, use "import.meta.env.${String(p)}" instead.`);
} });
//#endregion
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/vite/node/chunks/node.js
var require_constants$4 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const WIN_SLASH = "\\\\/";
	const WIN_NO_SLASH = `[^${WIN_SLASH}]`;
	const DEFAULT_MAX_EXTGLOB_RECURSION = 0;
	/**
	* Posix glob regex
	*/
	const DOT_LITERAL = "\\.";
	const PLUS_LITERAL = "\\+";
	const QMARK_LITERAL = "\\?";
	const SLASH_LITERAL = "\\/";
	const ONE_CHAR = "(?=.)";
	const QMARK = "[^/]";
	const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
	const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
	const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
	const POSIX_CHARS = {
		DOT_LITERAL,
		PLUS_LITERAL,
		QMARK_LITERAL,
		SLASH_LITERAL,
		ONE_CHAR,
		QMARK,
		END_ANCHOR,
		DOTS_SLASH,
		NO_DOT: `(?!${DOT_LITERAL})`,
		NO_DOTS: `(?!${START_ANCHOR}${DOTS_SLASH})`,
		NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`,
		NO_DOTS_SLASH: `(?!${DOTS_SLASH})`,
		QMARK_NO_DOT: `[^.${SLASH_LITERAL}]`,
		STAR: `${QMARK}*?`,
		START_ANCHOR,
		SEP: "/"
	};
	/**
	* Windows glob regex
	*/
	const WINDOWS_CHARS = {
		...POSIX_CHARS,
		SLASH_LITERAL: `[${WIN_SLASH}]`,
		QMARK: WIN_NO_SLASH,
		STAR: `${WIN_NO_SLASH}*?`,
		DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
		NO_DOT: `(?!${DOT_LITERAL})`,
		NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
		NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
		NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
		QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
		START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
		END_ANCHOR: `(?:[${WIN_SLASH}]|$)`,
		SEP: "\\"
	};
	module.exports = {
		DEFAULT_MAX_EXTGLOB_RECURSION,
		MAX_LENGTH: 1024 * 64,
		POSIX_REGEX_SOURCE: {
			__proto__: null,
			alnum: "a-zA-Z0-9",
			alpha: "a-zA-Z",
			ascii: "\\x00-\\x7F",
			blank: " \\t",
			cntrl: "\\x00-\\x1F\\x7F",
			digit: "0-9",
			graph: "\\x21-\\x7E",
			lower: "a-z",
			print: "\\x20-\\x7E ",
			punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
			space: " \\t\\r\\n\\v\\f",
			upper: "A-Z",
			word: "A-Za-z0-9_",
			xdigit: "A-Fa-f0-9"
		},
		REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
		REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
		REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
		REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
		REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
		REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
		REPLACEMENTS: {
			__proto__: null,
			"***": "*",
			"**/**": "**",
			"**/**/**": "**"
		},
		CHAR_0: 48,
		CHAR_9: 57,
		CHAR_UPPERCASE_A: 65,
		CHAR_LOWERCASE_A: 97,
		CHAR_UPPERCASE_Z: 90,
		CHAR_LOWERCASE_Z: 122,
		CHAR_LEFT_PARENTHESES: 40,
		CHAR_RIGHT_PARENTHESES: 41,
		CHAR_ASTERISK: 42,
		CHAR_AMPERSAND: 38,
		CHAR_AT: 64,
		CHAR_BACKWARD_SLASH: 92,
		CHAR_CARRIAGE_RETURN: 13,
		CHAR_CIRCUMFLEX_ACCENT: 94,
		CHAR_COLON: 58,
		CHAR_COMMA: 44,
		CHAR_DOT: 46,
		CHAR_DOUBLE_QUOTE: 34,
		CHAR_EQUAL: 61,
		CHAR_EXCLAMATION_MARK: 33,
		CHAR_FORM_FEED: 12,
		CHAR_FORWARD_SLASH: 47,
		CHAR_GRAVE_ACCENT: 96,
		CHAR_HASH: 35,
		CHAR_HYPHEN_MINUS: 45,
		CHAR_LEFT_ANGLE_BRACKET: 60,
		CHAR_LEFT_CURLY_BRACE: 123,
		CHAR_LEFT_SQUARE_BRACKET: 91,
		CHAR_LINE_FEED: 10,
		CHAR_NO_BREAK_SPACE: 160,
		CHAR_PERCENT: 37,
		CHAR_PLUS: 43,
		CHAR_QUESTION_MARK: 63,
		CHAR_RIGHT_ANGLE_BRACKET: 62,
		CHAR_RIGHT_CURLY_BRACE: 125,
		CHAR_RIGHT_SQUARE_BRACKET: 93,
		CHAR_SEMICOLON: 59,
		CHAR_SINGLE_QUOTE: 39,
		CHAR_SPACE: 32,
		CHAR_TAB: 9,
		CHAR_UNDERSCORE: 95,
		CHAR_VERTICAL_LINE: 124,
		CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
		/**
		* Create EXTGLOB_CHARS
		*/
		extglobChars(chars) {
			return {
				"!": {
					type: "negate",
					open: "(?:(?!(?:",
					close: `))${chars.STAR})`
				},
				"?": {
					type: "qmark",
					open: "(?:",
					close: ")?"
				},
				"+": {
					type: "plus",
					open: "(?:",
					close: ")+"
				},
				"*": {
					type: "star",
					open: "(?:",
					close: ")*"
				},
				"@": {
					type: "at",
					open: "(?:",
					close: ")"
				}
			};
		},
		/**
		* Create GLOB_CHARS
		*/
		globChars(win32) {
			return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
		}
	};
}));
var require_utils$2 = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	const { REGEX_BACKSLASH, REGEX_REMOVE_BACKSLASH, REGEX_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_GLOBAL } = require_constants$4();
	exports.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
	exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
	exports.isRegexChar = (str) => str.length === 1 && exports.hasRegexChars(str);
	exports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
	exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
	exports.isWindows = () => {
		if (typeof navigator !== "undefined" && navigator.platform) {
			const platform = navigator.platform.toLowerCase();
			return platform === "win32" || platform === "windows";
		}
		if (typeof process !== "undefined" && process.platform) return process.platform === "win32";
		return false;
	};
	exports.removeBackslashes = (str) => {
		return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
			return match === "\\" ? "" : match;
		});
	};
	exports.escapeLast = (input, char, lastIdx) => {
		const idx = input.lastIndexOf(char, lastIdx);
		if (idx === -1) return input;
		if (input[idx - 1] === "\\") return exports.escapeLast(input, char, idx - 1);
		return `${input.slice(0, idx)}\\${input.slice(idx)}`;
	};
	exports.removePrefix = (input, state = {}) => {
		let output = input;
		if (output.startsWith("./")) {
			output = output.slice(2);
			state.prefix = "./";
		}
		return output;
	};
	exports.wrapOutput = (input, state = {}, options = {}) => {
		let output = `${options.contains ? "" : "^"}(?:${input})${options.contains ? "" : "$"}`;
		if (state.negated === true) output = `(?:^(?!${output}).*$)`;
		return output;
	};
	exports.basename = (path, { windows } = {}) => {
		const segs = path.split(windows ? /[\\/]/ : "/");
		const last = segs[segs.length - 1];
		if (last === "") return segs[segs.length - 2];
		return last;
	};
}));
var require_scan$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const utils = require_utils$2();
	const { CHAR_ASTERISK, CHAR_AT, CHAR_BACKWARD_SLASH, CHAR_COMMA, CHAR_DOT, CHAR_EXCLAMATION_MARK, CHAR_FORWARD_SLASH, CHAR_LEFT_CURLY_BRACE, CHAR_LEFT_PARENTHESES, CHAR_LEFT_SQUARE_BRACKET, CHAR_PLUS, CHAR_QUESTION_MARK, CHAR_RIGHT_CURLY_BRACE, CHAR_RIGHT_PARENTHESES, CHAR_RIGHT_SQUARE_BRACKET } = require_constants$4();
	const isPathSeparator = (code) => {
		return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
	};
	const depth = (token) => {
		if (token.isPrefix !== true) token.depth = token.isGlobstar ? Infinity : 1;
	};
	/**
	* Quickly scans a glob pattern and returns an object with a handful of
	* useful properties, like `isGlob`, `path` (the leading non-glob, if it exists),
	* `glob` (the actual pattern), `negated` (true if the path starts with `!` but not
	* with `!(`) and `negatedExtglob` (true if the path starts with `!(`).
	*
	* ```js
	* const pm = require('picomatch');
	* console.log(pm.scan('foo/bar/*.js'));
	* { isGlob: true, input: 'foo/bar/*.js', base: 'foo/bar', glob: '*.js' }
	* ```
	* @param {String} `str`
	* @param {Object} `options`
	* @return {Object} Returns an object with tokens and regex source string.
	* @api public
	*/
	const scan = (input, options) => {
		const opts = options || {};
		const length = input.length - 1;
		const scanToEnd = opts.parts === true || opts.scanToEnd === true;
		const slashes = [];
		const tokens = [];
		const parts = [];
		let str = input;
		let index = -1;
		let start = 0;
		let lastIndex = 0;
		let isBrace = false;
		let isBracket = false;
		let isGlob = false;
		let isExtglob = false;
		let isGlobstar = false;
		let braceEscaped = false;
		let backslashes = false;
		let negated = false;
		let negatedExtglob = false;
		let finished = false;
		let braces = 0;
		let prev;
		let code;
		let token = {
			value: "",
			depth: 0,
			isGlob: false
		};
		const eos = () => index >= length;
		const peek = () => str.charCodeAt(index + 1);
		const advance = () => {
			prev = code;
			return str.charCodeAt(++index);
		};
		while (index < length) {
			code = advance();
			let next;
			if (code === CHAR_BACKWARD_SLASH) {
				backslashes = token.backslashes = true;
				code = advance();
				if (code === CHAR_LEFT_CURLY_BRACE) braceEscaped = true;
				continue;
			}
			if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
				braces++;
				while (eos() !== true && (code = advance())) {
					if (code === CHAR_BACKWARD_SLASH) {
						backslashes = token.backslashes = true;
						advance();
						continue;
					}
					if (code === CHAR_LEFT_CURLY_BRACE) {
						braces++;
						continue;
					}
					if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
						isBrace = token.isBrace = true;
						isGlob = token.isGlob = true;
						finished = true;
						if (scanToEnd === true) continue;
						break;
					}
					if (braceEscaped !== true && code === CHAR_COMMA) {
						isBrace = token.isBrace = true;
						isGlob = token.isGlob = true;
						finished = true;
						if (scanToEnd === true) continue;
						break;
					}
					if (code === CHAR_RIGHT_CURLY_BRACE) {
						braces--;
						if (braces === 0) {
							braceEscaped = false;
							isBrace = token.isBrace = true;
							finished = true;
							break;
						}
					}
				}
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_FORWARD_SLASH) {
				slashes.push(index);
				tokens.push(token);
				token = {
					value: "",
					depth: 0,
					isGlob: false
				};
				if (finished === true) continue;
				if (prev === CHAR_DOT && index === start + 1) {
					start += 2;
					continue;
				}
				lastIndex = index + 1;
				continue;
			}
			if (opts.noext !== true) {
				if ((code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK) === true && peek() === CHAR_LEFT_PARENTHESES) {
					isGlob = token.isGlob = true;
					isExtglob = token.isExtglob = true;
					finished = true;
					if (code === CHAR_EXCLAMATION_MARK && index === start) negatedExtglob = true;
					if (scanToEnd === true) {
						while (eos() !== true && (code = advance())) {
							if (code === CHAR_BACKWARD_SLASH) {
								backslashes = token.backslashes = true;
								code = advance();
								continue;
							}
							if (code === CHAR_RIGHT_PARENTHESES) {
								isGlob = token.isGlob = true;
								finished = true;
								break;
							}
						}
						continue;
					}
					break;
				}
			}
			if (code === CHAR_ASTERISK) {
				if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
				isGlob = token.isGlob = true;
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_QUESTION_MARK) {
				isGlob = token.isGlob = true;
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_LEFT_SQUARE_BRACKET) {
				while (eos() !== true && (next = advance())) {
					if (next === CHAR_BACKWARD_SLASH) {
						backslashes = token.backslashes = true;
						advance();
						continue;
					}
					if (next === CHAR_RIGHT_SQUARE_BRACKET) {
						isBracket = token.isBracket = true;
						isGlob = token.isGlob = true;
						finished = true;
						break;
					}
				}
				if (scanToEnd === true) continue;
				break;
			}
			if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
				negated = token.negated = true;
				start++;
				continue;
			}
			if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
				isGlob = token.isGlob = true;
				if (scanToEnd === true) {
					while (eos() !== true && (code = advance())) {
						if (code === CHAR_LEFT_PARENTHESES) {
							backslashes = token.backslashes = true;
							code = advance();
							continue;
						}
						if (code === CHAR_RIGHT_PARENTHESES) {
							finished = true;
							break;
						}
					}
					continue;
				}
				break;
			}
			if (isGlob === true) {
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
		}
		if (opts.noext === true) {
			isExtglob = false;
			isGlob = false;
		}
		let base = str;
		let prefix = "";
		let glob = "";
		if (start > 0) {
			prefix = str.slice(0, start);
			str = str.slice(start);
			lastIndex -= start;
		}
		if (base && isGlob === true && lastIndex > 0) {
			base = str.slice(0, lastIndex);
			glob = str.slice(lastIndex);
		} else if (isGlob === true) {
			base = "";
			glob = str;
		} else base = str;
		if (base && base !== "" && base !== "/" && base !== str) {
			if (isPathSeparator(base.charCodeAt(base.length - 1))) base = base.slice(0, -1);
		}
		if (opts.unescape === true) {
			if (glob) glob = utils.removeBackslashes(glob);
			if (base && backslashes === true) base = utils.removeBackslashes(base);
		}
		const state = {
			prefix,
			input,
			start,
			base,
			glob,
			isBrace,
			isBracket,
			isGlob,
			isExtglob,
			isGlobstar,
			negated,
			negatedExtglob
		};
		if (opts.tokens === true) {
			state.maxDepth = 0;
			if (!isPathSeparator(code)) tokens.push(token);
			state.tokens = tokens;
		}
		if (opts.parts === true || opts.tokens === true) {
			let prevIndex;
			for (let idx = 0; idx < slashes.length; idx++) {
				const n = prevIndex ? prevIndex + 1 : start;
				const i = slashes[idx];
				const value = input.slice(n, i);
				if (opts.tokens) {
					if (idx === 0 && start !== 0) {
						tokens[idx].isPrefix = true;
						tokens[idx].value = prefix;
					} else tokens[idx].value = value;
					depth(tokens[idx]);
					state.maxDepth += tokens[idx].depth;
				}
				if (idx !== 0 || value !== "") parts.push(value);
				prevIndex = i;
			}
			if (prevIndex && prevIndex + 1 < input.length) {
				const value = input.slice(prevIndex + 1);
				parts.push(value);
				if (opts.tokens) {
					tokens[tokens.length - 1].value = value;
					depth(tokens[tokens.length - 1]);
					state.maxDepth += tokens[tokens.length - 1].depth;
				}
			}
			state.slashes = slashes;
			state.parts = parts;
		}
		return state;
	};
	module.exports = scan;
}));
var require_parse$4 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const constants = require_constants$4();
	const utils = require_utils$2();
	/**
	* Constants
	*/
	const { MAX_LENGTH, POSIX_REGEX_SOURCE, REGEX_NON_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_BACKREF, REPLACEMENTS } = constants;
	/**
	* Helpers
	*/
	const expandRange = (args, options) => {
		if (typeof options.expandRange === "function") return options.expandRange(...args, options);
		args.sort();
		const value = `[${args.join("-")}]`;
		try {
			new RegExp(value);
		} catch (ex) {
			return args.map((v) => utils.escapeRegex(v)).join("..");
		}
		return value;
	};
	/**
	* Create the message for a syntax error
	*/
	const syntaxError = (type, char) => {
		return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
	};
	const splitTopLevel = (input) => {
		const parts = [];
		let bracket = 0;
		let paren = 0;
		let quote = 0;
		let value = "";
		let escaped = false;
		for (const ch of input) {
			if (escaped === true) {
				value += ch;
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				value += ch;
				escaped = true;
				continue;
			}
			if (ch === "\"") {
				quote = quote === 1 ? 0 : 1;
				value += ch;
				continue;
			}
			if (quote === 0) {
				if (ch === "[") bracket++;
				else if (ch === "]" && bracket > 0) bracket--;
				else if (bracket === 0) {
					if (ch === "(") paren++;
					else if (ch === ")" && paren > 0) paren--;
					else if (ch === "|" && paren === 0) {
						parts.push(value);
						value = "";
						continue;
					}
				}
			}
			value += ch;
		}
		parts.push(value);
		return parts;
	};
	const isPlainBranch = (branch) => {
		let escaped = false;
		for (const ch of branch) {
			if (escaped === true) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (/[?*+@!()[\]{}]/.test(ch)) return false;
		}
		return true;
	};
	const normalizeSimpleBranch = (branch) => {
		let value = branch.trim();
		let changed = true;
		while (changed === true) {
			changed = false;
			if (/^@\([^\\()[\]{}|]+\)$/.test(value)) {
				value = value.slice(2, -1);
				changed = true;
			}
		}
		if (!isPlainBranch(value)) return;
		return value.replace(/\\(.)/g, "$1");
	};
	const hasRepeatedCharPrefixOverlap = (branches) => {
		const values = branches.map(normalizeSimpleBranch).filter(Boolean);
		for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) {
			const a = values[i];
			const b = values[j];
			const char = a[0];
			if (!char || a !== char.repeat(a.length) || b !== char.repeat(b.length)) continue;
			if (a === b || a.startsWith(b) || b.startsWith(a)) return true;
		}
		return false;
	};
	const parseRepeatedExtglob = (pattern, requireEnd = true) => {
		if (pattern[0] !== "+" && pattern[0] !== "*" || pattern[1] !== "(") return;
		let bracket = 0;
		let paren = 0;
		let quote = 0;
		let escaped = false;
		for (let i = 1; i < pattern.length; i++) {
			const ch = pattern[i];
			if (escaped === true) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (ch === "\"") {
				quote = quote === 1 ? 0 : 1;
				continue;
			}
			if (quote === 1) continue;
			if (ch === "[") {
				bracket++;
				continue;
			}
			if (ch === "]" && bracket > 0) {
				bracket--;
				continue;
			}
			if (bracket > 0) continue;
			if (ch === "(") {
				paren++;
				continue;
			}
			if (ch === ")") {
				paren--;
				if (paren === 0) {
					if (requireEnd === true && i !== pattern.length - 1) return;
					return {
						type: pattern[0],
						body: pattern.slice(2, i),
						end: i
					};
				}
			}
		}
	};
	const getStarExtglobSequenceOutput = (pattern) => {
		let index = 0;
		const chars = [];
		while (index < pattern.length) {
			const match = parseRepeatedExtglob(pattern.slice(index), false);
			if (!match || match.type !== "*") return;
			const branches = splitTopLevel(match.body).map((branch) => branch.trim());
			if (branches.length !== 1) return;
			const branch = normalizeSimpleBranch(branches[0]);
			if (!branch || branch.length !== 1) return;
			chars.push(branch);
			index += match.end + 1;
		}
		if (chars.length < 1) return;
		return `${chars.length === 1 ? utils.escapeRegex(chars[0]) : `[${chars.map((ch) => utils.escapeRegex(ch)).join("")}]`}*`;
	};
	const repeatedExtglobRecursion = (pattern) => {
		let depth = 0;
		let value = pattern.trim();
		let match = parseRepeatedExtglob(value);
		while (match) {
			depth++;
			value = match.body.trim();
			match = parseRepeatedExtglob(value);
		}
		return depth;
	};
	const analyzeRepeatedExtglob = (body, options) => {
		if (options.maxExtglobRecursion === false) return { risky: false };
		const max = typeof options.maxExtglobRecursion === "number" ? options.maxExtglobRecursion : constants.DEFAULT_MAX_EXTGLOB_RECURSION;
		const branches = splitTopLevel(body).map((branch) => branch.trim());
		if (branches.length > 1) {
			if (branches.some((branch) => branch === "") || branches.some((branch) => /^[*?]+$/.test(branch)) || hasRepeatedCharPrefixOverlap(branches)) return { risky: true };
		}
		for (const branch of branches) {
			const safeOutput = getStarExtglobSequenceOutput(branch);
			if (safeOutput) return {
				risky: true,
				safeOutput
			};
			if (repeatedExtglobRecursion(branch) > max) return { risky: true };
		}
		return { risky: false };
	};
	/**
	* Parse the given input string.
	* @param {String} input
	* @param {Object} options
	* @return {Object}
	*/
	const parse = (input, options) => {
		if (typeof input !== "string") throw new TypeError("Expected a string");
		input = REPLACEMENTS[input] || input;
		const opts = { ...options };
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		let len = input.length;
		if (len > max) throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
		const bos = {
			type: "bos",
			value: "",
			output: opts.prepend || ""
		};
		const tokens = [bos];
		const capture = opts.capture ? "" : "?:";
		const PLATFORM_CHARS = constants.globChars(opts.windows);
		const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
		const { DOT_LITERAL, PLUS_LITERAL, SLASH_LITERAL, ONE_CHAR, DOTS_SLASH, NO_DOT, NO_DOT_SLASH, NO_DOTS_SLASH, QMARK, QMARK_NO_DOT, STAR, START_ANCHOR } = PLATFORM_CHARS;
		const globstar = (opts) => {
			return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
		};
		const nodot = opts.dot ? "" : NO_DOT;
		const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
		let star = opts.bash === true ? globstar(opts) : STAR;
		if (opts.capture) star = `(${star})`;
		if (typeof opts.noext === "boolean") opts.noextglob = opts.noext;
		const state = {
			input,
			index: -1,
			start: 0,
			dot: opts.dot === true,
			consumed: "",
			output: "",
			prefix: "",
			backtrack: false,
			negated: false,
			brackets: 0,
			braces: 0,
			parens: 0,
			quotes: 0,
			globstar: false,
			tokens
		};
		input = utils.removePrefix(input, state);
		len = input.length;
		const extglobs = [];
		const braces = [];
		const stack = [];
		let prev = bos;
		let value;
		/**
		* Tokenizing helpers
		*/
		const eos = () => state.index === len - 1;
		const peek = state.peek = (n = 1) => input[state.index + n];
		const advance = state.advance = () => input[++state.index] || "";
		const remaining = () => input.slice(state.index + 1);
		const consume = (value = "", num = 0) => {
			state.consumed += value;
			state.index += num;
		};
		const append = (token) => {
			state.output += token.output != null ? token.output : token.value;
			consume(token.value);
		};
		const negate = () => {
			let count = 1;
			while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
				advance();
				state.start++;
				count++;
			}
			if (count % 2 === 0) return false;
			state.negated = true;
			state.start++;
			return true;
		};
		const increment = (type) => {
			state[type]++;
			stack.push(type);
		};
		const decrement = (type) => {
			state[type]--;
			stack.pop();
		};
		/**
		* Push tokens onto the tokens array. This helper speeds up
		* tokenizing by 1) helping us avoid backtracking as much as possible,
		* and 2) helping us avoid creating extra tokens when consecutive
		* characters are plain text. This improves performance and simplifies
		* lookbehinds.
		*/
		const push = (tok) => {
			if (prev.type === "globstar") {
				if (tok.type !== "slash" && tok.type !== "paren" && !(state.braces > 0 && (tok.type === "comma" || tok.type === "brace")) && !(tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren"))) {
					state.output = state.output.slice(0, -prev.output.length);
					prev.type = "star";
					prev.value = "*";
					prev.output = star;
					state.output += prev.output;
				}
			}
			if (extglobs.length && tok.type !== "paren") extglobs[extglobs.length - 1].inner += tok.value;
			if (tok.value || tok.output) append(tok);
			if (prev && prev.type === "text" && tok.type === "text") {
				prev.output = (prev.output || prev.value) + tok.value;
				prev.value += tok.value;
				return;
			}
			tok.prev = prev;
			tokens.push(tok);
			prev = tok;
		};
		const extglobOpen = (type, value) => {
			const token = {
				...EXTGLOB_CHARS[value],
				conditions: 1,
				inner: ""
			};
			token.prev = prev;
			token.parens = state.parens;
			token.output = state.output;
			token.startIndex = state.index;
			token.tokensIndex = tokens.length;
			const output = (opts.capture ? "(" : "") + token.open;
			increment("parens");
			push({
				type,
				value,
				output: state.output ? "" : ONE_CHAR
			});
			push({
				type: "paren",
				extglob: true,
				value: advance(),
				output
			});
			extglobs.push(token);
		};
		const extglobClose = (token) => {
			const literal = input.slice(token.startIndex, state.index + 1);
			const body = input.slice(token.startIndex + 2, state.index);
			const analysis = analyzeRepeatedExtglob(body, opts);
			if ((token.type === "plus" || token.type === "star") && analysis.risky) {
				const safeOutput = analysis.safeOutput ? (token.output ? "" : ONE_CHAR) + (opts.capture ? `(${analysis.safeOutput})` : analysis.safeOutput) : void 0;
				const open = tokens[token.tokensIndex];
				open.type = "text";
				open.value = literal;
				open.output = safeOutput || utils.escapeRegex(literal);
				for (let i = token.tokensIndex + 1; i < tokens.length; i++) {
					tokens[i].value = "";
					tokens[i].output = "";
					delete tokens[i].suffix;
				}
				state.output = token.output + open.output;
				state.backtrack = true;
				push({
					type: "paren",
					extglob: true,
					value,
					output: ""
				});
				decrement("parens");
				return;
			}
			let output = token.close + (opts.capture ? ")" : "");
			let rest;
			if (token.type === "negate") {
				let extglobStar = star;
				if (token.inner && token.inner.length > 1 && token.inner.includes("/")) extglobStar = globstar(opts);
				if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) output = token.close = `)$))${extglobStar}`;
				if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) output = token.close = `)${parse(rest, {
					...options,
					fastpaths: false
				}).output})${extglobStar})`;
				if (token.prev.type === "bos") state.negatedExtglob = true;
			}
			push({
				type: "paren",
				extglob: true,
				value,
				output
			});
			decrement("parens");
		};
		/**
		* Fast paths
		*/
		if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
			let backslashes = false;
			let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
				if (first === "\\") {
					backslashes = true;
					return m;
				}
				if (first === "?") {
					if (esc) return esc + first + (rest ? QMARK.repeat(rest.length) : "");
					if (index === 0) return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
					return QMARK.repeat(chars.length);
				}
				if (first === ".") return DOT_LITERAL.repeat(chars.length);
				if (first === "*") {
					if (esc) return esc + first + (rest ? star : "");
					return star;
				}
				return esc ? m : `\\${m}`;
			});
			if (backslashes === true) if (opts.unescape === true) output = output.replace(/\\/g, "");
			else output = output.replace(/\\+/g, (m) => {
				return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
			});
			if (output === input && opts.contains === true) {
				state.output = input;
				return state;
			}
			state.output = utils.wrapOutput(output, state, options);
			return state;
		}
		/**
		* Tokenize input until we reach end-of-string
		*/
		while (!eos()) {
			value = advance();
			if (value === "\0") continue;
			/**
			* Escaped characters
			*/
			if (value === "\\") {
				const next = peek();
				if (next === "/" && opts.bash !== true) continue;
				if (next === "." || next === ";") continue;
				if (!next) {
					value += "\\";
					push({
						type: "text",
						value
					});
					continue;
				}
				const match = /^\\+/.exec(remaining());
				let slashes = 0;
				if (match && match[0].length > 2) {
					slashes = match[0].length;
					state.index += slashes;
					if (slashes % 2 !== 0) value += "\\";
				}
				if (opts.unescape === true) value = advance();
				else value += advance();
				if (state.brackets === 0) {
					push({
						type: "text",
						value
					});
					continue;
				}
			}
			/**
			* If we're inside a regex character class, continue
			* until we reach the closing bracket.
			*/
			if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
				if (opts.posix !== false && value === ":") {
					const inner = prev.value.slice(1);
					if (inner.includes("[")) {
						prev.posix = true;
						if (inner.includes(":")) {
							const idx = prev.value.lastIndexOf("[");
							const pre = prev.value.slice(0, idx);
							const rest = prev.value.slice(idx + 2);
							const posix = POSIX_REGEX_SOURCE[rest];
							if (posix) {
								prev.value = pre + posix;
								state.backtrack = true;
								advance();
								if (!bos.output && tokens.indexOf(prev) === 1) bos.output = ONE_CHAR;
								continue;
							}
						}
					}
				}
				if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") value = `\\${value}`;
				if (value === "]" && (prev.value === "[" || prev.value === "[^")) value = `\\${value}`;
				if (opts.posix === true && value === "!" && prev.value === "[") value = "^";
				prev.value += value;
				append({ value });
				continue;
			}
			/**
			* If we're inside a quoted string, continue
			* until we reach the closing double quote.
			*/
			if (state.quotes === 1 && value !== "\"") {
				value = utils.escapeRegex(value);
				prev.value += value;
				append({ value });
				continue;
			}
			/**
			* Double quotes
			*/
			if (value === "\"") {
				state.quotes = state.quotes === 1 ? 0 : 1;
				if (opts.keepQuotes === true) push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Parentheses
			*/
			if (value === "(") {
				increment("parens");
				push({
					type: "paren",
					value
				});
				continue;
			}
			if (value === ")") {
				if (state.parens === 0 && opts.strictBrackets === true) throw new SyntaxError(syntaxError("opening", "("));
				const extglob = extglobs[extglobs.length - 1];
				if (extglob && state.parens === extglob.parens + 1) {
					extglobClose(extglobs.pop());
					continue;
				}
				push({
					type: "paren",
					value,
					output: state.parens ? ")" : "\\)"
				});
				decrement("parens");
				continue;
			}
			/**
			* Square brackets
			*/
			if (value === "[") {
				if (opts.nobracket === true || !remaining().includes("]")) {
					if (opts.nobracket !== true && opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
					value = `\\${value}`;
				} else increment("brackets");
				push({
					type: "bracket",
					value
				});
				continue;
			}
			if (value === "]") {
				if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
					push({
						type: "text",
						value,
						output: `\\${value}`
					});
					continue;
				}
				if (state.brackets === 0) {
					if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("opening", "["));
					push({
						type: "text",
						value,
						output: `\\${value}`
					});
					continue;
				}
				decrement("brackets");
				const prevValue = prev.value.slice(1);
				if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) value = `/${value}`;
				prev.value += value;
				append({ value });
				if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) continue;
				const escaped = utils.escapeRegex(prev.value);
				state.output = state.output.slice(0, -prev.value.length);
				if (opts.literalBrackets === true) {
					state.output += escaped;
					prev.value = escaped;
					continue;
				}
				prev.value = `(${capture}${escaped}|${prev.value})`;
				state.output += prev.value;
				continue;
			}
			/**
			* Braces
			*/
			if (value === "{" && opts.nobrace !== true) {
				increment("braces");
				const open = {
					type: "brace",
					value,
					output: "(",
					outputIndex: state.output.length,
					tokensIndex: state.tokens.length
				};
				braces.push(open);
				push(open);
				continue;
			}
			if (value === "}") {
				const brace = braces[braces.length - 1];
				if (opts.nobrace === true || !brace) {
					push({
						type: "text",
						value,
						output: value
					});
					continue;
				}
				let output = ")";
				if (brace.dots === true) {
					const arr = tokens.slice();
					const range = [];
					for (let i = arr.length - 1; i >= 0; i--) {
						tokens.pop();
						if (arr[i].type === "brace") break;
						if (arr[i].type !== "dots") range.unshift(arr[i].value);
					}
					output = expandRange(range, opts);
					state.backtrack = true;
				}
				if (brace.comma !== true && brace.dots !== true) {
					const out = state.output.slice(0, brace.outputIndex);
					const toks = state.tokens.slice(brace.tokensIndex);
					brace.value = brace.output = "\\{";
					value = output = "\\}";
					state.output = out;
					for (const t of toks) state.output += t.output || t.value;
				}
				push({
					type: "brace",
					value,
					output
				});
				decrement("braces");
				braces.pop();
				continue;
			}
			/**
			* Pipes
			*/
			if (value === "|") {
				if (extglobs.length > 0) extglobs[extglobs.length - 1].conditions++;
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Commas
			*/
			if (value === ",") {
				let output = value;
				const brace = braces[braces.length - 1];
				if (brace && stack[stack.length - 1] === "braces") {
					brace.comma = true;
					output = "|";
				}
				push({
					type: "comma",
					value,
					output
				});
				continue;
			}
			/**
			* Slashes
			*/
			if (value === "/") {
				if (prev.type === "dot" && state.index === state.start + 1) {
					state.start = state.index + 1;
					state.consumed = "";
					state.output = "";
					tokens.pop();
					prev = bos;
					continue;
				}
				push({
					type: "slash",
					value,
					output: SLASH_LITERAL
				});
				continue;
			}
			/**
			* Dots
			*/
			if (value === ".") {
				if (state.braces > 0 && prev.type === "dot") {
					if (prev.value === ".") prev.output = DOT_LITERAL;
					const brace = braces[braces.length - 1];
					prev.type = "dots";
					prev.output += value;
					prev.value += value;
					brace.dots = true;
					continue;
				}
				if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
					push({
						type: "text",
						value,
						output: DOT_LITERAL
					});
					continue;
				}
				push({
					type: "dot",
					value,
					output: DOT_LITERAL
				});
				continue;
			}
			/**
			* Question marks
			*/
			if (value === "?") {
				if (!(prev && prev.value === "(") && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					extglobOpen("qmark", value);
					continue;
				}
				if (prev && prev.type === "paren") {
					const next = peek();
					let output = value;
					if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) output = `\\${value}`;
					push({
						type: "text",
						value,
						output
					});
					continue;
				}
				if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
					push({
						type: "qmark",
						value,
						output: QMARK_NO_DOT
					});
					continue;
				}
				push({
					type: "qmark",
					value,
					output: QMARK
				});
				continue;
			}
			/**
			* Exclamation
			*/
			if (value === "!") {
				if (opts.noextglob !== true && peek() === "(") {
					if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
						extglobOpen("negate", value);
						continue;
					}
				}
				if (opts.nonegate !== true && state.index === 0) {
					negate();
					continue;
				}
			}
			/**
			* Plus
			*/
			if (value === "+") {
				if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					extglobOpen("plus", value);
					continue;
				}
				if (prev && prev.value === "(" || opts.regex === false) {
					push({
						type: "plus",
						value,
						output: PLUS_LITERAL
					});
					continue;
				}
				if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
					push({
						type: "plus",
						value
					});
					continue;
				}
				push({
					type: "plus",
					value: PLUS_LITERAL
				});
				continue;
			}
			/**
			* Plain text
			*/
			if (value === "@") {
				if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					push({
						type: "at",
						extglob: true,
						value,
						output: ""
					});
					continue;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Plain text
			*/
			if (value !== "*") {
				if (value === "$" || value === "^") value = `\\${value}`;
				const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
				if (match) {
					value += match[0];
					state.index += match[0].length;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Stars
			*/
			if (prev && (prev.type === "globstar" || prev.star === true)) {
				prev.type = "star";
				prev.star = true;
				prev.value += value;
				prev.output = star;
				state.backtrack = true;
				state.globstar = true;
				consume(value);
				continue;
			}
			let rest = remaining();
			if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
				extglobOpen("star", value);
				continue;
			}
			if (prev.type === "star") {
				if (opts.noglobstar === true) {
					consume(value);
					continue;
				}
				const prior = prev.prev;
				const before = prior.prev;
				const isStart = prior.type === "slash" || prior.type === "bos";
				const afterStar = before && (before.type === "star" || before.type === "globstar");
				if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
					push({
						type: "star",
						value,
						output: ""
					});
					continue;
				}
				if (!isStart && prior.type !== "paren" && !(state.braces > 0 && (prior.type === "comma" || prior.type === "brace")) && !(extglobs.length && (prior.type === "pipe" || prior.type === "paren"))) {
					push({
						type: "star",
						value,
						output: ""
					});
					continue;
				}
				while (rest.slice(0, 3) === "/**") {
					const after = input[state.index + 4];
					if (after && after !== "/") break;
					rest = rest.slice(3);
					consume("/**", 3);
				}
				if (prior.type === "bos" && eos()) {
					prev.type = "globstar";
					prev.value += value;
					prev.output = globstar(opts);
					state.output = prev.output;
					state.globstar = true;
					consume(value);
					continue;
				}
				if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
					state.output = state.output.slice(0, -(prior.output + prev.output).length);
					prior.output = `(?:${prior.output}`;
					prev.type = "globstar";
					prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
					prev.value += value;
					state.globstar = true;
					state.output += prior.output + prev.output;
					consume(value);
					continue;
				}
				if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
					const end = rest[1] !== void 0 ? "|$" : "";
					state.output = state.output.slice(0, -(prior.output + prev.output).length);
					prior.output = `(?:${prior.output}`;
					prev.type = "globstar";
					prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
					prev.value += value;
					state.output += prior.output + prev.output;
					state.globstar = true;
					consume(value + advance());
					push({
						type: "slash",
						value: "/",
						output: ""
					});
					continue;
				}
				if (prior.type === "bos" && rest[0] === "/") {
					prev.type = "globstar";
					prev.value += value;
					prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
					state.output = prev.output;
					state.globstar = true;
					consume(value + advance());
					push({
						type: "slash",
						value: "/",
						output: ""
					});
					continue;
				}
				state.output = state.output.slice(0, -prev.output.length);
				prev.type = "globstar";
				prev.output = globstar(opts);
				prev.value += value;
				state.output += prev.output;
				state.globstar = true;
				consume(value);
				continue;
			}
			const token = {
				type: "star",
				value,
				output: star
			};
			if (opts.bash === true) {
				token.output = ".*?";
				if (prev.type === "bos" || prev.type === "slash") token.output = nodot + token.output;
				push(token);
				continue;
			}
			if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
				token.output = value;
				push(token);
				continue;
			}
			if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
				if (prev.type === "dot") {
					state.output += NO_DOT_SLASH;
					prev.output += NO_DOT_SLASH;
				} else if (opts.dot === true) {
					state.output += NO_DOTS_SLASH;
					prev.output += NO_DOTS_SLASH;
				} else {
					state.output += nodot;
					prev.output += nodot;
				}
				if (peek() !== "*") {
					state.output += ONE_CHAR;
					prev.output += ONE_CHAR;
				}
			}
			push(token);
		}
		while (state.brackets > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
			state.output = utils.escapeLast(state.output, "[");
			decrement("brackets");
		}
		while (state.parens > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", ")"));
			state.output = utils.escapeLast(state.output, "(");
			decrement("parens");
		}
		while (state.braces > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "}"));
			state.output = utils.escapeLast(state.output, "{");
			decrement("braces");
		}
		if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) push({
			type: "maybe_slash",
			value: "",
			output: `${SLASH_LITERAL}?`
		});
		if (state.backtrack === true) {
			state.output = "";
			for (const token of state.tokens) {
				state.output += token.output != null ? token.output : token.value;
				if (token.suffix) state.output += token.suffix;
			}
		}
		return state;
	};
	/**
	* Fast paths for creating regular expressions for common glob patterns.
	* This can significantly speed up processing and has very little downside
	* impact when none of the fast paths match.
	*/
	parse.fastpaths = (input, options) => {
		const opts = { ...options };
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		const len = input.length;
		if (len > max) throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
		input = REPLACEMENTS[input] || input;
		const { DOT_LITERAL, SLASH_LITERAL, ONE_CHAR, DOTS_SLASH, NO_DOT, NO_DOTS, NO_DOTS_SLASH, STAR, START_ANCHOR } = constants.globChars(opts.windows);
		const nodot = opts.dot ? NO_DOTS : NO_DOT;
		const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
		const capture = opts.capture ? "" : "?:";
		const state = {
			negated: false,
			prefix: ""
		};
		let star = opts.bash === true ? ".*?" : STAR;
		if (opts.capture) star = `(${star})`;
		const globstar = (opts) => {
			if (opts.noglobstar === true) return star;
			return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
		};
		const create = (str) => {
			switch (str) {
				case "*": return `${nodot}${ONE_CHAR}${star}`;
				case ".*": return `${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "*.*": return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "*/*": return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
				case "**": return nodot + globstar(opts);
				case "**/*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
				case "**/*.*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "**/.*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
				default: {
					const match = /^(.*?)\.(\w+)$/.exec(str);
					if (!match) return;
					const source = create(match[1]);
					if (!source) return;
					return source + DOT_LITERAL + match[2];
				}
			}
		};
		let source = create(utils.removePrefix(input, state));
		if (source && opts.strictSlashes !== true) source += `${SLASH_LITERAL}?`;
		return source;
	};
	module.exports = parse;
}));
var require_picomatch$3 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const scan = require_scan$1();
	const parse = require_parse$4();
	const utils = require_utils$2();
	const constants = require_constants$4();
	const isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
	/**
	* Creates a matcher function from one or more glob patterns. The
	* returned function takes a string to match as its first argument,
	* and returns true if the string is a match. The returned matcher
	* function also takes a boolean as the second argument that, when true,
	* returns an object with additional information.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch(glob[, options]);
	*
	* const isMatch = picomatch('*.!(*a)');
	* console.log(isMatch('a.a')); //=> false
	* console.log(isMatch('a.b')); //=> true
	* ```
	* @name picomatch
	* @param {String|Array} `globs` One or more glob patterns.
	* @param {Object=} `options`
	* @return {Function=} Returns a matcher function.
	* @api public
	*/
	const picomatch = (glob, options, returnState = false) => {
		if (Array.isArray(glob)) {
			const fns = glob.map((input) => picomatch(input, options, returnState));
			const arrayMatcher = (str) => {
				for (const isMatch of fns) {
					const state = isMatch(str);
					if (state) return state;
				}
				return false;
			};
			return arrayMatcher;
		}
		const isState = isObject(glob) && glob.tokens && glob.input;
		if (glob === "" || typeof glob !== "string" && !isState) throw new TypeError("Expected pattern to be a non-empty string");
		const opts = options || {};
		const posix = opts.windows;
		const regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, false, true);
		const state = regex.state;
		delete regex.state;
		let isIgnored = () => false;
		if (opts.ignore) isIgnored = picomatch(opts.ignore, {
			...options,
			ignore: null,
			onMatch: null,
			onResult: null
		}, returnState);
		const matcher = (input, returnObject = false) => {
			const { isMatch, match, output } = picomatch.test(input, regex, options, {
				glob,
				posix
			});
			const result = {
				glob,
				state,
				regex,
				posix,
				input,
				output,
				match,
				isMatch
			};
			if (typeof opts.onResult === "function") opts.onResult(result);
			if (isMatch === false) {
				result.isMatch = false;
				return returnObject ? result : false;
			}
			if (isIgnored(input)) {
				if (typeof opts.onIgnore === "function") opts.onIgnore(result);
				result.isMatch = false;
				return returnObject ? result : false;
			}
			if (typeof opts.onMatch === "function") opts.onMatch(result);
			return returnObject ? result : true;
		};
		if (returnState) matcher.state = state;
		return matcher;
	};
	/**
	* Test `input` with the given `regex`. This is used by the main
	* `picomatch()` function to test the input string.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.test(input, regex[, options]);
	*
	* console.log(picomatch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
	* // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
	* ```
	* @param {String} `input` String to test.
	* @param {RegExp} `regex`
	* @return {Object} Returns an object with matching info.
	* @api public
	*/
	picomatch.test = (input, regex, options, { glob, posix } = {}) => {
		if (typeof input !== "string") throw new TypeError("Expected input to be a string");
		if (input === "") return {
			isMatch: false,
			output: ""
		};
		const opts = options || {};
		const format = opts.format || (posix ? utils.toPosixSlashes : null);
		let match = input === glob;
		let output = match && format ? format(input) : input;
		if (match === false) {
			output = format ? format(input) : input;
			match = output === glob;
		}
		if (match === false || opts.capture === true) if (opts.matchBase === true || opts.basename === true) match = picomatch.matchBase(input, regex, options, posix);
		else match = regex.exec(output);
		return {
			isMatch: Boolean(match),
			match,
			output
		};
	};
	/**
	* Match the basename of a filepath.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.matchBase(input, glob[, options]);
	* console.log(picomatch.matchBase('foo/bar.js', '*.js'); // true
	* ```
	* @param {String} `input` String to test.
	* @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
	* @return {Boolean}
	* @api public
	*/
	picomatch.matchBase = (input, glob, options) => {
		return (glob instanceof RegExp ? glob : picomatch.makeRe(glob, options)).test(utils.basename(input));
	};
	/**
	* Returns true if **any** of the given glob `patterns` match the specified `string`.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.isMatch(string, patterns[, options]);
	*
	* console.log(picomatch.isMatch('a.a', ['b.*', '*.a'])); //=> true
	* console.log(picomatch.isMatch('a.a', 'b.*')); //=> false
	* ```
	* @param {String|Array} str The string to test.
	* @param {String|Array} patterns One or more glob patterns to use for matching.
	* @param {Object} [options] See available [options](#options).
	* @return {Boolean} Returns true if any patterns match `str`
	* @api public
	*/
	picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
	/**
	* Parse a glob pattern to create the source string for a regular
	* expression.
	*
	* ```js
	* const picomatch = require('picomatch');
	* const result = picomatch.parse(pattern[, options]);
	* ```
	* @param {String} `pattern`
	* @param {Object} `options`
	* @return {Object} Returns an object with useful properties and output to be used as a regex source string.
	* @api public
	*/
	picomatch.parse = (pattern, options) => {
		if (Array.isArray(pattern)) return pattern.map((p) => picomatch.parse(p, options));
		return parse(pattern, {
			...options,
			fastpaths: false
		});
	};
	/**
	* Scan a glob pattern to separate the pattern into segments.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.scan(input[, options]);
	*
	* const result = picomatch.scan('!./foo/*.js');
	* console.log(result);
	* { prefix: '!./',
	*   input: '!./foo/*.js',
	*   start: 3,
	*   base: 'foo',
	*   glob: '*.js',
	*   isBrace: false,
	*   isBracket: false,
	*   isGlob: true,
	*   isExtglob: false,
	*   isGlobstar: false,
	*   negated: true }
	* ```
	* @param {String} `input` Glob pattern to scan.
	* @param {Object} `options`
	* @return {Object} Returns an object with
	* @api public
	*/
	picomatch.scan = (input, options) => scan(input, options);
	/**
	* Compile a regular expression from the `state` object returned by the
	* [parse()](#parse) method.
	*
	* ```js
	* const picomatch = require('picomatch');
	* const state = picomatch.parse('*.js');
	* // picomatch.compileRe(state[, options]);
	*
	* console.log(picomatch.compileRe(state));
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {Object} `state`
	* @param {Object} `options`
	* @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
	* @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
	* @return {RegExp}
	* @api public
	*/
	picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
		if (returnOutput === true) return state.output;
		const opts = options || {};
		let source = `${opts.contains ? "" : "^"}(?:${state.output})${opts.contains ? "" : "$"}`;
		if (state && state.negated === true) source = `^(?!${source}).*$`;
		const regex = picomatch.toRegex(source, options);
		if (returnState === true) regex.state = state;
		return regex;
	};
	/**
	* Create a regular expression from a parsed glob pattern.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.makeRe(state[, options]);
	*
	* const result = picomatch.makeRe('*.js');
	* console.log(result);
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {String} `state` The object returned from the `.parse` method.
	* @param {Object} `options`
	* @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
	* @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
	* @return {RegExp} Returns a regex created from the given pattern.
	* @api public
	*/
	picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
		if (!input || typeof input !== "string") throw new TypeError("Expected a non-empty string");
		let parsed = {
			negated: false,
			fastpaths: true
		};
		if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) parsed.output = parse.fastpaths(input, options);
		if (!parsed.output) parsed = parse(input, options);
		return picomatch.compileRe(parsed, options, returnOutput, returnState);
	};
	/**
	* Create a regular expression from the given regex source string.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.toRegex(source[, options]);
	*
	* const { output } = picomatch.parse('*.js');
	* console.log(picomatch.toRegex(output));
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {String} `source` Regular expression source string.
	* @param {Object} `options`
	* @return {RegExp}
	* @api public
	*/
	picomatch.toRegex = (source, options) => {
		try {
			const opts = options || {};
			return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
		} catch (err) {
			if (options && options.debug === true) throw err;
			return /$^/;
		}
	};
	/**
	* Picomatch constants.
	* @return {Object}
	*/
	picomatch.constants = constants;
	/**
	* Expose "picomatch"
	*/
	module.exports = picomatch;
}));
var require_picomatch$2 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const pico = require_picomatch$3();
	const utils = require_utils$2();
	function picomatch(glob, options, returnState = false) {
		if (options && (options.windows === null || options.windows === void 0)) options = {
			...options,
			windows: utils.isWindows()
		};
		return pico(glob, options, returnState);
	}
	Object.assign(picomatch, pico);
	module.exports = picomatch;
}));
Math.random().toString(36).slice(2);
/**
* Prefix for resolved Ids that are not valid browser import specifiers
*/
const VALID_ID_PREFIX = `/@id/`;
let SOURCEMAPPING_URL = "sourceMa";
SOURCEMAPPING_URL += "ppingURL";
const isWindows = typeof process !== "undefined" && process.platform === "win32";
const windowsSlashRE = /\\/g;
function slash(p) {
	return p.replace(windowsSlashRE, "/");
}
const customizationHookNamespace = "vite-module-runner:import-meta-resolve/v1/";
`${JSON.stringify(customizationHookNamespace)}${JSON.stringify(customizationHookNamespace)}`;
",".charCodeAt(0);
";".charCodeAt(0);
var chars$1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar$1 = /* @__PURE__ */ new Uint8Array(64);
var charToInt$1 = /* @__PURE__ */ new Uint8Array(128);
for (let i = 0; i < chars$1.length; i++) {
	const c = chars$1.charCodeAt(i);
	intToChar$1[i] = c;
	charToInt$1[c] = i;
}
function coerce(value) {
	if (value instanceof Error) return value.stack || value.message;
	return value;
}
function selectColor(colors, namespace) {
	let hash = 0;
	for (let i = 0; i < namespace.length; i++) {
		hash = (hash << 5) - hash + namespace.charCodeAt(i);
		hash |= 0;
	}
	return colors[Math.abs(hash) % colors.length];
}
function matchesTemplate(search, template) {
	let searchIndex = 0;
	let templateIndex = 0;
	let starIndex = -1;
	let matchIndex = 0;
	while (searchIndex < search.length) if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) if (template[templateIndex] === "*") {
		starIndex = templateIndex;
		matchIndex = searchIndex;
		templateIndex++;
	} else {
		searchIndex++;
		templateIndex++;
	}
	else if (starIndex !== -1) {
		templateIndex = starIndex + 1;
		matchIndex++;
		searchIndex = matchIndex;
	} else return false;
	while (templateIndex < template.length && template[templateIndex] === "*") templateIndex++;
	return templateIndex === template.length;
}
function humanize(value) {
	if (value >= 1e3) return `${(value / 1e3).toFixed(1)}s`;
	return `${value}ms`;
}
function setup(useColors, colors, log, load, save, formatArgs, init) {
	const createDebug = (namespace) => {
		let prevTime;
		let enableOverride;
		let namespacesCache;
		let enabledCache;
		const debug = (...args) => {
			if (!debug.enabled) return;
			const curr = Date.now();
			debug.diff = curr - (prevTime || curr);
			debug.prev = prevTime;
			debug.curr = curr;
			prevTime = curr;
			args[0] = coerce(args[0]);
			if (typeof args[0] !== "string") args.unshift("%O");
			let index = 0;
			args[0] = args[0].replace(/%([a-z%])/gi, (match, format) => {
				if (match === "%%") return "%";
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === "function") {
					match = formatter.call(debug, args[index]);
					args.splice(index, 1);
					index--;
				}
				return match;
			});
			createDebug.formatArgs.call(debug, args);
			(debug.log || createDebug.log).apply(debug, args);
		};
		function extend(namespace$1, delimiter = ":") {
			const newDebug = createDebug(this.namespace + delimiter + namespace$1);
			newDebug.log = this.log;
			return newDebug;
		}
		debug.namespace = namespace;
		debug.useColors = useColors;
		debug.color = selectColor(colors, namespace);
		debug.extend = extend;
		debug.log = log;
		Object.defineProperty(debug, "enabled", {
			enumerable: true,
			configurable: false,
			get: () => {
				if (enableOverride != null) return enableOverride;
				if (namespacesCache !== createDebug.namespaces) {
					namespacesCache = createDebug.namespaces;
					enabledCache = createDebug.enabled(namespace);
				}
				return enabledCache;
			},
			set: (v) => {
				enableOverride = v;
			}
		});
		init && init(debug);
		return debug;
	};
	function enable(namespaces) {
		save(namespaces);
		createDebug.namespaces = namespaces;
		createDebug.names = [];
		createDebug.skips = [];
		const split = namespaces.trim().replace(/\s+/g, ",").split(",").filter(Boolean);
		for (const ns of split) if (ns[0] === "-") createDebug.skips.push(ns.slice(1));
		else createDebug.names.push(ns);
	}
	function disable() {
		const namespaces = [...createDebug.names, ...createDebug.skips.map((namespace) => `-${namespace}`)].join(",");
		createDebug.enable("");
		return namespaces;
	}
	function enabled(name) {
		for (const skip of createDebug.skips) if (matchesTemplate(name, skip)) return false;
		for (const ns of createDebug.names) if (matchesTemplate(name, ns)) return true;
		return false;
	}
	createDebug.namespaces = "";
	createDebug.formatters = {};
	createDebug.enable = enable;
	createDebug.disable = disable;
	createDebug.enabled = enabled;
	createDebug.names = [];
	createDebug.skips = [];
	createDebug.selectColor = (ns) => selectColor(colors, ns);
	createDebug.formatArgs = formatArgs;
	createDebug.log = log;
	createDebug.enable(load());
	return createDebug;
}
const require$1 = createRequire(import.meta.url);
function log$1(...args) {
	process.stderr.write(`${formatWithOptions(inspectOpts, ...args)}\n`);
}
const colors$38 = process.stderr.getColorDepth && process.stderr.getColorDepth() > 2 ? [
	20,
	21,
	26,
	27,
	32,
	33,
	38,
	39,
	40,
	41,
	42,
	43,
	44,
	45,
	56,
	57,
	62,
	63,
	68,
	69,
	74,
	75,
	76,
	77,
	78,
	79,
	80,
	81,
	92,
	93,
	98,
	99,
	112,
	113,
	128,
	129,
	134,
	135,
	148,
	149,
	160,
	161,
	162,
	163,
	164,
	165,
	166,
	167,
	168,
	169,
	170,
	171,
	172,
	173,
	178,
	179,
	184,
	185,
	196,
	197,
	198,
	199,
	200,
	201,
	202,
	203,
	204,
	205,
	206,
	207,
	208,
	209,
	214,
	215,
	220,
	221
] : [
	6,
	2,
	3,
	4,
	5,
	1
];
const inspectOpts = Object.keys(process.env).filter((key) => {
	return /^debug_/i.test(key);
}).reduce((obj, key) => {
	const prop = key.slice(6).toLowerCase().replace(/_([a-z])/g, (_, k) => k.toUpperCase());
	let value = process.env[key];
	if (value === "null") value = null;
	else if (/^yes|on|true|enabled$/i.test(value)) value = true;
	else if (/^no|off|false|disabled$/i.test(value)) value = false;
	else value = Number(value);
	obj[prop] = value;
	return obj;
}, {});
function load() {
	return process.env.DEBUG || "";
}
function save(namespaces) {
	if (namespaces) process.env.DEBUG = namespaces;
	else delete process.env.DEBUG;
}
function useColors() {
	return "colors" in inspectOpts ? Boolean(inspectOpts.colors) : isatty(process.stderr.fd);
}
let humanize$1;
try {
	humanize$1 = require$1("ms");
} catch (_unused) {
	humanize$1 = humanize;
}
function formatArgs(args) {
	const { namespace: name, useColors: useColors$1 } = this;
	if (useColors$1) {
		const c = this.color;
		const colorCode = `\u001B[3${c < 8 ? c : `8;5;${c}`}`;
		const prefix = `  ${colorCode};1m${name} \u001B[0m`;
		args[0] = prefix + args[0].split("\n").join(`\n${prefix}`);
		args.push(`${colorCode}m+${humanize$1(this.diff)}\u001B[0m`);
	} else args[0] = `${getDate()}${name} ${args[0]}`;
}
function getDate() {
	if (inspectOpts.hideDate) return "";
	return `${(/* @__PURE__ */ new Date()).toISOString()} `;
}
function init$1(debug) {
	debug.inspectOpts = Object.assign({}, inspectOpts);
}
const createDebug = setup(useColors(), colors$38, log$1, load, save, formatArgs, init$1);
createDebug.inspectOpts = inspectOpts;
createDebug.formatters.o = function(v) {
	this.inspectOpts.colors = this.useColors;
	return inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
};
createDebug.formatters.O = function(v) {
	this.inspectOpts.colors = this.useColors;
	return inspect(v, this.inspectOpts);
};
var node_default = createDebug;
createDebug.default = createDebug;
createDebug.debug = createDebug;
require_picomatch$2();
new RegExp(`\\${win32.sep}`, "g");
new Set(`break case class catch const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield enum await implements package protected static interface private public arguments Infinity NaN undefined null true false eval uneval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape Object Function Boolean Symbol Error EvalError InternalError RangeError ReferenceError SyntaxError TypeError URIError Number Math Date String RegExp Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array Map Set WeakMap WeakSet SIMD ArrayBuffer DataView JSON Promise Generator GeneratorFunction Reflect Proxy Intl`.split(" ")).add("");
"isWellFormed" in String.prototype;
if (process.versions.pnp) try {
	createRequire(
		/** #__KEEP__ */
		import.meta.url
	)("pnpapi");
} catch {}
var import_picocolors = /* @__PURE__ */ __toESM$2(require_picocolors(), 1);
const NODE_BUILTIN_NAMESPACE = "node:";
const BUN_BUILTIN_NAMESPACE = "bun:";
[
	...builtinModules.filter((id) => !id.includes(":")),
	new RegExp(`^${NODE_BUILTIN_NAMESPACE}`),
	new RegExp(`^${BUN_BUILTIN_NAMESPACE}`)
];
path.dirname(fileURLToPath(
	/** #__KEEP__ */
	import.meta.url
));
const filter = process.env.VITE_DEBUG_FILTER;
const DEBUG = process.env.DEBUG;
function createDebugger(namespace, options = {}) {
	const log = node_default(namespace);
	const { onlyWhenFocused, depth } = options;
	if (depth && log.inspectOpts && log.inspectOpts.depth == null) log.inspectOpts.depth = options.depth;
	let enabled = log.enabled;
	if (enabled && onlyWhenFocused) enabled = !!DEBUG?.includes(typeof onlyWhenFocused === "string" ? onlyWhenFocused : namespace);
	if (enabled) return (...args) => {
		if (!filter || args.some((a) => a?.includes?.(filter))) log(...args);
	};
}
function testCaseInsensitiveFS() {
	if (!CLIENT_ENTRY.endsWith("client.mjs")) throw new Error(`cannot test case insensitive FS, CLIENT_ENTRY const doesn't contain client.mjs`);
	if (!fs.existsSync(CLIENT_ENTRY)) throw new Error("cannot test case insensitive FS, CLIENT_ENTRY does not point to an existing file: " + CLIENT_ENTRY);
	return fs.existsSync(CLIENT_ENTRY.replace("client.mjs", "cLiEnT.mjs"));
}
testCaseInsensitiveFS();
function normalizePath$1(id) {
	return path.posix.normalize(isWindows ? slash(id) : id);
}
const externalRE = /^([a-z]+:)?\/\//;
const isExternalUrl = (url) => externalRE.test(url);
const dataUrlRE = /^\s*data:/i;
const isDataUrl = (url) => dataUrlRE.test(url);
new RegExp(`^(?:${[
	FS_PREFIX,
	VALID_ID_PREFIX,
	CLIENT_PUBLIC_PATH,
	ENV_PUBLIC_PATH
].join("|")})`);
async function asyncReplace(input, re, replacer) {
	let match;
	let remaining = input;
	let rewritten = "";
	while (match = re.exec(remaining)) {
		rewritten += remaining.slice(0, match.index);
		rewritten += await replacer(match);
		remaining = remaining.slice(match.index + match[0].length);
	}
	rewritten += remaining;
	return rewritten;
}
isWindows || fs.realpathSync.native;
function joinSrcset(ret) {
	return ret.map(({ url, descriptor }) => url + (descriptor ? ` ${descriptor}` : "")).join(", ");
}
/**
This regex represents a loose rule of an “image candidate string” and "image set options".

@see https://html.spec.whatwg.org/multipage/images.html#srcset-attribute
@see https://drafts.csswg.org/css-images-4/#image-set-notation

The Regex has named capturing groups `url` and `descriptor`.
The `url` group can be:
* any CSS function
* CSS string (single or double-quoted)
* URL string (unquoted)
The `descriptor` is anything after the space and before the comma.
*/
const imageCandidateRegex = /(?:^|\s|(?<=,))(?<url>[\w-]+\([^)]*\)|"[^"]*"|'[^']*'|[^,]\S*[^,])\s*(?:\s(?<descriptor>\w[^,]+))?(?:,|$)/g;
const escapedSpaceCharacters = /(?: |\\t|\\n|\\f|\\r)+/g;
function parseSrcset(string) {
	const matches = string.trim().replace(escapedSpaceCharacters, " ").replace(/\r?\n/, "").replace(/,\s+/, ", ").replaceAll(/\s+/g, " ").matchAll(imageCandidateRegex);
	return Array.from(matches, ({ groups }) => ({
		url: groups?.url?.trim() ?? "",
		descriptor: groups?.descriptor?.trim() ?? ""
	})).filter(({ url }) => !!url);
}
function processSrcSet(srcs, replacer) {
	return Promise.all(parseSrcset(srcs).map(async ({ url, descriptor }) => ({
		url: await replacer({
			url,
			descriptor
		}),
		descriptor
	}))).then(joinSrcset);
}
(() => {
	return () => {
		const method = process.env.VITE_DEPRECATION_TRACE ? "trace" : "warn";
		console[method]("`optimizeDeps.rollupOptions` / `ssr.optimizeDeps.rollupOptions` is deprecated. Use `optimizeDeps.rolldownOptions` instead. Note that this option may be set by a plugin. " + (method === "trace" ? "Showing trace because VITE_DEPRECATION_TRACE is set." : "Set VITE_DEPRECATION_TRACE=1 to see where it is called."));
	};
})();
createDebugger("vite:esbuild");
(async function() {}).constructor;
var ImportType;
(function(A) {
	A[A.Static = 1] = "Static", A[A.Dynamic = 2] = "Dynamic", A[A.ImportMeta = 3] = "ImportMeta", A[A.StaticSourcePhase = 4] = "StaticSourcePhase", A[A.DynamicSourcePhase = 5] = "DynamicSourcePhase", A[A.StaticDeferPhase = 6] = "StaticDeferPhase", A[A.DynamicDeferPhase = 7] = "DynamicDeferPhase";
})(ImportType || (ImportType = {}));
new Uint8Array(new Uint16Array([1]).buffer)[0];
const E = () => {
	return A = "AGFzbQEAAAABKwhgAX8Bf2AEf39/fwBgAAF/YAAAYAF/AGADf39/AX9gAn9/AX9gA39/fwADODcAAQECAgICAgICAgICAgICAgICAgICAgICAwIAAwMDBAAEAAAABQAAAAAAAwMDAAAGAAcABgIFBAUBcAEBAQUDAQABBg8CfwFBsPIAC38AQbDyAAsHnQEbBm1lbW9yeQIAAnNhAAABZQADAmlzAAQCaWUABQJzcwAGAnNlAAcCaXQACAJhaQAJAmlkAAoCaXAACwJlcwAMAmVlAA0DZWxzAA4DZWxlAA8CcmkAEAJyZQARAWYAEgJtcwATAnJhABQDYWtzABUDYWtlABYDYXZzABcDYXZlABgDcnNhABkFcGFyc2UAGgtfX2hlYXBfYmFzZQMBCrxJN2gBAX9BACAANgL0CUEAKALQCSIBIABBAXRqIgBBADsBAEEAIABBAmoiADYC+AlBACAANgL8CUEAQQA2AtQJQQBBADYC5AlBAEEANgLcCUEAQQA2AtgJQQBBADYC7AlBAEEANgLgCSABC9MBAQN/QQAoAuQJIQRBAEEAKAL8CSIFNgLkCUEAIAQ2AugJQQAgBUEoajYC/AkgBEEkakHUCSAEGyAFNgIAQQAoAsgJIQRBACgCxAkhBiAFIAE2AgAgBSAANgIIIAUgAiACQQJqQQAgBiADRiIAGyAEIANGIgQbNgIMIAUgAzYCFCAFQQA2AhAgBSACNgIEIAVCADcCICAFQQNBAUECIAAbIAQbNgIcIAVBACgCxAkgA0YiAjoAGAJAAkAgAg0AQQAoAsgJIANHDQELQQBBAToAgAoLC14BAX9BACgC7AkiBEEQakHYCSAEG0EAKAL8CSIENgIAQQAgBDYC7AlBACAEQRRqNgL8CUEAQQE6AIAKIARBADYCECAEIAM2AgwgBCACNgIIIAQgATYCBCAEIAA2AgALCABBACgChAoLFQBBACgC3AkoAgBBACgC0AlrQQF1Cx4BAX9BACgC3AkoAgQiAEEAKALQCWtBAXVBfyAAGwsVAEEAKALcCSgCCEEAKALQCWtBAXULHgEBf0EAKALcCSgCDCIAQQAoAtAJa0EBdUF/IAAbCwsAQQAoAtwJKAIcCx4BAX9BACgC3AkoAhAiAEEAKALQCWtBAXVBfyAAGws7AQF/AkBBACgC3AkoAhQiAEEAKALECUcNAEF/DwsCQCAAQQAoAsgJRw0AQX4PCyAAQQAoAtAJa0EBdQsLAEEAKALcCS0AGAsVAEEAKALgCSgCAEEAKALQCWtBAXULFQBBACgC4AkoAgRBACgC0AlrQQF1Cx4BAX9BACgC4AkoAggiAEEAKALQCWtBAXVBfyAAGwseAQF/QQAoAuAJKAIMIgBBACgC0AlrQQF1QX8gABsLJQEBf0EAQQAoAtwJIgBBJGpB1AkgABsoAgAiADYC3AkgAEEARwslAQF/QQBBACgC4AkiAEEQakHYCSAAGygCACIANgLgCSAAQQBHCwgAQQAtAIgKCwgAQQAtAIAKCysBAX9BAEEAKAKMCiIAQRBqQQAoAtwJQSBqIAAbKAIAIgA2AowKIABBAEcLFQBBACgCjAooAgBBACgC0AlrQQF1CxUAQQAoAowKKAIEQQAoAtAJa0EBdQsVAEEAKAKMCigCCEEAKALQCWtBAXULFQBBACgCjAooAgxBACgC0AlrQQF1CwoAQQBBADYCjAoLuw8BBX8jAEGA0ABrIgAkAEEAQQE6AIgKQQBBACgCzAk2ApQKQQBBACgC0AlBfmoiATYCqApBACABQQAoAvQJQQF0aiICNgKsCkEAQQA6AIAKQQBBADsBkApBAEEAOwGSCkEAQQA6AJgKQQBBADYChApBAEEAOgDwCUEAIABBgBBqNgKcCkEAIAA2AqAKQQBBADoApAoCQAJAAkACQANAQQAgAUECaiIDNgKoCiABIAJPDQECQCADLwEAIgJBd2pBBUkNAAJAAkACQAJAAkAgAkGbf2oOBQEICAgCAAsgAkEgRg0EIAJBL0YNAyACQTtGDQIMBwtBAC8BkgoNASADEBtFDQEgAUEEakGCCEEKEDYNARAcQQAtAIgKDQFBAEEAKAKoCiIBNgKUCgwHCyADEBtFDQAgAUEEakGMCEEKEDYNABAdC0EAQQAoAqgKNgKUCgwBCwJAIAEvAQQiA0EqRg0AIANBL0cNBBAeDAELQQEQHwtBACgCrAohAkEAKAKoCiEBDAALC0EAIQIgAyEBQQAtAPAJDQIMAQtBACABNgKoCkEAQQA6AIgKCwNAQQAgAUECaiIDNgKoCgJAAkACQAJAAkACQAJAIAFBACgCrApPDQACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCADLwEAIgJBYGoOEBMSCRISEhIIAQUSEgQSEgoACwJAAkACQAJAIAJBpX9qDg8FFQYVFQ4VFQMVARUVFQIACyACQXdqQQVJDRUgAkGFf2oOAwgUCRQLQQAvAZIKDRMgAxAbRQ0TIAFBBGpBgghBChA2DRMQHAwTCyADEBtFDRIgAUEEakGMCEEKEDYNEhAdDBILIAMQG0UNESABKQAEQuyAhIOwjsA5Ug0RIAEvAQwiA0F3aiIBQRdLDQ9BASABdEGfgIAEcUUNDwwQC0EAQQAvAZIKIgFBAWo7AZIKQQAoApwKIAFBA3RqIgFBATYCACABQQAoApQKNgIEDBALQQBBAC8BkgoiAUEBajsBkgpBACgCnAogAUEDdGoiAUEINgIAIAFBACgClAo2AgQMDwtBAC8BkgoiAUUNC0EAIAFBf2o7AZIKDA4LQQAvAZAKIgNFDQ1BAC8BkgoiAkUNDSACQQN0QQAoApwKakF4aigCAEEFRw0NIANBAnRBACgCoApqQXxqKAIAIgMoAgQNDUEAIAFBBGo2AqgKIANBACgClApBAmo2AgRBARAgGiADQQAoAqgKIgE2AhBBACABQX5qNgKoCgwNC0EALwGSCiIDRQ0JQQAgA0F/aiIDOwGSCkEALwGQCiICRQ0MQQAoApwKIANB//8DcUEDdGooAgBBBUcNDAJAIAJBAnRBACgCoApqQXxqKAIAIgMoAgQNACADQQAoApQKQQJqNgIEC0EAIAJBf2o7AZAKIAMgAUEEajYCDAwMCwJAQQAoApQKIgEvAQBBKUcNAEEAKALkCSIDRQ0AIAMoAgQgAUcNAEEAQQAoAugJIgM2AuQJAkAgA0UNACADQQA2AiQMAQtBAEEANgLUCQtBAEEALwGSCiIDQQFqOwGSCkEAKAKcCiADQQN0aiIDQQZBAkEALQCkChs2AgAgAyABNgIEQQBBADoApAoMCwtBAC8BkgoiAUUNB0EAIAFBf2oiATsBkgpBACgCnAogAUH//wNxQQN0aigCAEEERg0EDAoLQScQIQwJC0EiECEMCAsCQAJAIAEvAQQiAUEqRg0AIAFBL0cNARAeDAoLQQEQHwwJCwJAAkACQAJAQQAoApQKIgEvAQAiAxAiRQ0AAkACQCADQVVqDgQACQEDCQsgAUF+ai8BAEErRg0DDAgLIAFBfmovAQBBLUYNAgwHCyADQSlHDQFBACgCnApBAC8BkgoiAkEDdGooAgQQI0UNAgwGCyABQX5qLwEAQVBqQf//A3FBCk8NBQtBAC8BkgohAgsCQAJAIAJB//8DcSICRQ0AIANB5gBHDQBBACgCnAogAkF/akEDdGoiBCgCAEEBRw0AIAFBfmovAQBB7wBHDQEgAUF8ahAkRQ0BIAQoAgRBlghBAxAlRQ0BDAULIANB/QBHDQBBACgCnAogAkEDdGoiAigCBBAmDQQgAigCAEEGRg0ECyABECcNAyADRQ0DIANBL0ZBAC0AmApBAEdxDQMCQEEAKALsCSICRQ0AIAEgAigCAEkNACABIAIoAgRNDQQLIAFBfmohAUEAKALQCSECAkADQCABQQJqIgQgAk0NAUEAIAE2ApQKIAEvAQAhAyABQX5qIgQhASADEChFDQALIARBAmohBAsCQCADQf//A3EQKUUNACAEQX5qIQECQANAIAFBAmoiAyACTQ0BQQAgATYClAogAS8BACEDIAFBfmoiBCEBIAMQKQ0ACyAEQQJqIQMLIAMQKg0EC0EAQQE6AJgKDAcLQQAoApwKQQAvAZIKIgFBA3QiA2pBACgClAo2AgRBACABQQFqOwGSCkEAKAKcCiADakEDNgIACxArDAULQQAtAPAJQQAvAZAKQQAvAZIKcnJFIQIMBwsQLEEAQQA6AJgKDAMLEC1BACECDAULIANBoAFHDQELQQBBAToApAoLQQBBACgCqAo2ApQKC0EAKAKoCiEBDAALCyAAQYDQAGokACACCxoAAkBBACgC0AkgAEcNAEEBDwsgAEF+ahAuC/4KAQZ/QQBBACgCqAoiAEEMaiIBNgKoCkEAKALsCSECQQEQICEDAkACQAJAAkACQAJAAkACQAJAQQAoAqgKIgQgAUcNACADEC9FDQELAkACQAJAAkACQAJAAkAgA0EqRg0AIANB+wBHDQFBACAEQQJqNgKoCkEBECAhA0EAKAKoCiEEA0ACQAJAIANB//8DcSIDQSJGDQAgA0EnRg0AIAMQMxpBACgCqAohAwwBCyADECFBAEEAKAKoCkECaiIDNgKoCgtBARAgGgJAIAQgAxA0IgNBLEcNAEEAQQAoAqgKQQJqNgKoCkEBECAhAwsgA0H9AEYNA0EAKAKoCiIFIARGDQ8gBSEEIAVBACgCrApNDQAMDwsLQQAgBEECajYCqApBARAgGkEAKAKoCiIDIAMQNBoMAgtBAEEAOgCICgJAAkACQAJAAkACQCADQZ9/ag4MAgsEAQsDCwsLCwsFAAsgA0H2AEYNBAwKC0EAIARBDmoiAzYCqAoCQAJAAkBBARAgQZ9/ag4GABICEhIBEgtBACgCqAoiBSkAAkLzgOSD4I3AMVINESAFLwEKEClFDRFBACAFQQpqNgKoCkEAECAaC0EAKAKoCiIFQQJqQbIIQQ4QNg0QIAUvARAiAkF3aiIBQRdLDQ1BASABdEGfgIAEcUUNDQwOC0EAKAKoCiIFKQACQuyAhIOwjsA5Ug0PIAUvAQoiAkF3aiIBQRdNDQYMCgtBACAEQQpqNgKoCkEAECAaQQAoAqgKIQQLQQAgBEEQajYCqAoCQEEBECAiBEEqRw0AQQBBACgCqApBAmo2AqgKQQEQICEEC0EAKAKoCiEDIAQQMxogA0EAKAKoCiIEIAMgBBACQQBBACgCqApBfmo2AqgKDwsCQCAEKQACQuyAhIOwjsA5Ug0AIAQvAQoQKEUNAEEAIARBCmo2AqgKQQEQICEEQQAoAqgKIQMgBBAzGiADQQAoAqgKIgQgAyAEEAJBAEEAKAKoCkF+ajYCqAoPC0EAIARBBGoiBDYCqAoLQQAgBEEGajYCqApBAEEAOgCICkEBECAhBEEAKAKoCiEDIAQQMyEEQQAoAqgKIQIgBEHf/wNxIgFB2wBHDQNBACACQQJqNgKoCkEBECAhBUEAKAKoCiEDQQAhBAwEC0EAQQE6AIAKQQBBACgCqApBAmo2AqgKC0EBECAhBEEAKAKoCiEDAkAgBEHmAEcNACADQQJqQawIQQYQNg0AQQAgA0EIajYCqAogAEEBECBBABAyIAJBEGpB2AkgAhshAwNAIAMoAgAiA0UNBSADQgA3AgggA0EQaiEDDAALC0EAIANBfmo2AqgKDAMLQQEgAXRBn4CABHFFDQMMBAtBASEECwNAAkACQCAEDgIAAQELIAVB//8DcRAzGkEBIQQMAQsCQAJAQQAoAqgKIgQgA0YNACADIAQgAyAEEAJBARAgIQQCQCABQdsARw0AIARBIHJB/QBGDQQLQQAoAqgKIQMCQCAEQSxHDQBBACADQQJqNgKoCkEBECAhBUEAKAKoCiEDIAVBIHJB+wBHDQILQQAgA0F+ajYCqAoLIAFB2wBHDQJBACACQX5qNgKoCg8LQQAhBAwACwsPCyACQaABRg0AIAJB+wBHDQQLQQAgBUEKajYCqApBARAgIgVB+wBGDQMMAgsCQCACQVhqDgMBAwEACyACQaABRw0CC0EAIAVBEGo2AqgKAkBBARAgIgVBKkcNAEEAQQAoAqgKQQJqNgKoCkEBECAhBQsgBUEoRg0BC0EAKAKoCiEBIAUQMxpBACgCqAoiBSABTQ0AIAQgAyABIAUQAkEAQQAoAqgKQX5qNgKoCg8LIAQgA0EAQQAQAkEAIARBDGo2AqgKDwsQLQuFDAEKf0EAQQAoAqgKIgBBDGoiATYCqApBARAgIQJBACgCqAohAwJAAkACQAJAAkACQAJAAkAgAkEuRw0AQQAgA0ECajYCqAoCQEEBECAiAkHkAEYNAAJAIAJB8wBGDQAgAkHtAEcNB0EAKAKoCiICQQJqQZwIQQYQNg0HAkBBACgClAoiAxAxDQAgAy8BAEEuRg0ICyAAIAAgAkEIakEAKALICRABDwtBACgCqAoiAkECakGiCEEKEDYNBgJAQQAoApQKIgMQMQ0AIAMvAQBBLkYNBwtBACEEQQAgAkEMajYCqApBASEFQQUhBkEBECAhAkEAIQdBASEIDAILQQAoAqgKIgIpAAJC5YCYg9CMgDlSDQUCQEEAKAKUCiIDEDENACADLwEAQS5GDQYLQQAhBEEAIAJBCmo2AqgKQQIhCEEHIQZBASEHQQEQICECQQEhBQwBCwJAAkACQAJAIAJB8wBHDQAgAyABTQ0AIANBAmpBoghBChA2DQACQCADLwEMIgRBd2oiB0EXSw0AQQEgB3RBn4CABHENAgsgBEGgAUYNAQtBACEHQQchBkEBIQQgAkHkAEYNAQwCC0EAIQRBACADQQxqIgI2AqgKQQEhBUEBECAhCQJAQQAoAqgKIgYgAkYNAEHmACECAkAgCUHmAEYNAEEFIQZBACEHQQEhCCAJIQIMBAtBACEHQQEhCCAGQQJqQawIQQYQNg0EIAYvAQgQKEUNBAtBACEHQQAgAzYCqApBByEGQQEhBEEAIQVBACEIIAkhAgwCCyADIABBCmpNDQBBACEIQeQAIQICQCADKQACQuWAmIPQjIA5Ug0AAkACQCADLwEKIgRBd2oiB0EXSw0AQQEgB3RBn4CABHENAQtBACEIIARBoAFHDQELQQAhBUEAIANBCmo2AqgKQSohAkEBIQdBAiEIQQEQICIJQSpGDQRBACADNgKoCkEBIQRBACEHQQAhCCAJIQIMAgsgAyEGQQAhBwwCC0EAIQVBACEICwJAIAJBKEcNAEEAKAKcCkEALwGSCiICQQN0aiIDQQAoAqgKNgIEQQAgAkEBajsBkgogA0EFNgIAQQAoApQKLwEAQS5GDQRBAEEAKAKoCiIDQQJqNgKoCkEBECAhAiAAQQAoAqgKQQAgAxABAkACQCAFDQBBACgC5AkhAQwBC0EAKALkCSIBIAY2AhwLQQBBAC8BkAoiA0EBajsBkApBACgCoAogA0ECdGogATYCAAJAIAJBIkYNACACQSdGDQBBAEEAKAKoCkF+ajYCqAoPCyACECFBAEEAKAKoCkECaiICNgKoCgJAAkACQEEBECBBV2oOBAECAgACC0EAQQAoAqgKQQJqNgKoCkEBECAaQQAoAuQJIgMgAjYCBCADQQE6ABggA0EAKAKoCiICNgIQQQAgAkF+ajYCqAoPC0EAKALkCSIDIAI2AgQgA0EBOgAYQQBBAC8BkgpBf2o7AZIKIANBACgCqApBAmo2AgxBAEEALwGQCkF/ajsBkAoPC0EAQQAoAqgKQX5qNgKoCg8LAkAgBEEBcyACQfsAR3INAEEAKAKoCiECQQAvAZIKDQUDQAJAAkACQCACQQAoAqwKTw0AQQEQICICQSJGDQEgAkEnRg0BIAJB/QBHDQJBAEEAKAKoCkECajYCqAoLQQEQICEDQQAoAqgKIQICQCADQeYARw0AIAJBAmpBrAhBBhA2DQcLQQAgAkEIajYCqAoCQEEBECAiAkEiRg0AIAJBJ0cNBwsgACACQQAQMg8LIAIQIQtBAEEAKAKoCkECaiICNgKoCgwACwsCQAJAIAJBWWoOBAMBAQMACyACQSJGDQILQQAoAqgKIQYLIAYgAUcNAEEAIABBCmo2AqgKDwsgAkEqRyAHcQ0DQQAvAZIKQf//A3ENA0EAKAKoCiECQQAoAqwKIQEDQCACIAFPDQECQAJAIAIvAQAiA0EnRg0AIANBIkcNAQsgACADIAgQMg8LQQAgAkECaiICNgKoCgwACwsQLQsPC0EAIAJBfmo2AqgKDwtBAEEAKAKoCkF+ajYCqAoLRwEDf0EAKAKoCkECaiEAQQAoAqwKIQECQANAIAAiAkF+aiABTw0BIAJBAmohACACLwEAQXZqDgQBAAABAAsLQQAgAjYCqAoLmAEBA39BAEEAKAKoCiIBQQJqNgKoCiABQQZqIQFBACgCrAohAgNAAkACQAJAIAFBfGogAk8NACABQX5qLwEAIQMCQAJAIAANACADQSpGDQEgA0F2ag4EAgQEAgQLIANBKkcNAwsgAS8BAEEvRw0CQQAgAUF+ajYCqAoMAQsgAUF+aiEBC0EAIAE2AqgKDwsgAUECaiEBDAALC5wBAQN/QQAoAqgKIQECQANAAkACQCABLwEAIgJBL0cNAAJAIAEvAQIiAUEqRg0AIAFBL0cNBBAeDAILIAAQHwwBCwJAAkAgAEUNACACQXdqIgFBF0sNAUEBIAF0QZ+AgARxRQ0BDAILIAIQKUUNAwwBCyACQaABRw0CC0EAQQAoAqgKIgNBAmoiATYCqAogA0EAKAKsCkkNAAsLIAILiAEBBH9BACgCqAohAUEAKAKsCiECAkACQANAIAEiA0ECaiEBIAMgAk8NASABLwEAIgQgAEYNAgJAIARB3ABGDQAgBEF2ag4EAgEBAgELIANBBGohASADLwEEQQ1HDQAgA0EGaiABIAMvAQZBCkYbIQEMAAsLQQAgATYCqAoQLQ8LQQAgATYCqAoLbAEBfwJAAkAgAEFfaiIBQQVLDQBBASABdEExcQ0BCyAAQUZqQf//A3FBBkkNACAAQSlHIABBWGpB//8DcUEHSXENAAJAIABBpX9qDgQBAAABAAsgAEH9AEcgAEGFf2pB//8DcUEESXEPC0EBCy4BAX9BASEBAkAgAEGcCUEFECUNACAAQZYIQQMQJQ0AIABBpglBAhAlIQELIAELygEBAn8CQAJAIAAvAQAiAUF3akEFSQ0AIAFBIEYNACABQSlGDQAgAUHdAEYNACABQaABRg0AQQAhAiABQf0ARw0BC0EAKALQCSECAkACQANAIAAvAQAhASAAIAJNDQECQCABQXdqQQVJDQAgAUEgRg0AIAFBoAFGDQACQCABQSlGDQAgAUHdAEYNACABQf0ARw0EC0EBDwsgAEF+aiEADAALC0EBIQIgAUEpRg0BIAFB3QBGDQEgAUH9AEYNAQsgARAvQQFzIQILIAILRgEDf0EAIQMCQCAAIAJBAXQiAmsiBEECaiIAQQAoAtAJIgVJDQAgACABIAIQNg0AAkAgACAFRw0AQQEPCyAEEC4hAwsgAwuDAQECf0EBIQECQAJAAkACQAJAAkAgAC8BACICQUVqDgQFBAQBAAsCQCACQZt/ag4EAwQEAgALIAJBKUYNBCACQfkARw0DIABBfmpBsglBBhAlDwsgAEF+ai8BAEE9Rg8LIABBfmpBqglBBBAlDwsgAEF+akG+CUEDECUPC0EAIQELIAELtAMBAn9BACEBAkACQAJAAkACQAJAAkACQAJAAkAgAC8BAEGcf2oOFAABAgkJCQkDCQkEBQkJBgkHCQkICQsCQAJAIABBfmovAQBBl39qDgQACgoBCgsgAEF8akHACEECECUPCyAAQXxqQcQIQQMQJQ8LAkACQAJAIABBfmovAQBBjX9qDgMAAQIKCwJAIABBfGovAQAiAkHhAEYNACACQewARw0KIABBempB5QAQMA8LIABBempB4wAQMA8LIABBfGpByghBBBAlDwsgAEF8akHSCEEGECUPCyAAQX5qLwEAQe8ARw0GIABBfGovAQBB5QBHDQYCQCAAQXpqLwEAIgJB8ABGDQAgAkHjAEcNByAAQXhqQd4IQQYQJQ8LIABBeGpB6ghBAhAlDwsgAEF+akHuCEEEECUPC0EBIQEgAEF+aiIAQekAEDANBCAAQfYIQQUQJQ8LIABBfmpB5AAQMA8LIABBfmpBgAlBBxAlDwsgAEF+akGOCUEEECUPCwJAIABBfmovAQAiAkHvAEYNACACQeUARw0BIABBfGpB7gAQMA8LIABBfGpBlglBAxAlIQELIAELNAEBf0EBIQECQCAAQXdqQf//A3FBBUkNACAAQYABckGgAUYNACAAQS5HIAAQL3EhAQsgAQswAQF/AkACQCAAQXdqIgFBF0sNAEEBIAF0QY2AgARxDQELIABBoAFGDQBBAA8LQQELTgECf0EAIQECQAJAIAAvAQAiAkHlAEYNACACQesARw0BIABBfmpB7ghBBBAlDwsgAEF+ai8BAEH1AEcNACAAQXxqQdIIQQYQJSEBCyABC94BAQR/QQAoAqgKIQBBACgCrAohAQJAAkACQANAIAAiAkECaiEAIAIgAU8NAQJAAkACQCAALwEAIgNBpH9qDgUCAwMDAQALIANBJEcNAiACLwEEQfsARw0CQQAgAkEEaiIANgKoCkEAQQAvAZIKIgJBAWo7AZIKQQAoApwKIAJBA3RqIgJBBDYCACACIAA2AgQPC0EAIAA2AqgKQQBBAC8BkgpBf2oiADsBkgpBACgCnAogAEH//wNxQQN0aigCAEEDRw0DDAQLIAJBBGohAAwACwtBACAANgKoCgsQLQsLcAECfwJAAkADQEEAQQAoAqgKIgBBAmoiATYCqAogAEEAKAKsCk8NAQJAAkACQCABLwEAIgFBpX9qDgIBAgALAkAgAUF2ag4EBAMDBAALIAFBL0cNAgwECxA1GgwBC0EAIABBBGo2AqgKDAALCxAtCws1AQF/QQBBAToA8AlBACgCqAohAEEAQQAoAqwKQQJqNgKoCkEAIABBACgC0AlrQQF1NgKECgtDAQJ/QQEhAQJAIAAvAQAiAkF3akH//wNxQQVJDQAgAkGAAXJBoAFGDQBBACEBIAIQL0UNACACQS5HIAAQMXIPCyABC2gBAn9BASEBAkACQCAAQV9qIgJBBUsNAEEBIAJ0QTFxDQELIABB+P8DcUEoRg0AIABBRmpB//8DcUEGSQ0AAkAgAEGlf2oiAkEDSw0AIAJBAUcNAQsgAEGFf2pB//8DcUEESSEBCyABCz0BAn9BACECAkBBACgC0AkiAyAASw0AIAAvAQAgAUcNAAJAIAMgAEcNAEEBDwsgAEF+ai8BABAoIQILIAILMQEBf0EAIQECQCAALwEAQS5HDQAgAEF+ai8BAEEuRw0AIABBfGovAQBBLkYhAQsgAQvbBAEFfwJAIAFBIkYNACABQSdGDQAQLQ8LQQAoAqgKIQMgARAhIAAgA0ECakEAKAKoCkEAKALECRABAkAgAkEBSA0AQQAoAuQJQQRBBiACQQFGGzYCHAtBAEEAKAKoCkECajYCqApBABAgIQJBACgCqAohAQJAAkAgAkH3AEcNACABLwECQekARw0AIAEvAQRB9ABHDQAgAS8BBkHoAEYNAQtBACABQX5qNgKoCg8LQQAgAUEIajYCqAoCQEEBECBB+wBGDQBBACABNgKoCg8LQQAoAqgKIgQhA0EAIQADQEEAIANBAmo2AqgKAkACQAJAAkBBARAgIgJBJ0cNAEEAKAKoCiEFQScQIUEAKAKoCkECaiEDDAELQQAoAqgKIQUgAkEiRw0BQSIQIUEAKAKoCkECaiEDC0EAIAM2AqgKQQEQICECDAELIAIQMyECQQAoAqgKIQMLAkAgAkE6Rg0AQQAgATYCqAoPC0EAQQAoAqgKQQJqNgKoCgJAQQEQICICQSJGDQAgAkEnRg0AQQAgATYCqAoPC0EAKAKoCiEGIAIQIUEAQQAoAvwJIgJBFGo2AvwJQQAoAqgKIQcgAiAFNgIAIAJBADYCECACIAY2AgggAiADNgIEIAIgB0ECajYCDEEAQQAoAqgKQQJqNgKoCiAAQRBqQQAoAuQJQSBqIAAbIAI2AgACQAJAQQEQICIAQSxGDQAgAEH9AEYNAUEAIAE2AqgKDwtBAEEAKAKoCkECaiIDNgKoCiACIQAMAQsLQQAoAuQJIgEgBDYCECABQQAoAqgKQQJqNgIMC20BAn8CQAJAA0ACQCAAQf//A3EiAUF3aiICQRdLDQBBASACdEGfgIAEcQ0CCyABQaABRg0BIAAhAiABEC8NAkEAIQJBAEEAKAKoCiIAQQJqNgKoCiAALwECIgANAAwCCwsgACECCyACQf//A3ELqwEBBH8CQAJAQQAoAqgKIgIvAQAiA0HhAEYNACABIQQgACEFDAELQQAgAkEEajYCqApBARAgIQJBACgCqAohBQJAAkAgAkEiRg0AIAJBJ0YNACACEDMaQQAoAqgKIQQMAQsgAhAhQQBBACgCqApBAmoiBDYCqAoLQQEQICEDQQAoAqgKIQILAkAgAiAFRg0AIAUgBEEAIAAgACABRiICG0EAIAEgAhsQAgsgAwtyAQR/QQAoAqgKIQBBACgCrAohAQJAAkADQCAAQQJqIQIgACABTw0BAkACQCACLwEAIgNBpH9qDgIBBAALIAIhACADQXZqDgQCAQECAQsgAEEEaiEADAALC0EAIAI2AqgKEC1BAA8LQQAgAjYCqApB3QALSQEDf0EAIQMCQCACRQ0AAkADQCAALQAAIgQgAS0AACIFRw0BIAFBAWohASAAQQFqIQAgAkF/aiICDQAMAgsLIAQgBWshAwsgAwsL4gECAEGACAvEAQAAeABwAG8AcgB0AG0AcABvAHIAdABmAG8AcgBlAHQAYQBvAHUAcgBjAGUAcgBvAG0AdQBuAGMAdABpAG8AbgB2AG8AeQBpAGUAZABlAGwAZQBjAG8AbgB0AGkAbgBpAG4AcwB0AGEAbgB0AHkAYgByAGUAYQByAGUAdAB1AHIAZABlAGIAdQBnAGcAZQBhAHcAYQBpAHQAaAByAHcAaABpAGwAZQBpAGYAYwBhAHQAYwBmAGkAbgBhAGwAbABlAGwAcwAAQcQJCxABAAAAAgAAAAAEAAAwOQAA", "undefined" != typeof Buffer ? Buffer.from(A, "base64") : Uint8Array.from(atob(A), ((A) => A.charCodeAt(0)));
	var A;
};
WebAssembly.compile(E()).then(WebAssembly.instantiate).then((({ exports: A }) => {}));
var __require = /* @__PURE__ */ createRequire$1(import.meta.url);
/* c8 ignore next 6 */
try {
	__require.resolve("picomatch");
	__require("picomatch");
} catch {}
Array.isArray;
process.platform;
process.env.TINYGLOBBY_DEBUG;
createDebugger("vite:optimize-deps");
new Set(builtinModules);
/**
* @typedef ErrnoExceptionFields
* @property {number | undefined} [errnode]
* @property {string | undefined} [code]
* @property {string | undefined} [path]
* @property {string | undefined} [syscall]
* @property {string | undefined} [url]
*
* @typedef {Error & ErrnoExceptionFields} ErrnoException
*/
const own$1 = {}.hasOwnProperty;
const classRegExp = /^([A-Z][a-z\d]*)+$/;
const kTypes = /* @__PURE__ */ new Set([
	"string",
	"function",
	"number",
	"object",
	"Function",
	"Object",
	"boolean",
	"bigint",
	"symbol"
]);
const codes = {};
/**
* Create a list string in the form like 'A and B' or 'A, B, ..., and Z'.
* We cannot use Intl.ListFormat because it's not available in
* --without-intl builds.
*
* @param {Array<string>} array
*   An array of strings.
* @param {string} [type]
*   The list type to be inserted before the last element.
* @returns {string}
*/
function formatList(array, type = "and") {
	return array.length < 3 ? array.join(` ${type} `) : `${array.slice(0, -1).join(", ")}, ${type} ${array[array.length - 1]}`;
}
/** @type {Map<string, MessageFunction | string>} */
const messages = /* @__PURE__ */ new Map();
const nodeInternalPrefix = "__node_internal_";
/** @type {number} */
let userStackTraceLimit;
codes.ERR_INVALID_ARG_TYPE = createError(
	"ERR_INVALID_ARG_TYPE",
	/**
	* @param {string} name
	* @param {Array<string> | string} expected
	* @param {unknown} actual
	*/
	(name, expected, actual) => {
		assert.ok(typeof name === "string", "'name' must be a string");
		if (!Array.isArray(expected)) expected = [expected];
		let message = "The ";
		if (name.endsWith(" argument")) message += `${name} `;
		else {
			const type = name.includes(".") ? "property" : "argument";
			message += `"${name}" ${type} `;
		}
		message += "must be ";
		/** @type {Array<string>} */
		const types = [];
		/** @type {Array<string>} */
		const instances = [];
		/** @type {Array<string>} */
		const other = [];
		for (const value of expected) {
			assert.ok(typeof value === "string", "All expected entries have to be of type string");
			if (kTypes.has(value)) types.push(value.toLowerCase());
			else if (classRegExp.exec(value) === null) {
				assert.ok(value !== "object", "The value \"object\" should be written as \"Object\"");
				other.push(value);
			} else instances.push(value);
		}
		if (instances.length > 0) {
			const pos = types.indexOf("object");
			if (pos !== -1) {
				types.slice(pos, 1);
				instances.push("Object");
			}
		}
		if (types.length > 0) {
			message += `${types.length > 1 ? "one of type" : "of type"} ${formatList(types, "or")}`;
			if (instances.length > 0 || other.length > 0) message += " or ";
		}
		if (instances.length > 0) {
			message += `an instance of ${formatList(instances, "or")}`;
			if (other.length > 0) message += " or ";
		}
		if (other.length > 0) if (other.length > 1) message += `one of ${formatList(other, "or")}`;
		else {
			if (other[0].toLowerCase() !== other[0]) message += "an ";
			message += `${other[0]}`;
		}
		message += `. Received ${determineSpecificType(actual)}`;
		return message;
	},
	TypeError
);
codes.ERR_INVALID_MODULE_SPECIFIER = createError(
	"ERR_INVALID_MODULE_SPECIFIER",
	/**
	* @param {string} request
	* @param {string} reason
	* @param {string} [base]
	*/
	(request, reason, base = void 0) => {
		return `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ""}`;
	},
	TypeError
);
codes.ERR_INVALID_PACKAGE_CONFIG = createError(
	"ERR_INVALID_PACKAGE_CONFIG",
	/**
	* @param {string} path
	* @param {string} [base]
	* @param {string} [message]
	*/
	(path, base, message) => {
		return `Invalid package config ${path}${base ? ` while importing ${base}` : ""}${message ? `. ${message}` : ""}`;
	},
	Error
);
codes.ERR_INVALID_PACKAGE_TARGET = createError(
	"ERR_INVALID_PACKAGE_TARGET",
	/**
	* @param {string} packagePath
	* @param {string} key
	* @param {unknown} target
	* @param {boolean} [isImport=false]
	* @param {string} [base]
	*/
	(packagePath, key, target, isImport = false, base = void 0) => {
		const relatedError = typeof target === "string" && !isImport && target.length > 0 && !target.startsWith("./");
		if (key === ".") {
			assert.ok(isImport === false);
			return `Invalid "exports" main target ${JSON.stringify(target)} defined in the package config ${packagePath}package.json${base ? ` imported from ${base}` : ""}${relatedError ? "; targets must start with \"./\"" : ""}`;
		}
		return `Invalid "${isImport ? "imports" : "exports"}" target ${JSON.stringify(target)} defined for '${key}' in the package config ${packagePath}package.json${base ? ` imported from ${base}` : ""}${relatedError ? "; targets must start with \"./\"" : ""}`;
	},
	Error
);
codes.ERR_MODULE_NOT_FOUND = createError(
	"ERR_MODULE_NOT_FOUND",
	/**
	* @param {string} path
	* @param {string} base
	* @param {boolean} [exactUrl]
	*/
	(path, base, exactUrl = false) => {
		return `Cannot find ${exactUrl ? "module" : "package"} '${path}' imported from ${base}`;
	},
	Error
);
codes.ERR_NETWORK_IMPORT_DISALLOWED = createError("ERR_NETWORK_IMPORT_DISALLOWED", "import of '%s' by %s is not supported: %s", Error);
codes.ERR_PACKAGE_IMPORT_NOT_DEFINED = createError(
	"ERR_PACKAGE_IMPORT_NOT_DEFINED",
	/**
	* @param {string} specifier
	* @param {string} packagePath
	* @param {string} base
	*/
	(specifier, packagePath, base) => {
		return `Package import specifier "${specifier}" is not defined${packagePath ? ` in package ${packagePath}package.json` : ""} imported from ${base}`;
	},
	TypeError
);
codes.ERR_PACKAGE_PATH_NOT_EXPORTED = createError(
	"ERR_PACKAGE_PATH_NOT_EXPORTED",
	/**
	* @param {string} packagePath
	* @param {string} subpath
	* @param {string} [base]
	*/
	(packagePath, subpath, base = void 0) => {
		if (subpath === ".") return `No "exports" main defined in ${packagePath}package.json${base ? ` imported from ${base}` : ""}`;
		return `Package subpath '${subpath}' is not defined by "exports" in ${packagePath}package.json${base ? ` imported from ${base}` : ""}`;
	},
	Error
);
codes.ERR_UNSUPPORTED_DIR_IMPORT = createError("ERR_UNSUPPORTED_DIR_IMPORT", "Directory import '%s' is not supported resolving ES modules imported from %s", Error);
codes.ERR_UNSUPPORTED_RESOLVE_REQUEST = createError("ERR_UNSUPPORTED_RESOLVE_REQUEST", "Failed to resolve module specifier \"%s\" from \"%s\": Invalid relative URL or base scheme is not hierarchical.", TypeError);
codes.ERR_UNKNOWN_FILE_EXTENSION = createError(
	"ERR_UNKNOWN_FILE_EXTENSION",
	/**
	* @param {string} extension
	* @param {string} path
	*/
	(extension, path) => {
		return `Unknown file extension "${extension}" for ${path}`;
	},
	TypeError
);
codes.ERR_INVALID_ARG_VALUE = createError(
	"ERR_INVALID_ARG_VALUE",
	/**
	* @param {string} name
	* @param {unknown} value
	* @param {string} [reason='is invalid']
	*/
	(name, value, reason = "is invalid") => {
		let inspected = inspect(value);
		if (inspected.length > 128) inspected = `${inspected.slice(0, 128)}...`;
		return `The ${name.includes(".") ? "property" : "argument"} '${name}' ${reason}. Received ${inspected}`;
	},
	TypeError
);
/**
* Utility function for registering the error codes. Only used here. Exported
* *only* to allow for testing.
* @param {string} sym
* @param {MessageFunction | string} value
* @param {ErrorConstructor} constructor
* @returns {new (...parameters: Array<any>) => Error}
*/
function createError(sym, value, constructor) {
	messages.set(sym, value);
	return makeNodeErrorWithCode(constructor, sym);
}
/**
* @param {ErrorConstructor} Base
* @param {string} key
* @returns {ErrorConstructor}
*/
function makeNodeErrorWithCode(Base, key) {
	return NodeError;
	/**
	* @param {Array<unknown>} parameters
	*/
	function NodeError(...parameters) {
		const limit = Error.stackTraceLimit;
		if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = 0;
		const error = new Base();
		if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = limit;
		const message = getMessage(key, parameters, error);
		Object.defineProperties(error, {
			message: {
				value: message,
				enumerable: false,
				writable: true,
				configurable: true
			},
			toString: {
				/** @this {Error} */
				value() {
					return `${this.name} [${key}]: ${this.message}`;
				},
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
		captureLargerStackTrace(error);
		error.code = key;
		return error;
	}
}
/**
* @returns {boolean}
*/
function isErrorStackTraceLimitWritable() {
	try {
		if (v8.startupSnapshot.isBuildingSnapshot()) return false;
	} catch {}
	const desc = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit");
	if (desc === void 0) return Object.isExtensible(Error);
	return own$1.call(desc, "writable") && desc.writable !== void 0 ? desc.writable : desc.set !== void 0;
}
/**
* This function removes unnecessary frames from Node.js core errors.
* @template {(...parameters: unknown[]) => unknown} T
* @param {T} wrappedFunction
* @returns {T}
*/
function hideStackFrames(wrappedFunction) {
	const hidden = nodeInternalPrefix + wrappedFunction.name;
	Object.defineProperty(wrappedFunction, "name", { value: hidden });
	return wrappedFunction;
}
const captureLargerStackTrace = hideStackFrames(
	/**
	* @param {Error} error
	* @returns {Error}
	*/
	function(error) {
		const stackTraceLimitIsWritable = isErrorStackTraceLimitWritable();
		if (stackTraceLimitIsWritable) {
			userStackTraceLimit = Error.stackTraceLimit;
			Error.stackTraceLimit = Number.POSITIVE_INFINITY;
		}
		Error.captureStackTrace(error);
		if (stackTraceLimitIsWritable) Error.stackTraceLimit = userStackTraceLimit;
		return error;
	}
);
/**
* @param {string} key
* @param {Array<unknown>} parameters
* @param {Error} self
* @returns {string}
*/
function getMessage(key, parameters, self) {
	const message = messages.get(key);
	assert.ok(message !== void 0, "expected `message` to be found");
	if (typeof message === "function") {
		assert.ok(message.length <= parameters.length, `Code: ${key}; The provided arguments length (${parameters.length}) does not match the required ones (${message.length}).`);
		return Reflect.apply(message, self, parameters);
	}
	const regex = /%[dfijoOs]/g;
	let expectedLength = 0;
	while (regex.exec(message) !== null) expectedLength++;
	assert.ok(expectedLength === parameters.length, `Code: ${key}; The provided arguments length (${parameters.length}) does not match the required ones (${expectedLength}).`);
	if (parameters.length === 0) return message;
	parameters.unshift(message);
	return Reflect.apply(format, null, parameters);
}
/**
* Determine the specific type of a value for type-mismatch errors.
* @param {unknown} value
* @returns {string}
*/
function determineSpecificType(value) {
	if (value === null || value === void 0) return String(value);
	if (typeof value === "function" && value.name) return `function ${value.name}`;
	if (typeof value === "object") {
		if (value.constructor && value.constructor.name) return `an instance of ${value.constructor.name}`;
		return `${inspect(value, { depth: -1 })}`;
	}
	let inspected = inspect(value, { colors: false });
	if (inspected.length > 28) inspected = `${inspected.slice(0, 25)}...`;
	return `type ${typeof value} (${inspected})`;
}
const DEFAULT_CONDITIONS = Object.freeze(["node", "import"]);
new Set(DEFAULT_CONDITIONS);
(/* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	function _resolveEscapeSequences(value) {
		return value.replace(/\\\$/g, "$");
	}
	function expandValue(value, processEnv, runningParsed) {
		const env = {
			...runningParsed,
			...processEnv
		};
		const regex = /(?<!\\)\${([^{}]+)}|(?<!\\)\$([A-Za-z_][A-Za-z0-9_]*)/g;
		let result = value;
		let match;
		const seen = /* @__PURE__ */ new Set();
		while ((match = regex.exec(result)) !== null) {
			seen.add(result);
			const [template, bracedExpression, unbracedExpression] = match;
			const expression = bracedExpression || unbracedExpression;
			const opMatch = expression.match(/(:\+|\+|:-|-)/);
			const splitter = opMatch ? opMatch[0] : null;
			const r = expression.split(splitter);
			let defaultValue;
			let value;
			const key = r.shift();
			if ([":+", "+"].includes(splitter)) {
				defaultValue = env[key] ? r.join(splitter) : "";
				value = null;
			} else {
				defaultValue = r.join(splitter);
				value = env[key];
			}
			if (value) if (seen.has(value)) result = result.replace(template, defaultValue);
			else result = result.replace(template, value);
			else result = result.replace(template, defaultValue);
			if (result === runningParsed[key]) break;
			regex.lastIndex = 0;
		}
		return result;
	}
	function expand(options) {
		let processEnv = process.env;
		if (options && options.processEnv != null) processEnv = options.processEnv;
		for (const key in options.parsed) {
			let value = options.parsed[key];
			if (processEnv[key] && processEnv[key] !== value) value = processEnv[key];
			else value = expandValue(value, processEnv, options.parsed);
			options.parsed[key] = _resolveEscapeSequences(value);
		}
		for (const processKey in options.parsed) processEnv[processKey] = options.parsed[processKey];
		return options;
	}
	module.exports.expand = expand;
})))();
createDebugger("vite:env");
var require_ms$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Helpers.
	*/
	var s = 1e3;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var y = d * 365.25;
	/**
	* Parse or format the given `val`.
	*
	* Options:
	*
	*  - `long` verbose formatting [false]
	*
	* @param {String|Number} val
	* @param {Object} [options]
	* @throws {Error} throw an error if val is not a non-empty string or a number
	* @return {String|Number}
	* @api public
	*/
	module.exports = function(val, options) {
		options = options || {};
		var type = typeof val;
		if (type === "string" && val.length > 0) return parse(val);
		else if (type === "number" && isNaN(val) === false) return options.long ? fmtLong(val) : fmtShort(val);
		throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
	};
	/**
	* Parse the given `str` and return milliseconds.
	*
	* @param {String} str
	* @return {Number}
	* @api private
	*/
	function parse(str) {
		str = String(str);
		if (str.length > 100) return;
		var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
		if (!match) return;
		var n = parseFloat(match[1]);
		switch ((match[2] || "ms").toLowerCase()) {
			case "years":
			case "year":
			case "yrs":
			case "yr":
			case "y": return n * y;
			case "days":
			case "day":
			case "d": return n * d;
			case "hours":
			case "hour":
			case "hrs":
			case "hr":
			case "h": return n * h;
			case "minutes":
			case "minute":
			case "mins":
			case "min":
			case "m": return n * m;
			case "seconds":
			case "second":
			case "secs":
			case "sec":
			case "s": return n * s;
			case "milliseconds":
			case "millisecond":
			case "msecs":
			case "msec":
			case "ms": return n;
			default: return;
		}
	}
	/**
	* Short format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtShort(ms) {
		if (ms >= d) return Math.round(ms / d) + "d";
		if (ms >= h) return Math.round(ms / h) + "h";
		if (ms >= m) return Math.round(ms / m) + "m";
		if (ms >= s) return Math.round(ms / s) + "s";
		return ms + "ms";
	}
	/**
	* Long format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtLong(ms) {
		return plural(ms, d, "day") || plural(ms, h, "hour") || plural(ms, m, "minute") || plural(ms, s, "second") || ms + " ms";
	}
	/**
	* Pluralization helper.
	*/
	function plural(ms, n, name) {
		if (ms < n) return;
		if (ms < n * 1.5) return Math.floor(ms / n) + " " + name;
		return Math.ceil(ms / n) + " " + name + "s";
	}
}));
var require_debug$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* This is the common logic for both the Node.js and web browser
	* implementations of `debug()`.
	*
	* Expose `debug()` as the module.
	*/
	exports = module.exports = createDebug.debug = createDebug["default"] = createDebug;
	exports.coerce = coerce;
	exports.disable = disable;
	exports.enable = enable;
	exports.enabled = enabled;
	exports.humanize = require_ms$1();
	/**
	* The currently active debug mode names, and names to skip.
	*/
	exports.names = [];
	exports.skips = [];
	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	exports.formatters = {};
	/**
	* Previous log timestamp.
	*/
	var prevTime;
	/**
	* Select a color.
	* @param {String} namespace
	* @return {Number}
	* @api private
	*/
	function selectColor(namespace) {
		var hash = 0, i;
		for (i in namespace) {
			hash = (hash << 5) - hash + namespace.charCodeAt(i);
			hash |= 0;
		}
		return exports.colors[Math.abs(hash) % exports.colors.length];
	}
	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		function debug() {
			if (!debug.enabled) return;
			var self = debug;
			var curr = +/* @__PURE__ */ new Date();
			self.diff = curr - (prevTime || curr);
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;
			var args = new Array(arguments.length);
			for (var i = 0; i < args.length; i++) args[i] = arguments[i];
			args[0] = exports.coerce(args[0]);
			if ("string" !== typeof args[0]) args.unshift("%O");
			var index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
				if (match === "%%") return match;
				index++;
				var formatter = exports.formatters[format];
				if ("function" === typeof formatter) {
					match = formatter.call(self, args[index]);
					args.splice(index, 1);
					index--;
				}
				return match;
			});
			exports.formatArgs.call(self, args);
			(debug.log || exports.log || console.log.bind(console)).apply(self, args);
		}
		debug.namespace = namespace;
		debug.enabled = exports.enabled(namespace);
		debug.useColors = exports.useColors();
		debug.color = selectColor(namespace);
		if ("function" === typeof exports.init) exports.init(debug);
		return debug;
	}
	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		exports.save(namespaces);
		exports.names = [];
		exports.skips = [];
		var split = (typeof namespaces === "string" ? namespaces : "").split(/[\s,]+/);
		var len = split.length;
		for (var i = 0; i < len; i++) {
			if (!split[i]) continue;
			namespaces = split[i].replace(/\*/g, ".*?");
			if (namespaces[0] === "-") exports.skips.push(new RegExp("^" + namespaces.substr(1) + "$"));
			else exports.names.push(new RegExp("^" + namespaces + "$"));
		}
	}
	/**
	* Disable debug output.
	*
	* @api public
	*/
	function disable() {
		exports.enable("");
	}
	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		var i, len;
		for (i = 0, len = exports.skips.length; i < len; i++) if (exports.skips[i].test(name)) return false;
		for (i = 0, len = exports.names.length; i < len; i++) if (exports.names[i].test(name)) return true;
		return false;
	}
	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) return val.stack || val.message;
		return val;
	}
}));
var require_browser$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* This is the web browser implementation of `debug()`.
	*
	* Expose `debug()` as the module.
	*/
	exports = module.exports = require_debug$1();
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = "undefined" != typeof chrome && "undefined" != typeof chrome.storage ? chrome.storage.local : localstorage();
	/**
	* Colors.
	*/
	exports.colors = [
		"lightseagreen",
		"forestgreen",
		"goldenrod",
		"dodgerblue",
		"darkorchid",
		"crimson"
	];
	/**
	* Currently only WebKit-based Web Inspectors, Firefox >= v31,
	* and the Firebug extension (any Firefox version) are known
	* to support "%c" CSS customizations.
	*
	* TODO: add a `localStorage` variable to explicitly enable/disable colors
	*/
	function useColors() {
		if (typeof window !== "undefined" && window.process && window.process.type === "renderer") return true;
		return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
	}
	/**
	* Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	*/
	exports.formatters.j = function(v) {
		try {
			return JSON.stringify(v);
		} catch (err) {
			return "[UnexpectedJSONParseError]: " + err.message;
		}
	};
	/**
	* Colorize log arguments if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		var useColors = this.useColors;
		args[0] = (useColors ? "%c" : "") + this.namespace + (useColors ? " %c" : " ") + args[0] + (useColors ? "%c " : " ") + "+" + exports.humanize(this.diff);
		if (!useColors) return;
		var c = "color: " + this.color;
		args.splice(1, 0, c, "color: inherit");
		var index = 0;
		var lastC = 0;
		args[0].replace(/%[a-zA-Z%]/g, function(match) {
			if ("%%" === match) return;
			index++;
			if ("%c" === match) lastC = index;
		});
		args.splice(lastC, 0, c);
	}
	/**
	* Invokes `console.log()` when available.
	* No-op when `console.log` is not a "function".
	*
	* @api public
	*/
	function log() {
		return "object" === typeof console && console.log && Function.prototype.apply.call(console.log, console, arguments);
	}
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		try {
			if (null == namespaces) exports.storage.removeItem("debug");
			else exports.storage.debug = namespaces;
		} catch (e) {}
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		var r;
		try {
			r = exports.storage.debug;
		} catch (e) {}
		if (!r && typeof process !== "undefined" && "env" in process) r = process.env.DEBUG;
		return r;
	}
	/**
	* Enable namespaces listed in `localStorage.debug` initially.
	*/
	exports.enable(load());
	/**
	* Localstorage attempts to return the localstorage.
	*
	* This is necessary because safari throws
	* when a user disables cookies/localstorage
	* and you attempt to access it.
	*
	* @return {LocalStorage}
	* @api private
	*/
	function localstorage() {
		try {
			return window.localStorage;
		} catch (e) {}
	}
}));
var require_node$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module dependencies.
	*/
	var tty$1 = __require$2("tty");
	var util$2 = __require$2("util");
	/**
	* This is the Node.js implementation of `debug()`.
	*
	* Expose `debug()` as the module.
	*/
	exports = module.exports = require_debug$1();
	exports.init = init;
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	/**
	* Colors.
	*/
	exports.colors = [
		6,
		2,
		3,
		4,
		5,
		1
	];
	/**
	* Build up the default `inspectOpts` object from the environment variables.
	*
	*   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
	*/
	exports.inspectOpts = Object.keys(process.env).filter(function(key) {
		return /^debug_/i.test(key);
	}).reduce(function(obj, key) {
		var prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, function(_, k) {
			return k.toUpperCase();
		});
		var val = process.env[key];
		if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
		else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
		else if (val === "null") val = null;
		else val = Number(val);
		obj[prop] = val;
		return obj;
	}, {});
	/**
	* The file descriptor to write the `debug()` calls to.
	* Set the `DEBUG_FD` env variable to override with another value. i.e.:
	*
	*   $ DEBUG_FD=3 node script.js 3>debug.log
	*/
	var fd = parseInt(process.env.DEBUG_FD, 10) || 2;
	if (1 !== fd && 2 !== fd) util$2.deprecate(function() {}, "except for stderr(2) and stdout(1), any other usage of DEBUG_FD is deprecated. Override debug.log if you want to use a different log function (https://git.io/debug_fd)")();
	var stream = 1 === fd ? process.stdout : 2 === fd ? process.stderr : createWritableStdioStream(fd);
	/**
	* Is stdout a TTY? Colored output is enabled when `true`.
	*/
	function useColors() {
		return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty$1.isatty(fd);
	}
	/**
	* Map %o to `util.inspect()`, all on a single line.
	*/
	exports.formatters.o = function(v) {
		this.inspectOpts.colors = this.useColors;
		return util$2.inspect(v, this.inspectOpts).split("\n").map(function(str) {
			return str.trim();
		}).join(" ");
	};
	/**
	* Map %o to `util.inspect()`, allowing multiple lines if needed.
	*/
	exports.formatters.O = function(v) {
		this.inspectOpts.colors = this.useColors;
		return util$2.inspect(v, this.inspectOpts);
	};
	/**
	* Adds ANSI color escape codes if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		var name = this.namespace;
		if (this.useColors) {
			var c = this.color;
			var prefix = "  \x1B[3" + c + ";1m" + name + " \x1B[0m";
			args[0] = prefix + args[0].split("\n").join("\n" + prefix);
			args.push("\x1B[3" + c + "m+" + exports.humanize(this.diff) + "\x1B[0m");
		} else args[0] = (/* @__PURE__ */ new Date()).toUTCString() + " " + name + " " + args[0];
	}
	/**
	* Invokes `util.format()` with the specified arguments and writes to `stream`.
	*/
	function log() {
		return stream.write(util$2.format.apply(util$2, arguments) + "\n");
	}
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		if (null == namespaces) delete process.env.DEBUG;
		else process.env.DEBUG = namespaces;
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		return process.env.DEBUG;
	}
	/**
	* Copied from `node/src/node.js`.
	*
	* XXX: It's lame that node doesn't expose this API out-of-the-box. It also
	* relies on the undocumented `tty_wrap.guessHandleType()` which is also lame.
	*/
	function createWritableStdioStream(fd) {
		var stream;
		switch (process.binding("tty_wrap").guessHandleType(fd)) {
			case "TTY":
				stream = new tty$1.WriteStream(fd);
				stream._type = "tty";
				if (stream._handle && stream._handle.unref) stream._handle.unref();
				break;
			case "FILE":
				stream = new (__require$2("fs")).SyncWriteStream(fd, { autoClose: false });
				stream._type = "fs";
				break;
			case "PIPE":
			case "TCP":
				stream = new (__require$2("net")).Socket({
					fd,
					readable: false,
					writable: true
				});
				stream.readable = false;
				stream.read = null;
				stream._type = "pipe";
				if (stream._handle && stream._handle.unref) stream._handle.unref();
				break;
			default: throw new Error("Implement me. Unknown stream file type!");
		}
		stream.fd = fd;
		stream._isStdio = true;
		return stream;
	}
	/**
	* Init logic for `debug` instances.
	*
	* Create a new `inspectOpts` object in case `useColors` is set
	* differently for a particular `debug` instance.
	*/
	function init(debug) {
		debug.inspectOpts = {};
		var keys = Object.keys(exports.inspectOpts);
		for (var i = 0; i < keys.length; i++) debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
	}
	/**
	* Enable namespaces listed in `process.env.DEBUG` initially.
	*/
	exports.enable(load());
}));
var require_src$3 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Detect Electron renderer process, which is node, but we should
	* treat as a browser.
	*/
	if (typeof process !== "undefined" && process.type === "renderer") module.exports = require_browser$1();
	else module.exports = require_node$1();
}));
/*!
* encodeurl
* Copyright(c) 2016 Douglas Christopher Wilson
* MIT Licensed
*/
var require_encodeurl = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module exports.
	* @public
	*/
	module.exports = encodeUrl;
	/**
	* RegExp to match non-URL code points, *after* encoding (i.e. not including "%")
	* and including invalid escape sequences.
	* @private
	*/
	var ENCODE_CHARS_REGEXP = /(?:[^\x21\x25\x26-\x3B\x3D\x3F-\x5B\x5D\x5F\x61-\x7A\x7E]|%(?:[^0-9A-Fa-f]|[0-9A-Fa-f][^0-9A-Fa-f]|$))+/g;
	/**
	* RegExp to match unmatched surrogate pair.
	* @private
	*/
	var UNMATCHED_SURROGATE_PAIR_REGEXP = /(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]|[\uD800-\uDBFF]([^\uDC00-\uDFFF]|$)/g;
	/**
	* String to replace unmatched surrogate pair with.
	* @private
	*/
	var UNMATCHED_SURROGATE_PAIR_REPLACE = "$1�$2";
	/**
	* Encode a URL to a percent-encoded form, excluding already-encoded sequences.
	*
	* This function will take an already-encoded URL and encode all the non-URL
	* code points. This function will not encode the "%" character unless it is
	* not part of a valid sequence (`%20` will be left as-is, but `%foo` will
	* be encoded as `%25foo`).
	*
	* This encode is meant to be "safe" and does not throw errors. It will try as
	* hard as it can to properly encode the given URL, including replacing any raw,
	* unpaired surrogate pairs with the Unicode replacement character prior to
	* encoding.
	*
	* @param {string} url
	* @return {string}
	* @public
	*/
	function encodeUrl(url) {
		return String(url).replace(UNMATCHED_SURROGATE_PAIR_REGEXP, UNMATCHED_SURROGATE_PAIR_REPLACE).replace(ENCODE_CHARS_REGEXP, encodeURI);
	}
}));
/*!
* escape-html
* Copyright(c) 2012-2013 TJ Holowaychuk
* Copyright(c) 2015 Andreas Lubbe
* Copyright(c) 2015 Tiancheng "Timothy" Gu
* MIT Licensed
*/
var require_escape_html = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module variables.
	* @private
	*/
	var matchHtmlRegExp = /["'&<>]/;
	/**
	* Module exports.
	* @public
	*/
	module.exports = escapeHtml;
	/**
	* Escape special characters in the given string of html.
	*
	* @param  {string} string The string to escape for inserting into HTML
	* @return {string}
	* @public
	*/
	function escapeHtml(string) {
		var str = "" + string;
		var match = matchHtmlRegExp.exec(str);
		if (!match) return str;
		var escape;
		var html = "";
		var index = 0;
		var lastIndex = 0;
		for (index = match.index; index < str.length; index++) {
			switch (str.charCodeAt(index)) {
				case 34:
					escape = "&quot;";
					break;
				case 38:
					escape = "&amp;";
					break;
				case 39:
					escape = "&#39;";
					break;
				case 60:
					escape = "&lt;";
					break;
				case 62:
					escape = "&gt;";
					break;
				default: continue;
			}
			if (lastIndex !== index) html += str.substring(lastIndex, index);
			lastIndex = index + 1;
			html += escape;
		}
		return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
	}
}));
/*!
* ee-first
* Copyright(c) 2014 Jonathan Ong
* MIT Licensed
*/
var require_ee_first = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module exports.
	* @public
	*/
	module.exports = first;
	/**
	* Get the first event in a set of event emitters and event pairs.
	*
	* @param {array} stuff
	* @param {function} done
	* @public
	*/
	function first(stuff, done) {
		if (!Array.isArray(stuff)) throw new TypeError("arg must be an array of [ee, events...] arrays");
		var cleanups = [];
		for (var i = 0; i < stuff.length; i++) {
			var arr = stuff[i];
			if (!Array.isArray(arr) || arr.length < 2) throw new TypeError("each array member must be [ee, events...]");
			var ee = arr[0];
			for (var j = 1; j < arr.length; j++) {
				var event = arr[j];
				var fn = listener(event, callback);
				ee.on(event, fn);
				cleanups.push({
					ee,
					event,
					fn
				});
			}
		}
		function callback() {
			cleanup();
			done.apply(null, arguments);
		}
		function cleanup() {
			var x;
			for (var i = 0; i < cleanups.length; i++) {
				x = cleanups[i];
				x.ee.removeListener(x.event, x.fn);
			}
		}
		function thunk(fn) {
			done = fn;
		}
		thunk.cancel = cleanup;
		return thunk;
	}
	/**
	* Create the event listener.
	* @private
	*/
	function listener(event, done) {
		return function onevent(arg1) {
			var args = new Array(arguments.length);
			var ee = this;
			var err = event === "error" ? arg1 : null;
			for (var i = 0; i < args.length; i++) args[i] = arguments[i];
			done(err, ee, event, args);
		};
	}
}));
/*!
* on-finished
* Copyright(c) 2013 Jonathan Ong
* Copyright(c) 2014 Douglas Christopher Wilson
* MIT Licensed
*/
var require_on_finished = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module exports.
	* @public
	*/
	module.exports = onFinished;
	module.exports.isFinished = isFinished;
	/**
	* Module dependencies.
	* @private
	*/
	var first = require_ee_first();
	/**
	* Variables.
	* @private
	*/
	/* istanbul ignore next */
	var defer = typeof setImmediate === "function" ? setImmediate : function(fn) {
		process.nextTick(fn.bind.apply(fn, arguments));
	};
	/**
	* Invoke callback when the response has finished, useful for
	* cleaning up resources afterwards.
	*
	* @param {object} msg
	* @param {function} listener
	* @return {object}
	* @public
	*/
	function onFinished(msg, listener) {
		if (isFinished(msg) !== false) {
			defer(listener, null, msg);
			return msg;
		}
		attachListener(msg, listener);
		return msg;
	}
	/**
	* Determine if message is already finished.
	*
	* @param {object} msg
	* @return {boolean}
	* @public
	*/
	function isFinished(msg) {
		var socket = msg.socket;
		if (typeof msg.finished === "boolean") return Boolean(msg.finished || socket && !socket.writable);
		if (typeof msg.complete === "boolean") return Boolean(msg.upgrade || !socket || !socket.readable || msg.complete && !msg.readable);
	}
	/**
	* Attach a finished listener to the message.
	*
	* @param {object} msg
	* @param {function} callback
	* @private
	*/
	function attachFinishedListener(msg, callback) {
		var eeMsg;
		var eeSocket;
		var finished = false;
		function onFinish(error) {
			eeMsg.cancel();
			eeSocket.cancel();
			finished = true;
			callback(error);
		}
		eeMsg = eeSocket = first([[
			msg,
			"end",
			"finish"
		]], onFinish);
		function onSocket(socket) {
			msg.removeListener("socket", onSocket);
			if (finished) return;
			if (eeMsg !== eeSocket) return;
			eeSocket = first([[
				socket,
				"error",
				"close"
			]], onFinish);
		}
		if (msg.socket) {
			onSocket(msg.socket);
			return;
		}
		msg.on("socket", onSocket);
		if (msg.socket === void 0) patchAssignSocket(msg, onSocket);
	}
	/**
	* Attach the listener to the message.
	*
	* @param {object} msg
	* @return {function}
	* @private
	*/
	function attachListener(msg, listener) {
		var attached = msg.__onFinished;
		if (!attached || !attached.queue) {
			attached = msg.__onFinished = createListener(msg);
			attachFinishedListener(msg, attached);
		}
		attached.queue.push(listener);
	}
	/**
	* Create listener on message.
	*
	* @param {object} msg
	* @return {function}
	* @private
	*/
	function createListener(msg) {
		function listener(err) {
			if (msg.__onFinished === listener) msg.__onFinished = null;
			if (!listener.queue) return;
			var queue = listener.queue;
			listener.queue = null;
			for (var i = 0; i < queue.length; i++) queue[i](err, msg);
		}
		listener.queue = [];
		return listener;
	}
	/**
	* Patch ServerResponse.prototype.assignSocket for node.js 0.8.
	*
	* @param {ServerResponse} res
	* @param {function} callback
	* @private
	*/
	function patchAssignSocket(res, callback) {
		var assignSocket = res.assignSocket;
		if (typeof assignSocket !== "function") return;
		res.assignSocket = function _assignSocket(socket) {
			assignSocket.call(this, socket);
			callback(socket);
		};
	}
}));
/*!
* parseurl
* Copyright(c) 2014 Jonathan Ong
* Copyright(c) 2014-2017 Douglas Christopher Wilson
* MIT Licensed
*/
var require_parseurl = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module dependencies.
	* @private
	*/
	var url$2 = __require$2("url");
	var parse = url$2.parse;
	var Url = url$2.Url;
	/**
	* Module exports.
	* @public
	*/
	module.exports = parseurl;
	module.exports.original = originalurl;
	/**
	* Parse the `req` url with memoization.
	*
	* @param {ServerRequest} req
	* @return {Object}
	* @public
	*/
	function parseurl(req) {
		var url = req.url;
		if (url === void 0) return;
		var parsed = req._parsedUrl;
		if (fresh(url, parsed)) return parsed;
		parsed = fastparse(url);
		parsed._raw = url;
		return req._parsedUrl = parsed;
	}
	/**
	* Parse the `req` original url with fallback and memoization.
	*
	* @param {ServerRequest} req
	* @return {Object}
	* @public
	*/
	function originalurl(req) {
		var url = req.originalUrl;
		if (typeof url !== "string") return parseurl(req);
		var parsed = req._parsedOriginalUrl;
		if (fresh(url, parsed)) return parsed;
		parsed = fastparse(url);
		parsed._raw = url;
		return req._parsedOriginalUrl = parsed;
	}
	/**
	* Parse the `str` url with fast-path short-cut.
	*
	* @param {string} str
	* @return {Object}
	* @private
	*/
	function fastparse(str) {
		if (typeof str !== "string" || str.charCodeAt(0) !== 47) return parse(str);
		var pathname = str;
		var query = null;
		var search = null;
		for (var i = 1; i < str.length; i++) switch (str.charCodeAt(i)) {
			case 63:
				if (search === null) {
					pathname = str.substring(0, i);
					query = str.substring(i + 1);
					search = str.substring(i);
				}
				break;
			case 9:
			case 10:
			case 12:
			case 13:
			case 32:
			case 35:
			case 160:
			case 65279: return parse(str);
		}
		var url = Url !== void 0 ? new Url() : {};
		url.path = str;
		url.href = str;
		url.pathname = pathname;
		if (search !== null) {
			url.query = query;
			url.search = search;
		}
		return url;
	}
	/**
	* Determine if parsed is still fresh for url.
	*
	* @param {string} url
	* @param {object} parsedUrl
	* @return {boolean}
	* @private
	*/
	function fresh(url, parsedUrl) {
		return typeof parsedUrl === "object" && parsedUrl !== null && (Url === void 0 || parsedUrl instanceof Url) && parsedUrl._raw === url;
	}
}));
var require_codes = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = {
		"100": "Continue",
		"101": "Switching Protocols",
		"102": "Processing",
		"103": "Early Hints",
		"200": "OK",
		"201": "Created",
		"202": "Accepted",
		"203": "Non-Authoritative Information",
		"204": "No Content",
		"205": "Reset Content",
		"206": "Partial Content",
		"207": "Multi-Status",
		"208": "Already Reported",
		"226": "IM Used",
		"300": "Multiple Choices",
		"301": "Moved Permanently",
		"302": "Found",
		"303": "See Other",
		"304": "Not Modified",
		"305": "Use Proxy",
		"306": "(Unused)",
		"307": "Temporary Redirect",
		"308": "Permanent Redirect",
		"400": "Bad Request",
		"401": "Unauthorized",
		"402": "Payment Required",
		"403": "Forbidden",
		"404": "Not Found",
		"405": "Method Not Allowed",
		"406": "Not Acceptable",
		"407": "Proxy Authentication Required",
		"408": "Request Timeout",
		"409": "Conflict",
		"410": "Gone",
		"411": "Length Required",
		"412": "Precondition Failed",
		"413": "Payload Too Large",
		"414": "URI Too Long",
		"415": "Unsupported Media Type",
		"416": "Range Not Satisfiable",
		"417": "Expectation Failed",
		"418": "I'm a teapot",
		"421": "Misdirected Request",
		"422": "Unprocessable Entity",
		"423": "Locked",
		"424": "Failed Dependency",
		"425": "Unordered Collection",
		"426": "Upgrade Required",
		"428": "Precondition Required",
		"429": "Too Many Requests",
		"431": "Request Header Fields Too Large",
		"451": "Unavailable For Legal Reasons",
		"500": "Internal Server Error",
		"501": "Not Implemented",
		"502": "Bad Gateway",
		"503": "Service Unavailable",
		"504": "Gateway Timeout",
		"505": "HTTP Version Not Supported",
		"506": "Variant Also Negotiates",
		"507": "Insufficient Storage",
		"508": "Loop Detected",
		"509": "Bandwidth Limit Exceeded",
		"510": "Not Extended",
		"511": "Network Authentication Required"
	};
}));
/*!
* statuses
* Copyright(c) 2014 Jonathan Ong
* Copyright(c) 2016 Douglas Christopher Wilson
* MIT Licensed
*/
var require_statuses = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module dependencies.
	* @private
	*/
	var codes = require_codes();
	/**
	* Module exports.
	* @public
	*/
	module.exports = status;
	status.STATUS_CODES = codes;
	status.codes = populateStatusesMap(status, codes);
	status.redirect = {
		300: true,
		301: true,
		302: true,
		303: true,
		305: true,
		307: true,
		308: true
	};
	status.empty = {
		204: true,
		205: true,
		304: true
	};
	status.retry = {
		502: true,
		503: true,
		504: true
	};
	/**
	* Populate the statuses map for given codes.
	* @private
	*/
	function populateStatusesMap(statuses, codes) {
		var arr = [];
		Object.keys(codes).forEach(function forEachCode(code) {
			var message = codes[code];
			var status = Number(code);
			statuses[status] = message;
			statuses[message] = status;
			statuses[message.toLowerCase()] = status;
			arr.push(status);
		});
		return arr;
	}
	/**
	* Get the status code.
	*
	* Given a number, this will throw if it is not a known status
	* code, otherwise the code will be returned. Given a string,
	* the string will be parsed for a number and return the code
	* if valid, otherwise will lookup the code assuming this is
	* the status message.
	*
	* @param {string|number} code
	* @returns {number}
	* @public
	*/
	function status(code) {
		if (typeof code === "number") {
			if (!status[code]) throw new Error("invalid status code: " + code);
			return code;
		}
		if (typeof code !== "string") throw new TypeError("code must be a number or string");
		var n = parseInt(code, 10);
		if (!isNaN(n)) {
			if (!status[n]) throw new Error("invalid status code: " + n);
			return n;
		}
		n = status[code.toLowerCase()];
		if (!n) throw new Error("invalid status message: \"" + code + "\"");
		return n;
	}
}));
/*!
* unpipe
* Copyright(c) 2015 Douglas Christopher Wilson
* MIT Licensed
*/
var require_unpipe = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module exports.
	* @public
	*/
	module.exports = unpipe;
	/**
	* Determine if there are Node.js pipe-like data listeners.
	* @private
	*/
	function hasPipeDataListeners(stream) {
		var listeners = stream.listeners("data");
		for (var i = 0; i < listeners.length; i++) if (listeners[i].name === "ondata") return true;
		return false;
	}
	/**
	* Unpipe a stream from all destinations.
	*
	* @param {object} stream
	* @public
	*/
	function unpipe(stream) {
		if (!stream) throw new TypeError("argument stream is required");
		if (typeof stream.unpipe === "function") {
			stream.unpipe();
			return;
		}
		if (!hasPipeDataListeners(stream)) return;
		var listener;
		var listeners = stream.listeners("close");
		for (var i = 0; i < listeners.length; i++) {
			listener = listeners[i];
			if (listener.name !== "cleanup" && listener.name !== "onclose") continue;
			listener.call(stream);
		}
	}
}));
/*!
* finalhandler
* Copyright(c) 2014-2017 Douglas Christopher Wilson
* MIT Licensed
*/
var require_finalhandler = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module dependencies.
	* @private
	*/
	var debug = require_src$3()("finalhandler");
	var encodeUrl = require_encodeurl();
	var escapeHtml = require_escape_html();
	var onFinished = require_on_finished();
	var parseUrl = require_parseurl();
	var statuses = require_statuses();
	var unpipe = require_unpipe();
	/**
	* Module variables.
	* @private
	*/
	var DOUBLE_SPACE_REGEXP = /\x20{2}/g;
	var NEWLINE_REGEXP = /\n/g;
	/* istanbul ignore next */
	var defer = typeof setImmediate === "function" ? setImmediate : function(fn) {
		process.nextTick(fn.bind.apply(fn, arguments));
	};
	var isFinished = onFinished.isFinished;
	/**
	* Create a minimal HTML document.
	*
	* @param {string} message
	* @private
	*/
	function createHtmlDocument(message) {
		return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>" + escapeHtml(message).replace(NEWLINE_REGEXP, "<br>").replace(DOUBLE_SPACE_REGEXP, " &nbsp;") + "</pre>\n</body>\n</html>\n";
	}
	/**
	* Module exports.
	* @public
	*/
	module.exports = finalhandler;
	/**
	* Create a function to handle the final response.
	*
	* @param {Request} req
	* @param {Response} res
	* @param {Object} [options]
	* @return {Function}
	* @public
	*/
	function finalhandler(req, res, options) {
		var opts = options || {};
		var env = opts.env || process.env.NODE_ENV || "development";
		var onerror = opts.onerror;
		return function(err) {
			var headers;
			var msg;
			var status;
			if (!err && headersSent(res)) {
				debug("cannot 404 after headers sent");
				return;
			}
			if (err) {
				status = getErrorStatusCode(err);
				if (status === void 0) status = getResponseStatusCode(res);
				else headers = getErrorHeaders(err);
				msg = getErrorMessage(err, status, env);
			} else {
				status = 404;
				msg = "Cannot " + req.method + " " + encodeUrl(getResourceName(req));
			}
			debug("default %s", status);
			if (err && onerror) defer(onerror, err, req, res);
			if (headersSent(res)) {
				debug("cannot %d after headers sent", status);
				req.socket.destroy();
				return;
			}
			send(req, res, status, headers, msg);
		};
	}
	/**
	* Get headers from Error object.
	*
	* @param {Error} err
	* @return {object}
	* @private
	*/
	function getErrorHeaders(err) {
		if (!err.headers || typeof err.headers !== "object") return;
		var headers = Object.create(null);
		var keys = Object.keys(err.headers);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			headers[key] = err.headers[key];
		}
		return headers;
	}
	/**
	* Get message from Error object, fallback to status message.
	*
	* @param {Error} err
	* @param {number} status
	* @param {string} env
	* @return {string}
	* @private
	*/
	function getErrorMessage(err, status, env) {
		var msg;
		if (env !== "production") {
			msg = err.stack;
			if (!msg && typeof err.toString === "function") msg = err.toString();
		}
		return msg || statuses[status];
	}
	/**
	* Get status code from Error object.
	*
	* @param {Error} err
	* @return {number}
	* @private
	*/
	function getErrorStatusCode(err) {
		if (typeof err.status === "number" && err.status >= 400 && err.status < 600) return err.status;
		if (typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 600) return err.statusCode;
	}
	/**
	* Get resource name for the request.
	*
	* This is typically just the original pathname of the request
	* but will fallback to "resource" is that cannot be determined.
	*
	* @param {IncomingMessage} req
	* @return {string}
	* @private
	*/
	function getResourceName(req) {
		try {
			return parseUrl.original(req).pathname;
		} catch (e) {
			return "resource";
		}
	}
	/**
	* Get status code from response.
	*
	* @param {OutgoingMessage} res
	* @return {number}
	* @private
	*/
	function getResponseStatusCode(res) {
		var status = res.statusCode;
		if (typeof status !== "number" || status < 400 || status > 599) status = 500;
		return status;
	}
	/**
	* Determine if the response headers have been sent.
	*
	* @param {object} res
	* @returns {boolean}
	* @private
	*/
	function headersSent(res) {
		return typeof res.headersSent !== "boolean" ? Boolean(res._header) : res.headersSent;
	}
	/**
	* Send response.
	*
	* @param {IncomingMessage} req
	* @param {OutgoingMessage} res
	* @param {number} status
	* @param {object} headers
	* @param {string} message
	* @private
	*/
	function send(req, res, status, headers, message) {
		function write() {
			var body = createHtmlDocument(message);
			res.statusCode = status;
			res.statusMessage = statuses[status];
			setHeaders(res, headers);
			res.setHeader("Content-Security-Policy", "default-src 'none'");
			res.setHeader("X-Content-Type-Options", "nosniff");
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			res.setHeader("Content-Length", Buffer.byteLength(body, "utf8"));
			if (req.method === "HEAD") {
				res.end();
				return;
			}
			res.end(body, "utf8");
		}
		if (isFinished(req)) {
			write();
			return;
		}
		unpipe(req);
		onFinished(req, write);
		req.resume();
	}
	/**
	* Set response headers from an object.
	*
	* @param {OutgoingMessage} res
	* @param {object} headers
	* @private
	*/
	function setHeaders(res, headers) {
		if (!headers) return;
		var keys = Object.keys(headers);
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			res.setHeader(key, headers[key]);
		}
	}
}));
var require_utils_merge = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Merge object b with object a.
	*
	*     var a = { foo: 'bar' }
	*       , b = { bar: 'baz' };
	*
	*     merge(a, b);
	*     // => { foo: 'bar', bar: 'baz' }
	*
	* @param {Object} a
	* @param {Object} b
	* @return {Object}
	* @api public
	*/
	exports = module.exports = function(a, b) {
		if (a && b) for (var key in b) a[key] = b[key];
		return a;
	};
}));
/*!
* connect
* Copyright(c) 2010 Sencha Inc.
* Copyright(c) 2011 TJ Holowaychuk
* Copyright(c) 2015 Douglas Christopher Wilson
* MIT Licensed
*/
var require_connect = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module dependencies.
	* @private
	*/
	var debug = require_src$3()("connect:dispatcher");
	var EventEmitter$4 = __require$2("events").EventEmitter;
	var finalhandler = require_finalhandler();
	var http$6 = __require$2("http");
	var merge = require_utils_merge();
	var parseUrl = require_parseurl();
	/**
	* Module exports.
	* @public
	*/
	module.exports = createServer;
	/**
	* Module variables.
	* @private
	*/
	var env = process.env.NODE_ENV || "development";
	var proto = {};
	/* istanbul ignore next */
	var defer = typeof setImmediate === "function" ? setImmediate : function(fn) {
		process.nextTick(fn.bind.apply(fn, arguments));
	};
	/**
	* Create a new connect server.
	*
	* @return {function}
	* @public
	*/
	function createServer() {
		function app(req, res, next) {
			app.handle(req, res, next);
		}
		merge(app, proto);
		merge(app, EventEmitter$4.prototype);
		app.route = "/";
		app.stack = [];
		return app;
	}
	/**
	* Utilize the given middleware `handle` to the given `route`,
	* defaulting to _/_. This "route" is the mount-point for the
	* middleware, when given a value other than _/_ the middleware
	* is only effective when that segment is present in the request's
	* pathname.
	*
	* For example if we were to mount a function at _/admin_, it would
	* be invoked on _/admin_, and _/admin/settings_, however it would
	* not be invoked for _/_, or _/posts_.
	*
	* @param {String|Function|Server} route, callback or server
	* @param {Function|Server} callback or server
	* @return {Server} for chaining
	* @public
	*/
	proto.use = function use(route, fn) {
		var handle = fn;
		var path = route;
		if (typeof route !== "string") {
			handle = route;
			path = "/";
		}
		if (typeof handle.handle === "function") {
			var server = handle;
			server.route = path;
			handle = function(req, res, next) {
				server.handle(req, res, next);
			};
		}
		if (handle instanceof http$6.Server) handle = handle.listeners("request")[0];
		if (path[path.length - 1] === "/") path = path.slice(0, -1);
		debug("use %s %s", path || "/", handle.name || "anonymous");
		this.stack.push({
			route: path,
			handle
		});
		return this;
	};
	/**
	* Handle server requests, punting them down
	* the middleware stack.
	*
	* @private
	*/
	proto.handle = function handle(req, res, out) {
		var index = 0;
		var protohost = getProtohost(req.url) || "";
		var removed = "";
		var slashAdded = false;
		var stack = this.stack;
		var done = out || finalhandler(req, res, {
			env,
			onerror: logerror
		});
		req.originalUrl = req.originalUrl || req.url;
		function next(err) {
			if (slashAdded) {
				req.url = req.url.substr(1);
				slashAdded = false;
			}
			if (removed.length !== 0) {
				req.url = protohost + removed + req.url.substr(protohost.length);
				removed = "";
			}
			var layer = stack[index++];
			if (!layer) {
				defer(done, err);
				return;
			}
			var path = parseUrl(req).pathname || "/";
			var route = layer.route;
			if (path.toLowerCase().substr(0, route.length) !== route.toLowerCase()) return next(err);
			var c = path.length > route.length && path[route.length];
			if (c && c !== "/" && c !== ".") return next(err);
			if (route.length !== 0 && route !== "/") {
				removed = route;
				req.url = protohost + req.url.substr(protohost.length + removed.length);
				if (!protohost && req.url[0] !== "/") {
					req.url = "/" + req.url;
					slashAdded = true;
				}
			}
			call(layer.handle, route, err, req, res, next);
		}
		next();
	};
	/**
	* Listen for connections.
	*
	* This method takes the same arguments
	* as node's `http.Server#listen()`.
	*
	* HTTP and HTTPS:
	*
	* If you run your application both as HTTP
	* and HTTPS you may wrap them individually,
	* since your Connect "server" is really just
	* a JavaScript `Function`.
	*
	*      var connect = require('connect')
	*        , http = require('http')
	*        , https = require('https');
	*
	*      var app = connect();
	*
	*      http.createServer(app).listen(80);
	*      https.createServer(options, app).listen(443);
	*
	* @return {http.Server}
	* @api public
	*/
	proto.listen = function listen() {
		var server = http$6.createServer(this);
		return server.listen.apply(server, arguments);
	};
	/**
	* Invoke a route handle.
	* @private
	*/
	function call(handle, route, err, req, res, next) {
		var arity = handle.length;
		var error = err;
		var hasError = Boolean(err);
		debug("%s %s : %s", handle.name || "<anonymous>", route, req.originalUrl);
		try {
			if (hasError && arity === 4) {
				handle(err, req, res, next);
				return;
			} else if (!hasError && arity < 4) {
				handle(req, res, next);
				return;
			}
		} catch (e) {
			error = e;
		}
		next(error);
	}
	/**
	* Log error using console.error.
	*
	* @param {Error} err
	* @private
	*/
	function logerror(err) {
		if (env !== "test") console.error(err.stack || err.toString());
	}
	/**
	* Get get protocol + host for a URL.
	*
	* @param {string} url
	* @private
	*/
	function getProtohost(url) {
		if (url.length === 0 || url[0] === "/") return;
		var fqdnIndex = url.indexOf("://");
		return fqdnIndex !== -1 && url.lastIndexOf("?", fqdnIndex) === -1 ? url.substr(0, url.indexOf("/", 3 + fqdnIndex)) : void 0;
	}
}));
/*
object-assign
(c) Sindre Sorhus
@license MIT
*/
var require_object_assign = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	var getOwnPropertySymbols = Object.getOwnPropertySymbols;
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	var propIsEnumerable = Object.prototype.propertyIsEnumerable;
	function toObject(val) {
		if (val === null || val === void 0) throw new TypeError("Object.assign cannot be called with null or undefined");
		return Object(val);
	}
	function shouldUseNative() {
		try {
			if (!Object.assign) return false;
			var test1 = /* @__PURE__ */ new String("abc");
			test1[5] = "de";
			if (Object.getOwnPropertyNames(test1)[0] === "5") return false;
			var test2 = {};
			for (var i = 0; i < 10; i++) test2["_" + String.fromCharCode(i)] = i;
			if (Object.getOwnPropertyNames(test2).map(function(n) {
				return test2[n];
			}).join("") !== "0123456789") return false;
			var test3 = {};
			"abcdefghijklmnopqrst".split("").forEach(function(letter) {
				test3[letter] = letter;
			});
			if (Object.keys(Object.assign({}, test3)).join("") !== "abcdefghijklmnopqrst") return false;
			return true;
		} catch (err) {
			return false;
		}
	}
	module.exports = shouldUseNative() ? Object.assign : function(target, source) {
		var from;
		var to = toObject(target);
		var symbols;
		for (var s = 1; s < arguments.length; s++) {
			from = Object(arguments[s]);
			for (var key in from) if (hasOwnProperty.call(from, key)) to[key] = from[key];
			if (getOwnPropertySymbols) {
				symbols = getOwnPropertySymbols(from);
				for (var i = 0; i < symbols.length; i++) if (propIsEnumerable.call(from, symbols[i])) to[symbols[i]] = from[symbols[i]];
			}
		}
		return to;
	};
}));
/*!
* vary
* Copyright(c) 2014-2017 Douglas Christopher Wilson
* MIT Licensed
*/
var require_vary = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module exports.
	*/
	module.exports = vary;
	module.exports.append = append;
	/**
	* RegExp to match field-name in RFC 7230 sec 3.2
	*
	* field-name    = token
	* token         = 1*tchar
	* tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
	*               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
	*               / DIGIT / ALPHA
	*               ; any VCHAR, except delimiters
	*/
	var FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
	/**
	* Append a field to a vary header.
	*
	* @param {String} header
	* @param {String|Array} field
	* @return {String}
	* @public
	*/
	function append(header, field) {
		if (typeof header !== "string") throw new TypeError("header argument is required");
		if (!field) throw new TypeError("field argument is required");
		var fields = !Array.isArray(field) ? parse(String(field)) : field;
		for (var j = 0; j < fields.length; j++) if (!FIELD_NAME_REGEXP.test(fields[j])) throw new TypeError("field argument contains an invalid header name");
		if (header === "*") return header;
		var val = header;
		var vals = parse(header.toLowerCase());
		if (fields.indexOf("*") !== -1 || vals.indexOf("*") !== -1) return "*";
		for (var i = 0; i < fields.length; i++) {
			var fld = fields[i].toLowerCase();
			if (vals.indexOf(fld) === -1) {
				vals.push(fld);
				val = val ? val + ", " + fields[i] : fields[i];
			}
		}
		return val;
	}
	/**
	* Parse a vary header into an array.
	*
	* @param {String} header
	* @return {Array}
	* @private
	*/
	function parse(header) {
		var end = 0;
		var list = [];
		var start = 0;
		for (var i = 0, len = header.length; i < len; i++) switch (header.charCodeAt(i)) {
			case 32:
				if (start === end) start = end = i + 1;
				break;
			case 44:
				list.push(header.substring(start, end));
				start = end = i + 1;
				break;
			default:
				end = i + 1;
				break;
		}
		list.push(header.substring(start, end));
		return list;
	}
	/**
	* Mark that a request is varied on a header field.
	*
	* @param {Object} res
	* @param {String|Array} field
	* @public
	*/
	function vary(res, field) {
		if (!res || !res.getHeader || !res.setHeader) throw new TypeError("res argument is required");
		var val = res.getHeader("Vary") || "";
		if (val = append(Array.isArray(val) ? val.join(", ") : String(val), field)) res.setHeader("Vary", val);
	}
}));
var require_lib$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	(function() {
		"use strict";
		var assign = require_object_assign();
		var vary = require_vary();
		var defaults = {
			origin: "*",
			methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
			preflightContinue: false,
			optionsSuccessStatus: 204
		};
		function isString(s) {
			return typeof s === "string" || s instanceof String;
		}
		function isOriginAllowed(origin, allowedOrigin) {
			if (Array.isArray(allowedOrigin)) {
				for (var i = 0; i < allowedOrigin.length; ++i) if (isOriginAllowed(origin, allowedOrigin[i])) return true;
				return false;
			} else if (isString(allowedOrigin)) return origin === allowedOrigin;
			else if (allowedOrigin instanceof RegExp) return allowedOrigin.test(origin);
			else return !!allowedOrigin;
		}
		function configureOrigin(options, req) {
			var requestOrigin = req.headers.origin, headers = [], isAllowed;
			if (!options.origin || options.origin === "*") headers.push([{
				key: "Access-Control-Allow-Origin",
				value: "*"
			}]);
			else if (isString(options.origin)) {
				headers.push([{
					key: "Access-Control-Allow-Origin",
					value: options.origin
				}]);
				headers.push([{
					key: "Vary",
					value: "Origin"
				}]);
			} else {
				isAllowed = isOriginAllowed(requestOrigin, options.origin);
				headers.push([{
					key: "Access-Control-Allow-Origin",
					value: isAllowed ? requestOrigin : false
				}]);
				headers.push([{
					key: "Vary",
					value: "Origin"
				}]);
			}
			return headers;
		}
		function configureMethods(options) {
			var methods = options.methods;
			if (methods.join) methods = options.methods.join(",");
			return {
				key: "Access-Control-Allow-Methods",
				value: methods
			};
		}
		function configureCredentials(options) {
			if (options.credentials === true) return {
				key: "Access-Control-Allow-Credentials",
				value: "true"
			};
			return null;
		}
		function configureAllowedHeaders(options, req) {
			var allowedHeaders = options.allowedHeaders || options.headers;
			var headers = [];
			if (!allowedHeaders) {
				allowedHeaders = req.headers["access-control-request-headers"];
				headers.push([{
					key: "Vary",
					value: "Access-Control-Request-Headers"
				}]);
			} else if (allowedHeaders.join) allowedHeaders = allowedHeaders.join(",");
			if (allowedHeaders && allowedHeaders.length) headers.push([{
				key: "Access-Control-Allow-Headers",
				value: allowedHeaders
			}]);
			return headers;
		}
		function configureExposedHeaders(options) {
			var headers = options.exposedHeaders;
			if (!headers) return null;
			else if (headers.join) headers = headers.join(",");
			if (headers && headers.length) return {
				key: "Access-Control-Expose-Headers",
				value: headers
			};
			return null;
		}
		function configureMaxAge(options) {
			var maxAge = (typeof options.maxAge === "number" || options.maxAge) && options.maxAge.toString();
			if (maxAge && maxAge.length) return {
				key: "Access-Control-Max-Age",
				value: maxAge
			};
			return null;
		}
		function applyHeaders(headers, res) {
			for (var i = 0, n = headers.length; i < n; i++) {
				var header = headers[i];
				if (header) {
					if (Array.isArray(header)) applyHeaders(header, res);
					else if (header.key === "Vary" && header.value) vary(res, header.value);
					else if (header.value) res.setHeader(header.key, header.value);
				}
			}
		}
		function cors(options, req, res, next) {
			var headers = [];
			if ((req.method && req.method.toUpperCase && req.method.toUpperCase()) === "OPTIONS") {
				headers.push(configureOrigin(options, req));
				headers.push(configureCredentials(options));
				headers.push(configureMethods(options));
				headers.push(configureAllowedHeaders(options, req));
				headers.push(configureMaxAge(options));
				headers.push(configureExposedHeaders(options));
				applyHeaders(headers, res);
				if (options.preflightContinue) next();
				else {
					res.statusCode = options.optionsSuccessStatus;
					res.setHeader("Content-Length", "0");
					res.end();
				}
			} else {
				headers.push(configureOrigin(options, req));
				headers.push(configureCredentials(options));
				headers.push(configureExposedHeaders(options));
				applyHeaders(headers, res);
				next();
			}
		}
		function middlewareWrapper(o) {
			var optionsCallback = null;
			if (typeof o === "function") optionsCallback = o;
			else optionsCallback = function(req, cb) {
				cb(null, o);
			};
			return function corsMiddleware(req, res, next) {
				optionsCallback(req, function(err, options) {
					if (err) next(err);
					else {
						var corsOptions = assign({}, defaults, options);
						var originCallback = null;
						if (corsOptions.origin && typeof corsOptions.origin === "function") originCallback = corsOptions.origin;
						else if (corsOptions.origin) originCallback = function(origin, cb) {
							cb(null, corsOptions.origin);
						};
						if (originCallback) originCallback(req.headers.origin, function(err2, origin) {
							if (err2 || !origin) next(err2);
							else {
								corsOptions.origin = origin;
								cors(corsOptions, req, res, next);
							}
						});
						else next();
					}
				});
			};
		}
		module.exports = middlewareWrapper;
	})();
}));
var require_constants$3 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const path$13 = __require$2("path");
	const WIN_SLASH = "\\\\/";
	const WIN_NO_SLASH = `[^${WIN_SLASH}]`;
	/**
	* Posix glob regex
	*/
	const DOT_LITERAL = "\\.";
	const PLUS_LITERAL = "\\+";
	const QMARK_LITERAL = "\\?";
	const SLASH_LITERAL = "\\/";
	const ONE_CHAR = "(?=.)";
	const QMARK = "[^/]";
	const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
	const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
	const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
	const POSIX_CHARS = {
		DOT_LITERAL,
		PLUS_LITERAL,
		QMARK_LITERAL,
		SLASH_LITERAL,
		ONE_CHAR,
		QMARK,
		END_ANCHOR,
		DOTS_SLASH,
		NO_DOT: `(?!${DOT_LITERAL})`,
		NO_DOTS: `(?!${START_ANCHOR}${DOTS_SLASH})`,
		NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`,
		NO_DOTS_SLASH: `(?!${DOTS_SLASH})`,
		QMARK_NO_DOT: `[^.${SLASH_LITERAL}]`,
		STAR: `${QMARK}*?`,
		START_ANCHOR
	};
	/**
	* Windows glob regex
	*/
	const WINDOWS_CHARS = {
		...POSIX_CHARS,
		SLASH_LITERAL: `[${WIN_SLASH}]`,
		QMARK: WIN_NO_SLASH,
		STAR: `${WIN_NO_SLASH}*?`,
		DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
		NO_DOT: `(?!${DOT_LITERAL})`,
		NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
		NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
		NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
		QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
		START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
		END_ANCHOR: `(?:[${WIN_SLASH}]|$)`
	};
	module.exports = {
		MAX_LENGTH: 1024 * 64,
		POSIX_REGEX_SOURCE: {
			alnum: "a-zA-Z0-9",
			alpha: "a-zA-Z",
			ascii: "\\x00-\\x7F",
			blank: " \\t",
			cntrl: "\\x00-\\x1F\\x7F",
			digit: "0-9",
			graph: "\\x21-\\x7E",
			lower: "a-z",
			print: "\\x20-\\x7E ",
			punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
			space: " \\t\\r\\n\\v\\f",
			upper: "A-Z",
			word: "A-Za-z0-9_",
			xdigit: "A-Fa-f0-9"
		},
		REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
		REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
		REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
		REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
		REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
		REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
		REPLACEMENTS: {
			"***": "*",
			"**/**": "**",
			"**/**/**": "**"
		},
		CHAR_0: 48,
		CHAR_9: 57,
		CHAR_UPPERCASE_A: 65,
		CHAR_LOWERCASE_A: 97,
		CHAR_UPPERCASE_Z: 90,
		CHAR_LOWERCASE_Z: 122,
		CHAR_LEFT_PARENTHESES: 40,
		CHAR_RIGHT_PARENTHESES: 41,
		CHAR_ASTERISK: 42,
		CHAR_AMPERSAND: 38,
		CHAR_AT: 64,
		CHAR_BACKWARD_SLASH: 92,
		CHAR_CARRIAGE_RETURN: 13,
		CHAR_CIRCUMFLEX_ACCENT: 94,
		CHAR_COLON: 58,
		CHAR_COMMA: 44,
		CHAR_DOT: 46,
		CHAR_DOUBLE_QUOTE: 34,
		CHAR_EQUAL: 61,
		CHAR_EXCLAMATION_MARK: 33,
		CHAR_FORM_FEED: 12,
		CHAR_FORWARD_SLASH: 47,
		CHAR_GRAVE_ACCENT: 96,
		CHAR_HASH: 35,
		CHAR_HYPHEN_MINUS: 45,
		CHAR_LEFT_ANGLE_BRACKET: 60,
		CHAR_LEFT_CURLY_BRACE: 123,
		CHAR_LEFT_SQUARE_BRACKET: 91,
		CHAR_LINE_FEED: 10,
		CHAR_NO_BREAK_SPACE: 160,
		CHAR_PERCENT: 37,
		CHAR_PLUS: 43,
		CHAR_QUESTION_MARK: 63,
		CHAR_RIGHT_ANGLE_BRACKET: 62,
		CHAR_RIGHT_CURLY_BRACE: 125,
		CHAR_RIGHT_SQUARE_BRACKET: 93,
		CHAR_SEMICOLON: 59,
		CHAR_SINGLE_QUOTE: 39,
		CHAR_SPACE: 32,
		CHAR_TAB: 9,
		CHAR_UNDERSCORE: 95,
		CHAR_VERTICAL_LINE: 124,
		CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
		SEP: path$13.sep,
		/**
		* Create EXTGLOB_CHARS
		*/
		extglobChars(chars) {
			return {
				"!": {
					type: "negate",
					open: "(?:(?!(?:",
					close: `))${chars.STAR})`
				},
				"?": {
					type: "qmark",
					open: "(?:",
					close: ")?"
				},
				"+": {
					type: "plus",
					open: "(?:",
					close: ")+"
				},
				"*": {
					type: "star",
					open: "(?:",
					close: ")*"
				},
				"@": {
					type: "at",
					open: "(?:",
					close: ")"
				}
			};
		},
		/**
		* Create GLOB_CHARS
		*/
		globChars(win32) {
			return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
		}
	};
}));
var require_utils$1 = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	const path$12 = __require$2("path");
	const win32 = process.platform === "win32";
	const { REGEX_BACKSLASH, REGEX_REMOVE_BACKSLASH, REGEX_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_GLOBAL } = require_constants$3();
	exports.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
	exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
	exports.isRegexChar = (str) => str.length === 1 && exports.hasRegexChars(str);
	exports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
	exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
	exports.removeBackslashes = (str) => {
		return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
			return match === "\\" ? "" : match;
		});
	};
	exports.supportsLookbehinds = () => {
		const segs = process.version.slice(1).split(".").map(Number);
		if (segs.length === 3 && segs[0] >= 9 || segs[0] === 8 && segs[1] >= 10) return true;
		return false;
	};
	exports.isWindows = (options) => {
		if (options && typeof options.windows === "boolean") return options.windows;
		return win32 === true || path$12.sep === "\\";
	};
	exports.escapeLast = (input, char, lastIdx) => {
		const idx = input.lastIndexOf(char, lastIdx);
		if (idx === -1) return input;
		if (input[idx - 1] === "\\") return exports.escapeLast(input, char, idx - 1);
		return `${input.slice(0, idx)}\\${input.slice(idx)}`;
	};
	exports.removePrefix = (input, state = {}) => {
		let output = input;
		if (output.startsWith("./")) {
			output = output.slice(2);
			state.prefix = "./";
		}
		return output;
	};
	exports.wrapOutput = (input, state = {}, options = {}) => {
		let output = `${options.contains ? "" : "^"}(?:${input})${options.contains ? "" : "$"}`;
		if (state.negated === true) output = `(?:^(?!${output}).*$)`;
		return output;
	};
}));
var require_scan = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const utils = require_utils$1();
	const { CHAR_ASTERISK, CHAR_AT, CHAR_BACKWARD_SLASH, CHAR_COMMA, CHAR_DOT, CHAR_EXCLAMATION_MARK, CHAR_FORWARD_SLASH, CHAR_LEFT_CURLY_BRACE, CHAR_LEFT_PARENTHESES, CHAR_LEFT_SQUARE_BRACKET, CHAR_PLUS, CHAR_QUESTION_MARK, CHAR_RIGHT_CURLY_BRACE, CHAR_RIGHT_PARENTHESES, CHAR_RIGHT_SQUARE_BRACKET } = require_constants$3();
	const isPathSeparator = (code) => {
		return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
	};
	const depth = (token) => {
		if (token.isPrefix !== true) token.depth = token.isGlobstar ? Infinity : 1;
	};
	/**
	* Quickly scans a glob pattern and returns an object with a handful of
	* useful properties, like `isGlob`, `path` (the leading non-glob, if it exists),
	* `glob` (the actual pattern), `negated` (true if the path starts with `!` but not
	* with `!(`) and `negatedExtglob` (true if the path starts with `!(`).
	*
	* ```js
	* const pm = require('picomatch');
	* console.log(pm.scan('foo/bar/*.js'));
	* { isGlob: true, input: 'foo/bar/*.js', base: 'foo/bar', glob: '*.js' }
	* ```
	* @param {String} `str`
	* @param {Object} `options`
	* @return {Object} Returns an object with tokens and regex source string.
	* @api public
	*/
	const scan = (input, options) => {
		const opts = options || {};
		const length = input.length - 1;
		const scanToEnd = opts.parts === true || opts.scanToEnd === true;
		const slashes = [];
		const tokens = [];
		const parts = [];
		let str = input;
		let index = -1;
		let start = 0;
		let lastIndex = 0;
		let isBrace = false;
		let isBracket = false;
		let isGlob = false;
		let isExtglob = false;
		let isGlobstar = false;
		let braceEscaped = false;
		let backslashes = false;
		let negated = false;
		let negatedExtglob = false;
		let finished = false;
		let braces = 0;
		let prev;
		let code;
		let token = {
			value: "",
			depth: 0,
			isGlob: false
		};
		const eos = () => index >= length;
		const peek = () => str.charCodeAt(index + 1);
		const advance = () => {
			prev = code;
			return str.charCodeAt(++index);
		};
		while (index < length) {
			code = advance();
			let next;
			if (code === CHAR_BACKWARD_SLASH) {
				backslashes = token.backslashes = true;
				code = advance();
				if (code === CHAR_LEFT_CURLY_BRACE) braceEscaped = true;
				continue;
			}
			if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
				braces++;
				while (eos() !== true && (code = advance())) {
					if (code === CHAR_BACKWARD_SLASH) {
						backslashes = token.backslashes = true;
						advance();
						continue;
					}
					if (code === CHAR_LEFT_CURLY_BRACE) {
						braces++;
						continue;
					}
					if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
						isBrace = token.isBrace = true;
						isGlob = token.isGlob = true;
						finished = true;
						if (scanToEnd === true) continue;
						break;
					}
					if (braceEscaped !== true && code === CHAR_COMMA) {
						isBrace = token.isBrace = true;
						isGlob = token.isGlob = true;
						finished = true;
						if (scanToEnd === true) continue;
						break;
					}
					if (code === CHAR_RIGHT_CURLY_BRACE) {
						braces--;
						if (braces === 0) {
							braceEscaped = false;
							isBrace = token.isBrace = true;
							finished = true;
							break;
						}
					}
				}
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_FORWARD_SLASH) {
				slashes.push(index);
				tokens.push(token);
				token = {
					value: "",
					depth: 0,
					isGlob: false
				};
				if (finished === true) continue;
				if (prev === CHAR_DOT && index === start + 1) {
					start += 2;
					continue;
				}
				lastIndex = index + 1;
				continue;
			}
			if (opts.noext !== true) {
				if ((code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK) === true && peek() === CHAR_LEFT_PARENTHESES) {
					isGlob = token.isGlob = true;
					isExtglob = token.isExtglob = true;
					finished = true;
					if (code === CHAR_EXCLAMATION_MARK && index === start) negatedExtglob = true;
					if (scanToEnd === true) {
						while (eos() !== true && (code = advance())) {
							if (code === CHAR_BACKWARD_SLASH) {
								backslashes = token.backslashes = true;
								code = advance();
								continue;
							}
							if (code === CHAR_RIGHT_PARENTHESES) {
								isGlob = token.isGlob = true;
								finished = true;
								break;
							}
						}
						continue;
					}
					break;
				}
			}
			if (code === CHAR_ASTERISK) {
				if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
				isGlob = token.isGlob = true;
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_QUESTION_MARK) {
				isGlob = token.isGlob = true;
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_LEFT_SQUARE_BRACKET) {
				while (eos() !== true && (next = advance())) {
					if (next === CHAR_BACKWARD_SLASH) {
						backslashes = token.backslashes = true;
						advance();
						continue;
					}
					if (next === CHAR_RIGHT_SQUARE_BRACKET) {
						isBracket = token.isBracket = true;
						isGlob = token.isGlob = true;
						finished = true;
						break;
					}
				}
				if (scanToEnd === true) continue;
				break;
			}
			if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
				negated = token.negated = true;
				start++;
				continue;
			}
			if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
				isGlob = token.isGlob = true;
				if (scanToEnd === true) {
					while (eos() !== true && (code = advance())) {
						if (code === CHAR_LEFT_PARENTHESES) {
							backslashes = token.backslashes = true;
							code = advance();
							continue;
						}
						if (code === CHAR_RIGHT_PARENTHESES) {
							finished = true;
							break;
						}
					}
					continue;
				}
				break;
			}
			if (isGlob === true) {
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
		}
		if (opts.noext === true) {
			isExtglob = false;
			isGlob = false;
		}
		let base = str;
		let prefix = "";
		let glob = "";
		if (start > 0) {
			prefix = str.slice(0, start);
			str = str.slice(start);
			lastIndex -= start;
		}
		if (base && isGlob === true && lastIndex > 0) {
			base = str.slice(0, lastIndex);
			glob = str.slice(lastIndex);
		} else if (isGlob === true) {
			base = "";
			glob = str;
		} else base = str;
		if (base && base !== "" && base !== "/" && base !== str) {
			if (isPathSeparator(base.charCodeAt(base.length - 1))) base = base.slice(0, -1);
		}
		if (opts.unescape === true) {
			if (glob) glob = utils.removeBackslashes(glob);
			if (base && backslashes === true) base = utils.removeBackslashes(base);
		}
		const state = {
			prefix,
			input,
			start,
			base,
			glob,
			isBrace,
			isBracket,
			isGlob,
			isExtglob,
			isGlobstar,
			negated,
			negatedExtglob
		};
		if (opts.tokens === true) {
			state.maxDepth = 0;
			if (!isPathSeparator(code)) tokens.push(token);
			state.tokens = tokens;
		}
		if (opts.parts === true || opts.tokens === true) {
			let prevIndex;
			for (let idx = 0; idx < slashes.length; idx++) {
				const n = prevIndex ? prevIndex + 1 : start;
				const i = slashes[idx];
				const value = input.slice(n, i);
				if (opts.tokens) {
					if (idx === 0 && start !== 0) {
						tokens[idx].isPrefix = true;
						tokens[idx].value = prefix;
					} else tokens[idx].value = value;
					depth(tokens[idx]);
					state.maxDepth += tokens[idx].depth;
				}
				if (idx !== 0 || value !== "") parts.push(value);
				prevIndex = i;
			}
			if (prevIndex && prevIndex + 1 < input.length) {
				const value = input.slice(prevIndex + 1);
				parts.push(value);
				if (opts.tokens) {
					tokens[tokens.length - 1].value = value;
					depth(tokens[tokens.length - 1]);
					state.maxDepth += tokens[tokens.length - 1].depth;
				}
			}
			state.slashes = slashes;
			state.parts = parts;
		}
		return state;
	};
	module.exports = scan;
}));
var require_parse$3 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const constants = require_constants$3();
	const utils = require_utils$1();
	/**
	* Constants
	*/
	const { MAX_LENGTH, POSIX_REGEX_SOURCE, REGEX_NON_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_BACKREF, REPLACEMENTS } = constants;
	/**
	* Helpers
	*/
	const expandRange = (args, options) => {
		if (typeof options.expandRange === "function") return options.expandRange(...args, options);
		args.sort();
		const value = `[${args.join("-")}]`;
		try {
			new RegExp(value);
		} catch (ex) {
			return args.map((v) => utils.escapeRegex(v)).join("..");
		}
		return value;
	};
	/**
	* Create the message for a syntax error
	*/
	const syntaxError = (type, char) => {
		return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
	};
	/**
	* Parse the given input string.
	* @param {String} input
	* @param {Object} options
	* @return {Object}
	*/
	const parse = (input, options) => {
		if (typeof input !== "string") throw new TypeError("Expected a string");
		input = REPLACEMENTS[input] || input;
		const opts = { ...options };
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		let len = input.length;
		if (len > max) throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
		const bos = {
			type: "bos",
			value: "",
			output: opts.prepend || ""
		};
		const tokens = [bos];
		const capture = opts.capture ? "" : "?:";
		const win32 = utils.isWindows(options);
		const PLATFORM_CHARS = constants.globChars(win32);
		const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
		const { DOT_LITERAL, PLUS_LITERAL, SLASH_LITERAL, ONE_CHAR, DOTS_SLASH, NO_DOT, NO_DOT_SLASH, NO_DOTS_SLASH, QMARK, QMARK_NO_DOT, STAR, START_ANCHOR } = PLATFORM_CHARS;
		const globstar = (opts) => {
			return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
		};
		const nodot = opts.dot ? "" : NO_DOT;
		const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
		let star = opts.bash === true ? globstar(opts) : STAR;
		if (opts.capture) star = `(${star})`;
		if (typeof opts.noext === "boolean") opts.noextglob = opts.noext;
		const state = {
			input,
			index: -1,
			start: 0,
			dot: opts.dot === true,
			consumed: "",
			output: "",
			prefix: "",
			backtrack: false,
			negated: false,
			brackets: 0,
			braces: 0,
			parens: 0,
			quotes: 0,
			globstar: false,
			tokens
		};
		input = utils.removePrefix(input, state);
		len = input.length;
		const extglobs = [];
		const braces = [];
		const stack = [];
		let prev = bos;
		let value;
		/**
		* Tokenizing helpers
		*/
		const eos = () => state.index === len - 1;
		const peek = state.peek = (n = 1) => input[state.index + n];
		const advance = state.advance = () => input[++state.index] || "";
		const remaining = () => input.slice(state.index + 1);
		const consume = (value = "", num = 0) => {
			state.consumed += value;
			state.index += num;
		};
		const append = (token) => {
			state.output += token.output != null ? token.output : token.value;
			consume(token.value);
		};
		const negate = () => {
			let count = 1;
			while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
				advance();
				state.start++;
				count++;
			}
			if (count % 2 === 0) return false;
			state.negated = true;
			state.start++;
			return true;
		};
		const increment = (type) => {
			state[type]++;
			stack.push(type);
		};
		const decrement = (type) => {
			state[type]--;
			stack.pop();
		};
		/**
		* Push tokens onto the tokens array. This helper speeds up
		* tokenizing by 1) helping us avoid backtracking as much as possible,
		* and 2) helping us avoid creating extra tokens when consecutive
		* characters are plain text. This improves performance and simplifies
		* lookbehinds.
		*/
		const push = (tok) => {
			if (prev.type === "globstar") {
				if (tok.type !== "slash" && tok.type !== "paren" && !(state.braces > 0 && (tok.type === "comma" || tok.type === "brace")) && !(tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren"))) {
					state.output = state.output.slice(0, -prev.output.length);
					prev.type = "star";
					prev.value = "*";
					prev.output = star;
					state.output += prev.output;
				}
			}
			if (extglobs.length && tok.type !== "paren") extglobs[extglobs.length - 1].inner += tok.value;
			if (tok.value || tok.output) append(tok);
			if (prev && prev.type === "text" && tok.type === "text") {
				prev.value += tok.value;
				prev.output = (prev.output || "") + tok.value;
				return;
			}
			tok.prev = prev;
			tokens.push(tok);
			prev = tok;
		};
		const extglobOpen = (type, value) => {
			const token = {
				...EXTGLOB_CHARS[value],
				conditions: 1,
				inner: ""
			};
			token.prev = prev;
			token.parens = state.parens;
			token.output = state.output;
			const output = (opts.capture ? "(" : "") + token.open;
			increment("parens");
			push({
				type,
				value,
				output: state.output ? "" : ONE_CHAR
			});
			push({
				type: "paren",
				extglob: true,
				value: advance(),
				output
			});
			extglobs.push(token);
		};
		const extglobClose = (token) => {
			let output = token.close + (opts.capture ? ")" : "");
			let rest;
			if (token.type === "negate") {
				let extglobStar = star;
				if (token.inner && token.inner.length > 1 && token.inner.includes("/")) extglobStar = globstar(opts);
				if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) output = token.close = `)$))${extglobStar}`;
				if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) output = token.close = `)${parse(rest, {
					...options,
					fastpaths: false
				}).output})${extglobStar})`;
				if (token.prev.type === "bos") state.negatedExtglob = true;
			}
			push({
				type: "paren",
				extglob: true,
				value,
				output
			});
			decrement("parens");
		};
		/**
		* Fast paths
		*/
		if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
			let backslashes = false;
			let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
				if (first === "\\") {
					backslashes = true;
					return m;
				}
				if (first === "?") {
					if (esc) return esc + first + (rest ? QMARK.repeat(rest.length) : "");
					if (index === 0) return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
					return QMARK.repeat(chars.length);
				}
				if (first === ".") return DOT_LITERAL.repeat(chars.length);
				if (first === "*") {
					if (esc) return esc + first + (rest ? star : "");
					return star;
				}
				return esc ? m : `\\${m}`;
			});
			if (backslashes === true) if (opts.unescape === true) output = output.replace(/\\/g, "");
			else output = output.replace(/\\+/g, (m) => {
				return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
			});
			if (output === input && opts.contains === true) {
				state.output = input;
				return state;
			}
			state.output = utils.wrapOutput(output, state, options);
			return state;
		}
		/**
		* Tokenize input until we reach end-of-string
		*/
		while (!eos()) {
			value = advance();
			if (value === "\0") continue;
			/**
			* Escaped characters
			*/
			if (value === "\\") {
				const next = peek();
				if (next === "/" && opts.bash !== true) continue;
				if (next === "." || next === ";") continue;
				if (!next) {
					value += "\\";
					push({
						type: "text",
						value
					});
					continue;
				}
				const match = /^\\+/.exec(remaining());
				let slashes = 0;
				if (match && match[0].length > 2) {
					slashes = match[0].length;
					state.index += slashes;
					if (slashes % 2 !== 0) value += "\\";
				}
				if (opts.unescape === true) value = advance();
				else value += advance();
				if (state.brackets === 0) {
					push({
						type: "text",
						value
					});
					continue;
				}
			}
			/**
			* If we're inside a regex character class, continue
			* until we reach the closing bracket.
			*/
			if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
				if (opts.posix !== false && value === ":") {
					const inner = prev.value.slice(1);
					if (inner.includes("[")) {
						prev.posix = true;
						if (inner.includes(":")) {
							const idx = prev.value.lastIndexOf("[");
							const pre = prev.value.slice(0, idx);
							const rest = prev.value.slice(idx + 2);
							const posix = POSIX_REGEX_SOURCE[rest];
							if (posix) {
								prev.value = pre + posix;
								state.backtrack = true;
								advance();
								if (!bos.output && tokens.indexOf(prev) === 1) bos.output = ONE_CHAR;
								continue;
							}
						}
					}
				}
				if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") value = `\\${value}`;
				if (value === "]" && (prev.value === "[" || prev.value === "[^")) value = `\\${value}`;
				if (opts.posix === true && value === "!" && prev.value === "[") value = "^";
				prev.value += value;
				append({ value });
				continue;
			}
			/**
			* If we're inside a quoted string, continue
			* until we reach the closing double quote.
			*/
			if (state.quotes === 1 && value !== "\"") {
				value = utils.escapeRegex(value);
				prev.value += value;
				append({ value });
				continue;
			}
			/**
			* Double quotes
			*/
			if (value === "\"") {
				state.quotes = state.quotes === 1 ? 0 : 1;
				if (opts.keepQuotes === true) push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Parentheses
			*/
			if (value === "(") {
				increment("parens");
				push({
					type: "paren",
					value
				});
				continue;
			}
			if (value === ")") {
				if (state.parens === 0 && opts.strictBrackets === true) throw new SyntaxError(syntaxError("opening", "("));
				const extglob = extglobs[extglobs.length - 1];
				if (extglob && state.parens === extglob.parens + 1) {
					extglobClose(extglobs.pop());
					continue;
				}
				push({
					type: "paren",
					value,
					output: state.parens ? ")" : "\\)"
				});
				decrement("parens");
				continue;
			}
			/**
			* Square brackets
			*/
			if (value === "[") {
				if (opts.nobracket === true || !remaining().includes("]")) {
					if (opts.nobracket !== true && opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
					value = `\\${value}`;
				} else increment("brackets");
				push({
					type: "bracket",
					value
				});
				continue;
			}
			if (value === "]") {
				if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
					push({
						type: "text",
						value,
						output: `\\${value}`
					});
					continue;
				}
				if (state.brackets === 0) {
					if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("opening", "["));
					push({
						type: "text",
						value,
						output: `\\${value}`
					});
					continue;
				}
				decrement("brackets");
				const prevValue = prev.value.slice(1);
				if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) value = `/${value}`;
				prev.value += value;
				append({ value });
				if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) continue;
				const escaped = utils.escapeRegex(prev.value);
				state.output = state.output.slice(0, -prev.value.length);
				if (opts.literalBrackets === true) {
					state.output += escaped;
					prev.value = escaped;
					continue;
				}
				prev.value = `(${capture}${escaped}|${prev.value})`;
				state.output += prev.value;
				continue;
			}
			/**
			* Braces
			*/
			if (value === "{" && opts.nobrace !== true) {
				increment("braces");
				const open = {
					type: "brace",
					value,
					output: "(",
					outputIndex: state.output.length,
					tokensIndex: state.tokens.length
				};
				braces.push(open);
				push(open);
				continue;
			}
			if (value === "}") {
				const brace = braces[braces.length - 1];
				if (opts.nobrace === true || !brace) {
					push({
						type: "text",
						value,
						output: value
					});
					continue;
				}
				let output = ")";
				if (brace.dots === true) {
					const arr = tokens.slice();
					const range = [];
					for (let i = arr.length - 1; i >= 0; i--) {
						tokens.pop();
						if (arr[i].type === "brace") break;
						if (arr[i].type !== "dots") range.unshift(arr[i].value);
					}
					output = expandRange(range, opts);
					state.backtrack = true;
				}
				if (brace.comma !== true && brace.dots !== true) {
					const out = state.output.slice(0, brace.outputIndex);
					const toks = state.tokens.slice(brace.tokensIndex);
					brace.value = brace.output = "\\{";
					value = output = "\\}";
					state.output = out;
					for (const t of toks) state.output += t.output || t.value;
				}
				push({
					type: "brace",
					value,
					output
				});
				decrement("braces");
				braces.pop();
				continue;
			}
			/**
			* Pipes
			*/
			if (value === "|") {
				if (extglobs.length > 0) extglobs[extglobs.length - 1].conditions++;
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Commas
			*/
			if (value === ",") {
				let output = value;
				const brace = braces[braces.length - 1];
				if (brace && stack[stack.length - 1] === "braces") {
					brace.comma = true;
					output = "|";
				}
				push({
					type: "comma",
					value,
					output
				});
				continue;
			}
			/**
			* Slashes
			*/
			if (value === "/") {
				if (prev.type === "dot" && state.index === state.start + 1) {
					state.start = state.index + 1;
					state.consumed = "";
					state.output = "";
					tokens.pop();
					prev = bos;
					continue;
				}
				push({
					type: "slash",
					value,
					output: SLASH_LITERAL
				});
				continue;
			}
			/**
			* Dots
			*/
			if (value === ".") {
				if (state.braces > 0 && prev.type === "dot") {
					if (prev.value === ".") prev.output = DOT_LITERAL;
					const brace = braces[braces.length - 1];
					prev.type = "dots";
					prev.output += value;
					prev.value += value;
					brace.dots = true;
					continue;
				}
				if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
					push({
						type: "text",
						value,
						output: DOT_LITERAL
					});
					continue;
				}
				push({
					type: "dot",
					value,
					output: DOT_LITERAL
				});
				continue;
			}
			/**
			* Question marks
			*/
			if (value === "?") {
				if (!(prev && prev.value === "(") && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					extglobOpen("qmark", value);
					continue;
				}
				if (prev && prev.type === "paren") {
					const next = peek();
					let output = value;
					if (next === "<" && !utils.supportsLookbehinds()) throw new Error("Node.js v10 or higher is required for regex lookbehinds");
					if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) output = `\\${value}`;
					push({
						type: "text",
						value,
						output
					});
					continue;
				}
				if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
					push({
						type: "qmark",
						value,
						output: QMARK_NO_DOT
					});
					continue;
				}
				push({
					type: "qmark",
					value,
					output: QMARK
				});
				continue;
			}
			/**
			* Exclamation
			*/
			if (value === "!") {
				if (opts.noextglob !== true && peek() === "(") {
					if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
						extglobOpen("negate", value);
						continue;
					}
				}
				if (opts.nonegate !== true && state.index === 0) {
					negate();
					continue;
				}
			}
			/**
			* Plus
			*/
			if (value === "+") {
				if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					extglobOpen("plus", value);
					continue;
				}
				if (prev && prev.value === "(" || opts.regex === false) {
					push({
						type: "plus",
						value,
						output: PLUS_LITERAL
					});
					continue;
				}
				if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
					push({
						type: "plus",
						value
					});
					continue;
				}
				push({
					type: "plus",
					value: PLUS_LITERAL
				});
				continue;
			}
			/**
			* Plain text
			*/
			if (value === "@") {
				if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					push({
						type: "at",
						extglob: true,
						value,
						output: ""
					});
					continue;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Plain text
			*/
			if (value !== "*") {
				if (value === "$" || value === "^") value = `\\${value}`;
				const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
				if (match) {
					value += match[0];
					state.index += match[0].length;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Stars
			*/
			if (prev && (prev.type === "globstar" || prev.star === true)) {
				prev.type = "star";
				prev.star = true;
				prev.value += value;
				prev.output = star;
				state.backtrack = true;
				state.globstar = true;
				consume(value);
				continue;
			}
			let rest = remaining();
			if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
				extglobOpen("star", value);
				continue;
			}
			if (prev.type === "star") {
				if (opts.noglobstar === true) {
					consume(value);
					continue;
				}
				const prior = prev.prev;
				const before = prior.prev;
				const isStart = prior.type === "slash" || prior.type === "bos";
				const afterStar = before && (before.type === "star" || before.type === "globstar");
				if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
					push({
						type: "star",
						value,
						output: ""
					});
					continue;
				}
				if (!isStart && prior.type !== "paren" && !(state.braces > 0 && (prior.type === "comma" || prior.type === "brace")) && !(extglobs.length && (prior.type === "pipe" || prior.type === "paren"))) {
					push({
						type: "star",
						value,
						output: ""
					});
					continue;
				}
				while (rest.slice(0, 3) === "/**") {
					const after = input[state.index + 4];
					if (after && after !== "/") break;
					rest = rest.slice(3);
					consume("/**", 3);
				}
				if (prior.type === "bos" && eos()) {
					prev.type = "globstar";
					prev.value += value;
					prev.output = globstar(opts);
					state.output = prev.output;
					state.globstar = true;
					consume(value);
					continue;
				}
				if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
					state.output = state.output.slice(0, -(prior.output + prev.output).length);
					prior.output = `(?:${prior.output}`;
					prev.type = "globstar";
					prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
					prev.value += value;
					state.globstar = true;
					state.output += prior.output + prev.output;
					consume(value);
					continue;
				}
				if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
					const end = rest[1] !== void 0 ? "|$" : "";
					state.output = state.output.slice(0, -(prior.output + prev.output).length);
					prior.output = `(?:${prior.output}`;
					prev.type = "globstar";
					prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
					prev.value += value;
					state.output += prior.output + prev.output;
					state.globstar = true;
					consume(value + advance());
					push({
						type: "slash",
						value: "/",
						output: ""
					});
					continue;
				}
				if (prior.type === "bos" && rest[0] === "/") {
					prev.type = "globstar";
					prev.value += value;
					prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
					state.output = prev.output;
					state.globstar = true;
					consume(value + advance());
					push({
						type: "slash",
						value: "/",
						output: ""
					});
					continue;
				}
				state.output = state.output.slice(0, -prev.output.length);
				prev.type = "globstar";
				prev.output = globstar(opts);
				prev.value += value;
				state.output += prev.output;
				state.globstar = true;
				consume(value);
				continue;
			}
			const token = {
				type: "star",
				value,
				output: star
			};
			if (opts.bash === true) {
				token.output = ".*?";
				if (prev.type === "bos" || prev.type === "slash") token.output = nodot + token.output;
				push(token);
				continue;
			}
			if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
				token.output = value;
				push(token);
				continue;
			}
			if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
				if (prev.type === "dot") {
					state.output += NO_DOT_SLASH;
					prev.output += NO_DOT_SLASH;
				} else if (opts.dot === true) {
					state.output += NO_DOTS_SLASH;
					prev.output += NO_DOTS_SLASH;
				} else {
					state.output += nodot;
					prev.output += nodot;
				}
				if (peek() !== "*") {
					state.output += ONE_CHAR;
					prev.output += ONE_CHAR;
				}
			}
			push(token);
		}
		while (state.brackets > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
			state.output = utils.escapeLast(state.output, "[");
			decrement("brackets");
		}
		while (state.parens > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", ")"));
			state.output = utils.escapeLast(state.output, "(");
			decrement("parens");
		}
		while (state.braces > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "}"));
			state.output = utils.escapeLast(state.output, "{");
			decrement("braces");
		}
		if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) push({
			type: "maybe_slash",
			value: "",
			output: `${SLASH_LITERAL}?`
		});
		if (state.backtrack === true) {
			state.output = "";
			for (const token of state.tokens) {
				state.output += token.output != null ? token.output : token.value;
				if (token.suffix) state.output += token.suffix;
			}
		}
		return state;
	};
	/**
	* Fast paths for creating regular expressions for common glob patterns.
	* This can significantly speed up processing and has very little downside
	* impact when none of the fast paths match.
	*/
	parse.fastpaths = (input, options) => {
		const opts = { ...options };
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		const len = input.length;
		if (len > max) throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
		input = REPLACEMENTS[input] || input;
		const win32 = utils.isWindows(options);
		const { DOT_LITERAL, SLASH_LITERAL, ONE_CHAR, DOTS_SLASH, NO_DOT, NO_DOTS, NO_DOTS_SLASH, STAR, START_ANCHOR } = constants.globChars(win32);
		const nodot = opts.dot ? NO_DOTS : NO_DOT;
		const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
		const capture = opts.capture ? "" : "?:";
		const state = {
			negated: false,
			prefix: ""
		};
		let star = opts.bash === true ? ".*?" : STAR;
		if (opts.capture) star = `(${star})`;
		const globstar = (opts) => {
			if (opts.noglobstar === true) return star;
			return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
		};
		const create = (str) => {
			switch (str) {
				case "*": return `${nodot}${ONE_CHAR}${star}`;
				case ".*": return `${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "*.*": return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "*/*": return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
				case "**": return nodot + globstar(opts);
				case "**/*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
				case "**/*.*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "**/.*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
				default: {
					const match = /^(.*?)\.(\w+)$/.exec(str);
					if (!match) return;
					const source = create(match[1]);
					if (!source) return;
					return source + DOT_LITERAL + match[2];
				}
			}
		};
		let source = create(utils.removePrefix(input, state));
		if (source && opts.strictSlashes !== true) source += `${SLASH_LITERAL}?`;
		return source;
	};
	module.exports = parse;
}));
var require_picomatch$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const path$11 = __require$2("path");
	const scan = require_scan();
	const parse = require_parse$3();
	const utils = require_utils$1();
	const constants = require_constants$3();
	const isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
	/**
	* Creates a matcher function from one or more glob patterns. The
	* returned function takes a string to match as its first argument,
	* and returns true if the string is a match. The returned matcher
	* function also takes a boolean as the second argument that, when true,
	* returns an object with additional information.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch(glob[, options]);
	*
	* const isMatch = picomatch('*.!(*a)');
	* console.log(isMatch('a.a')); //=> false
	* console.log(isMatch('a.b')); //=> true
	* ```
	* @name picomatch
	* @param {String|Array} `globs` One or more glob patterns.
	* @param {Object=} `options`
	* @return {Function=} Returns a matcher function.
	* @api public
	*/
	const picomatch = (glob, options, returnState = false) => {
		if (Array.isArray(glob)) {
			const fns = glob.map((input) => picomatch(input, options, returnState));
			const arrayMatcher = (str) => {
				for (const isMatch of fns) {
					const state = isMatch(str);
					if (state) return state;
				}
				return false;
			};
			return arrayMatcher;
		}
		const isState = isObject(glob) && glob.tokens && glob.input;
		if (glob === "" || typeof glob !== "string" && !isState) throw new TypeError("Expected pattern to be a non-empty string");
		const opts = options || {};
		const posix = utils.isWindows(options);
		const regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, false, true);
		const state = regex.state;
		delete regex.state;
		let isIgnored = () => false;
		if (opts.ignore) isIgnored = picomatch(opts.ignore, {
			...options,
			ignore: null,
			onMatch: null,
			onResult: null
		}, returnState);
		const matcher = (input, returnObject = false) => {
			const { isMatch, match, output } = picomatch.test(input, regex, options, {
				glob,
				posix
			});
			const result = {
				glob,
				state,
				regex,
				posix,
				input,
				output,
				match,
				isMatch
			};
			if (typeof opts.onResult === "function") opts.onResult(result);
			if (isMatch === false) {
				result.isMatch = false;
				return returnObject ? result : false;
			}
			if (isIgnored(input)) {
				if (typeof opts.onIgnore === "function") opts.onIgnore(result);
				result.isMatch = false;
				return returnObject ? result : false;
			}
			if (typeof opts.onMatch === "function") opts.onMatch(result);
			return returnObject ? result : true;
		};
		if (returnState) matcher.state = state;
		return matcher;
	};
	/**
	* Test `input` with the given `regex`. This is used by the main
	* `picomatch()` function to test the input string.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.test(input, regex[, options]);
	*
	* console.log(picomatch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
	* // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
	* ```
	* @param {String} `input` String to test.
	* @param {RegExp} `regex`
	* @return {Object} Returns an object with matching info.
	* @api public
	*/
	picomatch.test = (input, regex, options, { glob, posix } = {}) => {
		if (typeof input !== "string") throw new TypeError("Expected input to be a string");
		if (input === "") return {
			isMatch: false,
			output: ""
		};
		const opts = options || {};
		const format = opts.format || (posix ? utils.toPosixSlashes : null);
		let match = input === glob;
		let output = match && format ? format(input) : input;
		if (match === false) {
			output = format ? format(input) : input;
			match = output === glob;
		}
		if (match === false || opts.capture === true) if (opts.matchBase === true || opts.basename === true) match = picomatch.matchBase(input, regex, options, posix);
		else match = regex.exec(output);
		return {
			isMatch: Boolean(match),
			match,
			output
		};
	};
	/**
	* Match the basename of a filepath.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.matchBase(input, glob[, options]);
	* console.log(picomatch.matchBase('foo/bar.js', '*.js'); // true
	* ```
	* @param {String} `input` String to test.
	* @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
	* @return {Boolean}
	* @api public
	*/
	picomatch.matchBase = (input, glob, options, posix = utils.isWindows(options)) => {
		return (glob instanceof RegExp ? glob : picomatch.makeRe(glob, options)).test(path$11.basename(input));
	};
	/**
	* Returns true if **any** of the given glob `patterns` match the specified `string`.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.isMatch(string, patterns[, options]);
	*
	* console.log(picomatch.isMatch('a.a', ['b.*', '*.a'])); //=> true
	* console.log(picomatch.isMatch('a.a', 'b.*')); //=> false
	* ```
	* @param {String|Array} str The string to test.
	* @param {String|Array} patterns One or more glob patterns to use for matching.
	* @param {Object} [options] See available [options](#options).
	* @return {Boolean} Returns true if any patterns match `str`
	* @api public
	*/
	picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
	/**
	* Parse a glob pattern to create the source string for a regular
	* expression.
	*
	* ```js
	* const picomatch = require('picomatch');
	* const result = picomatch.parse(pattern[, options]);
	* ```
	* @param {String} `pattern`
	* @param {Object} `options`
	* @return {Object} Returns an object with useful properties and output to be used as a regex source string.
	* @api public
	*/
	picomatch.parse = (pattern, options) => {
		if (Array.isArray(pattern)) return pattern.map((p) => picomatch.parse(p, options));
		return parse(pattern, {
			...options,
			fastpaths: false
		});
	};
	/**
	* Scan a glob pattern to separate the pattern into segments.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.scan(input[, options]);
	*
	* const result = picomatch.scan('!./foo/*.js');
	* console.log(result);
	* { prefix: '!./',
	*   input: '!./foo/*.js',
	*   start: 3,
	*   base: 'foo',
	*   glob: '*.js',
	*   isBrace: false,
	*   isBracket: false,
	*   isGlob: true,
	*   isExtglob: false,
	*   isGlobstar: false,
	*   negated: true }
	* ```
	* @param {String} `input` Glob pattern to scan.
	* @param {Object} `options`
	* @return {Object} Returns an object with
	* @api public
	*/
	picomatch.scan = (input, options) => scan(input, options);
	/**
	* Compile a regular expression from the `state` object returned by the
	* [parse()](#parse) method.
	*
	* @param {Object} `state`
	* @param {Object} `options`
	* @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
	* @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
	* @return {RegExp}
	* @api public
	*/
	picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
		if (returnOutput === true) return state.output;
		const opts = options || {};
		let source = `${opts.contains ? "" : "^"}(?:${state.output})${opts.contains ? "" : "$"}`;
		if (state && state.negated === true) source = `^(?!${source}).*$`;
		const regex = picomatch.toRegex(source, options);
		if (returnState === true) regex.state = state;
		return regex;
	};
	/**
	* Create a regular expression from a parsed glob pattern.
	*
	* ```js
	* const picomatch = require('picomatch');
	* const state = picomatch.parse('*.js');
	* // picomatch.compileRe(state[, options]);
	*
	* console.log(picomatch.compileRe(state));
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {String} `state` The object returned from the `.parse` method.
	* @param {Object} `options`
	* @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
	* @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
	* @return {RegExp} Returns a regex created from the given pattern.
	* @api public
	*/
	picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
		if (!input || typeof input !== "string") throw new TypeError("Expected a non-empty string");
		let parsed = {
			negated: false,
			fastpaths: true
		};
		if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) parsed.output = parse.fastpaths(input, options);
		if (!parsed.output) parsed = parse(input, options);
		return picomatch.compileRe(parsed, options, returnOutput, returnState);
	};
	/**
	* Create a regular expression from the given regex source string.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.toRegex(source[, options]);
	*
	* const { output } = picomatch.parse('*.js');
	* console.log(picomatch.toRegex(output));
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {String} `source` Regular expression source string.
	* @param {Object} `options`
	* @return {RegExp}
	* @api public
	*/
	picomatch.toRegex = (source, options) => {
		try {
			const opts = options || {};
			return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
		} catch (err) {
			if (options && options.debug === true) throw err;
			return /$^/;
		}
	};
	/**
	* Picomatch constants.
	* @return {Object}
	*/
	picomatch.constants = constants;
	/**
	* Expose "picomatch"
	*/
	module.exports = picomatch;
}));
var require_picomatch = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = require_picomatch$1();
}));
var require_readdirp = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const fs$10 = __require$2("fs");
	const { Readable: Readable$1 } = __require$2("stream");
	const sysPath$3 = __require$2("path");
	const { promisify: promisify$4 } = __require$2("util");
	const picomatch = require_picomatch();
	const readdir = promisify$4(fs$10.readdir);
	const stat = promisify$4(fs$10.stat);
	const lstat = promisify$4(fs$10.lstat);
	const realpath = promisify$4(fs$10.realpath);
	/**
	* @typedef {Object} EntryInfo
	* @property {String} path
	* @property {String} fullPath
	* @property {fs.Stats=} stats
	* @property {fs.Dirent=} dirent
	* @property {String} basename
	*/
	const BANG = "!";
	const RECURSIVE_ERROR_CODE = "READDIRP_RECURSIVE_ERROR";
	const NORMAL_FLOW_ERRORS = /* @__PURE__ */ new Set([
		"ENOENT",
		"EPERM",
		"EACCES",
		"ELOOP",
		RECURSIVE_ERROR_CODE
	]);
	const FILE_TYPE = "files";
	const DIR_TYPE = "directories";
	const FILE_DIR_TYPE = "files_directories";
	const EVERYTHING_TYPE = "all";
	const ALL_TYPES = [
		FILE_TYPE,
		DIR_TYPE,
		FILE_DIR_TYPE,
		EVERYTHING_TYPE
	];
	const isNormalFlowError = (error) => NORMAL_FLOW_ERRORS.has(error.code);
	const [maj, min] = process.versions.node.split(".").slice(0, 2).map((n) => Number.parseInt(n, 10));
	const wantBigintFsStats = process.platform === "win32" && (maj > 10 || maj === 10 && min >= 5);
	const normalizeFilter = (filter) => {
		if (filter === void 0) return;
		if (typeof filter === "function") return filter;
		if (typeof filter === "string") {
			const glob = picomatch(filter.trim());
			return (entry) => glob(entry.basename);
		}
		if (Array.isArray(filter)) {
			const positive = [];
			const negative = [];
			for (const item of filter) {
				const trimmed = item.trim();
				if (trimmed.charAt(0) === BANG) negative.push(picomatch(trimmed.slice(1)));
				else positive.push(picomatch(trimmed));
			}
			if (negative.length > 0) {
				if (positive.length > 0) return (entry) => positive.some((f) => f(entry.basename)) && !negative.some((f) => f(entry.basename));
				return (entry) => !negative.some((f) => f(entry.basename));
			}
			return (entry) => positive.some((f) => f(entry.basename));
		}
	};
	var ReaddirpStream = class ReaddirpStream extends Readable$1 {
		static get defaultOptions() {
			return {
				root: ".",
				fileFilter: (path) => true,
				directoryFilter: (path) => true,
				type: FILE_TYPE,
				lstat: false,
				depth: 2147483648,
				alwaysStat: false
			};
		}
		constructor(options = {}) {
			super({
				objectMode: true,
				autoDestroy: true,
				highWaterMark: options.highWaterMark || 4096
			});
			const opts = {
				...ReaddirpStream.defaultOptions,
				...options
			};
			const { root, type } = opts;
			this._fileFilter = normalizeFilter(opts.fileFilter);
			this._directoryFilter = normalizeFilter(opts.directoryFilter);
			const statMethod = opts.lstat ? lstat : stat;
			if (wantBigintFsStats) this._stat = (path) => statMethod(path, { bigint: true });
			else this._stat = statMethod;
			this._maxDepth = opts.depth;
			this._wantsDir = [
				DIR_TYPE,
				FILE_DIR_TYPE,
				EVERYTHING_TYPE
			].includes(type);
			this._wantsFile = [
				FILE_TYPE,
				FILE_DIR_TYPE,
				EVERYTHING_TYPE
			].includes(type);
			this._wantsEverything = type === EVERYTHING_TYPE;
			this._root = sysPath$3.resolve(root);
			this._isDirent = "Dirent" in fs$10 && !opts.alwaysStat;
			this._statsProp = this._isDirent ? "dirent" : "stats";
			this._rdOptions = {
				encoding: "utf8",
				withFileTypes: this._isDirent
			};
			this.parents = [this._exploreDir(root, 1)];
			this.reading = false;
			this.parent = void 0;
		}
		async _read(batch) {
			if (this.reading) return;
			this.reading = true;
			try {
				while (!this.destroyed && batch > 0) {
					const { path, depth, files = [] } = this.parent || {};
					if (files.length > 0) {
						const slice = files.splice(0, batch).map((dirent) => this._formatEntry(dirent, path));
						for (const entry of await Promise.all(slice)) {
							if (this.destroyed) return;
							const entryType = await this._getEntryType(entry);
							if (entryType === "directory" && this._directoryFilter(entry)) {
								if (depth <= this._maxDepth) this.parents.push(this._exploreDir(entry.fullPath, depth + 1));
								if (this._wantsDir) {
									this.push(entry);
									batch--;
								}
							} else if ((entryType === "file" || this._includeAsFile(entry)) && this._fileFilter(entry)) {
								if (this._wantsFile) {
									this.push(entry);
									batch--;
								}
							}
						}
					} else {
						const parent = this.parents.pop();
						if (!parent) {
							this.push(null);
							break;
						}
						this.parent = await parent;
						if (this.destroyed) return;
					}
				}
			} catch (error) {
				this.destroy(error);
			} finally {
				this.reading = false;
			}
		}
		async _exploreDir(path, depth) {
			let files;
			try {
				files = await readdir(path, this._rdOptions);
			} catch (error) {
				this._onError(error);
			}
			return {
				files,
				depth,
				path
			};
		}
		async _formatEntry(dirent, path) {
			let entry;
			try {
				const basename = this._isDirent ? dirent.name : dirent;
				const fullPath = sysPath$3.resolve(sysPath$3.join(path, basename));
				entry = {
					path: sysPath$3.relative(this._root, fullPath),
					fullPath,
					basename
				};
				entry[this._statsProp] = this._isDirent ? dirent : await this._stat(fullPath);
			} catch (err) {
				this._onError(err);
			}
			return entry;
		}
		_onError(err) {
			if (isNormalFlowError(err) && !this.destroyed) this.emit("warn", err);
			else this.destroy(err);
		}
		async _getEntryType(entry) {
			const stats = entry && entry[this._statsProp];
			if (!stats) return;
			if (stats.isFile()) return "file";
			if (stats.isDirectory()) return "directory";
			if (stats && stats.isSymbolicLink()) {
				const full = entry.fullPath;
				try {
					const entryRealPath = await realpath(full);
					const entryRealPathStats = await lstat(entryRealPath);
					if (entryRealPathStats.isFile()) return "file";
					if (entryRealPathStats.isDirectory()) {
						const len = entryRealPath.length;
						if (full.startsWith(entryRealPath) && full.substr(len, 1) === sysPath$3.sep) {
							const recursiveError = /* @__PURE__ */ new Error(`Circular symlink detected: "${full}" points to "${entryRealPath}"`);
							recursiveError.code = RECURSIVE_ERROR_CODE;
							return this._onError(recursiveError);
						}
						return "directory";
					}
				} catch (error) {
					this._onError(error);
				}
			}
		}
		_includeAsFile(entry) {
			const stats = entry && entry[this._statsProp];
			return stats && this._wantsEverything && !stats.isDirectory();
		}
	};
	/**
	* @typedef {Object} ReaddirpArguments
	* @property {Function=} fileFilter
	* @property {Function=} directoryFilter
	* @property {String=} type
	* @property {Number=} depth
	* @property {String=} root
	* @property {Boolean=} lstat
	* @property {Boolean=} bigint
	*/
	/**
	* Main function which ends up calling readdirRec and reads all files and directories in given root recursively.
	* @param {String} root Root directory
	* @param {ReaddirpArguments=} options Options to specify root (start directory), filters and recursion depth
	*/
	const readdirp = (root, options = {}) => {
		let type = options.entryType || options.type;
		if (type === "both") type = FILE_DIR_TYPE;
		if (type) options.type = type;
		if (!root) throw new Error("readdirp: root argument is required. Usage: readdirp(root, options)");
		else if (typeof root !== "string") throw new TypeError("readdirp: root argument must be a string. Usage: readdirp(root, options)");
		else if (type && !ALL_TYPES.includes(type)) throw new Error(`readdirp: Invalid type passed. Use one of ${ALL_TYPES.join(", ")}`);
		options.root = root;
		return new ReaddirpStream(options);
	};
	const readdirpPromise = (root, options = {}) => {
		return new Promise((resolve, reject) => {
			const files = [];
			readdirp(root, options).on("data", (entry) => files.push(entry)).on("end", () => resolve(files)).on("error", (error) => reject(error));
		});
	};
	readdirp.promise = readdirpPromise;
	readdirp.ReaddirpStream = ReaddirpStream;
	readdirp.default = readdirp;
	module.exports = readdirp;
}));
var require_normalize_path = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/*!
	* normalize-path <https://github.com/jonschlinkert/normalize-path>
	*
	* Copyright (c) 2014-2018, Jon Schlinkert.
	* Released under the MIT License.
	*/
	module.exports = function(path, stripTrailing) {
		if (typeof path !== "string") throw new TypeError("expected path to be a string");
		if (path === "\\" || path === "/") return "/";
		var len = path.length;
		if (len <= 1) return path;
		var prefix = "";
		if (len > 4 && path[3] === "\\") {
			var ch = path[2];
			if ((ch === "?" || ch === ".") && path.slice(0, 2) === "\\\\") {
				path = path.slice(2);
				prefix = "//";
			}
		}
		var segs = path.split(/[/\\]+/);
		if (stripTrailing !== false && segs[segs.length - 1] === "") segs.pop();
		return prefix + segs.join("/");
	};
}));
var require_anymatch = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	const picomatch = require_picomatch();
	const normalizePath = require_normalize_path();
	/**
	* @typedef {(testString: string) => boolean} AnymatchFn
	* @typedef {string|RegExp|AnymatchFn} AnymatchPattern
	* @typedef {AnymatchPattern|AnymatchPattern[]} AnymatchMatcher
	*/
	const BANG = "!";
	const DEFAULT_OPTIONS = { returnIndex: false };
	const arrify = (item) => Array.isArray(item) ? item : [item];
	/**
	* @param {AnymatchPattern} matcher
	* @param {object} options
	* @returns {AnymatchFn}
	*/
	const createPattern = (matcher, options) => {
		if (typeof matcher === "function") return matcher;
		if (typeof matcher === "string") {
			const glob = picomatch(matcher, options);
			return (string) => matcher === string || glob(string);
		}
		if (matcher instanceof RegExp) return (string) => matcher.test(string);
		return (string) => false;
	};
	/**
	* @param {Array<Function>} patterns
	* @param {Array<Function>} negPatterns
	* @param {String|Array} args
	* @param {Boolean} returnIndex
	* @returns {boolean|number}
	*/
	const matchPatterns = (patterns, negPatterns, args, returnIndex) => {
		const isList = Array.isArray(args);
		const _path = isList ? args[0] : args;
		if (!isList && typeof _path !== "string") throw new TypeError("anymatch: second argument must be a string: got " + Object.prototype.toString.call(_path));
		const path = normalizePath(_path, false);
		for (let index = 0; index < negPatterns.length; index++) {
			const nglob = negPatterns[index];
			if (nglob(path)) return returnIndex ? -1 : false;
		}
		const applied = isList && [path].concat(args.slice(1));
		for (let index = 0; index < patterns.length; index++) {
			const pattern = patterns[index];
			if (isList ? pattern(...applied) : pattern(path)) return returnIndex ? index : true;
		}
		return returnIndex ? -1 : false;
	};
	/**
	* @param {AnymatchMatcher} matchers
	* @param {Array|string} testString
	* @param {object} options
	* @returns {boolean|number|Function}
	*/
	const anymatch = (matchers, testString, options = DEFAULT_OPTIONS) => {
		if (matchers == null) throw new TypeError("anymatch: specify first argument");
		const opts = typeof options === "boolean" ? { returnIndex: options } : options;
		const returnIndex = opts.returnIndex || false;
		const mtchers = arrify(matchers);
		const negatedGlobs = mtchers.filter((item) => typeof item === "string" && item.charAt(0) === BANG).map((item) => item.slice(1)).map((item) => picomatch(item, opts));
		const patterns = mtchers.filter((item) => typeof item !== "string" || typeof item === "string" && item.charAt(0) !== BANG).map((matcher) => createPattern(matcher, opts));
		if (testString == null) return (testString, ri = false) => {
			return matchPatterns(patterns, negatedGlobs, testString, typeof ri === "boolean" ? ri : false);
		};
		return matchPatterns(patterns, negatedGlobs, testString, returnIndex);
	};
	anymatch.default = anymatch;
	module.exports = anymatch;
}));
var require_is_extglob = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/*!
	* is-extglob <https://github.com/jonschlinkert/is-extglob>
	*
	* Copyright (c) 2014-2016, Jon Schlinkert.
	* Licensed under the MIT License.
	*/
	module.exports = function isExtglob(str) {
		if (typeof str !== "string" || str === "") return false;
		var match;
		while (match = /(\\).|([@?!+*]\(.*\))/g.exec(str)) {
			if (match[2]) return true;
			str = str.slice(match.index + match[0].length);
		}
		return false;
	};
}));
var require_is_glob = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/*!
	* is-glob <https://github.com/jonschlinkert/is-glob>
	*
	* Copyright (c) 2014-2017, Jon Schlinkert.
	* Released under the MIT License.
	*/
	var isExtglob = require_is_extglob();
	var chars = {
		"{": "}",
		"(": ")",
		"[": "]"
	};
	var strictCheck = function(str) {
		if (str[0] === "!") return true;
		var index = 0;
		var pipeIndex = -2;
		var closeSquareIndex = -2;
		var closeCurlyIndex = -2;
		var closeParenIndex = -2;
		var backSlashIndex = -2;
		while (index < str.length) {
			if (str[index] === "*") return true;
			if (str[index + 1] === "?" && /[\].+)]/.test(str[index])) return true;
			if (closeSquareIndex !== -1 && str[index] === "[" && str[index + 1] !== "]") {
				if (closeSquareIndex < index) closeSquareIndex = str.indexOf("]", index);
				if (closeSquareIndex > index) {
					if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) return true;
					backSlashIndex = str.indexOf("\\", index);
					if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) return true;
				}
			}
			if (closeCurlyIndex !== -1 && str[index] === "{" && str[index + 1] !== "}") {
				closeCurlyIndex = str.indexOf("}", index);
				if (closeCurlyIndex > index) {
					backSlashIndex = str.indexOf("\\", index);
					if (backSlashIndex === -1 || backSlashIndex > closeCurlyIndex) return true;
				}
			}
			if (closeParenIndex !== -1 && str[index] === "(" && str[index + 1] === "?" && /[:!=]/.test(str[index + 2]) && str[index + 3] !== ")") {
				closeParenIndex = str.indexOf(")", index);
				if (closeParenIndex > index) {
					backSlashIndex = str.indexOf("\\", index);
					if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) return true;
				}
			}
			if (pipeIndex !== -1 && str[index] === "(" && str[index + 1] !== "|") {
				if (pipeIndex < index) pipeIndex = str.indexOf("|", index);
				if (pipeIndex !== -1 && str[pipeIndex + 1] !== ")") {
					closeParenIndex = str.indexOf(")", pipeIndex);
					if (closeParenIndex > pipeIndex) {
						backSlashIndex = str.indexOf("\\", pipeIndex);
						if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) return true;
					}
				}
			}
			if (str[index] === "\\") {
				var open = str[index + 1];
				index += 2;
				var close = chars[open];
				if (close) {
					var n = str.indexOf(close, index);
					if (n !== -1) index = n + 1;
				}
				if (str[index] === "!") return true;
			} else index++;
		}
		return false;
	};
	var relaxedCheck = function(str) {
		if (str[0] === "!") return true;
		var index = 0;
		while (index < str.length) {
			if (/[*?{}()[\]]/.test(str[index])) return true;
			if (str[index] === "\\") {
				var open = str[index + 1];
				index += 2;
				var close = chars[open];
				if (close) {
					var n = str.indexOf(close, index);
					if (n !== -1) index = n + 1;
				}
				if (str[index] === "!") return true;
			} else index++;
		}
		return false;
	};
	module.exports = function isGlob(str, options) {
		if (typeof str !== "string" || str === "") return false;
		if (isExtglob(str)) return true;
		var check = strictCheck;
		if (options && options.strict === false) check = relaxedCheck;
		return check(str);
	};
}));
var require_glob_parent = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	var isGlob = require_is_glob();
	var pathPosixDirname = __require$2("path").posix.dirname;
	var isWin32 = __require$2("os").platform() === "win32";
	var slash = "/";
	var backslash = /\\/g;
	var enclosure = /[\{\[].*[\}\]]$/;
	var globby = /(^|[^\\])([\{\[]|\([^\)]+$)/;
	var escaped = /\\([\!\*\?\|\[\]\(\)\{\}])/g;
	/**
	* @param {string} str
	* @param {Object} opts
	* @param {boolean} [opts.flipBackslashes=true]
	* @returns {string}
	*/
	module.exports = function globParent(str, opts) {
		if (Object.assign({ flipBackslashes: true }, opts).flipBackslashes && isWin32 && str.indexOf(slash) < 0) str = str.replace(backslash, slash);
		if (enclosure.test(str)) str += slash;
		str += "a";
		do
			str = pathPosixDirname(str);
		while (isGlob(str) || globby.test(str));
		return str.replace(escaped, "$1");
	};
}));
var require_utils = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	exports.isInteger = (num) => {
		if (typeof num === "number") return Number.isInteger(num);
		if (typeof num === "string" && num.trim() !== "") return Number.isInteger(Number(num));
		return false;
	};
	/**
	* Find a node of the given type
	*/
	exports.find = (node, type) => node.nodes.find((node) => node.type === type);
	/**
	* Find a node of the given type
	*/
	exports.exceedsLimit = (min, max, step = 1, limit) => {
		if (limit === false) return false;
		if (!exports.isInteger(min) || !exports.isInteger(max)) return false;
		return (Number(max) - Number(min)) / Number(step) >= limit;
	};
	/**
	* Escape the given node with '\\' before node.value
	*/
	exports.escapeNode = (block, n = 0, type) => {
		const node = block.nodes[n];
		if (!node) return;
		if (type && node.type === type || node.type === "open" || node.type === "close") {
			if (node.escaped !== true) {
				node.value = "\\" + node.value;
				node.escaped = true;
			}
		}
	};
	/**
	* Returns true if the given brace node should be enclosed in literal braces
	*/
	exports.encloseBrace = (node) => {
		if (node.type !== "brace") return false;
		if (node.commas >> 0 + node.ranges >> 0 === 0) {
			node.invalid = true;
			return true;
		}
		return false;
	};
	/**
	* Returns true if a brace node is invalid.
	*/
	exports.isInvalidBrace = (block) => {
		if (block.type !== "brace") return false;
		if (block.invalid === true || block.dollar) return true;
		if (block.commas >> 0 + block.ranges >> 0 === 0) {
			block.invalid = true;
			return true;
		}
		if (block.open !== true || block.close !== true) {
			block.invalid = true;
			return true;
		}
		return false;
	};
	/**
	* Returns true if a node is an open or close node
	*/
	exports.isOpenOrClose = (node) => {
		if (node.type === "open" || node.type === "close") return true;
		return node.open === true || node.close === true;
	};
	/**
	* Reduce an array of text nodes.
	*/
	exports.reduce = (nodes) => nodes.reduce((acc, node) => {
		if (node.type === "text") acc.push(node.value);
		if (node.type === "range") node.type = "text";
		return acc;
	}, []);
	/**
	* Flatten an array
	*/
	exports.flatten = (...args) => {
		const result = [];
		const flat = (arr) => {
			for (let i = 0; i < arr.length; i++) {
				const ele = arr[i];
				if (Array.isArray(ele)) {
					flat(ele);
					continue;
				}
				if (ele !== void 0) result.push(ele);
			}
			return result;
		};
		flat(args);
		return result;
	};
}));
var require_stringify = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const utils = require_utils();
	module.exports = (ast, options = {}) => {
		const stringify = (node, parent = {}) => {
			const invalidBlock = options.escapeInvalid && utils.isInvalidBrace(parent);
			const invalidNode = node.invalid === true && options.escapeInvalid === true;
			let output = "";
			if (node.value) {
				if ((invalidBlock || invalidNode) && utils.isOpenOrClose(node)) return "\\" + node.value;
				return node.value;
			}
			if (node.value) return node.value;
			if (node.nodes) for (const child of node.nodes) output += stringify(child);
			return output;
		};
		return stringify(ast);
	};
}));
/*!
* is-number <https://github.com/jonschlinkert/is-number>
*
* Copyright (c) 2014-present, Jon Schlinkert.
* Released under the MIT License.
*/
var require_is_number = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = function(num) {
		if (typeof num === "number") return num - num === 0;
		if (typeof num === "string" && num.trim() !== "") return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
		return false;
	};
}));
/*!
* to-regex-range <https://github.com/micromatch/to-regex-range>
*
* Copyright (c) 2015-present, Jon Schlinkert.
* Released under the MIT License.
*/
var require_to_regex_range = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const isNumber = require_is_number();
	const toRegexRange = (min, max, options) => {
		if (isNumber(min) === false) throw new TypeError("toRegexRange: expected the first argument to be a number");
		if (max === void 0 || min === max) return String(min);
		if (isNumber(max) === false) throw new TypeError("toRegexRange: expected the second argument to be a number.");
		let opts = {
			relaxZeros: true,
			...options
		};
		if (typeof opts.strictZeros === "boolean") opts.relaxZeros = opts.strictZeros === false;
		let relax = String(opts.relaxZeros);
		let shorthand = String(opts.shorthand);
		let capture = String(opts.capture);
		let wrap = String(opts.wrap);
		let cacheKey = min + ":" + max + "=" + relax + shorthand + capture + wrap;
		if (toRegexRange.cache.hasOwnProperty(cacheKey)) return toRegexRange.cache[cacheKey].result;
		let a = Math.min(min, max);
		let b = Math.max(min, max);
		if (Math.abs(a - b) === 1) {
			let result = min + "|" + max;
			if (opts.capture) return `(${result})`;
			if (opts.wrap === false) return result;
			return `(?:${result})`;
		}
		let isPadded = hasPadding(min) || hasPadding(max);
		let state = {
			min,
			max,
			a,
			b
		};
		let positives = [];
		let negatives = [];
		if (isPadded) {
			state.isPadded = isPadded;
			state.maxLen = String(state.max).length;
		}
		if (a < 0) {
			negatives = splitToPatterns(b < 0 ? Math.abs(b) : 1, Math.abs(a), state, opts);
			a = state.a = 0;
		}
		if (b >= 0) positives = splitToPatterns(a, b, state, opts);
		state.negatives = negatives;
		state.positives = positives;
		state.result = collatePatterns(negatives, positives, opts);
		if (opts.capture === true) state.result = `(${state.result})`;
		else if (opts.wrap !== false && positives.length + negatives.length > 1) state.result = `(?:${state.result})`;
		toRegexRange.cache[cacheKey] = state;
		return state.result;
	};
	function collatePatterns(neg, pos, options) {
		let onlyNegative = filterPatterns(neg, pos, "-", false, options) || [];
		let onlyPositive = filterPatterns(pos, neg, "", false, options) || [];
		let intersected = filterPatterns(neg, pos, "-?", true, options) || [];
		return onlyNegative.concat(intersected).concat(onlyPositive).join("|");
	}
	function splitToRanges(min, max) {
		let nines = 1;
		let zeros = 1;
		let stop = countNines(min, nines);
		let stops = /* @__PURE__ */ new Set([max]);
		while (min <= stop && stop <= max) {
			stops.add(stop);
			nines += 1;
			stop = countNines(min, nines);
		}
		stop = countZeros(max + 1, zeros) - 1;
		while (min < stop && stop <= max) {
			stops.add(stop);
			zeros += 1;
			stop = countZeros(max + 1, zeros) - 1;
		}
		stops = [...stops];
		stops.sort(compare);
		return stops;
	}
	/**
	* Convert a range to a regex pattern
	* @param {Number} `start`
	* @param {Number} `stop`
	* @return {String}
	*/
	function rangeToPattern(start, stop, options) {
		if (start === stop) return {
			pattern: start,
			count: [],
			digits: 0
		};
		let zipped = zip(start, stop);
		let digits = zipped.length;
		let pattern = "";
		let count = 0;
		for (let i = 0; i < digits; i++) {
			let [startDigit, stopDigit] = zipped[i];
			if (startDigit === stopDigit) pattern += startDigit;
			else if (startDigit !== "0" || stopDigit !== "9") pattern += toCharacterClass(startDigit, stopDigit, options);
			else count++;
		}
		if (count) pattern += options.shorthand === true ? "\\d" : "[0-9]";
		return {
			pattern,
			count: [count],
			digits
		};
	}
	function splitToPatterns(min, max, tok, options) {
		let ranges = splitToRanges(min, max);
		let tokens = [];
		let start = min;
		let prev;
		for (let i = 0; i < ranges.length; i++) {
			let max = ranges[i];
			let obj = rangeToPattern(String(start), String(max), options);
			let zeros = "";
			if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
				if (prev.count.length > 1) prev.count.pop();
				prev.count.push(obj.count[0]);
				prev.string = prev.pattern + toQuantifier(prev.count);
				start = max + 1;
				continue;
			}
			if (tok.isPadded) zeros = padZeros(max, tok, options);
			obj.string = zeros + obj.pattern + toQuantifier(obj.count);
			tokens.push(obj);
			start = max + 1;
			prev = obj;
		}
		return tokens;
	}
	function filterPatterns(arr, comparison, prefix, intersection, options) {
		let result = [];
		for (let ele of arr) {
			let { string } = ele;
			if (!intersection && !contains(comparison, "string", string)) result.push(prefix + string);
			if (intersection && contains(comparison, "string", string)) result.push(prefix + string);
		}
		return result;
	}
	/**
	* Zip strings
	*/
	function zip(a, b) {
		let arr = [];
		for (let i = 0; i < a.length; i++) arr.push([a[i], b[i]]);
		return arr;
	}
	function compare(a, b) {
		return a > b ? 1 : b > a ? -1 : 0;
	}
	function contains(arr, key, val) {
		return arr.some((ele) => ele[key] === val);
	}
	function countNines(min, len) {
		return Number(String(min).slice(0, -len) + "9".repeat(len));
	}
	function countZeros(integer, zeros) {
		return integer - integer % Math.pow(10, zeros);
	}
	function toQuantifier(digits) {
		let [start = 0, stop = ""] = digits;
		if (stop || start > 1) return `{${start + (stop ? "," + stop : "")}}`;
		return "";
	}
	function toCharacterClass(a, b, options) {
		return `[${a}${b - a === 1 ? "" : "-"}${b}]`;
	}
	function hasPadding(str) {
		return /^-?(0+)\d/.test(str);
	}
	function padZeros(value, tok, options) {
		if (!tok.isPadded) return value;
		let diff = Math.abs(tok.maxLen - String(value).length);
		let relax = options.relaxZeros !== false;
		switch (diff) {
			case 0: return "";
			case 1: return relax ? "0?" : "0";
			case 2: return relax ? "0{0,2}" : "00";
			default: return relax ? `0{0,${diff}}` : `0{${diff}}`;
		}
	}
	/**
	* Cache
	*/
	toRegexRange.cache = {};
	toRegexRange.clearCache = () => toRegexRange.cache = {};
	/**
	* Expose `toRegexRange`
	*/
	module.exports = toRegexRange;
}));
/*!
* fill-range <https://github.com/jonschlinkert/fill-range>
*
* Copyright (c) 2014-present, Jon Schlinkert.
* Licensed under the MIT License.
*/
var require_fill_range = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const util$1 = __require$2("util");
	const toRegexRange = require_to_regex_range();
	const isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
	const transform = (toNumber) => {
		return (value) => toNumber === true ? Number(value) : String(value);
	};
	const isValidValue = (value) => {
		return typeof value === "number" || typeof value === "string" && value !== "";
	};
	const isNumber = (num) => Number.isInteger(+num);
	const zeros = (input) => {
		let value = `${input}`;
		let index = -1;
		if (value[0] === "-") value = value.slice(1);
		if (value === "0") return false;
		while (value[++index] === "0");
		return index > 0;
	};
	const stringify = (start, end, options) => {
		if (typeof start === "string" || typeof end === "string") return true;
		return options.stringify === true;
	};
	const pad = (input, maxLength, toNumber) => {
		if (maxLength > 0) {
			let dash = input[0] === "-" ? "-" : "";
			if (dash) input = input.slice(1);
			input = dash + input.padStart(dash ? maxLength - 1 : maxLength, "0");
		}
		if (toNumber === false) return String(input);
		return input;
	};
	const toMaxLen = (input, maxLength) => {
		let negative = input[0] === "-" ? "-" : "";
		if (negative) {
			input = input.slice(1);
			maxLength--;
		}
		while (input.length < maxLength) input = "0" + input;
		return negative ? "-" + input : input;
	};
	const toSequence = (parts, options, maxLen) => {
		parts.negatives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
		parts.positives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
		let prefix = options.capture ? "" : "?:";
		let positives = "";
		let negatives = "";
		let result;
		if (parts.positives.length) positives = parts.positives.map((v) => toMaxLen(String(v), maxLen)).join("|");
		if (parts.negatives.length) negatives = `-(${prefix}${parts.negatives.map((v) => toMaxLen(String(v), maxLen)).join("|")})`;
		if (positives && negatives) result = `${positives}|${negatives}`;
		else result = positives || negatives;
		if (options.wrap) return `(${prefix}${result})`;
		return result;
	};
	const toRange = (a, b, isNumbers, options) => {
		if (isNumbers) return toRegexRange(a, b, {
			wrap: false,
			...options
		});
		let start = String.fromCharCode(a);
		if (a === b) return start;
		return `[${start}-${String.fromCharCode(b)}]`;
	};
	const toRegex = (start, end, options) => {
		if (Array.isArray(start)) return options.wrap === true ? `(${options.capture ? "" : "?:"}${start.join("|")})` : start.join("|");
		return toRegexRange(start, end, options);
	};
	const rangeError = (...args) => {
		return /* @__PURE__ */ new RangeError("Invalid range arguments: " + util$1.inspect(...args));
	};
	const invalidRange = (start, end, options) => {
		if (options.strictRanges === true) throw rangeError([start, end]);
		return [];
	};
	const invalidStep = (step, options) => {
		if (options.strictRanges === true) throw new TypeError(`Expected step "${step}" to be a number`);
		return [];
	};
	const fillNumbers = (start, end, step = 1, options = {}) => {
		let a = Number(start);
		let b = Number(end);
		if (!Number.isInteger(a) || !Number.isInteger(b)) {
			if (options.strictRanges === true) throw rangeError([start, end]);
			return [];
		}
		if (a === 0) a = 0;
		if (b === 0) b = 0;
		let descending = a > b;
		let startString = String(start);
		let endString = String(end);
		let stepString = String(step);
		step = Math.max(Math.abs(step), 1);
		let padded = zeros(startString) || zeros(endString) || zeros(stepString);
		let maxLen = padded ? Math.max(startString.length, endString.length, stepString.length) : 0;
		let toNumber = padded === false && stringify(start, end, options) === false;
		let format = options.transform || transform(toNumber);
		if (options.toRegex && step === 1) return toRange(toMaxLen(start, maxLen), toMaxLen(end, maxLen), true, options);
		let parts = {
			negatives: [],
			positives: []
		};
		let push = (num) => parts[num < 0 ? "negatives" : "positives"].push(Math.abs(num));
		let range = [];
		let index = 0;
		while (descending ? a >= b : a <= b) {
			if (options.toRegex === true && step > 1) push(a);
			else range.push(pad(format(a, index), maxLen, toNumber));
			a = descending ? a - step : a + step;
			index++;
		}
		if (options.toRegex === true) return step > 1 ? toSequence(parts, options, maxLen) : toRegex(range, null, {
			wrap: false,
			...options
		});
		return range;
	};
	const fillLetters = (start, end, step = 1, options = {}) => {
		if (!isNumber(start) && start.length > 1 || !isNumber(end) && end.length > 1) return invalidRange(start, end, options);
		let format = options.transform || ((val) => String.fromCharCode(val));
		let a = `${start}`.charCodeAt(0);
		let b = `${end}`.charCodeAt(0);
		let descending = a > b;
		let min = Math.min(a, b);
		let max = Math.max(a, b);
		if (options.toRegex && step === 1) return toRange(min, max, false, options);
		let range = [];
		let index = 0;
		while (descending ? a >= b : a <= b) {
			range.push(format(a, index));
			a = descending ? a - step : a + step;
			index++;
		}
		if (options.toRegex === true) return toRegex(range, null, {
			wrap: false,
			options
		});
		return range;
	};
	const fill = (start, end, step, options = {}) => {
		if (end == null && isValidValue(start)) return [start];
		if (!isValidValue(start) || !isValidValue(end)) return invalidRange(start, end, options);
		if (typeof step === "function") return fill(start, end, 1, { transform: step });
		if (isObject(step)) return fill(start, end, 0, step);
		let opts = { ...options };
		if (opts.capture === true) opts.wrap = true;
		step = step || opts.step || 1;
		if (!isNumber(step)) {
			if (step != null && !isObject(step)) return invalidStep(step, opts);
			return fill(start, end, 1, step);
		}
		if (isNumber(start) && isNumber(end)) return fillNumbers(start, end, step, opts);
		return fillLetters(start, end, Math.max(Math.abs(step), 1), opts);
	};
	module.exports = fill;
}));
var require_compile = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const fill = require_fill_range();
	const utils = require_utils();
	const compile = (ast, options = {}) => {
		const walk = (node, parent = {}) => {
			const invalid = utils.isInvalidBrace(parent) === true || (node.invalid === true && options.escapeInvalid === true) === true;
			const prefix = options.escapeInvalid === true ? "\\" : "";
			let output = "";
			if (node.isOpen === true) return prefix + node.value;
			if (node.isClose === true) {
				console.log("node.isClose", prefix, node.value);
				return prefix + node.value;
			}
			if (node.type === "open") return invalid ? prefix + node.value : "(";
			if (node.type === "close") return invalid ? prefix + node.value : ")";
			if (node.type === "comma") return node.prev.type === "comma" ? "" : invalid ? node.value : "|";
			if (node.value) return node.value;
			if (node.nodes && node.ranges > 0) {
				const args = utils.reduce(node.nodes);
				const range = fill(...args, {
					...options,
					wrap: false,
					toRegex: true,
					strictZeros: true
				});
				if (range.length !== 0) return args.length > 1 && range.length > 1 ? `(${range})` : range;
			}
			if (node.nodes) for (const child of node.nodes) output += walk(child, node);
			return output;
		};
		return walk(ast);
	};
	module.exports = compile;
}));
var require_expand = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const fill = require_fill_range();
	const stringify = require_stringify();
	const utils = require_utils();
	const append = (queue = "", stash = "", enclose = false) => {
		const result = [];
		queue = [].concat(queue);
		stash = [].concat(stash);
		if (!stash.length) return queue;
		if (!queue.length) return enclose ? utils.flatten(stash).map((ele) => `{${ele}}`) : stash;
		for (const item of queue) if (Array.isArray(item)) for (const value of item) result.push(append(value, stash, enclose));
		else for (let ele of stash) {
			if (enclose === true && typeof ele === "string") ele = `{${ele}}`;
			result.push(Array.isArray(ele) ? append(item, ele, enclose) : item + ele);
		}
		return utils.flatten(result);
	};
	const expand = (ast, options = {}) => {
		const rangeLimit = options.rangeLimit === void 0 ? 1e3 : options.rangeLimit;
		const walk = (node, parent = {}) => {
			node.queue = [];
			let p = parent;
			let q = parent.queue;
			while (p.type !== "brace" && p.type !== "root" && p.parent) {
				p = p.parent;
				q = p.queue;
			}
			if (node.invalid || node.dollar) {
				q.push(append(q.pop(), stringify(node, options)));
				return;
			}
			if (node.type === "brace" && node.invalid !== true && node.nodes.length === 2) {
				q.push(append(q.pop(), ["{}"]));
				return;
			}
			if (node.nodes && node.ranges > 0) {
				const args = utils.reduce(node.nodes);
				if (utils.exceedsLimit(...args, options.step, rangeLimit)) throw new RangeError("expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.");
				let range = fill(...args, options);
				if (range.length === 0) range = stringify(node, options);
				q.push(append(q.pop(), range));
				node.nodes = [];
				return;
			}
			const enclose = utils.encloseBrace(node);
			let queue = node.queue;
			let block = node;
			while (block.type !== "brace" && block.type !== "root" && block.parent) {
				block = block.parent;
				queue = block.queue;
			}
			for (let i = 0; i < node.nodes.length; i++) {
				const child = node.nodes[i];
				if (child.type === "comma" && node.type === "brace") {
					if (i === 1) queue.push("");
					queue.push("");
					continue;
				}
				if (child.type === "close") {
					q.push(append(q.pop(), queue, enclose));
					continue;
				}
				if (child.value && child.type !== "open") {
					queue.push(append(queue.pop(), child.value));
					continue;
				}
				if (child.nodes) walk(child, node);
			}
			return queue;
		};
		return utils.flatten(walk(ast));
	};
	module.exports = expand;
}));
var require_constants$2 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = {
		MAX_LENGTH: 1e4,
		CHAR_0: "0",
		CHAR_9: "9",
		CHAR_UPPERCASE_A: "A",
		CHAR_LOWERCASE_A: "a",
		CHAR_UPPERCASE_Z: "Z",
		CHAR_LOWERCASE_Z: "z",
		CHAR_LEFT_PARENTHESES: "(",
		CHAR_RIGHT_PARENTHESES: ")",
		CHAR_ASTERISK: "*",
		CHAR_AMPERSAND: "&",
		CHAR_AT: "@",
		CHAR_BACKSLASH: "\\",
		CHAR_BACKTICK: "`",
		CHAR_CARRIAGE_RETURN: "\r",
		CHAR_CIRCUMFLEX_ACCENT: "^",
		CHAR_COLON: ":",
		CHAR_COMMA: ",",
		CHAR_DOLLAR: "$",
		CHAR_DOT: ".",
		CHAR_DOUBLE_QUOTE: "\"",
		CHAR_EQUAL: "=",
		CHAR_EXCLAMATION_MARK: "!",
		CHAR_FORM_FEED: "\f",
		CHAR_FORWARD_SLASH: "/",
		CHAR_HASH: "#",
		CHAR_HYPHEN_MINUS: "-",
		CHAR_LEFT_ANGLE_BRACKET: "<",
		CHAR_LEFT_CURLY_BRACE: "{",
		CHAR_LEFT_SQUARE_BRACKET: "[",
		CHAR_LINE_FEED: "\n",
		CHAR_NO_BREAK_SPACE: "\xA0",
		CHAR_PERCENT: "%",
		CHAR_PLUS: "+",
		CHAR_QUESTION_MARK: "?",
		CHAR_RIGHT_ANGLE_BRACKET: ">",
		CHAR_RIGHT_CURLY_BRACE: "}",
		CHAR_RIGHT_SQUARE_BRACKET: "]",
		CHAR_SEMICOLON: ";",
		CHAR_SINGLE_QUOTE: "'",
		CHAR_SPACE: " ",
		CHAR_TAB: "	",
		CHAR_UNDERSCORE: "_",
		CHAR_VERTICAL_LINE: "|",
		CHAR_ZERO_WIDTH_NOBREAK_SPACE: "﻿"
	};
}));
var require_parse$2 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const stringify = require_stringify();
	/**
	* Constants
	*/
	const { MAX_LENGTH, CHAR_BACKSLASH, CHAR_BACKTICK, CHAR_COMMA, CHAR_DOT, CHAR_LEFT_PARENTHESES, CHAR_RIGHT_PARENTHESES, CHAR_LEFT_CURLY_BRACE, CHAR_RIGHT_CURLY_BRACE, CHAR_LEFT_SQUARE_BRACKET, CHAR_RIGHT_SQUARE_BRACKET, CHAR_DOUBLE_QUOTE, CHAR_SINGLE_QUOTE, CHAR_NO_BREAK_SPACE, CHAR_ZERO_WIDTH_NOBREAK_SPACE } = require_constants$2();
	/**
	* parse
	*/
	const parse = (input, options = {}) => {
		if (typeof input !== "string") throw new TypeError("Expected a string");
		const opts = options || {};
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		if (input.length > max) throw new SyntaxError(`Input length (${input.length}), exceeds max characters (${max})`);
		const ast = {
			type: "root",
			input,
			nodes: []
		};
		const stack = [ast];
		let block = ast;
		let prev = ast;
		let brackets = 0;
		const length = input.length;
		let index = 0;
		let depth = 0;
		let value;
		/**
		* Helpers
		*/
		const advance = () => input[index++];
		const push = (node) => {
			if (node.type === "text" && prev.type === "dot") prev.type = "text";
			if (prev && prev.type === "text" && node.type === "text") {
				prev.value += node.value;
				return;
			}
			block.nodes.push(node);
			node.parent = block;
			node.prev = prev;
			prev = node;
			return node;
		};
		push({ type: "bos" });
		while (index < length) {
			block = stack[stack.length - 1];
			value = advance();
			/**
			* Invalid chars
			*/
			if (value === CHAR_ZERO_WIDTH_NOBREAK_SPACE || value === CHAR_NO_BREAK_SPACE) continue;
			/**
			* Escaped chars
			*/
			if (value === CHAR_BACKSLASH) {
				push({
					type: "text",
					value: (options.keepEscaping ? value : "") + advance()
				});
				continue;
			}
			/**
			* Right square bracket (literal): ']'
			*/
			if (value === CHAR_RIGHT_SQUARE_BRACKET) {
				push({
					type: "text",
					value: "\\" + value
				});
				continue;
			}
			/**
			* Left square bracket: '['
			*/
			if (value === CHAR_LEFT_SQUARE_BRACKET) {
				brackets++;
				let next;
				while (index < length && (next = advance())) {
					value += next;
					if (next === CHAR_LEFT_SQUARE_BRACKET) {
						brackets++;
						continue;
					}
					if (next === CHAR_BACKSLASH) {
						value += advance();
						continue;
					}
					if (next === CHAR_RIGHT_SQUARE_BRACKET) {
						brackets--;
						if (brackets === 0) break;
					}
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Parentheses
			*/
			if (value === CHAR_LEFT_PARENTHESES) {
				block = push({
					type: "paren",
					nodes: []
				});
				stack.push(block);
				push({
					type: "text",
					value
				});
				continue;
			}
			if (value === CHAR_RIGHT_PARENTHESES) {
				if (block.type !== "paren") {
					push({
						type: "text",
						value
					});
					continue;
				}
				block = stack.pop();
				push({
					type: "text",
					value
				});
				block = stack[stack.length - 1];
				continue;
			}
			/**
			* Quotes: '|"|`
			*/
			if (value === CHAR_DOUBLE_QUOTE || value === CHAR_SINGLE_QUOTE || value === CHAR_BACKTICK) {
				const open = value;
				let next;
				if (options.keepQuotes !== true) value = "";
				while (index < length && (next = advance())) {
					if (next === CHAR_BACKSLASH) {
						value += next + advance();
						continue;
					}
					if (next === open) {
						if (options.keepQuotes === true) value += next;
						break;
					}
					value += next;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Left curly brace: '{'
			*/
			if (value === CHAR_LEFT_CURLY_BRACE) {
				depth++;
				block = push({
					type: "brace",
					open: true,
					close: false,
					dollar: prev.value && prev.value.slice(-1) === "$" || block.dollar === true,
					depth,
					commas: 0,
					ranges: 0,
					nodes: []
				});
				stack.push(block);
				push({
					type: "open",
					value
				});
				continue;
			}
			/**
			* Right curly brace: '}'
			*/
			if (value === CHAR_RIGHT_CURLY_BRACE) {
				if (block.type !== "brace") {
					push({
						type: "text",
						value
					});
					continue;
				}
				const type = "close";
				block = stack.pop();
				block.close = true;
				push({
					type,
					value
				});
				depth--;
				block = stack[stack.length - 1];
				continue;
			}
			/**
			* Comma: ','
			*/
			if (value === CHAR_COMMA && depth > 0) {
				if (block.ranges > 0) {
					block.ranges = 0;
					const open = block.nodes.shift();
					block.nodes = [open, {
						type: "text",
						value: stringify(block)
					}];
				}
				push({
					type: "comma",
					value
				});
				block.commas++;
				continue;
			}
			/**
			* Dot: '.'
			*/
			if (value === CHAR_DOT && depth > 0 && block.commas === 0) {
				const siblings = block.nodes;
				if (depth === 0 || siblings.length === 0) {
					push({
						type: "text",
						value
					});
					continue;
				}
				if (prev.type === "dot") {
					block.range = [];
					prev.value += value;
					prev.type = "range";
					if (block.nodes.length !== 3 && block.nodes.length !== 5) {
						block.invalid = true;
						block.ranges = 0;
						prev.type = "text";
						continue;
					}
					block.ranges++;
					block.args = [];
					continue;
				}
				if (prev.type === "range") {
					siblings.pop();
					const before = siblings[siblings.length - 1];
					before.value += prev.value + value;
					prev = before;
					block.ranges--;
					continue;
				}
				push({
					type: "dot",
					value
				});
				continue;
			}
			/**
			* Text
			*/
			push({
				type: "text",
				value
			});
		}
		do {
			block = stack.pop();
			if (block.type !== "root") {
				block.nodes.forEach((node) => {
					if (!node.nodes) {
						if (node.type === "open") node.isOpen = true;
						if (node.type === "close") node.isClose = true;
						if (!node.nodes) node.type = "text";
						node.invalid = true;
					}
				});
				const parent = stack[stack.length - 1];
				const index = parent.nodes.indexOf(block);
				parent.nodes.splice(index, 1, ...block.nodes);
			}
		} while (stack.length > 0);
		push({ type: "eos" });
		return ast;
	};
	module.exports = parse;
}));
var require_braces = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const stringify = require_stringify();
	const compile = require_compile();
	const expand = require_expand();
	const parse = require_parse$2();
	/**
	* Expand the given pattern or create a regex-compatible string.
	*
	* ```js
	* const braces = require('braces');
	* console.log(braces('{a,b,c}', { compile: true })); //=> ['(a|b|c)']
	* console.log(braces('{a,b,c}')); //=> ['a', 'b', 'c']
	* ```
	* @param {String} `str`
	* @param {Object} `options`
	* @return {String}
	* @api public
	*/
	const braces = (input, options = {}) => {
		let output = [];
		if (Array.isArray(input)) for (const pattern of input) {
			const result = braces.create(pattern, options);
			if (Array.isArray(result)) output.push(...result);
			else output.push(result);
		}
		else output = [].concat(braces.create(input, options));
		if (options && options.expand === true && options.nodupes === true) output = [...new Set(output)];
		return output;
	};
	/**
	* Parse the given `str` with the given `options`.
	*
	* ```js
	* // braces.parse(pattern, [, options]);
	* const ast = braces.parse('a/{b,c}/d');
	* console.log(ast);
	* ```
	* @param {String} pattern Brace pattern to parse
	* @param {Object} options
	* @return {Object} Returns an AST
	* @api public
	*/
	braces.parse = (input, options = {}) => parse(input, options);
	/**
	* Creates a braces string from an AST, or an AST node.
	*
	* ```js
	* const braces = require('braces');
	* let ast = braces.parse('foo/{a,b}/bar');
	* console.log(stringify(ast.nodes[2])); //=> '{a,b}'
	* ```
	* @param {String} `input` Brace pattern or AST.
	* @param {Object} `options`
	* @return {Array} Returns an array of expanded values.
	* @api public
	*/
	braces.stringify = (input, options = {}) => {
		if (typeof input === "string") return stringify(braces.parse(input, options), options);
		return stringify(input, options);
	};
	/**
	* Compiles a brace pattern into a regex-compatible, optimized string.
	* This method is called by the main [braces](#braces) function by default.
	*
	* ```js
	* const braces = require('braces');
	* console.log(braces.compile('a/{b,c}/d'));
	* //=> ['a/(b|c)/d']
	* ```
	* @param {String} `input` Brace pattern or AST.
	* @param {Object} `options`
	* @return {Array} Returns an array of expanded values.
	* @api public
	*/
	braces.compile = (input, options = {}) => {
		if (typeof input === "string") input = braces.parse(input, options);
		return compile(input, options);
	};
	/**
	* Expands a brace pattern into an array. This method is called by the
	* main [braces](#braces) function when `options.expand` is true. Before
	* using this method it's recommended that you read the [performance notes](#performance))
	* and advantages of using [.compile](#compile) instead.
	*
	* ```js
	* const braces = require('braces');
	* console.log(braces.expand('a/{b,c}/d'));
	* //=> ['a/b/d', 'a/c/d'];
	* ```
	* @param {String} `pattern` Brace pattern
	* @param {Object} `options`
	* @return {Array} Returns an array of expanded values.
	* @api public
	*/
	braces.expand = (input, options = {}) => {
		if (typeof input === "string") input = braces.parse(input, options);
		let result = expand(input, options);
		if (options.noempty === true) result = result.filter(Boolean);
		if (options.nodupes === true) result = [...new Set(result)];
		return result;
	};
	/**
	* Processes a brace pattern and returns either an expanded array
	* (if `options.expand` is true), a highly optimized regex-compatible string.
	* This method is called by the main [braces](#braces) function.
	*
	* ```js
	* const braces = require('braces');
	* console.log(braces.create('user-{200..300}/project-{a,b,c}-{1..10}'))
	* //=> 'user-(20[0-9]|2[1-9][0-9]|300)/project-(a|b|c)-([1-9]|10)'
	* ```
	* @param {String} `pattern` Brace pattern
	* @param {Object} `options`
	* @return {Array} Returns an array of expanded values.
	* @api public
	*/
	braces.create = (input, options = {}) => {
		if (input === "" || input.length < 3) return [input];
		return options.expand !== true ? braces.compile(input, options) : braces.expand(input, options);
	};
	/**
	* Expose "braces"
	*/
	module.exports = braces;
}));
var require_binary_extensions$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = [
		"3dm",
		"3ds",
		"3g2",
		"3gp",
		"7z",
		"a",
		"aac",
		"adp",
		"afdesign",
		"afphoto",
		"afpub",
		"ai",
		"aif",
		"aiff",
		"alz",
		"ape",
		"apk",
		"appimage",
		"ar",
		"arj",
		"asf",
		"au",
		"avi",
		"bak",
		"baml",
		"bh",
		"bin",
		"bk",
		"bmp",
		"btif",
		"bz2",
		"bzip2",
		"cab",
		"caf",
		"cgm",
		"class",
		"cmx",
		"cpio",
		"cr2",
		"cur",
		"dat",
		"dcm",
		"deb",
		"dex",
		"djvu",
		"dll",
		"dmg",
		"dng",
		"doc",
		"docm",
		"docx",
		"dot",
		"dotm",
		"dra",
		"DS_Store",
		"dsk",
		"dts",
		"dtshd",
		"dvb",
		"dwg",
		"dxf",
		"ecelp4800",
		"ecelp7470",
		"ecelp9600",
		"egg",
		"eol",
		"eot",
		"epub",
		"exe",
		"f4v",
		"fbs",
		"fh",
		"fla",
		"flac",
		"flatpak",
		"fli",
		"flv",
		"fpx",
		"fst",
		"fvt",
		"g3",
		"gh",
		"gif",
		"graffle",
		"gz",
		"gzip",
		"h261",
		"h263",
		"h264",
		"icns",
		"ico",
		"ief",
		"img",
		"ipa",
		"iso",
		"jar",
		"jpeg",
		"jpg",
		"jpgv",
		"jpm",
		"jxr",
		"key",
		"ktx",
		"lha",
		"lib",
		"lvp",
		"lz",
		"lzh",
		"lzma",
		"lzo",
		"m3u",
		"m4a",
		"m4v",
		"mar",
		"mdi",
		"mht",
		"mid",
		"midi",
		"mj2",
		"mka",
		"mkv",
		"mmr",
		"mng",
		"mobi",
		"mov",
		"movie",
		"mp3",
		"mp4",
		"mp4a",
		"mpeg",
		"mpg",
		"mpga",
		"mxu",
		"nef",
		"npx",
		"numbers",
		"nupkg",
		"o",
		"odp",
		"ods",
		"odt",
		"oga",
		"ogg",
		"ogv",
		"otf",
		"ott",
		"pages",
		"pbm",
		"pcx",
		"pdb",
		"pdf",
		"pea",
		"pgm",
		"pic",
		"png",
		"pnm",
		"pot",
		"potm",
		"potx",
		"ppa",
		"ppam",
		"ppm",
		"pps",
		"ppsm",
		"ppsx",
		"ppt",
		"pptm",
		"pptx",
		"psd",
		"pya",
		"pyc",
		"pyo",
		"pyv",
		"qt",
		"rar",
		"ras",
		"raw",
		"resources",
		"rgb",
		"rip",
		"rlc",
		"rmf",
		"rmvb",
		"rpm",
		"rtf",
		"rz",
		"s3m",
		"s7z",
		"scpt",
		"sgi",
		"shar",
		"snap",
		"sil",
		"sketch",
		"slk",
		"smv",
		"snk",
		"so",
		"stl",
		"suo",
		"sub",
		"swf",
		"tar",
		"tbz",
		"tbz2",
		"tga",
		"tgz",
		"thmx",
		"tif",
		"tiff",
		"tlz",
		"ttc",
		"ttf",
		"txz",
		"udf",
		"uvh",
		"uvi",
		"uvm",
		"uvp",
		"uvs",
		"uvu",
		"viv",
		"vob",
		"war",
		"wav",
		"wax",
		"wbmp",
		"wdp",
		"weba",
		"webm",
		"webp",
		"whl",
		"wim",
		"wm",
		"wma",
		"wmv",
		"wmx",
		"woff",
		"woff2",
		"wrm",
		"wvx",
		"xbm",
		"xif",
		"xla",
		"xlam",
		"xls",
		"xlsb",
		"xlsm",
		"xlsx",
		"xlt",
		"xltm",
		"xltx",
		"xm",
		"xmind",
		"xpi",
		"xpm",
		"xwd",
		"xz",
		"z",
		"zip",
		"zipx"
	];
}));
var require_binary_extensions = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = require_binary_extensions$1();
}));
var require_is_binary_path = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const path$10 = __require$2("path");
	const binaryExtensions = require_binary_extensions();
	const extensions = new Set(binaryExtensions);
	module.exports = (filePath) => extensions.has(path$10.extname(filePath).slice(1).toLowerCase());
}));
var require_constants$1 = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	const { sep: sep$2 } = __require$2("path");
	const { platform } = process;
	const os$3 = __require$2("os");
	exports.EV_ALL = "all";
	exports.EV_READY = "ready";
	exports.EV_ADD = "add";
	exports.EV_CHANGE = "change";
	exports.EV_ADD_DIR = "addDir";
	exports.EV_UNLINK = "unlink";
	exports.EV_UNLINK_DIR = "unlinkDir";
	exports.EV_RAW = "raw";
	exports.EV_ERROR = "error";
	exports.STR_DATA = "data";
	exports.STR_END = "end";
	exports.STR_CLOSE = "close";
	exports.FSEVENT_CREATED = "created";
	exports.FSEVENT_MODIFIED = "modified";
	exports.FSEVENT_DELETED = "deleted";
	exports.FSEVENT_MOVED = "moved";
	exports.FSEVENT_CLONED = "cloned";
	exports.FSEVENT_UNKNOWN = "unknown";
	exports.FSEVENT_FLAG_MUST_SCAN_SUBDIRS = 1;
	exports.FSEVENT_TYPE_FILE = "file";
	exports.FSEVENT_TYPE_DIRECTORY = "directory";
	exports.FSEVENT_TYPE_SYMLINK = "symlink";
	exports.KEY_LISTENERS = "listeners";
	exports.KEY_ERR = "errHandlers";
	exports.KEY_RAW = "rawEmitters";
	exports.HANDLER_KEYS = [
		exports.KEY_LISTENERS,
		exports.KEY_ERR,
		exports.KEY_RAW
	];
	exports.DOT_SLASH = `.${sep$2}`;
	exports.BACK_SLASH_RE = /\\/g;
	exports.DOUBLE_SLASH_RE = /\/\//;
	exports.SLASH_OR_BACK_SLASH_RE = /[/\\]/;
	exports.DOT_RE = /\..*\.(sw[px])$|~$|\.subl.*\.tmp/;
	exports.REPLACER_RE = /^\.[/\\]/;
	exports.SLASH = "/";
	exports.SLASH_SLASH = "//";
	exports.BRACE_START = "{";
	exports.BANG = "!";
	exports.ONE_DOT = ".";
	exports.TWO_DOTS = "..";
	exports.STAR = "*";
	exports.GLOBSTAR = "**";
	exports.ROOT_GLOBSTAR = "/**/*";
	exports.SLASH_GLOBSTAR = "/**";
	exports.DIR_SUFFIX = "Dir";
	exports.ANYMATCH_OPTS = { dot: true };
	exports.STRING_TYPE = "string";
	exports.FUNCTION_TYPE = "function";
	exports.EMPTY_STR = "";
	exports.EMPTY_FN = () => {};
	exports.IDENTITY_FN = (val) => val;
	exports.isWindows = platform === "win32";
	exports.isMacos = platform === "darwin";
	exports.isLinux = platform === "linux";
	exports.isIBMi = os$3.type() === "OS400";
}));
var require_nodefs_handler = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const fs$9 = __require$2("fs");
	const sysPath$2 = __require$2("path");
	const { promisify: promisify$3 } = __require$2("util");
	const isBinaryPath = require_is_binary_path();
	const { isWindows, isLinux, EMPTY_FN, EMPTY_STR, KEY_LISTENERS, KEY_ERR, KEY_RAW, HANDLER_KEYS, EV_CHANGE, EV_ADD, EV_ADD_DIR, EV_ERROR, STR_DATA, STR_END, BRACE_START, STAR } = require_constants$1();
	const THROTTLE_MODE_WATCH = "watch";
	const open = promisify$3(fs$9.open);
	const stat = promisify$3(fs$9.stat);
	const lstat = promisify$3(fs$9.lstat);
	const close = promisify$3(fs$9.close);
	const fsrealpath = promisify$3(fs$9.realpath);
	const statMethods = {
		lstat,
		stat
	};
	const foreach = (val, fn) => {
		if (val instanceof Set) val.forEach(fn);
		else fn(val);
	};
	const addAndConvert = (main, prop, item) => {
		let container = main[prop];
		if (!(container instanceof Set)) main[prop] = container = /* @__PURE__ */ new Set([container]);
		container.add(item);
	};
	const clearItem = (cont) => (key) => {
		const set = cont[key];
		if (set instanceof Set) set.clear();
		else delete cont[key];
	};
	const delFromSet = (main, prop, item) => {
		const container = main[prop];
		if (container instanceof Set) container.delete(item);
		else if (container === item) delete main[prop];
	};
	const isEmptySet = (val) => val instanceof Set ? val.size === 0 : !val;
	/**
	* @typedef {String} Path
	*/
	/**
	* @typedef {Object} FsWatchContainer
	* @property {Set} listeners
	* @property {Set} errHandlers
	* @property {Set} rawEmitters
	* @property {fs.FSWatcher=} watcher
	* @property {Boolean=} watcherUnusable
	*/
	/**
	* @type {Map<String,FsWatchContainer>}
	*/
	const FsWatchInstances = /* @__PURE__ */ new Map();
	/**
	* Instantiates the fs_watch interface
	* @param {String} path to be watched
	* @param {Object} options to be passed to fs_watch
	* @param {Function} listener main event handler
	* @param {Function} errHandler emits info about errors
	* @param {Function} emitRaw emits raw event data
	* @returns {fs.FSWatcher} new fsevents instance
	*/
	function createFsWatchInstance(path, options, listener, errHandler, emitRaw) {
		const handleEvent = (rawEvent, evPath) => {
			listener(path);
			emitRaw(rawEvent, evPath, { watchedPath: path });
			if (evPath && path !== evPath) fsWatchBroadcast(sysPath$2.resolve(path, evPath), KEY_LISTENERS, sysPath$2.join(path, evPath));
		};
		try {
			return fs$9.watch(path, options, handleEvent);
		} catch (error) {
			errHandler(error);
		}
	}
	/**
	* Helper for passing fs_watch event data to a collection of listeners
	* @param {Path} fullPath absolute path bound to fs_watch instance
	* @param {String} type listener type
	* @param {*=} val1 arguments to be passed to listeners
	* @param {*=} val2
	* @param {*=} val3
	*/
	const fsWatchBroadcast = (fullPath, type, val1, val2, val3) => {
		const cont = FsWatchInstances.get(fullPath);
		if (!cont) return;
		foreach(cont[type], (listener) => {
			listener(val1, val2, val3);
		});
	};
	/**
	* Instantiates the fs_watch interface or binds listeners
	* to an existing one covering the same file system entry
	* @param {String} path
	* @param {String} fullPath absolute path
	* @param {Object} options to be passed to fs_watch
	* @param {Object} handlers container for event listener functions
	*/
	const setFsWatchListener = (path, fullPath, options, handlers) => {
		const { listener, errHandler, rawEmitter } = handlers;
		let cont = FsWatchInstances.get(fullPath);
		/** @type {fs.FSWatcher=} */
		let watcher;
		if (!options.persistent) {
			watcher = createFsWatchInstance(path, options, listener, errHandler, rawEmitter);
			return watcher.close.bind(watcher);
		}
		if (cont) {
			addAndConvert(cont, KEY_LISTENERS, listener);
			addAndConvert(cont, KEY_ERR, errHandler);
			addAndConvert(cont, KEY_RAW, rawEmitter);
		} else {
			watcher = createFsWatchInstance(path, options, fsWatchBroadcast.bind(null, fullPath, KEY_LISTENERS), errHandler, fsWatchBroadcast.bind(null, fullPath, KEY_RAW));
			if (!watcher) return;
			watcher.on(EV_ERROR, async (error) => {
				const broadcastErr = fsWatchBroadcast.bind(null, fullPath, KEY_ERR);
				cont.watcherUnusable = true;
				if (isWindows && error.code === "EPERM") try {
					const fd = await open(path, "r");
					await close(fd);
					broadcastErr(error);
				} catch (err) {}
				else broadcastErr(error);
			});
			cont = {
				listeners: listener,
				errHandlers: errHandler,
				rawEmitters: rawEmitter,
				watcher
			};
			FsWatchInstances.set(fullPath, cont);
		}
		return () => {
			delFromSet(cont, KEY_LISTENERS, listener);
			delFromSet(cont, KEY_ERR, errHandler);
			delFromSet(cont, KEY_RAW, rawEmitter);
			if (isEmptySet(cont.listeners)) {
				cont.watcher.close();
				FsWatchInstances.delete(fullPath);
				HANDLER_KEYS.forEach(clearItem(cont));
				cont.watcher = void 0;
				Object.freeze(cont);
			}
		};
	};
	const FsWatchFileInstances = /* @__PURE__ */ new Map();
	/**
	* Instantiates the fs_watchFile interface or binds listeners
	* to an existing one covering the same file system entry
	* @param {String} path to be watched
	* @param {String} fullPath absolute path
	* @param {Object} options options to be passed to fs_watchFile
	* @param {Object} handlers container for event listener functions
	* @returns {Function} closer
	*/
	const setFsWatchFileListener = (path, fullPath, options, handlers) => {
		const { listener, rawEmitter } = handlers;
		let cont = FsWatchFileInstances.get(fullPath);
		const copts = cont && cont.options;
		if (copts && (copts.persistent < options.persistent || copts.interval > options.interval)) {
			fs$9.unwatchFile(fullPath);
			cont = void 0;
		}
		if (cont) {
			addAndConvert(cont, KEY_LISTENERS, listener);
			addAndConvert(cont, KEY_RAW, rawEmitter);
		} else {
			cont = {
				listeners: listener,
				rawEmitters: rawEmitter,
				options,
				watcher: fs$9.watchFile(fullPath, options, (curr, prev) => {
					foreach(cont.rawEmitters, (rawEmitter) => {
						rawEmitter(EV_CHANGE, fullPath, {
							curr,
							prev
						});
					});
					const currmtime = curr.mtimeMs;
					if (curr.size !== prev.size || currmtime > prev.mtimeMs || currmtime === 0) foreach(cont.listeners, (listener) => listener(path, curr));
				})
			};
			FsWatchFileInstances.set(fullPath, cont);
		}
		return () => {
			delFromSet(cont, KEY_LISTENERS, listener);
			delFromSet(cont, KEY_RAW, rawEmitter);
			if (isEmptySet(cont.listeners)) {
				FsWatchFileInstances.delete(fullPath);
				fs$9.unwatchFile(fullPath);
				cont.options = cont.watcher = void 0;
				Object.freeze(cont);
			}
		};
	};
	/**
	* @mixin
	*/
	var NodeFsHandler = class {
		/**
		* @param {import("../index").FSWatcher} fsW
		*/
		constructor(fsW) {
			this.fsw = fsW;
			this._boundHandleError = (error) => fsW._handleError(error);
		}
		/**
		* Watch file for changes with fs_watchFile or fs_watch.
		* @param {String} path to file or dir
		* @param {Function} listener on fs change
		* @returns {Function} closer for the watcher instance
		*/
		_watchWithNodeFs(path, listener) {
			const opts = this.fsw.options;
			const directory = sysPath$2.dirname(path);
			const basename = sysPath$2.basename(path);
			this.fsw._getWatchedDir(directory).add(basename);
			const absolutePath = sysPath$2.resolve(path);
			const options = { persistent: opts.persistent };
			if (!listener) listener = EMPTY_FN;
			let closer;
			if (opts.usePolling) {
				options.interval = opts.enableBinaryInterval && isBinaryPath(basename) ? opts.binaryInterval : opts.interval;
				closer = setFsWatchFileListener(path, absolutePath, options, {
					listener,
					rawEmitter: this.fsw._emitRaw
				});
			} else closer = setFsWatchListener(path, absolutePath, options, {
				listener,
				errHandler: this._boundHandleError,
				rawEmitter: this.fsw._emitRaw
			});
			return closer;
		}
		/**
		* Watch a file and emit add event if warranted.
		* @param {Path} file Path
		* @param {fs.Stats} stats result of fs_stat
		* @param {Boolean} initialAdd was the file added at watch instantiation?
		* @returns {Function} closer for the watcher instance
		*/
		_handleFile(file, stats, initialAdd) {
			if (this.fsw.closed) return;
			const dirname = sysPath$2.dirname(file);
			const basename = sysPath$2.basename(file);
			const parent = this.fsw._getWatchedDir(dirname);
			let prevStats = stats;
			if (parent.has(basename)) return;
			const listener = async (path, newStats) => {
				if (!this.fsw._throttle(THROTTLE_MODE_WATCH, file, 5)) return;
				if (!newStats || newStats.mtimeMs === 0) try {
					const newStats = await stat(file);
					if (this.fsw.closed) return;
					const at = newStats.atimeMs;
					const mt = newStats.mtimeMs;
					if (!at || at <= mt || mt !== prevStats.mtimeMs) this.fsw._emit(EV_CHANGE, file, newStats);
					if (isLinux && prevStats.ino !== newStats.ino) {
						this.fsw._closeFile(path);
						prevStats = newStats;
						this.fsw._addPathCloser(path, this._watchWithNodeFs(file, listener));
					} else prevStats = newStats;
				} catch (error) {
					this.fsw._remove(dirname, basename);
				}
				else if (parent.has(basename)) {
					const at = newStats.atimeMs;
					const mt = newStats.mtimeMs;
					if (!at || at <= mt || mt !== prevStats.mtimeMs) this.fsw._emit(EV_CHANGE, file, newStats);
					prevStats = newStats;
				}
			};
			const closer = this._watchWithNodeFs(file, listener);
			if (!(initialAdd && this.fsw.options.ignoreInitial) && this.fsw._isntIgnored(file)) {
				if (!this.fsw._throttle(EV_ADD, file, 0)) return;
				this.fsw._emit(EV_ADD, file, stats);
			}
			return closer;
		}
		/**
		* Handle symlinks encountered while reading a dir.
		* @param {Object} entry returned by readdirp
		* @param {String} directory path of dir being read
		* @param {String} path of this item
		* @param {String} item basename of this item
		* @returns {Promise<Boolean>} true if no more processing is needed for this entry.
		*/
		async _handleSymlink(entry, directory, path, item) {
			if (this.fsw.closed) return;
			const full = entry.fullPath;
			const dir = this.fsw._getWatchedDir(directory);
			if (!this.fsw.options.followSymlinks) {
				this.fsw._incrReadyCount();
				let linkPath;
				try {
					linkPath = await fsrealpath(path);
				} catch (e) {
					this.fsw._emitReady();
					return true;
				}
				if (this.fsw.closed) return;
				if (dir.has(item)) {
					if (this.fsw._symlinkPaths.get(full) !== linkPath) {
						this.fsw._symlinkPaths.set(full, linkPath);
						this.fsw._emit(EV_CHANGE, path, entry.stats);
					}
				} else {
					dir.add(item);
					this.fsw._symlinkPaths.set(full, linkPath);
					this.fsw._emit(EV_ADD, path, entry.stats);
				}
				this.fsw._emitReady();
				return true;
			}
			if (this.fsw._symlinkPaths.has(full)) return true;
			this.fsw._symlinkPaths.set(full, true);
		}
		_handleRead(directory, initialAdd, wh, target, dir, depth, throttler) {
			directory = sysPath$2.join(directory, EMPTY_STR);
			if (!wh.hasGlob) {
				throttler = this.fsw._throttle("readdir", directory, 1e3);
				if (!throttler) return;
			}
			const previous = this.fsw._getWatchedDir(wh.path);
			const current = /* @__PURE__ */ new Set();
			let stream = this.fsw._readdirp(directory, {
				fileFilter: (entry) => wh.filterPath(entry),
				directoryFilter: (entry) => wh.filterDir(entry),
				depth: 0
			}).on(STR_DATA, async (entry) => {
				if (this.fsw.closed) {
					stream = void 0;
					return;
				}
				const item = entry.path;
				let path = sysPath$2.join(directory, item);
				current.add(item);
				if (entry.stats.isSymbolicLink() && await this._handleSymlink(entry, directory, path, item)) return;
				if (this.fsw.closed) {
					stream = void 0;
					return;
				}
				if (item === target || !target && !previous.has(item)) {
					this.fsw._incrReadyCount();
					path = sysPath$2.join(dir, sysPath$2.relative(dir, path));
					this._addToNodeFs(path, initialAdd, wh, depth + 1);
				}
			}).on(EV_ERROR, this._boundHandleError);
			return new Promise((resolve) => stream.once(STR_END, () => {
				if (this.fsw.closed) {
					stream = void 0;
					return;
				}
				const wasThrottled = throttler ? throttler.clear() : false;
				resolve();
				previous.getChildren().filter((item) => {
					return item !== directory && !current.has(item) && (!wh.hasGlob || wh.filterPath({ fullPath: sysPath$2.resolve(directory, item) }));
				}).forEach((item) => {
					this.fsw._remove(directory, item);
				});
				stream = void 0;
				if (wasThrottled) this._handleRead(directory, false, wh, target, dir, depth, throttler);
			}));
		}
		/**
		* Read directory to add / remove files from `@watched` list and re-read it on change.
		* @param {String} dir fs path
		* @param {fs.Stats} stats
		* @param {Boolean} initialAdd
		* @param {Number} depth relative to user-supplied path
		* @param {String} target child path targeted for watch
		* @param {Object} wh Common watch helpers for this path
		* @param {String} realpath
		* @returns {Promise<Function>} closer for the watcher instance.
		*/
		async _handleDir(dir, stats, initialAdd, depth, target, wh, realpath) {
			const parentDir = this.fsw._getWatchedDir(sysPath$2.dirname(dir));
			const tracked = parentDir.has(sysPath$2.basename(dir));
			if (!(initialAdd && this.fsw.options.ignoreInitial) && !target && !tracked) {
				if (!wh.hasGlob || wh.globFilter(dir)) this.fsw._emit(EV_ADD_DIR, dir, stats);
			}
			parentDir.add(sysPath$2.basename(dir));
			this.fsw._getWatchedDir(dir);
			let throttler;
			let closer;
			const oDepth = this.fsw.options.depth;
			if ((oDepth == null || depth <= oDepth) && !this.fsw._symlinkPaths.has(realpath)) {
				if (!target) {
					await this._handleRead(dir, initialAdd, wh, target, dir, depth, throttler);
					if (this.fsw.closed) return;
				}
				closer = this._watchWithNodeFs(dir, (dirPath, stats) => {
					if (stats && stats.mtimeMs === 0) return;
					this._handleRead(dirPath, false, wh, target, dir, depth, throttler);
				});
			}
			return closer;
		}
		/**
		* Handle added file, directory, or glob pattern.
		* Delegates call to _handleFile / _handleDir after checks.
		* @param {String} path to file or ir
		* @param {Boolean} initialAdd was the file added at watch instantiation?
		* @param {Object} priorWh depth relative to user-supplied path
		* @param {Number} depth Child path actually targeted for watch
		* @param {String=} target Child path actually targeted for watch
		* @returns {Promise}
		*/
		async _addToNodeFs(path, initialAdd, priorWh, depth, target) {
			const ready = this.fsw._emitReady;
			if (this.fsw._isIgnored(path) || this.fsw.closed) {
				ready();
				return false;
			}
			const wh = this.fsw._getWatchHelpers(path, depth);
			if (!wh.hasGlob && priorWh) {
				wh.hasGlob = priorWh.hasGlob;
				wh.globFilter = priorWh.globFilter;
				wh.filterPath = (entry) => priorWh.filterPath(entry);
				wh.filterDir = (entry) => priorWh.filterDir(entry);
			}
			try {
				const stats = await statMethods[wh.statMethod](wh.watchPath);
				if (this.fsw.closed) return;
				if (this.fsw._isIgnored(wh.watchPath, stats)) {
					ready();
					return false;
				}
				const follow = this.fsw.options.followSymlinks && !path.includes(STAR) && !path.includes(BRACE_START);
				let closer;
				if (stats.isDirectory()) {
					const absPath = sysPath$2.resolve(path);
					const targetPath = follow ? await fsrealpath(path) : path;
					if (this.fsw.closed) return;
					closer = await this._handleDir(wh.watchPath, stats, initialAdd, depth, target, wh, targetPath);
					if (this.fsw.closed) return;
					if (absPath !== targetPath && targetPath !== void 0) this.fsw._symlinkPaths.set(absPath, targetPath);
				} else if (stats.isSymbolicLink()) {
					const targetPath = follow ? await fsrealpath(path) : path;
					if (this.fsw.closed) return;
					const parent = sysPath$2.dirname(wh.watchPath);
					this.fsw._getWatchedDir(parent).add(wh.watchPath);
					this.fsw._emit(EV_ADD, wh.watchPath, stats);
					closer = await this._handleDir(parent, stats, initialAdd, depth, path, wh, targetPath);
					if (this.fsw.closed) return;
					if (targetPath !== void 0) this.fsw._symlinkPaths.set(sysPath$2.resolve(path), targetPath);
				} else closer = this._handleFile(wh.watchPath, stats, initialAdd);
				ready();
				this.fsw._addPathCloser(path, closer);
				return false;
			} catch (error) {
				if (this.fsw._handleError(error)) {
					ready();
					return path;
				}
			}
		}
	};
	module.exports = NodeFsHandler;
}));
var require_fsevents_handler = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const fs$8 = __require$2("fs");
	const sysPath$1 = __require$2("path");
	const { promisify: promisify$2 } = __require$2("util");
	let fsevents;
	try {
		fsevents = __require$2("fsevents");
	} catch (error) {
		if (process.env.CHOKIDAR_PRINT_FSEVENTS_REQUIRE_ERROR) console.error(error);
	}
	if (fsevents) {
		const mtch = process.version.match(/v(\d+)\.(\d+)/);
		if (mtch && mtch[1] && mtch[2]) {
			if (Number.parseInt(mtch[1], 10) === 8 && Number.parseInt(mtch[2], 10) < 16) fsevents = void 0;
		}
	}
	const { EV_ADD, EV_CHANGE, EV_ADD_DIR, EV_UNLINK, EV_ERROR, STR_DATA, STR_END, FSEVENT_CREATED, FSEVENT_MODIFIED, FSEVENT_DELETED, FSEVENT_MOVED, FSEVENT_UNKNOWN, FSEVENT_FLAG_MUST_SCAN_SUBDIRS, FSEVENT_TYPE_FILE, FSEVENT_TYPE_DIRECTORY, FSEVENT_TYPE_SYMLINK, ROOT_GLOBSTAR, DIR_SUFFIX, DOT_SLASH, FUNCTION_TYPE, EMPTY_FN, IDENTITY_FN } = require_constants$1();
	const Depth = (value) => isNaN(value) ? {} : { depth: value };
	const stat = promisify$2(fs$8.stat);
	const lstat = promisify$2(fs$8.lstat);
	const realpath = promisify$2(fs$8.realpath);
	const statMethods = {
		stat,
		lstat
	};
	/**
	* @typedef {String} Path
	*/
	/**
	* @typedef {Object} FsEventsWatchContainer
	* @property {Set<Function>} listeners
	* @property {Function} rawEmitter
	* @property {{stop: Function}} watcher
	*/
	/**
	* Object to hold per-process fsevents instances (may be shared across chokidar FSWatcher instances)
	* @type {Map<Path,FsEventsWatchContainer>}
	*/
	const FSEventsWatchers = /* @__PURE__ */ new Map();
	const consolidateThreshhold = 10;
	const wrongEventFlags = /* @__PURE__ */ new Set([
		69888,
		70400,
		71424,
		72704,
		73472,
		131328,
		131840,
		262912
	]);
	/**
	* Instantiates the fsevents interface
	* @param {Path} path path to be watched
	* @param {Function} callback called when fsevents is bound and ready
	* @returns {{stop: Function}} new fsevents instance
	*/
	const createFSEventsInstance = (path, callback) => {
		return { stop: fsevents.watch(path, callback) };
	};
	/**
	* Instantiates the fsevents interface or binds listeners to an existing one covering
	* the same file tree.
	* @param {Path} path           - to be watched
	* @param {Path} realPath       - real path for symlinks
	* @param {Function} listener   - called when fsevents emits events
	* @param {Function} rawEmitter - passes data to listeners of the 'raw' event
	* @returns {Function} closer
	*/
	function setFSEventsListener(path, realPath, listener, rawEmitter) {
		let watchPath = sysPath$1.extname(realPath) ? sysPath$1.dirname(realPath) : realPath;
		const parentPath = sysPath$1.dirname(watchPath);
		let cont = FSEventsWatchers.get(watchPath);
		if (couldConsolidate(parentPath)) watchPath = parentPath;
		const resolvedPath = sysPath$1.resolve(path);
		const hasSymlink = resolvedPath !== realPath;
		const filteredListener = (fullPath, flags, info) => {
			if (hasSymlink) fullPath = fullPath.replace(realPath, resolvedPath);
			if (fullPath === resolvedPath || !fullPath.indexOf(resolvedPath + sysPath$1.sep)) listener(fullPath, flags, info);
		};
		let watchedParent = false;
		for (const watchedPath of FSEventsWatchers.keys()) if (realPath.indexOf(sysPath$1.resolve(watchedPath) + sysPath$1.sep) === 0) {
			watchPath = watchedPath;
			cont = FSEventsWatchers.get(watchPath);
			watchedParent = true;
			break;
		}
		if (cont || watchedParent) cont.listeners.add(filteredListener);
		else {
			cont = {
				listeners: /* @__PURE__ */ new Set([filteredListener]),
				rawEmitter,
				watcher: createFSEventsInstance(watchPath, (fullPath, flags) => {
					if (!cont.listeners.size) return;
					if (flags & FSEVENT_FLAG_MUST_SCAN_SUBDIRS) return;
					const info = fsevents.getInfo(fullPath, flags);
					cont.listeners.forEach((list) => {
						list(fullPath, flags, info);
					});
					cont.rawEmitter(info.event, fullPath, info);
				})
			};
			FSEventsWatchers.set(watchPath, cont);
		}
		return () => {
			const lst = cont.listeners;
			lst.delete(filteredListener);
			if (!lst.size) {
				FSEventsWatchers.delete(watchPath);
				if (cont.watcher) return cont.watcher.stop().then(() => {
					cont.rawEmitter = cont.watcher = void 0;
					Object.freeze(cont);
				});
			}
		};
	}
	const couldConsolidate = (path) => {
		let count = 0;
		for (const watchPath of FSEventsWatchers.keys()) if (watchPath.indexOf(path) === 0) {
			count++;
			if (count >= consolidateThreshhold) return true;
		}
		return false;
	};
	const canUse = () => fsevents && FSEventsWatchers.size < 128;
	const calcDepth = (path, root) => {
		let i = 0;
		while (!path.indexOf(root) && (path = sysPath$1.dirname(path)) !== root) i++;
		return i;
	};
	const sameTypes = (info, stats) => info.type === FSEVENT_TYPE_DIRECTORY && stats.isDirectory() || info.type === FSEVENT_TYPE_SYMLINK && stats.isSymbolicLink() || info.type === FSEVENT_TYPE_FILE && stats.isFile();
	/**
	* @mixin
	*/
	var FsEventsHandler = class {
		/**
		* @param {import('../index').FSWatcher} fsw
		*/
		constructor(fsw) {
			this.fsw = fsw;
		}
		checkIgnored(path, stats) {
			const ipaths = this.fsw._ignoredPaths;
			if (this.fsw._isIgnored(path, stats)) {
				ipaths.add(path);
				if (stats && stats.isDirectory()) ipaths.add(path + ROOT_GLOBSTAR);
				return true;
			}
			ipaths.delete(path);
			ipaths.delete(path + ROOT_GLOBSTAR);
		}
		addOrChange(path, fullPath, realPath, parent, watchedDir, item, info, opts) {
			const event = watchedDir.has(item) ? EV_CHANGE : EV_ADD;
			this.handleEvent(event, path, fullPath, realPath, parent, watchedDir, item, info, opts);
		}
		async checkExists(path, fullPath, realPath, parent, watchedDir, item, info, opts) {
			try {
				const stats = await stat(path);
				if (this.fsw.closed) return;
				if (sameTypes(info, stats)) this.addOrChange(path, fullPath, realPath, parent, watchedDir, item, info, opts);
				else this.handleEvent(EV_UNLINK, path, fullPath, realPath, parent, watchedDir, item, info, opts);
			} catch (error) {
				if (error.code === "EACCES") this.addOrChange(path, fullPath, realPath, parent, watchedDir, item, info, opts);
				else this.handleEvent(EV_UNLINK, path, fullPath, realPath, parent, watchedDir, item, info, opts);
			}
		}
		handleEvent(event, path, fullPath, realPath, parent, watchedDir, item, info, opts) {
			if (this.fsw.closed || this.checkIgnored(path)) return;
			if (event === EV_UNLINK) {
				const isDirectory = info.type === FSEVENT_TYPE_DIRECTORY;
				if (isDirectory || watchedDir.has(item)) this.fsw._remove(parent, item, isDirectory);
			} else {
				if (event === EV_ADD) {
					if (info.type === FSEVENT_TYPE_DIRECTORY) this.fsw._getWatchedDir(path);
					if (info.type === FSEVENT_TYPE_SYMLINK && opts.followSymlinks) {
						const curDepth = opts.depth === void 0 ? void 0 : calcDepth(fullPath, realPath) + 1;
						return this._addToFsEvents(path, false, true, curDepth);
					}
					this.fsw._getWatchedDir(parent).add(item);
				}
				/**
				* @type {'add'|'addDir'|'unlink'|'unlinkDir'}
				*/
				const eventName = info.type === FSEVENT_TYPE_DIRECTORY ? event + DIR_SUFFIX : event;
				this.fsw._emit(eventName, path);
				if (eventName === EV_ADD_DIR) this._addToFsEvents(path, false, true);
			}
		}
		/**
		* Handle symlinks encountered during directory scan
		* @param {String} watchPath  - file/dir path to be watched with fsevents
		* @param {String} realPath   - real path (in case of symlinks)
		* @param {Function} transform  - path transformer
		* @param {Function} globFilter - path filter in case a glob pattern was provided
		* @returns {Function} closer for the watcher instance
		*/
		_watchWithFsEvents(watchPath, realPath, transform, globFilter) {
			if (this.fsw.closed || this.fsw._isIgnored(watchPath)) return;
			const opts = this.fsw.options;
			const watchCallback = async (fullPath, flags, info) => {
				if (this.fsw.closed || this.fsw._isIgnored(fullPath)) return;
				if (opts.depth !== void 0 && calcDepth(fullPath, realPath) > opts.depth) return;
				const path = transform(sysPath$1.join(watchPath, sysPath$1.relative(watchPath, fullPath)));
				if (globFilter && !globFilter(path)) return;
				const parent = sysPath$1.dirname(path);
				const item = sysPath$1.basename(path);
				const watchedDir = this.fsw._getWatchedDir(info.type === FSEVENT_TYPE_DIRECTORY ? path : parent);
				if (wrongEventFlags.has(flags) || info.event === FSEVENT_UNKNOWN) if (typeof opts.ignored === FUNCTION_TYPE) {
					let stats;
					try {
						stats = await stat(path);
					} catch (error) {}
					if (this.fsw.closed) return;
					if (this.checkIgnored(path, stats)) return;
					if (sameTypes(info, stats)) this.addOrChange(path, fullPath, realPath, parent, watchedDir, item, info, opts);
					else this.handleEvent(EV_UNLINK, path, fullPath, realPath, parent, watchedDir, item, info, opts);
				} else this.checkExists(path, fullPath, realPath, parent, watchedDir, item, info, opts);
				else switch (info.event) {
					case FSEVENT_CREATED:
					case FSEVENT_MODIFIED: return this.addOrChange(path, fullPath, realPath, parent, watchedDir, item, info, opts);
					case FSEVENT_DELETED:
					case FSEVENT_MOVED: return this.checkExists(path, fullPath, realPath, parent, watchedDir, item, info, opts);
				}
			};
			const closer = setFSEventsListener(watchPath, realPath, watchCallback, this.fsw._emitRaw);
			this.fsw._emitReady();
			return closer;
		}
		/**
		* Handle symlinks encountered during directory scan
		* @param {String} linkPath path to symlink
		* @param {String} fullPath absolute path to the symlink
		* @param {Function} transform pre-existing path transformer
		* @param {Number} curDepth level of subdirectories traversed to where symlink is
		* @returns {Promise<void>}
		*/
		async _handleFsEventsSymlink(linkPath, fullPath, transform, curDepth) {
			if (this.fsw.closed || this.fsw._symlinkPaths.has(fullPath)) return;
			this.fsw._symlinkPaths.set(fullPath, true);
			this.fsw._incrReadyCount();
			try {
				const linkTarget = await realpath(linkPath);
				if (this.fsw.closed) return;
				if (this.fsw._isIgnored(linkTarget)) return this.fsw._emitReady();
				this.fsw._incrReadyCount();
				this._addToFsEvents(linkTarget || linkPath, (path) => {
					let aliasedPath = linkPath;
					if (linkTarget && linkTarget !== DOT_SLASH) aliasedPath = path.replace(linkTarget, linkPath);
					else if (path !== DOT_SLASH) aliasedPath = sysPath$1.join(linkPath, path);
					return transform(aliasedPath);
				}, false, curDepth);
			} catch (error) {
				if (this.fsw._handleError(error)) return this.fsw._emitReady();
			}
		}
		/**
		*
		* @param {Path} newPath
		* @param {fs.Stats} stats
		*/
		emitAdd(newPath, stats, processPath, opts, forceAdd) {
			const pp = processPath(newPath);
			const isDir = stats.isDirectory();
			const dirObj = this.fsw._getWatchedDir(sysPath$1.dirname(pp));
			const base = sysPath$1.basename(pp);
			if (isDir) this.fsw._getWatchedDir(pp);
			if (dirObj.has(base)) return;
			dirObj.add(base);
			if (!opts.ignoreInitial || forceAdd === true) this.fsw._emit(isDir ? EV_ADD_DIR : EV_ADD, pp, stats);
		}
		initWatch(realPath, path, wh, processPath) {
			if (this.fsw.closed) return;
			const closer = this._watchWithFsEvents(wh.watchPath, sysPath$1.resolve(realPath || wh.watchPath), processPath, wh.globFilter);
			this.fsw._addPathCloser(path, closer);
		}
		/**
		* Handle added path with fsevents
		* @param {String} path file/dir path or glob pattern
		* @param {Function|Boolean=} transform converts working path to what the user expects
		* @param {Boolean=} forceAdd ensure add is emitted
		* @param {Number=} priorDepth Level of subdirectories already traversed.
		* @returns {Promise<void>}
		*/
		async _addToFsEvents(path, transform, forceAdd, priorDepth) {
			if (this.fsw.closed) return;
			const opts = this.fsw.options;
			const processPath = typeof transform === FUNCTION_TYPE ? transform : IDENTITY_FN;
			const wh = this.fsw._getWatchHelpers(path);
			try {
				const stats = await statMethods[wh.statMethod](wh.watchPath);
				if (this.fsw.closed) return;
				if (this.fsw._isIgnored(wh.watchPath, stats)) throw null;
				if (stats.isDirectory()) {
					if (!wh.globFilter) this.emitAdd(processPath(path), stats, processPath, opts, forceAdd);
					if (priorDepth && priorDepth > opts.depth) return;
					this.fsw._readdirp(wh.watchPath, {
						fileFilter: (entry) => wh.filterPath(entry),
						directoryFilter: (entry) => wh.filterDir(entry),
						...Depth(opts.depth - (priorDepth || 0))
					}).on(STR_DATA, (entry) => {
						if (this.fsw.closed) return;
						if (entry.stats.isDirectory() && !wh.filterPath(entry)) return;
						const joinedPath = sysPath$1.join(wh.watchPath, entry.path);
						const { fullPath } = entry;
						if (wh.followSymlinks && entry.stats.isSymbolicLink()) {
							const curDepth = opts.depth === void 0 ? void 0 : calcDepth(joinedPath, sysPath$1.resolve(wh.watchPath)) + 1;
							this._handleFsEventsSymlink(joinedPath, fullPath, processPath, curDepth);
						} else this.emitAdd(joinedPath, entry.stats, processPath, opts, forceAdd);
					}).on(EV_ERROR, EMPTY_FN).on(STR_END, () => {
						this.fsw._emitReady();
					});
				} else {
					this.emitAdd(wh.watchPath, stats, processPath, opts, forceAdd);
					this.fsw._emitReady();
				}
			} catch (error) {
				if (!error || this.fsw._handleError(error)) {
					this.fsw._emitReady();
					this.fsw._emitReady();
				}
			}
			if (opts.persistent && forceAdd !== true) if (typeof transform === FUNCTION_TYPE) this.initWatch(void 0, path, wh, processPath);
			else {
				let realPath;
				try {
					realPath = await realpath(wh.watchPath);
				} catch (e) {}
				this.initWatch(realPath, path, wh, processPath);
			}
		}
	};
	module.exports = FsEventsHandler;
	module.exports.canUse = canUse;
}));
var require_chokidar = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	const { EventEmitter: EventEmitter$3 } = __require$2("events");
	const fs$7 = __require$2("fs");
	const sysPath = __require$2("path");
	const { promisify: promisify$1 } = __require$2("util");
	const readdirp = require_readdirp();
	const anymatch = require_anymatch().default;
	const globParent = require_glob_parent();
	const isGlob = require_is_glob();
	const braces = require_braces();
	const normalizePath = require_normalize_path();
	const NodeFsHandler = require_nodefs_handler();
	const FsEventsHandler = require_fsevents_handler();
	const { EV_ALL, EV_READY, EV_ADD, EV_CHANGE, EV_UNLINK, EV_ADD_DIR, EV_UNLINK_DIR, EV_RAW, EV_ERROR, STR_CLOSE, STR_END, BACK_SLASH_RE, DOUBLE_SLASH_RE, SLASH_OR_BACK_SLASH_RE, DOT_RE, REPLACER_RE, SLASH, SLASH_SLASH, BRACE_START, BANG, ONE_DOT, TWO_DOTS, GLOBSTAR, SLASH_GLOBSTAR, ANYMATCH_OPTS, STRING_TYPE, FUNCTION_TYPE, EMPTY_STR, EMPTY_FN, isWindows, isMacos, isIBMi } = require_constants$1();
	const stat = promisify$1(fs$7.stat);
	const readdir = promisify$1(fs$7.readdir);
	/**
	* @typedef {String} Path
	* @typedef {'all'|'add'|'addDir'|'change'|'unlink'|'unlinkDir'|'raw'|'error'|'ready'} EventName
	* @typedef {'readdir'|'watch'|'add'|'remove'|'change'} ThrottleType
	*/
	/**
	*
	* @typedef {Object} WatchHelpers
	* @property {Boolean} followSymlinks
	* @property {'stat'|'lstat'} statMethod
	* @property {Path} path
	* @property {Path} watchPath
	* @property {Function} entryPath
	* @property {Boolean} hasGlob
	* @property {Object} globFilter
	* @property {Function} filterPath
	* @property {Function} filterDir
	*/
	const arrify = (value = []) => Array.isArray(value) ? value : [value];
	const flatten = (list, result = []) => {
		list.forEach((item) => {
			if (Array.isArray(item)) flatten(item, result);
			else result.push(item);
		});
		return result;
	};
	const unifyPaths = (paths_) => {
		/**
		* @type {Array<String>}
		*/
		const paths = flatten(arrify(paths_));
		if (!paths.every((p) => typeof p === STRING_TYPE)) throw new TypeError(`Non-string provided as watch path: ${paths}`);
		return paths.map(normalizePathToUnix);
	};
	const toUnix = (string) => {
		let str = string.replace(BACK_SLASH_RE, SLASH);
		let prepend = false;
		if (str.startsWith(SLASH_SLASH)) prepend = true;
		while (str.match(DOUBLE_SLASH_RE)) str = str.replace(DOUBLE_SLASH_RE, SLASH);
		if (prepend) str = SLASH + str;
		return str;
	};
	const normalizePathToUnix = (path) => toUnix(sysPath.normalize(toUnix(path)));
	const normalizeIgnored = (cwd = EMPTY_STR) => (path) => {
		if (typeof path !== STRING_TYPE) return path;
		return normalizePathToUnix(sysPath.isAbsolute(path) ? path : sysPath.join(cwd, path));
	};
	const getAbsolutePath = (path, cwd) => {
		if (sysPath.isAbsolute(path)) return path;
		if (path.startsWith(BANG)) return BANG + sysPath.join(cwd, path.slice(1));
		return sysPath.join(cwd, path);
	};
	const undef = (opts, key) => opts[key] === void 0;
	/**
	* Directory entry.
	* @property {Path} path
	* @property {Set<Path>} items
	*/
	var DirEntry = class {
		/**
		* @param {Path} dir
		* @param {Function} removeWatcher
		*/
		constructor(dir, removeWatcher) {
			this.path = dir;
			this._removeWatcher = removeWatcher;
			/** @type {Set<Path>} */
			this.items = /* @__PURE__ */ new Set();
		}
		add(item) {
			const { items } = this;
			if (!items) return;
			if (item !== ONE_DOT && item !== TWO_DOTS) items.add(item);
		}
		async remove(item) {
			const { items } = this;
			if (!items) return;
			items.delete(item);
			if (items.size > 0) return;
			const dir = this.path;
			try {
				await readdir(dir);
			} catch (err) {
				if (this._removeWatcher) this._removeWatcher(sysPath.dirname(dir), sysPath.basename(dir));
			}
		}
		has(item) {
			const { items } = this;
			if (!items) return;
			return items.has(item);
		}
		/**
		* @returns {Array<String>}
		*/
		getChildren() {
			const { items } = this;
			if (!items) return;
			return [...items.values()];
		}
		dispose() {
			this.items.clear();
			delete this.path;
			delete this._removeWatcher;
			delete this.items;
			Object.freeze(this);
		}
	};
	const STAT_METHOD_F = "stat";
	const STAT_METHOD_L = "lstat";
	var WatchHelper = class {
		constructor(path, watchPath, follow, fsw) {
			this.fsw = fsw;
			this.path = path = path.replace(REPLACER_RE, EMPTY_STR);
			this.watchPath = watchPath;
			this.fullWatchPath = sysPath.resolve(watchPath);
			this.hasGlob = watchPath !== path;
			/** @type {object|boolean} */
			if (path === EMPTY_STR) this.hasGlob = false;
			this.globSymlink = this.hasGlob && follow ? void 0 : false;
			this.globFilter = this.hasGlob ? anymatch(path, void 0, ANYMATCH_OPTS) : false;
			this.dirParts = this.getDirParts(path);
			this.dirParts.forEach((parts) => {
				if (parts.length > 1) parts.pop();
			});
			this.followSymlinks = follow;
			this.statMethod = follow ? STAT_METHOD_F : STAT_METHOD_L;
		}
		checkGlobSymlink(entry) {
			if (this.globSymlink === void 0) this.globSymlink = entry.fullParentDir === this.fullWatchPath ? false : {
				realPath: entry.fullParentDir,
				linkPath: this.fullWatchPath
			};
			if (this.globSymlink) return entry.fullPath.replace(this.globSymlink.realPath, this.globSymlink.linkPath);
			return entry.fullPath;
		}
		entryPath(entry) {
			return sysPath.join(this.watchPath, sysPath.relative(this.watchPath, this.checkGlobSymlink(entry)));
		}
		filterPath(entry) {
			const { stats } = entry;
			if (stats && stats.isSymbolicLink()) return this.filterDir(entry);
			const resolvedPath = this.entryPath(entry);
			return (this.hasGlob && typeof this.globFilter === FUNCTION_TYPE ? this.globFilter(resolvedPath) : true) && this.fsw._isntIgnored(resolvedPath, stats) && this.fsw._hasReadPermissions(stats);
		}
		getDirParts(path) {
			if (!this.hasGlob) return [];
			const parts = [];
			(path.includes(BRACE_START) ? braces.expand(path) : [path]).forEach((path) => {
				parts.push(sysPath.relative(this.watchPath, path).split(SLASH_OR_BACK_SLASH_RE));
			});
			return parts;
		}
		filterDir(entry) {
			if (this.hasGlob) {
				const entryParts = this.getDirParts(this.checkGlobSymlink(entry));
				let globstar = false;
				this.unmatchedGlob = !this.dirParts.some((parts) => {
					return parts.every((part, i) => {
						if (part === GLOBSTAR) globstar = true;
						return globstar || !entryParts[0][i] || anymatch(part, entryParts[0][i], ANYMATCH_OPTS);
					});
				});
			}
			return !this.unmatchedGlob && this.fsw._isntIgnored(this.entryPath(entry), entry.stats);
		}
	};
	/**
	* Watches files & directories for changes. Emitted events:
	* `add`, `addDir`, `change`, `unlink`, `unlinkDir`, `all`, `error`
	*
	*     new FSWatcher()
	*       .add(directories)
	*       .on('add', path => log('File', path, 'was added'))
	*/
	var FSWatcher = class extends EventEmitter$3 {
		constructor(_opts) {
			super();
			const opts = {};
			if (_opts) Object.assign(opts, _opts);
			/** @type {Map<String, DirEntry>} */
			this._watched = /* @__PURE__ */ new Map();
			/** @type {Map<String, Array>} */
			this._closers = /* @__PURE__ */ new Map();
			/** @type {Set<String>} */
			this._ignoredPaths = /* @__PURE__ */ new Set();
			/** @type {Map<ThrottleType, Map>} */
			this._throttled = /* @__PURE__ */ new Map();
			/** @type {Map<Path, String|Boolean>} */
			this._symlinkPaths = /* @__PURE__ */ new Map();
			this._streams = /* @__PURE__ */ new Set();
			this.closed = false;
			if (undef(opts, "persistent")) opts.persistent = true;
			if (undef(opts, "ignoreInitial")) opts.ignoreInitial = false;
			if (undef(opts, "ignorePermissionErrors")) opts.ignorePermissionErrors = false;
			if (undef(opts, "interval")) opts.interval = 100;
			if (undef(opts, "binaryInterval")) opts.binaryInterval = 300;
			if (undef(opts, "disableGlobbing")) opts.disableGlobbing = false;
			opts.enableBinaryInterval = opts.binaryInterval !== opts.interval;
			if (undef(opts, "useFsEvents")) opts.useFsEvents = !opts.usePolling;
			if (!FsEventsHandler.canUse()) opts.useFsEvents = false;
			if (undef(opts, "usePolling") && !opts.useFsEvents) opts.usePolling = isMacos;
			if (isIBMi) opts.usePolling = true;
			const envPoll = process.env.CHOKIDAR_USEPOLLING;
			if (envPoll !== void 0) {
				const envLower = envPoll.toLowerCase();
				if (envLower === "false" || envLower === "0") opts.usePolling = false;
				else if (envLower === "true" || envLower === "1") opts.usePolling = true;
				else opts.usePolling = !!envLower;
			}
			const envInterval = process.env.CHOKIDAR_INTERVAL;
			if (envInterval) opts.interval = Number.parseInt(envInterval, 10);
			if (undef(opts, "atomic")) opts.atomic = !opts.usePolling && !opts.useFsEvents;
			if (opts.atomic) this._pendingUnlinks = /* @__PURE__ */ new Map();
			if (undef(opts, "followSymlinks")) opts.followSymlinks = true;
			if (undef(opts, "awaitWriteFinish")) opts.awaitWriteFinish = false;
			if (opts.awaitWriteFinish === true) opts.awaitWriteFinish = {};
			const awf = opts.awaitWriteFinish;
			if (awf) {
				if (!awf.stabilityThreshold) awf.stabilityThreshold = 2e3;
				if (!awf.pollInterval) awf.pollInterval = 100;
				this._pendingWrites = /* @__PURE__ */ new Map();
			}
			if (opts.ignored) opts.ignored = arrify(opts.ignored);
			let readyCalls = 0;
			this._emitReady = () => {
				readyCalls++;
				if (readyCalls >= this._readyCount) {
					this._emitReady = EMPTY_FN;
					this._readyEmitted = true;
					process.nextTick(() => this.emit(EV_READY));
				}
			};
			this._emitRaw = (...args) => this.emit(EV_RAW, ...args);
			this._readyEmitted = false;
			this.options = opts;
			if (opts.useFsEvents) this._fsEventsHandler = new FsEventsHandler(this);
			else this._nodeFsHandler = new NodeFsHandler(this);
			Object.freeze(opts);
		}
		/**
		* Adds paths to be watched on an existing FSWatcher instance
		* @param {Path|Array<Path>} paths_
		* @param {String=} _origAdd private; for handling non-existent paths to be watched
		* @param {Boolean=} _internal private; indicates a non-user add
		* @returns {FSWatcher} for chaining
		*/
		add(paths_, _origAdd, _internal) {
			const { cwd, disableGlobbing } = this.options;
			this.closed = false;
			let paths = unifyPaths(paths_);
			if (cwd) paths = paths.map((path) => {
				const absPath = getAbsolutePath(path, cwd);
				if (disableGlobbing || !isGlob(path)) return absPath;
				return normalizePath(absPath);
			});
			paths = paths.filter((path) => {
				if (path.startsWith(BANG)) {
					this._ignoredPaths.add(path.slice(1));
					return false;
				}
				this._ignoredPaths.delete(path);
				this._ignoredPaths.delete(path + SLASH_GLOBSTAR);
				this._userIgnored = void 0;
				return true;
			});
			if (this.options.useFsEvents && this._fsEventsHandler) {
				if (!this._readyCount) this._readyCount = paths.length;
				if (this.options.persistent) this._readyCount += paths.length;
				paths.forEach((path) => this._fsEventsHandler._addToFsEvents(path));
			} else {
				if (!this._readyCount) this._readyCount = 0;
				this._readyCount += paths.length;
				Promise.all(paths.map(async (path) => {
					const res = await this._nodeFsHandler._addToNodeFs(path, !_internal, 0, 0, _origAdd);
					if (res) this._emitReady();
					return res;
				})).then((results) => {
					if (this.closed) return;
					results.filter((item) => item).forEach((item) => {
						this.add(sysPath.dirname(item), sysPath.basename(_origAdd || item));
					});
				});
			}
			return this;
		}
		/**
		* Close watchers or start ignoring events from specified paths.
		* @param {Path|Array<Path>} paths_ - string or array of strings, file/directory paths and/or globs
		* @returns {FSWatcher} for chaining
		*/
		unwatch(paths_) {
			if (this.closed) return this;
			const paths = unifyPaths(paths_);
			const { cwd } = this.options;
			paths.forEach((path) => {
				if (!sysPath.isAbsolute(path) && !this._closers.has(path)) {
					if (cwd) path = sysPath.join(cwd, path);
					path = sysPath.resolve(path);
				}
				this._closePath(path);
				this._ignoredPaths.add(path);
				if (this._watched.has(path)) this._ignoredPaths.add(path + SLASH_GLOBSTAR);
				this._userIgnored = void 0;
			});
			return this;
		}
		/**
		* Close watchers and remove all listeners from watched paths.
		* @returns {Promise<void>}.
		*/
		close() {
			if (this.closed) return this._closePromise;
			this.closed = true;
			this.removeAllListeners();
			const closers = [];
			this._closers.forEach((closerList) => closerList.forEach((closer) => {
				const promise = closer();
				if (promise instanceof Promise) closers.push(promise);
			}));
			this._streams.forEach((stream) => stream.destroy());
			this._userIgnored = void 0;
			this._readyCount = 0;
			this._readyEmitted = false;
			this._watched.forEach((dirent) => dirent.dispose());
			[
				"closers",
				"watched",
				"streams",
				"symlinkPaths",
				"throttled"
			].forEach((key) => {
				this[`_${key}`].clear();
			});
			this._closePromise = closers.length ? Promise.all(closers).then(() => void 0) : Promise.resolve();
			return this._closePromise;
		}
		/**
		* Expose list of watched paths
		* @returns {Object} for chaining
		*/
		getWatched() {
			const watchList = {};
			this._watched.forEach((entry, dir) => {
				const key = this.options.cwd ? sysPath.relative(this.options.cwd, dir) : dir;
				watchList[key || ONE_DOT] = entry.getChildren().sort();
			});
			return watchList;
		}
		emitWithAll(event, args) {
			this.emit(...args);
			if (event !== EV_ERROR) this.emit(EV_ALL, ...args);
		}
		/**
		* Normalize and emit events.
		* Calling _emit DOES NOT MEAN emit() would be called!
		* @param {EventName} event Type of event
		* @param {Path} path File or directory path
		* @param {*=} val1 arguments to be passed with event
		* @param {*=} val2
		* @param {*=} val3
		* @returns the error if defined, otherwise the value of the FSWatcher instance's `closed` flag
		*/
		async _emit(event, path, val1, val2, val3) {
			if (this.closed) return;
			const opts = this.options;
			if (isWindows) path = sysPath.normalize(path);
			if (opts.cwd) path = sysPath.relative(opts.cwd, path);
			/** @type Array<any> */
			const args = [event, path];
			if (val3 !== void 0) args.push(val1, val2, val3);
			else if (val2 !== void 0) args.push(val1, val2);
			else if (val1 !== void 0) args.push(val1);
			const awf = opts.awaitWriteFinish;
			let pw;
			if (awf && (pw = this._pendingWrites.get(path))) {
				pw.lastChange = /* @__PURE__ */ new Date();
				return this;
			}
			if (opts.atomic) {
				if (event === EV_UNLINK) {
					this._pendingUnlinks.set(path, args);
					setTimeout(() => {
						this._pendingUnlinks.forEach((entry, path) => {
							this.emit(...entry);
							this.emit(EV_ALL, ...entry);
							this._pendingUnlinks.delete(path);
						});
					}, typeof opts.atomic === "number" ? opts.atomic : 100);
					return this;
				}
				if (event === EV_ADD && this._pendingUnlinks.has(path)) {
					event = args[0] = EV_CHANGE;
					this._pendingUnlinks.delete(path);
				}
			}
			if (awf && (event === EV_ADD || event === EV_CHANGE) && this._readyEmitted) {
				const awfEmit = (err, stats) => {
					if (err) {
						event = args[0] = EV_ERROR;
						args[1] = err;
						this.emitWithAll(event, args);
					} else if (stats) {
						if (args.length > 2) args[2] = stats;
						else args.push(stats);
						this.emitWithAll(event, args);
					}
				};
				this._awaitWriteFinish(path, awf.stabilityThreshold, event, awfEmit);
				return this;
			}
			if (event === EV_CHANGE) {
				if (!this._throttle(EV_CHANGE, path, 50)) return this;
			}
			if (opts.alwaysStat && val1 === void 0 && (event === EV_ADD || event === EV_ADD_DIR || event === EV_CHANGE)) {
				const fullPath = opts.cwd ? sysPath.join(opts.cwd, path) : path;
				let stats;
				try {
					stats = await stat(fullPath);
				} catch (err) {}
				if (!stats || this.closed) return;
				args.push(stats);
			}
			this.emitWithAll(event, args);
			return this;
		}
		/**
		* Common handler for errors
		* @param {Error} error
		* @returns {Error|Boolean} The error if defined, otherwise the value of the FSWatcher instance's `closed` flag
		*/
		_handleError(error) {
			const code = error && error.code;
			if (error && code !== "ENOENT" && code !== "ENOTDIR" && (!this.options.ignorePermissionErrors || code !== "EPERM" && code !== "EACCES")) this.emit(EV_ERROR, error);
			return error || this.closed;
		}
		/**
		* Helper utility for throttling
		* @param {ThrottleType} actionType type being throttled
		* @param {Path} path being acted upon
		* @param {Number} timeout duration of time to suppress duplicate actions
		* @returns {Object|false} tracking object or false if action should be suppressed
		*/
		_throttle(actionType, path, timeout) {
			if (!this._throttled.has(actionType)) this._throttled.set(actionType, /* @__PURE__ */ new Map());
			/** @type {Map<Path, Object>} */
			const action = this._throttled.get(actionType);
			/** @type {Object} */
			const actionPath = action.get(path);
			if (actionPath) {
				actionPath.count++;
				return false;
			}
			let timeoutObject;
			const clear = () => {
				const item = action.get(path);
				const count = item ? item.count : 0;
				action.delete(path);
				clearTimeout(timeoutObject);
				if (item) clearTimeout(item.timeoutObject);
				return count;
			};
			timeoutObject = setTimeout(clear, timeout);
			const thr = {
				timeoutObject,
				clear,
				count: 0
			};
			action.set(path, thr);
			return thr;
		}
		_incrReadyCount() {
			return this._readyCount++;
		}
		/**
		* Awaits write operation to finish.
		* Polls a newly created file for size variations. When files size does not change for 'threshold' milliseconds calls callback.
		* @param {Path} path being acted upon
		* @param {Number} threshold Time in milliseconds a file size must be fixed before acknowledging write OP is finished
		* @param {EventName} event
		* @param {Function} awfEmit Callback to be called when ready for event to be emitted.
		*/
		_awaitWriteFinish(path, threshold, event, awfEmit) {
			let timeoutHandler;
			let fullPath = path;
			if (this.options.cwd && !sysPath.isAbsolute(path)) fullPath = sysPath.join(this.options.cwd, path);
			const now = /* @__PURE__ */ new Date();
			const awaitWriteFinish = (prevStat) => {
				fs$7.stat(fullPath, (err, curStat) => {
					if (err || !this._pendingWrites.has(path)) {
						if (err && err.code !== "ENOENT") awfEmit(err);
						return;
					}
					const now = Number(/* @__PURE__ */ new Date());
					if (prevStat && curStat.size !== prevStat.size) this._pendingWrites.get(path).lastChange = now;
					if (now - this._pendingWrites.get(path).lastChange >= threshold) {
						this._pendingWrites.delete(path);
						awfEmit(void 0, curStat);
					} else timeoutHandler = setTimeout(awaitWriteFinish, this.options.awaitWriteFinish.pollInterval, curStat);
				});
			};
			if (!this._pendingWrites.has(path)) {
				this._pendingWrites.set(path, {
					lastChange: now,
					cancelWait: () => {
						this._pendingWrites.delete(path);
						clearTimeout(timeoutHandler);
						return event;
					}
				});
				timeoutHandler = setTimeout(awaitWriteFinish, this.options.awaitWriteFinish.pollInterval);
			}
		}
		_getGlobIgnored() {
			return [...this._ignoredPaths.values()];
		}
		/**
		* Determines whether user has asked to ignore this path.
		* @param {Path} path filepath or dir
		* @param {fs.Stats=} stats result of fs.stat
		* @returns {Boolean}
		*/
		_isIgnored(path, stats) {
			if (this.options.atomic && DOT_RE.test(path)) return true;
			if (!this._userIgnored) {
				const { cwd } = this.options;
				const ign = this.options.ignored;
				const ignored = ign && ign.map(normalizeIgnored(cwd));
				const paths = arrify(ignored).filter((path) => typeof path === STRING_TYPE && !isGlob(path)).map((path) => path + SLASH_GLOBSTAR);
				const list = this._getGlobIgnored().map(normalizeIgnored(cwd)).concat(ignored, paths);
				this._userIgnored = anymatch(list, void 0, ANYMATCH_OPTS);
			}
			return this._userIgnored([path, stats]);
		}
		_isntIgnored(path, stat) {
			return !this._isIgnored(path, stat);
		}
		/**
		* Provides a set of common helpers and properties relating to symlink and glob handling.
		* @param {Path} path file, directory, or glob pattern being watched
		* @param {Number=} depth at any depth > 0, this isn't a glob
		* @returns {WatchHelper} object containing helpers for this path
		*/
		_getWatchHelpers(path, depth) {
			const watchPath = depth || this.options.disableGlobbing || !isGlob(path) ? path : globParent(path);
			const follow = this.options.followSymlinks;
			return new WatchHelper(path, watchPath, follow, this);
		}
		/**
		* Provides directory tracking objects
		* @param {String} directory path of the directory
		* @returns {DirEntry} the directory's tracking object
		*/
		_getWatchedDir(directory) {
			if (!this._boundRemove) this._boundRemove = this._remove.bind(this);
			const dir = sysPath.resolve(directory);
			if (!this._watched.has(dir)) this._watched.set(dir, new DirEntry(dir, this._boundRemove));
			return this._watched.get(dir);
		}
		/**
		* Check for read permissions.
		* Based on this answer on SO: https://stackoverflow.com/a/11781404/1358405
		* @param {fs.Stats} stats - object, result of fs_stat
		* @returns {Boolean} indicates whether the file can be read
		*/
		_hasReadPermissions(stats) {
			if (this.options.ignorePermissionErrors) return true;
			const st = (stats && Number.parseInt(stats.mode, 10)) & 511;
			const it = Number.parseInt(st.toString(8)[0], 10);
			return Boolean(4 & it);
		}
		/**
		* Handles emitting unlink events for
		* files and directories, and via recursion, for
		* files and directories within directories that are unlinked
		* @param {String} directory within which the following item is located
		* @param {String} item      base path of item/directory
		* @returns {void}
		*/
		_remove(directory, item, isDirectory) {
			const path = sysPath.join(directory, item);
			const fullPath = sysPath.resolve(path);
			isDirectory = isDirectory != null ? isDirectory : this._watched.has(path) || this._watched.has(fullPath);
			if (!this._throttle("remove", path, 100)) return;
			if (!isDirectory && !this.options.useFsEvents && this._watched.size === 1) this.add(directory, item, true);
			this._getWatchedDir(path).getChildren().forEach((nested) => this._remove(path, nested));
			const parent = this._getWatchedDir(directory);
			const wasTracked = parent.has(item);
			parent.remove(item);
			if (this._symlinkPaths.has(fullPath)) this._symlinkPaths.delete(fullPath);
			let relPath = path;
			if (this.options.cwd) relPath = sysPath.relative(this.options.cwd, path);
			if (this.options.awaitWriteFinish && this._pendingWrites.has(relPath)) {
				if (this._pendingWrites.get(relPath).cancelWait() === EV_ADD) return;
			}
			this._watched.delete(path);
			this._watched.delete(fullPath);
			const eventName = isDirectory ? EV_UNLINK_DIR : EV_UNLINK;
			if (wasTracked && !this._isIgnored(path)) this._emit(eventName, path);
			if (!this.options.useFsEvents) this._closePath(path);
		}
		/**
		* Closes all watchers for a path
		* @param {Path} path
		*/
		_closePath(path) {
			this._closeFile(path);
			const dir = sysPath.dirname(path);
			this._getWatchedDir(dir).remove(sysPath.basename(path));
		}
		/**
		* Closes only file-specific watchers
		* @param {Path} path
		*/
		_closeFile(path) {
			const closers = this._closers.get(path);
			if (!closers) return;
			closers.forEach((closer) => closer());
			this._closers.delete(path);
		}
		/**
		*
		* @param {Path} path
		* @param {Function} closer
		*/
		_addPathCloser(path, closer) {
			if (!closer) return;
			let list = this._closers.get(path);
			if (!list) {
				list = [];
				this._closers.set(path, list);
			}
			list.push(closer);
		}
		_readdirp(root, opts) {
			if (this.closed) return;
			let stream = readdirp(root, {
				type: EV_ALL,
				alwaysStat: true,
				lstat: true,
				...opts
			});
			this._streams.add(stream);
			stream.once(STR_CLOSE, () => {
				stream = void 0;
			});
			stream.once(STR_END, () => {
				if (stream) {
					this._streams.delete(stream);
					stream = void 0;
				}
			});
			return stream;
		}
	};
	/**
	* Instantiates watcher with paths to be tracked.
	* @param {String|Array<String>} paths file/directory paths and/or globs
	* @param {Object=} options chokidar opts
	* @returns an instance of FSWatcher for chaining.
	*/
	const watch = (paths, options) => {
		const watcher = new FSWatcher(options);
		watcher.add(paths);
		return watcher;
	};
	exports.watch = watch;
}));
var require_quote = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	var OPS = [
		"||",
		"&&",
		";;",
		"|&",
		"<(",
		"<<<",
		">>",
		">&",
		"<&",
		"&",
		";",
		"(",
		")",
		"|",
		"<",
		">"
	];
	var LINE_TERMINATORS = /[\n\r\u2028\u2029]/;
	var GLOB_SHELL_SPECIAL = /[\s#!"$&'():;<=>@\\^`|]/g;
	module.exports = function quote(xs) {
		return xs.map(function(s) {
			if (s === "") return "''";
			if (s && typeof s === "object") {
				if (s.op === "glob") {
					if (typeof s.pattern !== "string") throw new TypeError("glob token requires a string `pattern`");
					if (LINE_TERMINATORS.test(s.pattern)) throw new TypeError("glob `pattern` must not contain line terminators");
					return s.pattern.replace(GLOB_SHELL_SPECIAL, "\\$&");
				}
				if (typeof s.op === "string") {
					if (OPS.indexOf(s.op) < 0) throw new TypeError("invalid `op` value: " + JSON.stringify(s.op));
					return s.op.replace(/[\s\S]/g, "\\$&");
				}
				if (typeof s.comment === "string") {
					if (LINE_TERMINATORS.test(s.comment)) throw new TypeError("`comment` must not contain line terminators");
					return "#" + s.comment;
				}
				throw new TypeError("unrecognized object token shape");
			}
			if (/["\s\\]/.test(s) && !/'/.test(s)) return "'" + s.replace(/(['])/g, "\\$1") + "'";
			if (/["'\s]/.test(s)) return "\"" + s.replace(/(["\\$`!])/g, "\\$1") + "\"";
			return String(s).replace(/([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}])/g, "$1\\$2");
		}).join(" ");
	};
}));
var require_parse$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	var CONTROL = "(?:" + [
		"\\|\\|",
		"\\&\\&",
		";;",
		"\\|\\&",
		"\\<\\(",
		"\\<\\<\\<",
		">>",
		">\\&",
		"<\\&",
		"[&;()|<>]"
	].join("|") + ")";
	var controlRE = new RegExp("^" + CONTROL + "$");
	var META = "|&;()<> \\t";
	var SINGLE_QUOTE = "\"((\\\\\"|[^\"])*?)\"";
	var DOUBLE_QUOTE = "'((\\\\'|[^'])*?)'";
	var hash = /^#$/;
	var SQ = "'";
	var DQ = "\"";
	var DS = "$";
	var TOKEN = "";
	var mult = 4294967296;
	for (var i = 0; i < 4; i++) TOKEN += (mult * Math.random()).toString(16);
	var startsWithToken = new RegExp("^" + TOKEN);
	function matchAll(s, r) {
		var origIndex = r.lastIndex;
		var matches = [];
		var matchObj;
		while (matchObj = r.exec(s)) {
			matches.push(matchObj);
			if (r.lastIndex === matchObj.index) r.lastIndex += 1;
		}
		r.lastIndex = origIndex;
		return matches;
	}
	function getVar(env, pre, key) {
		var r = typeof env === "function" ? env(key) : env[key];
		if (typeof r === "undefined" && key != "") r = "";
		else if (typeof r === "undefined") r = "$";
		if (typeof r === "object") return pre + TOKEN + JSON.stringify(r) + TOKEN;
		return pre + r;
	}
	function parseInternal(string, env, opts) {
		if (!opts) opts = {};
		var BS = opts.escape || "\\";
		var BAREWORD = "(\\" + BS + "['\"" + META + "]|[^\\s'\"" + META + "])+";
		var matches = matchAll(string, new RegExp(["(" + CONTROL + ")", "(" + BAREWORD + "|" + SINGLE_QUOTE + "|" + DOUBLE_QUOTE + ")+"].join("|"), "g"));
		if (matches.length === 0) return [];
		if (!env) env = {};
		var commented = false;
		return matches.map(function(match) {
			var s = match[0];
			if (!s || commented) return;
			if (controlRE.test(s)) return { op: s };
			var quote = false;
			var esc = false;
			var out = "";
			var isGlob = false;
			var i;
			function parseEnvVar() {
				i += 1;
				var varend;
				var varname;
				var char = s.charAt(i);
				if (char === "{") {
					i += 1;
					if (s.charAt(i) === "}") throw new Error("Bad substitution: " + s.slice(i - 2, i + 1));
					varend = s.indexOf("}", i);
					if (varend < 0) throw new Error("Bad substitution: " + s.slice(i));
					varname = s.slice(i, varend);
					i = varend;
				} else if (/[*@#?$!_-]/.test(char)) {
					varname = char;
					i += 1;
				} else {
					var slicedFromI = s.slice(i);
					varend = slicedFromI.match(/[^\w\d_]/);
					if (!varend) {
						varname = slicedFromI;
						i = s.length;
					} else {
						varname = slicedFromI.slice(0, varend.index);
						i += varend.index - 1;
					}
				}
				return getVar(env, "", varname);
			}
			for (i = 0; i < s.length; i++) {
				var c = s.charAt(i);
				isGlob = isGlob || !quote && (c === "*" || c === "?");
				if (esc) {
					out += c;
					esc = false;
				} else if (quote) if (c === quote) quote = false;
				else if (quote == SQ) out += c;
				else if (c === BS) {
					i += 1;
					c = s.charAt(i);
					if (c === DQ || c === BS || c === DS) out += c;
					else out += BS + c;
				} else if (c === DS) out += parseEnvVar();
				else out += c;
				else if (c === DQ || c === SQ) quote = c;
				else if (controlRE.test(c)) return { op: s };
				else if (hash.test(c)) {
					commented = true;
					var commentObj = { comment: string.slice(match.index + i + 1) };
					if (out.length) return [out, commentObj];
					return [commentObj];
				} else if (c === BS) esc = true;
				else if (c === DS) out += parseEnvVar();
				else out += c;
			}
			if (isGlob) return {
				op: "glob",
				pattern: out
			};
			return out;
		}).reduce(function(prev, arg) {
			return typeof arg === "undefined" ? prev : prev.concat(arg);
		}, []);
	}
	module.exports = function parse(s, env, opts) {
		var mapped = parseInternal(s, env, opts);
		if (typeof env !== "function") return mapped;
		return mapped.reduce(function(acc, s) {
			if (typeof s === "object") return acc.concat(s);
			var xs = s.split(RegExp("(" + TOKEN + ".*?" + TOKEN + ")", "g"));
			if (xs.length === 1) return acc.concat(xs[0]);
			return acc.concat(xs.filter(Boolean).map(function(x) {
				if (startsWithToken.test(x)) return JSON.parse(x.split(TOKEN)[1]);
				return x;
			}));
		}, []);
	};
}));
var require_shell_quote = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	exports.quote = require_quote();
	exports.parse = require_parse$1();
}));
var require_macos = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = {
		"/Applications/Atom.app/Contents/MacOS/Atom": "atom",
		"/Applications/Atom Beta.app/Contents/MacOS/Atom Beta": "/Applications/Atom Beta.app/Contents/MacOS/Atom Beta",
		"/Applications/Brackets.app/Contents/MacOS/Brackets": "brackets",
		"/Applications/Sublime Text.app/Contents/MacOS/Sublime Text": "/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl",
		"/Applications/Sublime Text.app/Contents/MacOS/sublime_text": "/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl",
		"/Applications/Sublime Text 2.app/Contents/MacOS/Sublime Text 2": "/Applications/Sublime Text 2.app/Contents/SharedSupport/bin/subl",
		"/Applications/Sublime Text Dev.app/Contents/MacOS/Sublime Text": "/Applications/Sublime Text Dev.app/Contents/SharedSupport/bin/subl",
		"/Applications/Visual Studio Code.app/Contents/MacOS/Code": "code",
		"/Applications/Visual Studio Code.app/Contents/MacOS/Electron": "code",
		"/Applications/Visual Studio Code - Insiders.app/Contents/MacOS/Code - Insiders": "code-insiders",
		"/Applications/Visual Studio Code - Insiders.app/Contents/MacOS/Electron": "code-insiders",
		"/Applications/VSCodium.app/Contents/MacOS/Electron": "codium",
		"/Applications/Cursor.app/Contents/MacOS/Cursor": "cursor",
		"/Applications/Trae.app/Contents/MacOS/Electron": "trae",
		"/Applications/Antigravity.app/Contents/MacOS/Electron": "antigravity",
		"/Applications/AppCode.app/Contents/MacOS/appcode": "/Applications/AppCode.app/Contents/MacOS/appcode",
		"/Applications/CLion.app/Contents/MacOS/clion": "/Applications/CLion.app/Contents/MacOS/clion",
		"/Applications/IntelliJ IDEA.app/Contents/MacOS/idea": "/Applications/IntelliJ IDEA.app/Contents/MacOS/idea",
		"/Applications/IntelliJ IDEA Ultimate.app/Contents/MacOS/idea": "/Applications/IntelliJ IDEA Ultimate.app/Contents/MacOS/idea",
		"/Applications/IntelliJ IDEA Community Edition.app/Contents/MacOS/idea": "/Applications/IntelliJ IDEA Community Edition.app/Contents/MacOS/idea",
		"/Applications/PhpStorm.app/Contents/MacOS/phpstorm": "/Applications/PhpStorm.app/Contents/MacOS/phpstorm",
		"/Applications/PyCharm.app/Contents/MacOS/pycharm": "/Applications/PyCharm.app/Contents/MacOS/pycharm",
		"/Applications/PyCharm CE.app/Contents/MacOS/pycharm": "/Applications/PyCharm CE.app/Contents/MacOS/pycharm",
		"/Applications/RubyMine.app/Contents/MacOS/rubymine": "/Applications/RubyMine.app/Contents/MacOS/rubymine",
		"/Applications/WebStorm.app/Contents/MacOS/webstorm": "/Applications/WebStorm.app/Contents/MacOS/webstorm",
		"/Applications/MacVim.app/Contents/MacOS/MacVim": "mvim",
		"/Applications/GoLand.app/Contents/MacOS/goland": "/Applications/GoLand.app/Contents/MacOS/goland",
		"/Applications/Rider.app/Contents/MacOS/rider": "/Applications/Rider.app/Contents/MacOS/rider",
		"/Applications/Zed.app/Contents/MacOS/zed": "zed"
	};
}));
var require_linux = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = {
		atom: "atom",
		Brackets: "brackets",
		"code-insiders": "code-insiders",
		code: "code",
		vscodium: "vscodium",
		codium: "codium",
		cursor: "cursor",
		trae: "trae",
		antigravity: "antigravity",
		emacs: "emacs",
		gvim: "gvim",
		idea: "idea",
		"idea.sh": "idea",
		phpstorm: "phpstorm",
		"phpstorm.sh": "phpstorm",
		pycharm: "pycharm",
		"pycharm.sh": "pycharm",
		rubymine: "rubymine",
		"rubymine.sh": "rubymine",
		sublime_text: "subl",
		vim: "vim",
		webstorm: "webstorm",
		"webstorm.sh": "webstorm",
		goland: "goland",
		"goland.sh": "goland",
		rider: "rider",
		"rider.sh": "rider",
		zed: "zed"
	};
}));
var require_windows$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = [
		"Brackets.exe",
		"Code.exe",
		"Code - Insiders.exe",
		"VSCodium.exe",
		"Cursor.exe",
		"atom.exe",
		"sublime_text.exe",
		"notepad++.exe",
		"clion.exe",
		"clion64.exe",
		"idea.exe",
		"idea64.exe",
		"phpstorm.exe",
		"phpstorm64.exe",
		"pycharm.exe",
		"pycharm64.exe",
		"rubymine.exe",
		"rubymine64.exe",
		"webstorm.exe",
		"webstorm64.exe",
		"goland.exe",
		"goland64.exe",
		"rider.exe",
		"rider64.exe",
		"Trae.exe",
		"zed.exe",
		"Antigravity.exe"
	];
}));
var require_guess = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const path$9 = __require$2("path");
	const shellQuote = require_shell_quote();
	const childProcess$2 = __require$2("child_process");
	const COMMON_EDITORS_MACOS = require_macos();
	const COMMON_EDITORS_LINUX = require_linux();
	const COMMON_EDITORS_WIN = require_windows$1();
	function getEditorFromMacProcesses(output) {
		const processNames = Object.keys(COMMON_EDITORS_MACOS);
		const processList = output.split("\n");
		for (let i = 0; i < processNames.length; i++) {
			const processName = processNames[i];
			if (processList.includes(processName)) return COMMON_EDITORS_MACOS[processName];
			const processNameWithoutApplications = processName.replace("/Applications", "");
			if (output.indexOf(processNameWithoutApplications) !== -1) {
				if (processName !== COMMON_EDITORS_MACOS[processName]) return COMMON_EDITORS_MACOS[processName];
				const runningProcess = processList.find((procName) => procName.endsWith(processNameWithoutApplications));
				if (runningProcess !== void 0) return runningProcess;
			}
		}
	}
	function getEditorFromWindowsProcesses(output) {
		const runningProcesses = output.split("\r\n");
		for (let i = 0; i < runningProcesses.length; i++) {
			const fullProcessPath = runningProcesses[i].trim();
			const shortProcessName = path$9.win32.basename(fullProcessPath);
			if (COMMON_EDITORS_WIN.indexOf(shortProcessName) !== -1) return fullProcessPath;
		}
	}
	function getEditorFromLinuxProcesses(output) {
		const processNames = Object.keys(COMMON_EDITORS_LINUX);
		for (let i = 0; i < processNames.length; i++) {
			const processName = processNames[i];
			if (output.indexOf(processName) !== -1) return COMMON_EDITORS_LINUX[processName];
		}
	}
	function guessEditor(specifiedEditor) {
		if (specifiedEditor) return shellQuote.parse(specifiedEditor);
		if (process.env.LAUNCH_EDITOR) return [process.env.LAUNCH_EDITOR];
		if (process.versions.webcontainer) return [process.env.EDITOR || "code"];
		try {
			if (process.platform === "darwin") {
				const editor = getEditorFromMacProcesses(childProcess$2.execSync("ps x -o comm=", { stdio: [
					"pipe",
					"pipe",
					"ignore"
				] }).toString());
				if (editor !== void 0) return [editor];
			} else if (process.platform === "win32") {
				const editor = getEditorFromWindowsProcesses(childProcess$2.execSync("powershell -NoProfile -Command \"[Console]::OutputEncoding=[Text.Encoding]::UTF8;Get-CimInstance -Query \\\"select executablepath from win32_process where executablepath is not null\\\" | % { $_.ExecutablePath }\"", { stdio: [
					"pipe",
					"pipe",
					"ignore"
				] }).toString());
				if (editor !== void 0) return [editor];
			} else if (process.platform === "linux") {
				const editor = getEditorFromLinuxProcesses(childProcess$2.execSync("ps x --no-heading -o comm --sort=comm", { stdio: [
					"pipe",
					"pipe",
					"ignore"
				] }).toString());
				if (editor !== void 0) return [editor];
			}
		} catch (ignoreError) {}
		if (process.env.VISUAL) return [process.env.VISUAL];
		else if (process.env.EDITOR) return [process.env.EDITOR];
		return [null];
	}
	module.exports = guessEditor;
	module.exports.getEditorFromMacProcesses = getEditorFromMacProcesses;
	module.exports.getEditorFromWindowsProcesses = getEditorFromWindowsProcesses;
	module.exports.getEditorFromLinuxProcesses = getEditorFromLinuxProcesses;
}));
var require_get_args = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const path$8 = __require$2("path");
	module.exports = function getArgumentsForPosition(editor, fileName, lineNumber, columnNumber = 1) {
		switch (path$8.basename(editor).replace(/\.(exe|cmd|bat)$/i, "")) {
			case "atom":
			case "Atom":
			case "Atom Beta":
			case "subl":
			case "sublime":
			case "sublime_text":
			case "wstorm":
			case "charm":
			case "zed": return [`${fileName}:${lineNumber}:${columnNumber}`];
			case "notepad++": return [
				"-n" + lineNumber,
				"-c" + columnNumber,
				fileName
			];
			case "vim":
			case "mvim": return [`+call cursor(${lineNumber}, ${columnNumber})`, fileName];
			case "joe":
			case "gvim": return [`+${lineNumber}`, fileName];
			case "emacs":
			case "emacsclient": return [`+${lineNumber}:${columnNumber}`, fileName];
			case "rmate":
			case "mate":
			case "mine": return [
				"--line",
				lineNumber,
				fileName
			];
			case "code":
			case "Code":
			case "code-insiders":
			case "Code - Insiders":
			case "codium":
			case "trae":
			case "antigravity":
			case "cursor":
			case "vscodium":
			case "VSCodium": return [
				"-r",
				"-g",
				`${fileName}:${lineNumber}:${columnNumber}`
			];
			case "appcode":
			case "clion":
			case "clion64":
			case "idea":
			case "idea64":
			case "phpstorm":
			case "phpstorm64":
			case "pycharm":
			case "pycharm64":
			case "rubymine":
			case "rubymine64":
			case "webstorm":
			case "webstorm64":
			case "goland":
			case "goland64":
			case "rider":
			case "rider64": return [
				"--line",
				lineNumber,
				"--column",
				columnNumber,
				fileName
			];
		}
		if (process.env.LAUNCH_EDITOR) return [
			fileName,
			lineNumber,
			columnNumber
		];
		return [fileName];
	};
}));
var require_launch_editor = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Copyright (c) 2015-present, Facebook, Inc.
	*
	* This source code is licensed under the MIT license found in the
	* LICENSE file at
	* https://github.com/facebookincubator/create-react-app/blob/master/LICENSE
	*
	* Modified by Yuxi Evan You
	*/
	const fs$6 = __require$2("fs");
	const os$2 = __require$2("os");
	const path$7 = __require$2("path");
	const colors = require_picocolors();
	const childProcess$1 = __require$2("child_process");
	const guessEditor = require_guess();
	const getArgumentsForPosition = require_get_args();
	function wrapErrorCallback(cb) {
		return (fileName, errorMessage) => {
			console.log();
			console.log(colors.red("Could not open " + path$7.basename(fileName) + " in the editor."));
			if (errorMessage) {
				if (errorMessage[errorMessage.length - 1] !== ".") errorMessage += ".";
				console.log(colors.red("The editor process exited with an error: " + errorMessage));
			}
			console.log();
			if (cb) cb(fileName, errorMessage);
		};
	}
	function isTerminalEditor(editor) {
		switch (editor) {
			case "vim":
			case "emacs":
			case "nano": return true;
		}
		return false;
	}
	const positionRE = /:(\d+)(:(\d+))?$/;
	function parseFile(file) {
		if (file.startsWith("file://")) file = __require$2("url").fileURLToPath(file);
		const fileName = file.replace(positionRE, "");
		const match = file.match(positionRE);
		return {
			fileName,
			lineNumber: match && match[1],
			columnNumber: match && match[3]
		};
	}
	let currentChildProcess = null;
	function launchEditor(file, specifiedEditor, onErrorCallback) {
		const parsed = parseFile(file);
		let { fileName } = parsed;
		const { lineNumber, columnNumber } = parsed;
		if (process.platform === "win32" && path$7.resolve(fileName).startsWith("\\\\")) return onErrorCallback(fileName, "UNC paths are not supported on Windows to avoid security issues. See https://github.com/vitejs/launch-editor/tree/main/packages/launch-editor#unc-paths-on-windows for details.");
		if (!fs$6.existsSync(fileName)) return;
		if (typeof specifiedEditor === "function") {
			onErrorCallback = specifiedEditor;
			specifiedEditor = void 0;
		}
		onErrorCallback = wrapErrorCallback(onErrorCallback);
		const [editor, ...args] = guessEditor(specifiedEditor);
		if (!editor) {
			onErrorCallback(fileName, null);
			return;
		}
		if (process.platform === "linux" && fileName.startsWith("/mnt/") && /Microsoft/i.test(os$2.release())) fileName = path$7.relative("", fileName);
		if (lineNumber) {
			const extraArgs = getArgumentsForPosition(editor, fileName, lineNumber, columnNumber);
			args.push.apply(args, extraArgs);
		} else args.push(fileName);
		if (currentChildProcess && isTerminalEditor(editor)) currentChildProcess.kill("SIGKILL");
		if (process.platform === "win32") {
			function escapeCmdArgs(cmdArgs) {
				return cmdArgs.replace(/([&|<>,;=^])/g, "^$1");
			}
			function doubleQuoteIfNeeded(str) {
				if (str.includes("^")) return `^"${str}^"`;
				else if (str.includes(" ")) return `"${str}"`;
				return str;
			}
			const launchCommand = [editor, ...args.map(escapeCmdArgs)].map(doubleQuoteIfNeeded).join(" ");
			currentChildProcess = childProcess$1.exec(launchCommand, {
				stdio: "inherit",
				shell: true
			});
		} else currentChildProcess = childProcess$1.spawn(editor, args, { stdio: "inherit" });
		currentChildProcess.on("exit", function(errorCode) {
			currentChildProcess = null;
			if (errorCode) onErrorCallback(fileName, "(code " + errorCode + ")");
		});
		currentChildProcess.on("error", function(error) {
			let { code, message } = error;
			if ("ENOENT" === code) message = `${message} ('${editor}' command does not exist in 'PATH')`;
			onErrorCallback(fileName, message);
		});
	}
	module.exports = launchEditor;
}));
var require_launch_editor_middleware = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const path$6 = __require$2("path");
	const launch = require_launch_editor();
	module.exports = (specifiedEditor, srcRoot, onErrorCallback) => {
		if (typeof specifiedEditor === "function") {
			onErrorCallback = specifiedEditor;
			specifiedEditor = void 0;
		}
		if (typeof srcRoot === "function") {
			onErrorCallback = srcRoot;
			srcRoot = void 0;
		}
		srcRoot = srcRoot || process.cwd();
		return function launchEditorMiddleware(req, res) {
			let url;
			try {
				const fullUrl = req.url.startsWith("http") ? req.url : `http://localhost${req.url}`;
				url = new URL(fullUrl);
			} catch (_err) {
				res.statusCode = 500;
				res.end(`launch-editor-middleware: invalid URL.`);
				return;
			}
			const file = url.searchParams.get("file");
			if (!file) {
				res.statusCode = 500;
				res.end(`launch-editor-middleware: required query param "file" is missing.`);
			} else {
				const resolved = file.startsWith("file://") ? file : path$6.resolve(srcRoot, file);
				launch(resolved, specifiedEditor, onErrorCallback);
				res.end();
			}
		};
	};
}));
var require_dist = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var src_exports = {};
	__export(src_exports, {
		KNOWN_AGENTS: () => KNOWN_AGENTS,
		determineAgent: () => determineAgent
	});
	module.exports = __toCommonJS(src_exports);
	var import_promises = __require$2("node:fs/promises");
	var import_node_fs = __require$2("node:fs");
	const DEVIN_LOCAL_PATH = "/opt/.devin";
	const CURSOR = "cursor";
	const CURSOR_CLI = "cursor-cli";
	const CLAUDE = "claude";
	const COWORK = "cowork";
	const DEVIN = "devin";
	const REPLIT = "replit";
	const GEMINI = "gemini";
	const CODEX = "codex";
	const ANTIGRAVITY = "antigravity";
	const AUGMENT_CLI = "augment-cli";
	const OPENCODE = "opencode";
	const GITHUB_COPILOT = "github-copilot";
	const GITHUB_COPILOT_CLI = "github-copilot-cli";
	const V0 = "v0";
	const KNOWN_AGENTS = {
		CURSOR,
		CURSOR_CLI,
		CLAUDE,
		COWORK,
		DEVIN,
		REPLIT,
		GEMINI,
		CODEX,
		ANTIGRAVITY,
		AUGMENT_CLI,
		OPENCODE,
		GITHUB_COPILOT,
		V0
	};
	async function determineAgent() {
		if (process.env.AI_AGENT) {
			const name = process.env.AI_AGENT.trim();
			if (name) {
				if (name === GITHUB_COPILOT || name === GITHUB_COPILOT_CLI) return {
					isAgent: true,
					agent: { name: GITHUB_COPILOT }
				};
				if (name === V0) return {
					isAgent: true,
					agent: { name: V0 }
				};
				return {
					isAgent: true,
					agent: { name }
				};
			}
		}
		if (process.env.CURSOR_TRACE_ID) return {
			isAgent: true,
			agent: { name: CURSOR }
		};
		if (process.env.CURSOR_AGENT || process.env.CURSOR_EXTENSION_HOST_ROLE === "agent-exec") return {
			isAgent: true,
			agent: { name: CURSOR_CLI }
		};
		if (process.env.GEMINI_CLI) return {
			isAgent: true,
			agent: { name: GEMINI }
		};
		if (process.env.CODEX_SANDBOX || process.env.CODEX_CI || process.env.CODEX_THREAD_ID) return {
			isAgent: true,
			agent: { name: CODEX }
		};
		if (process.env.ANTIGRAVITY_AGENT) return {
			isAgent: true,
			agent: { name: ANTIGRAVITY }
		};
		if (process.env.AUGMENT_AGENT) return {
			isAgent: true,
			agent: { name: AUGMENT_CLI }
		};
		if (process.env.OPENCODE_CLIENT) return {
			isAgent: true,
			agent: { name: OPENCODE }
		};
		if (process.env.CLAUDECODE || process.env.CLAUDE_CODE) {
			if (process.env.CLAUDE_CODE_IS_COWORK) return {
				isAgent: true,
				agent: { name: COWORK }
			};
			return {
				isAgent: true,
				agent: { name: CLAUDE }
			};
		}
		if (process.env.REPL_ID) return {
			isAgent: true,
			agent: { name: REPLIT }
		};
		if (process.env.COPILOT_MODEL || process.env.COPILOT_ALLOW_ALL || process.env.COPILOT_GITHUB_TOKEN) return {
			isAgent: true,
			agent: { name: GITHUB_COPILOT }
		};
		try {
			await (0, import_promises.access)(DEVIN_LOCAL_PATH, import_node_fs.constants.F_OK);
			return {
				isAgent: true,
				agent: { name: DEVIN }
			};
		} catch (_error) {}
		return {
			isAgent: false,
			agent: void 0
		};
	}
	0 && (module.exports = {
		KNOWN_AGENTS,
		determineAgent
	});
}));
new RegExp(`\\.(?:json|json5)(?:$|\\?)`);
let isDockerCached;
function hasDockerEnv() {
	try {
		fs.statSync("/.dockerenv");
		return true;
	} catch {
		return false;
	}
}
function hasDockerCGroup() {
	try {
		return fs.readFileSync("/proc/self/cgroup", "utf8").includes("docker");
	} catch {
		return false;
	}
}
function isDocker() {
	if (isDockerCached === void 0) isDockerCached = hasDockerEnv() || hasDockerCGroup();
	return isDockerCached;
}
let cachedResult;
const hasContainerEnv = () => {
	try {
		fs.statSync("/run/.containerenv");
		return true;
	} catch {
		return false;
	}
};
function isInsideContainer() {
	if (cachedResult === void 0) cachedResult = hasContainerEnv() || isDocker();
	return cachedResult;
}
const isWsl = () => {
	if (g$1.platform !== "linux") return false;
	if (nodeos__default.release().toLowerCase().includes("microsoft")) {
		if (isInsideContainer()) return false;
		return true;
	}
	try {
		return fs.readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft") ? !isInsideContainer() : false;
	} catch {
		return false;
	}
};
var is_wsl_default = g$1.env.__IS_WSL_TEST__ ? isWsl : isWsl();
(() => {
	const defaultMountPoint = "/mnt/";
	let mountPoint;
	return async function() {
		if (mountPoint) return mountPoint;
		const configFilePath = "/etc/wsl.conf";
		let isConfigFileExists = false;
		try {
			await fsp.access(configFilePath, constants.F_OK);
			isConfigFileExists = true;
		} catch {}
		if (!isConfigFileExists) return defaultMountPoint;
		const configContent = await fsp.readFile(configFilePath, { encoding: "utf8" });
		const configMountPoint = /(?<!#.*)root\s*=\s*(?<mountPoint>.*)/g.exec(configContent);
		if (!configMountPoint) return defaultMountPoint;
		mountPoint = configMountPoint.groups.mountPoint.trim();
		mountPoint = mountPoint.endsWith("/") ? mountPoint : `${mountPoint}/`;
		return mountPoint;
	};
})();
function defineLazyProperty(object, propertyName, valueGetter) {
	const define = (value) => Object.defineProperty(object, propertyName, {
		value,
		enumerable: true,
		writable: true
	});
	Object.defineProperty(object, propertyName, {
		configurable: true,
		enumerable: true,
		get() {
			const result = valueGetter();
			define(result);
			return result;
		},
		set(value) {
			define(value);
		}
	});
	return object;
}
promisify(execFile);
promisify(execFile);
promisify(execFile);
new Map(Object.entries({
	MSEdgeHTM: {
		name: "Edge",
		id: "com.microsoft.edge"
	},
	MSEdgeBHTML: {
		name: "Edge Beta",
		id: "com.microsoft.edge.beta"
	},
	MSEdgeDHTML: {
		name: "Edge Dev",
		id: "com.microsoft.edge.dev"
	},
	AppXq0fevzme2pys62n3e0fbqa7peapykr8v: {
		name: "Edge",
		id: "com.microsoft.edge.old"
	},
	ChromeHTML: {
		name: "Chrome",
		id: "com.google.chrome"
	},
	ChromeBHTML: {
		name: "Chrome Beta",
		id: "com.google.chrome.beta"
	},
	ChromeDHTML: {
		name: "Chrome Dev",
		id: "com.google.chrome.dev"
	},
	ChromiumHTM: {
		name: "Chromium",
		id: "org.chromium.Chromium"
	},
	BraveHTML: {
		name: "Brave",
		id: "com.brave.Browser"
	},
	BraveBHTML: {
		name: "Brave Beta",
		id: "com.brave.Browser.beta"
	},
	BraveDHTML: {
		name: "Brave Dev",
		id: "com.brave.Browser.dev"
	},
	BraveSSHTM: {
		name: "Brave Nightly",
		id: "com.brave.Browser.nightly"
	},
	FirefoxURL: {
		name: "Firefox",
		id: "org.mozilla.firefox"
	},
	OperaStable: {
		name: "Opera",
		id: "com.operasoftware.Opera"
	},
	VivaldiHTM: {
		name: "Vivaldi",
		id: "com.vivaldi.Vivaldi"
	},
	"IE.HTTP": {
		name: "Internet Explorer",
		id: "com.microsoft.ie"
	}
}));
promisify(execFile);
promisify(childProcess.execFile);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
path.join(__dirname$1, "xdg-open");
const { platform, arch } = g$1;
function detectArchBinary(binary) {
	if (typeof binary === "string" || Array.isArray(binary)) return binary;
	const { [arch]: archBinary } = binary;
	if (!archBinary) throw new Error(`${arch} is not supported`);
	return archBinary;
}
function detectPlatformBinary({ [platform]: platformBinary }, { wsl }) {
	if (wsl && is_wsl_default) return detectArchBinary(wsl);
	if (!platformBinary) throw new Error(`${platform} is not supported`);
	return detectArchBinary(platformBinary);
}
const apps = {};
defineLazyProperty(apps, "chrome", () => detectPlatformBinary({
	darwin: "google chrome",
	win32: "chrome",
	linux: [
		"google-chrome",
		"google-chrome-stable",
		"chromium"
	]
}, { wsl: {
	ia32: "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
	x64: ["/mnt/c/Program Files/Google/Chrome/Application/chrome.exe", "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe"]
} }));
defineLazyProperty(apps, "brave", () => detectPlatformBinary({
	darwin: "brave browser",
	win32: "brave",
	linux: ["brave-browser", "brave"]
}, { wsl: {
	ia32: "/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe",
	x64: ["/mnt/c/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe", "/mnt/c/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe"]
} }));
defineLazyProperty(apps, "firefox", () => detectPlatformBinary({
	darwin: "firefox",
	win32: String.raw`C:\Program Files\Mozilla Firefox\firefox.exe`,
	linux: "firefox"
}, { wsl: "/mnt/c/Program Files/Mozilla Firefox/firefox.exe" }));
defineLazyProperty(apps, "edge", () => detectPlatformBinary({
	darwin: "microsoft edge",
	win32: "msedge",
	linux: ["microsoft-edge", "microsoft-edge-dev"]
}, { wsl: "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" }));
defineLazyProperty(apps, "browser", () => "browser");
defineLazyProperty(apps, "browserPrivate", () => "browserPrivate");
var require_windows = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = isexe;
	isexe.sync = sync;
	var fs$5 = __require$2("fs");
	function checkPathExt(path, options) {
		var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
		if (!pathext) return true;
		pathext = pathext.split(";");
		if (pathext.indexOf("") !== -1) return true;
		for (var i = 0; i < pathext.length; i++) {
			var p = pathext[i].toLowerCase();
			if (p && path.substr(-p.length).toLowerCase() === p) return true;
		}
		return false;
	}
	function checkStat(stat, path, options) {
		if (!stat.isSymbolicLink() && !stat.isFile()) return false;
		return checkPathExt(path, options);
	}
	function isexe(path, options, cb) {
		fs$5.stat(path, function(er, stat) {
			cb(er, er ? false : checkStat(stat, path, options));
		});
	}
	function sync(path, options) {
		return checkStat(fs$5.statSync(path), path, options);
	}
}));
var require_mode = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = isexe;
	isexe.sync = sync;
	var fs$4 = __require$2("fs");
	function isexe(path, options, cb) {
		fs$4.stat(path, function(er, stat) {
			cb(er, er ? false : checkStat(stat, options));
		});
	}
	function sync(path, options) {
		return checkStat(fs$4.statSync(path), options);
	}
	function checkStat(stat, options) {
		return stat.isFile() && checkMode(stat, options);
	}
	function checkMode(stat, options) {
		var mod = stat.mode;
		var uid = stat.uid;
		var gid = stat.gid;
		var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
		var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
		var u = parseInt("100", 8);
		var g = parseInt("010", 8);
		var o = parseInt("001", 8);
		var ug = u | g;
		return mod & o || mod & g && gid === myGid || mod & u && uid === myUid || mod & ug && myUid === 0;
	}
}));
var require_isexe = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	__require$2("fs");
	var core;
	if (process.platform === "win32" || global.TESTING_WINDOWS) core = require_windows();
	else core = require_mode();
	module.exports = isexe;
	isexe.sync = sync;
	function isexe(path, options, cb) {
		if (typeof options === "function") {
			cb = options;
			options = {};
		}
		if (!cb) {
			if (typeof Promise !== "function") throw new TypeError("callback not provided");
			return new Promise(function(resolve, reject) {
				isexe(path, options || {}, function(er, is) {
					if (er) reject(er);
					else resolve(is);
				});
			});
		}
		core(path, options || {}, function(er, is) {
			if (er) {
				if (er.code === "EACCES" || options && options.ignoreErrors) {
					er = null;
					is = false;
				}
			}
			cb(er, is);
		});
	}
	function sync(path, options) {
		try {
			return core.sync(path, options || {});
		} catch (er) {
			if (options && options.ignoreErrors || er.code === "EACCES") return false;
			else throw er;
		}
	}
}));
var require_which = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const isWindows = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
	const path$5 = __require$2("path");
	const COLON = isWindows ? ";" : ":";
	const isexe = require_isexe();
	const getNotFoundError = (cmd) => Object.assign(/* @__PURE__ */ new Error(`not found: ${cmd}`), { code: "ENOENT" });
	const getPathInfo = (cmd, opt) => {
		const colon = opt.colon || COLON;
		const pathEnv = cmd.match(/\//) || isWindows && cmd.match(/\\/) ? [""] : [...isWindows ? [process.cwd()] : [], ...(opt.path || process.env.PATH || "").split(colon)];
		const pathExtExe = isWindows ? opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
		const pathExt = isWindows ? pathExtExe.split(colon) : [""];
		if (isWindows) {
			if (cmd.indexOf(".") !== -1 && pathExt[0] !== "") pathExt.unshift("");
		}
		return {
			pathEnv,
			pathExt,
			pathExtExe
		};
	};
	const which = (cmd, opt, cb) => {
		if (typeof opt === "function") {
			cb = opt;
			opt = {};
		}
		if (!opt) opt = {};
		const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
		const found = [];
		const step = (i) => new Promise((resolve, reject) => {
			if (i === pathEnv.length) return opt.all && found.length ? resolve(found) : reject(getNotFoundError(cmd));
			const ppRaw = pathEnv[i];
			const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
			const pCmd = path$5.join(pathPart, cmd);
			const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
			resolve(subStep(p, i, 0));
		});
		const subStep = (p, i, ii) => new Promise((resolve, reject) => {
			if (ii === pathExt.length) return resolve(step(i + 1));
			const ext = pathExt[ii];
			isexe(p + ext, { pathExt: pathExtExe }, (er, is) => {
				if (!er && is) if (opt.all) found.push(p + ext);
				else return resolve(p + ext);
				return resolve(subStep(p, i, ii + 1));
			});
		});
		return cb ? step(0).then((res) => cb(null, res), cb) : step(0);
	};
	const whichSync = (cmd, opt) => {
		opt = opt || {};
		const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
		const found = [];
		for (let i = 0; i < pathEnv.length; i++) {
			const ppRaw = pathEnv[i];
			const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
			const pCmd = path$5.join(pathPart, cmd);
			const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
			for (let j = 0; j < pathExt.length; j++) {
				const cur = p + pathExt[j];
				try {
					if (isexe.sync(cur, { pathExt: pathExtExe })) if (opt.all) found.push(cur);
					else return cur;
				} catch (ex) {}
			}
		}
		if (opt.all && found.length) return found;
		if (opt.nothrow) return null;
		throw getNotFoundError(cmd);
	};
	module.exports = which;
	which.sync = whichSync;
}));
var require_path_key = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const pathKey = (options = {}) => {
		const environment = options.env || process.env;
		if ((options.platform || process.platform) !== "win32") return "PATH";
		return Object.keys(environment).reverse().find((key) => key.toUpperCase() === "PATH") || "Path";
	};
	module.exports = pathKey;
	module.exports.default = pathKey;
}));
var require_resolveCommand = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const path$4 = __require$2("path");
	const which = require_which();
	const getPathKey = require_path_key();
	function resolveCommandAttempt(parsed, withoutPathExt) {
		const env = parsed.options.env || process.env;
		const cwd = process.cwd();
		const hasCustomCwd = parsed.options.cwd != null;
		const shouldSwitchCwd = hasCustomCwd && process.chdir !== void 0 && !process.chdir.disabled;
		if (shouldSwitchCwd) try {
			process.chdir(parsed.options.cwd);
		} catch (err) {}
		let resolved;
		try {
			resolved = which.sync(parsed.command, {
				path: env[getPathKey({ env })],
				pathExt: withoutPathExt ? path$4.delimiter : void 0
			});
		} catch (e) {} finally {
			if (shouldSwitchCwd) process.chdir(cwd);
		}
		if (resolved) resolved = path$4.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
		return resolved;
	}
	function resolveCommand(parsed) {
		return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
	}
	module.exports = resolveCommand;
}));
var require_escape = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
	function escapeCommand(arg) {
		arg = arg.replace(metaCharsRegExp, "^$1");
		return arg;
	}
	function escapeArgument(arg, doubleEscapeMetaChars) {
		arg = `${arg}`;
		arg = arg.replace(/(?=(\\+?)?)\1"/g, "$1$1\\\"");
		arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1");
		arg = `"${arg}"`;
		arg = arg.replace(metaCharsRegExp, "^$1");
		if (doubleEscapeMetaChars) arg = arg.replace(metaCharsRegExp, "^$1");
		return arg;
	}
	module.exports.command = escapeCommand;
	module.exports.argument = escapeArgument;
}));
var require_shebang_regex = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	module.exports = /^#!(.*)/;
}));
var require_shebang_command = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const shebangRegex = require_shebang_regex();
	module.exports = (string = "") => {
		const match = string.match(shebangRegex);
		if (!match) return null;
		const [path, argument] = match[0].replace(/#! ?/, "").split(" ");
		const binary = path.split("/").pop();
		if (binary === "env") return argument;
		return argument ? `${binary} ${argument}` : binary;
	};
}));
var require_readShebang = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const fs$3 = __require$2("fs");
	const shebangCommand = require_shebang_command();
	function readShebang(command) {
		const size = 150;
		const buffer = Buffer.alloc(size);
		let fd;
		try {
			fd = fs$3.openSync(command, "r");
			fs$3.readSync(fd, buffer, 0, size, 0);
			fs$3.closeSync(fd);
		} catch (e) {}
		return shebangCommand(buffer.toString());
	}
	module.exports = readShebang;
}));
var require_parse = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const path$3 = __require$2("path");
	const resolveCommand = require_resolveCommand();
	const escape = require_escape();
	const readShebang = require_readShebang();
	const isWin = process.platform === "win32";
	const isExecutableRegExp = /\.(?:com|exe)$/i;
	const isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
	function detectShebang(parsed) {
		parsed.file = resolveCommand(parsed);
		const shebang = parsed.file && readShebang(parsed.file);
		if (shebang) {
			parsed.args.unshift(parsed.file);
			parsed.command = shebang;
			return resolveCommand(parsed);
		}
		return parsed.file;
	}
	function parseNonShell(parsed) {
		if (!isWin) return parsed;
		const commandFile = detectShebang(parsed);
		const needsShell = !isExecutableRegExp.test(commandFile);
		if (parsed.options.forceShell || needsShell) {
			const needsDoubleEscapeMetaChars = isCmdShimRegExp.test(commandFile);
			parsed.command = path$3.normalize(parsed.command);
			parsed.command = escape.command(parsed.command);
			parsed.args = parsed.args.map((arg) => escape.argument(arg, needsDoubleEscapeMetaChars));
			parsed.args = [
				"/d",
				"/s",
				"/c",
				`"${[parsed.command].concat(parsed.args).join(" ")}"`
			];
			parsed.command = process.env.comspec || "cmd.exe";
			parsed.options.windowsVerbatimArguments = true;
		}
		return parsed;
	}
	function parse(command, args, options) {
		if (args && !Array.isArray(args)) {
			options = args;
			args = null;
		}
		args = args ? args.slice(0) : [];
		options = Object.assign({}, options);
		const parsed = {
			command,
			args,
			options,
			file: void 0,
			original: {
				command,
				args
			}
		};
		return options.shell ? parsed : parseNonShell(parsed);
	}
	module.exports = parse;
}));
var require_enoent = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const isWin = process.platform === "win32";
	function notFoundError(original, syscall) {
		return Object.assign(/* @__PURE__ */ new Error(`${syscall} ${original.command} ENOENT`), {
			code: "ENOENT",
			errno: "ENOENT",
			syscall: `${syscall} ${original.command}`,
			path: original.command,
			spawnargs: original.args
		});
	}
	function hookChildProcess(cp, parsed) {
		if (!isWin) return;
		const originalEmit = cp.emit;
		cp.emit = function(name, arg1) {
			if (name === "exit") {
				const err = verifyENOENT(arg1, parsed);
				if (err) return originalEmit.call(cp, "error", err);
			}
			return originalEmit.apply(cp, arguments);
		};
	}
	function verifyENOENT(status, parsed) {
		if (isWin && status === 1 && !parsed.file) return notFoundError(parsed.original, "spawn");
		return null;
	}
	function verifyENOENTSync(status, parsed) {
		if (isWin && status === 1 && !parsed.file) return notFoundError(parsed.original, "spawnSync");
		return null;
	}
	module.exports = {
		hookChildProcess,
		verifyENOENT,
		verifyENOENTSync,
		notFoundError
	};
}));
(/* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const cp = __require$2("child_process");
	const parse = require_parse();
	const enoent = require_enoent();
	function spawn(command, args, options) {
		const parsed = parse(command, args, options);
		const spawned = cp.spawn(parsed.command, parsed.args, parsed.options);
		enoent.hookChildProcess(spawned, parsed);
		return spawned;
	}
	function spawnSync(command, args, options) {
		const parsed = parse(command, args, options);
		const result = cp.spawnSync(parsed.command, parsed.args, parsed.options);
		result.error = result.error || enoent.verifyENOENTSync(result.status, parsed);
		return result;
	}
	module.exports = spawn;
	module.exports.spawn = spawn;
	module.exports.sync = spawnSync;
	module.exports._parse = parse;
	module.exports._enoent = enoent;
})))();
var require_constants = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const BINARY_TYPES = [
		"nodebuffer",
		"arraybuffer",
		"fragments"
	];
	const hasBlob = typeof Blob !== "undefined";
	if (hasBlob) BINARY_TYPES.push("blob");
	module.exports = {
		BINARY_TYPES,
		CLOSE_TIMEOUT: 3e4,
		EMPTY_BUFFER: Buffer.alloc(0),
		GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
		hasBlob,
		kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
		kListener: Symbol("kListener"),
		kStatusCode: Symbol("status-code"),
		kWebSocket: Symbol("websocket"),
		NOOP: () => {}
	};
}));
var require_buffer_util = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const { EMPTY_BUFFER } = require_constants();
	const FastBuffer = Buffer[Symbol.species];
	/**
	* Merges an array of buffers into a new buffer.
	*
	* @param {Buffer[]} list The array of buffers to concat
	* @param {Number} totalLength The total length of buffers in the list
	* @return {Buffer} The resulting buffer
	* @public
	*/
	function concat(list, totalLength) {
		if (list.length === 0) return EMPTY_BUFFER;
		if (list.length === 1) return list[0];
		const target = Buffer.allocUnsafe(totalLength);
		let offset = 0;
		for (let i = 0; i < list.length; i++) {
			const buf = list[i];
			target.set(buf, offset);
			offset += buf.length;
		}
		if (offset < totalLength) return new FastBuffer(target.buffer, target.byteOffset, offset);
		return target;
	}
	/**
	* Masks a buffer using the given mask.
	*
	* @param {Buffer} source The buffer to mask
	* @param {Buffer} mask The mask to use
	* @param {Buffer} output The buffer where to store the result
	* @param {Number} offset The offset at which to start writing
	* @param {Number} length The number of bytes to mask.
	* @public
	*/
	function _mask(source, mask, output, offset, length) {
		for (let i = 0; i < length; i++) output[offset + i] = source[i] ^ mask[i & 3];
	}
	/**
	* Unmasks a buffer using the given mask.
	*
	* @param {Buffer} buffer The buffer to unmask
	* @param {Buffer} mask The mask to use
	* @public
	*/
	function _unmask(buffer, mask) {
		for (let i = 0; i < buffer.length; i++) buffer[i] ^= mask[i & 3];
	}
	/**
	* Converts a buffer to an `ArrayBuffer`.
	*
	* @param {Buffer} buf The buffer to convert
	* @return {ArrayBuffer} Converted buffer
	* @public
	*/
	function toArrayBuffer(buf) {
		if (buf.length === buf.buffer.byteLength) return buf.buffer;
		return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
	}
	/**
	* Converts `data` to a `Buffer`.
	*
	* @param {*} data The data to convert
	* @return {Buffer} The buffer
	* @throws {TypeError}
	* @public
	*/
	function toBuffer(data) {
		toBuffer.readOnly = true;
		if (Buffer.isBuffer(data)) return data;
		let buf;
		if (data instanceof ArrayBuffer) buf = new FastBuffer(data);
		else if (ArrayBuffer.isView(data)) buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
		else {
			buf = Buffer.from(data);
			toBuffer.readOnly = false;
		}
		return buf;
	}
	module.exports = {
		concat,
		mask: _mask,
		toArrayBuffer,
		toBuffer,
		unmask: _unmask
	};
	/* istanbul ignore else  */
	if (!process.env.WS_NO_BUFFER_UTIL) try {
		const bufferUtil = __require$2("bufferutil");
		module.exports.mask = function(source, mask, output, offset, length) {
			if (length < 48) _mask(source, mask, output, offset, length);
			else bufferUtil.mask(source, mask, output, offset, length);
		};
		module.exports.unmask = function(buffer, mask) {
			if (buffer.length < 32) _unmask(buffer, mask);
			else bufferUtil.unmask(buffer, mask);
		};
	} catch (e) {}
}));
var require_limiter = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const kDone = Symbol("kDone");
	const kRun = Symbol("kRun");
	/**
	* A very simple job queue with adjustable concurrency. Adapted from
	* https://github.com/STRML/async-limiter
	*/
	var Limiter = class {
		/**
		* Creates a new `Limiter`.
		*
		* @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
		*     to run concurrently
		*/
		constructor(concurrency) {
			this[kDone] = () => {
				this.pending--;
				this[kRun]();
			};
			this.concurrency = concurrency || Infinity;
			this.jobs = [];
			this.pending = 0;
		}
		/**
		* Adds a job to the queue.
		*
		* @param {Function} job The job to run
		* @public
		*/
		add(job) {
			this.jobs.push(job);
			this[kRun]();
		}
		/**
		* Removes a job from the queue and runs it if possible.
		*
		* @private
		*/
		[kRun]() {
			if (this.pending === this.concurrency) return;
			if (this.jobs.length) {
				const job = this.jobs.shift();
				this.pending++;
				job(this[kDone]);
			}
		}
	};
	module.exports = Limiter;
}));
var require_permessage_deflate = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const zlib$1 = __require$2("zlib");
	const bufferUtil = require_buffer_util();
	const Limiter = require_limiter();
	const { kStatusCode } = require_constants();
	const FastBuffer = Buffer[Symbol.species];
	const TRAILER = Buffer.from([
		0,
		0,
		255,
		255
	]);
	const kPerMessageDeflate = Symbol("permessage-deflate");
	const kTotalLength = Symbol("total-length");
	const kCallback = Symbol("callback");
	const kBuffers = Symbol("buffers");
	const kError = Symbol("error");
	let zlibLimiter;
	/**
	* permessage-deflate implementation.
	*/
	var PerMessageDeflate = class {
		/**
		* Creates a PerMessageDeflate instance.
		*
		* @param {Object} [options] Configuration options
		* @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
		*     for, or request, a custom client window size
		* @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
		*     acknowledge disabling of client context takeover
		* @param {Number} [options.concurrencyLimit=10] The number of concurrent
		*     calls to zlib
		* @param {Boolean} [options.isServer=false] Create the instance in either
		*     server or client mode
		* @param {Number} [options.maxPayload=0] The maximum allowed message length
		* @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
		*     use of a custom server window size
		* @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
		*     disabling of server context takeover
		* @param {Number} [options.threshold=1024] Size (in bytes) below which
		*     messages should not be compressed if context takeover is disabled
		* @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
		*     deflate
		* @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
		*     inflate
		*/
		constructor(options) {
			this._options = options || {};
			this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
			this._maxPayload = this._options.maxPayload | 0;
			this._isServer = !!this._options.isServer;
			this._deflate = null;
			this._inflate = null;
			this.params = null;
			if (!zlibLimiter) {
				const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
				zlibLimiter = new Limiter(concurrency);
			}
		}
		/**
		* @type {String}
		*/
		static get extensionName() {
			return "permessage-deflate";
		}
		/**
		* Create an extension negotiation offer.
		*
		* @return {Object} Extension parameters
		* @public
		*/
		offer() {
			const params = {};
			if (this._options.serverNoContextTakeover) params.server_no_context_takeover = true;
			if (this._options.clientNoContextTakeover) params.client_no_context_takeover = true;
			if (this._options.serverMaxWindowBits) params.server_max_window_bits = this._options.serverMaxWindowBits;
			if (this._options.clientMaxWindowBits) params.client_max_window_bits = this._options.clientMaxWindowBits;
			else if (this._options.clientMaxWindowBits == null) params.client_max_window_bits = true;
			return params;
		}
		/**
		* Accept an extension negotiation offer/response.
		*
		* @param {Array} configurations The extension negotiation offers/reponse
		* @return {Object} Accepted configuration
		* @public
		*/
		accept(configurations) {
			configurations = this.normalizeParams(configurations);
			this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
			return this.params;
		}
		/**
		* Releases all resources used by the extension.
		*
		* @public
		*/
		cleanup() {
			if (this._inflate) {
				this._inflate.close();
				this._inflate = null;
			}
			if (this._deflate) {
				const callback = this._deflate[kCallback];
				this._deflate.close();
				this._deflate = null;
				if (callback) callback(/* @__PURE__ */ new Error("The deflate stream was closed while data was being processed"));
			}
		}
		/**
		*  Accept an extension negotiation offer.
		*
		* @param {Array} offers The extension negotiation offers
		* @return {Object} Accepted configuration
		* @private
		*/
		acceptAsServer(offers) {
			const opts = this._options;
			const accepted = offers.find((params) => {
				if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) return false;
				return true;
			});
			if (!accepted) throw new Error("None of the extension offers can be accepted");
			if (opts.serverNoContextTakeover) accepted.server_no_context_takeover = true;
			if (opts.clientNoContextTakeover) accepted.client_no_context_takeover = true;
			if (typeof opts.serverMaxWindowBits === "number") accepted.server_max_window_bits = opts.serverMaxWindowBits;
			if (typeof opts.clientMaxWindowBits === "number") accepted.client_max_window_bits = opts.clientMaxWindowBits;
			else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) delete accepted.client_max_window_bits;
			return accepted;
		}
		/**
		* Accept the extension negotiation response.
		*
		* @param {Array} response The extension negotiation response
		* @return {Object} Accepted configuration
		* @private
		*/
		acceptAsClient(response) {
			const params = response[0];
			if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) throw new Error("Unexpected parameter \"client_no_context_takeover\"");
			if (!params.client_max_window_bits) {
				if (typeof this._options.clientMaxWindowBits === "number") params.client_max_window_bits = this._options.clientMaxWindowBits;
			} else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) throw new Error("Unexpected or invalid parameter \"client_max_window_bits\"");
			return params;
		}
		/**
		* Normalize parameters.
		*
		* @param {Array} configurations The extension negotiation offers/reponse
		* @return {Array} The offers/response with normalized parameters
		* @private
		*/
		normalizeParams(configurations) {
			configurations.forEach((params) => {
				Object.keys(params).forEach((key) => {
					let value = params[key];
					if (value.length > 1) throw new Error(`Parameter "${key}" must have only a single value`);
					value = value[0];
					if (key === "client_max_window_bits") {
						if (value !== true) {
							const num = +value;
							if (!Number.isInteger(num) || num < 8 || num > 15) throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
							value = num;
						} else if (!this._isServer) throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
					} else if (key === "server_max_window_bits") {
						const num = +value;
						if (!Number.isInteger(num) || num < 8 || num > 15) throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
						value = num;
					} else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
						if (value !== true) throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
					} else throw new Error(`Unknown parameter "${key}"`);
					params[key] = value;
				});
			});
			return configurations;
		}
		/**
		* Decompress data. Concurrency limited.
		*
		* @param {Buffer} data Compressed data
		* @param {Boolean} fin Specifies whether or not this is the last fragment
		* @param {Function} callback Callback
		* @public
		*/
		decompress(data, fin, callback) {
			zlibLimiter.add((done) => {
				this._decompress(data, fin, (err, result) => {
					done();
					callback(err, result);
				});
			});
		}
		/**
		* Compress data. Concurrency limited.
		*
		* @param {(Buffer|String)} data Data to compress
		* @param {Boolean} fin Specifies whether or not this is the last fragment
		* @param {Function} callback Callback
		* @public
		*/
		compress(data, fin, callback) {
			zlibLimiter.add((done) => {
				this._compress(data, fin, (err, result) => {
					done();
					callback(err, result);
				});
			});
		}
		/**
		* Decompress data.
		*
		* @param {Buffer} data Compressed data
		* @param {Boolean} fin Specifies whether or not this is the last fragment
		* @param {Function} callback Callback
		* @private
		*/
		_decompress(data, fin, callback) {
			const endpoint = this._isServer ? "client" : "server";
			if (!this._inflate) {
				const key = `${endpoint}_max_window_bits`;
				const windowBits = typeof this.params[key] !== "number" ? zlib$1.Z_DEFAULT_WINDOWBITS : this.params[key];
				this._inflate = zlib$1.createInflateRaw({
					...this._options.zlibInflateOptions,
					windowBits
				});
				this._inflate[kPerMessageDeflate] = this;
				this._inflate[kTotalLength] = 0;
				this._inflate[kBuffers] = [];
				this._inflate.on("error", inflateOnError);
				this._inflate.on("data", inflateOnData);
			}
			this._inflate[kCallback] = callback;
			this._inflate.write(data);
			if (fin) this._inflate.write(TRAILER);
			this._inflate.flush(() => {
				const err = this._inflate[kError];
				if (err) {
					this._inflate.close();
					this._inflate = null;
					callback(err);
					return;
				}
				const data = bufferUtil.concat(this._inflate[kBuffers], this._inflate[kTotalLength]);
				if (this._inflate._readableState.endEmitted) {
					this._inflate.close();
					this._inflate = null;
				} else {
					this._inflate[kTotalLength] = 0;
					this._inflate[kBuffers] = [];
					if (fin && this.params[`${endpoint}_no_context_takeover`]) this._inflate.reset();
				}
				callback(null, data);
			});
		}
		/**
		* Compress data.
		*
		* @param {(Buffer|String)} data Data to compress
		* @param {Boolean} fin Specifies whether or not this is the last fragment
		* @param {Function} callback Callback
		* @private
		*/
		_compress(data, fin, callback) {
			const endpoint = this._isServer ? "server" : "client";
			if (!this._deflate) {
				const key = `${endpoint}_max_window_bits`;
				const windowBits = typeof this.params[key] !== "number" ? zlib$1.Z_DEFAULT_WINDOWBITS : this.params[key];
				this._deflate = zlib$1.createDeflateRaw({
					...this._options.zlibDeflateOptions,
					windowBits
				});
				this._deflate[kTotalLength] = 0;
				this._deflate[kBuffers] = [];
				this._deflate.on("data", deflateOnData);
			}
			this._deflate[kCallback] = callback;
			this._deflate.write(data);
			this._deflate.flush(zlib$1.Z_SYNC_FLUSH, () => {
				if (!this._deflate) return;
				let data = bufferUtil.concat(this._deflate[kBuffers], this._deflate[kTotalLength]);
				if (fin) data = new FastBuffer(data.buffer, data.byteOffset, data.length - 4);
				this._deflate[kCallback] = null;
				this._deflate[kTotalLength] = 0;
				this._deflate[kBuffers] = [];
				if (fin && this.params[`${endpoint}_no_context_takeover`]) this._deflate.reset();
				callback(null, data);
			});
		}
	};
	module.exports = PerMessageDeflate;
	/**
	* The listener of the `zlib.DeflateRaw` stream `'data'` event.
	*
	* @param {Buffer} chunk A chunk of data
	* @private
	*/
	function deflateOnData(chunk) {
		this[kBuffers].push(chunk);
		this[kTotalLength] += chunk.length;
	}
	/**
	* The listener of the `zlib.InflateRaw` stream `'data'` event.
	*
	* @param {Buffer} chunk A chunk of data
	* @private
	*/
	function inflateOnData(chunk) {
		this[kTotalLength] += chunk.length;
		if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
			this[kBuffers].push(chunk);
			return;
		}
		this[kError] = /* @__PURE__ */ new RangeError("Max payload size exceeded");
		this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
		this[kError][kStatusCode] = 1009;
		this.removeListener("data", inflateOnData);
		this.reset();
	}
	/**
	* The listener of the `zlib.InflateRaw` stream `'error'` event.
	*
	* @param {Error} err The emitted error
	* @private
	*/
	function inflateOnError(err) {
		this[kPerMessageDeflate]._inflate = null;
		if (this[kError]) {
			this[kCallback](this[kError]);
			return;
		}
		err[kStatusCode] = 1007;
		this[kCallback](err);
	}
}));
var require_validation = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const { isUtf8 } = __require$2("buffer");
	const { hasBlob } = require_constants();
	const tokenChars = [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		1,
		0,
		1,
		1,
		1,
		1,
		1,
		0,
		0,
		1,
		1,
		0,
		1,
		1,
		0,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		0,
		0,
		0,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		0,
		1,
		0,
		1,
		0
	];
	/**
	* Checks if a status code is allowed in a close frame.
	*
	* @param {Number} code The status code
	* @return {Boolean} `true` if the status code is valid, else `false`
	* @public
	*/
	function isValidStatusCode(code) {
		return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
	}
	/**
	* Checks if a given buffer contains only correct UTF-8.
	* Ported from https://www.cl.cam.ac.uk/%7Emgk25/ucs/utf8_check.c by
	* Markus Kuhn.
	*
	* @param {Buffer} buf The buffer to check
	* @return {Boolean} `true` if `buf` contains only correct UTF-8, else `false`
	* @public
	*/
	function _isValidUTF8(buf) {
		const len = buf.length;
		let i = 0;
		while (i < len) if ((buf[i] & 128) === 0) i++;
		else if ((buf[i] & 224) === 192) {
			if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) return false;
			i += 2;
		} else if ((buf[i] & 240) === 224) {
			if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || buf[i] === 237 && (buf[i + 1] & 224) === 160) return false;
			i += 3;
		} else if ((buf[i] & 248) === 240) {
			if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) return false;
			i += 4;
		} else return false;
		return true;
	}
	/**
	* Determines whether a value is a `Blob`.
	*
	* @param {*} value The value to be tested
	* @return {Boolean} `true` if `value` is a `Blob`, else `false`
	* @private
	*/
	function isBlob(value) {
		return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
	}
	module.exports = {
		isBlob,
		isValidStatusCode,
		isValidUTF8: _isValidUTF8,
		tokenChars
	};
	if (isUtf8) module.exports.isValidUTF8 = function(buf) {
		return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
	};
	else if (!process.env.WS_NO_UTF_8_VALIDATE) try {
		const isValidUTF8 = __require$2("utf-8-validate");
		module.exports.isValidUTF8 = function(buf) {
			return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
		};
	} catch (e) {}
}));
var require_receiver = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const { Writable: Writable$1 } = __require$2("stream");
	const PerMessageDeflate = require_permessage_deflate();
	const { BINARY_TYPES, EMPTY_BUFFER, kStatusCode, kWebSocket } = require_constants();
	const { concat, toArrayBuffer, unmask } = require_buffer_util();
	const { isValidStatusCode, isValidUTF8 } = require_validation();
	const FastBuffer = Buffer[Symbol.species];
	const GET_INFO = 0;
	const GET_PAYLOAD_LENGTH_16 = 1;
	const GET_PAYLOAD_LENGTH_64 = 2;
	const GET_MASK = 3;
	const GET_DATA = 4;
	const INFLATING = 5;
	const DEFER_EVENT = 6;
	/**
	* HyBi Receiver implementation.
	*
	* @extends Writable
	*/
	var Receiver = class extends Writable$1 {
		/**
		* Creates a Receiver instance.
		*
		* @param {Object} [options] Options object
		* @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
		*     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
		*     multiple times in the same tick
		* @param {String} [options.binaryType=nodebuffer] The type for binary data
		* @param {Object} [options.extensions] An object containing the negotiated
		*     extensions
		* @param {Boolean} [options.isServer=false] Specifies whether to operate in
		*     client or server mode
		* @param {Number} [options.maxBufferedChunks=0] The maximum number of
		*     buffered data chunks
		* @param {Number} [options.maxFragments=0] The maximum number of message
		*     fragments
		* @param {Number} [options.maxPayload=0] The maximum allowed message length
		* @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
		*     not to skip UTF-8 validation for text and close messages
		*/
		constructor(options = {}) {
			super();
			this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
			this._binaryType = options.binaryType || BINARY_TYPES[0];
			this._extensions = options.extensions || {};
			this._isServer = !!options.isServer;
			this._maxBufferedChunks = options.maxBufferedChunks | 0;
			this._maxFragments = options.maxFragments | 0;
			this._maxPayload = options.maxPayload | 0;
			this._skipUTF8Validation = !!options.skipUTF8Validation;
			this[kWebSocket] = void 0;
			this._bufferedBytes = 0;
			this._buffers = [];
			this._compressed = false;
			this._payloadLength = 0;
			this._mask = void 0;
			this._fragmented = 0;
			this._masked = false;
			this._fin = false;
			this._opcode = 0;
			this._totalPayloadLength = 0;
			this._messageLength = 0;
			this._fragments = [];
			this._errored = false;
			this._loop = false;
			this._state = GET_INFO;
		}
		/**
		* Implements `Writable.prototype._write()`.
		*
		* @param {Buffer} chunk The chunk of data to write
		* @param {String} encoding The character encoding of `chunk`
		* @param {Function} cb Callback
		* @private
		*/
		_write(chunk, encoding, cb) {
			if (this._opcode === 8 && this._state == GET_INFO) return cb();
			if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
				cb(this.createError(RangeError, "Too many buffered chunks", false, 1008, "WS_ERR_TOO_MANY_BUFFERED_PARTS"));
				return;
			}
			this._bufferedBytes += chunk.length;
			this._buffers.push(chunk);
			this.startLoop(cb);
		}
		/**
		* Consumes `n` bytes from the buffered data.
		*
		* @param {Number} n The number of bytes to consume
		* @return {Buffer} The consumed bytes
		* @private
		*/
		consume(n) {
			this._bufferedBytes -= n;
			if (n === this._buffers[0].length) return this._buffers.shift();
			if (n < this._buffers[0].length) {
				const buf = this._buffers[0];
				this._buffers[0] = new FastBuffer(buf.buffer, buf.byteOffset + n, buf.length - n);
				return new FastBuffer(buf.buffer, buf.byteOffset, n);
			}
			const dst = Buffer.allocUnsafe(n);
			do {
				const buf = this._buffers[0];
				const offset = dst.length - n;
				if (n >= buf.length) dst.set(this._buffers.shift(), offset);
				else {
					dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
					this._buffers[0] = new FastBuffer(buf.buffer, buf.byteOffset + n, buf.length - n);
				}
				n -= buf.length;
			} while (n > 0);
			return dst;
		}
		/**
		* Starts the parsing loop.
		*
		* @param {Function} cb Callback
		* @private
		*/
		startLoop(cb) {
			this._loop = true;
			do
				switch (this._state) {
					case GET_INFO:
						this.getInfo(cb);
						break;
					case GET_PAYLOAD_LENGTH_16:
						this.getPayloadLength16(cb);
						break;
					case GET_PAYLOAD_LENGTH_64:
						this.getPayloadLength64(cb);
						break;
					case GET_MASK:
						this.getMask();
						break;
					case GET_DATA:
						this.getData(cb);
						break;
					case INFLATING:
					case DEFER_EVENT:
						this._loop = false;
						return;
				}
			while (this._loop);
			if (!this._errored) cb();
		}
		/**
		* Reads the first two bytes of a frame.
		*
		* @param {Function} cb Callback
		* @private
		*/
		getInfo(cb) {
			if (this._bufferedBytes < 2) {
				this._loop = false;
				return;
			}
			const buf = this.consume(2);
			if ((buf[0] & 48) !== 0) {
				cb(this.createError(RangeError, "RSV2 and RSV3 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_2_3"));
				return;
			}
			const compressed = (buf[0] & 64) === 64;
			if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
				cb(this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1"));
				return;
			}
			this._fin = (buf[0] & 128) === 128;
			this._opcode = buf[0] & 15;
			this._payloadLength = buf[1] & 127;
			if (this._opcode === 0) {
				if (compressed) {
					cb(this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1"));
					return;
				}
				if (!this._fragmented) {
					cb(this.createError(RangeError, "invalid opcode 0", true, 1002, "WS_ERR_INVALID_OPCODE"));
					return;
				}
				this._opcode = this._fragmented;
			} else if (this._opcode === 1 || this._opcode === 2) {
				if (this._fragmented) {
					cb(this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE"));
					return;
				}
				this._compressed = compressed;
			} else if (this._opcode > 7 && this._opcode < 11) {
				if (!this._fin) {
					cb(this.createError(RangeError, "FIN must be set", true, 1002, "WS_ERR_EXPECTED_FIN"));
					return;
				}
				if (compressed) {
					cb(this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1"));
					return;
				}
				if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
					cb(this.createError(RangeError, `invalid payload length ${this._payloadLength}`, true, 1002, "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"));
					return;
				}
			} else {
				cb(this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE"));
				return;
			}
			if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
			this._masked = (buf[1] & 128) === 128;
			if (this._isServer) {
				if (!this._masked) {
					cb(this.createError(RangeError, "MASK must be set", true, 1002, "WS_ERR_EXPECTED_MASK"));
					return;
				}
			} else if (this._masked) {
				cb(this.createError(RangeError, "MASK must be clear", true, 1002, "WS_ERR_UNEXPECTED_MASK"));
				return;
			}
			if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
			else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
			else this.haveLength(cb);
		}
		/**
		* Gets extended payload length (7+16).
		*
		* @param {Function} cb Callback
		* @private
		*/
		getPayloadLength16(cb) {
			if (this._bufferedBytes < 2) {
				this._loop = false;
				return;
			}
			this._payloadLength = this.consume(2).readUInt16BE(0);
			this.haveLength(cb);
		}
		/**
		* Gets extended payload length (7+64).
		*
		* @param {Function} cb Callback
		* @private
		*/
		getPayloadLength64(cb) {
			if (this._bufferedBytes < 8) {
				this._loop = false;
				return;
			}
			const buf = this.consume(8);
			const num = buf.readUInt32BE(0);
			if (num > Math.pow(2, 21) - 1) {
				cb(this.createError(RangeError, "Unsupported WebSocket frame: payload length > 2^53 - 1", false, 1009, "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"));
				return;
			}
			this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
			this.haveLength(cb);
		}
		/**
		* Payload length has been read.
		*
		* @param {Function} cb Callback
		* @private
		*/
		haveLength(cb) {
			if (this._payloadLength && this._opcode < 8) {
				this._totalPayloadLength += this._payloadLength;
				if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
					cb(this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"));
					return;
				}
			}
			if (this._masked) this._state = GET_MASK;
			else this._state = GET_DATA;
		}
		/**
		* Reads mask bytes.
		*
		* @private
		*/
		getMask() {
			if (this._bufferedBytes < 4) {
				this._loop = false;
				return;
			}
			this._mask = this.consume(4);
			this._state = GET_DATA;
		}
		/**
		* Reads data bytes.
		*
		* @param {Function} cb Callback
		* @private
		*/
		getData(cb) {
			let data = EMPTY_BUFFER;
			if (this._payloadLength) {
				if (this._bufferedBytes < this._payloadLength) {
					this._loop = false;
					return;
				}
				data = this.consume(this._payloadLength);
				if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) unmask(data, this._mask);
			}
			if (this._opcode > 7) {
				this.controlMessage(data, cb);
				return;
			}
			if (this._compressed) {
				this._state = INFLATING;
				this.decompress(data, cb);
				return;
			}
			if (data.length) {
				if (this._maxFragments > 0 && this._fragments.length >= this._maxFragments) {
					cb(this.createError(RangeError, "Too many message fragments", false, 1008, "WS_ERR_TOO_MANY_BUFFERED_PARTS"));
					return;
				}
				this._messageLength = this._totalPayloadLength;
				this._fragments.push(data);
			}
			this.dataMessage(cb);
		}
		/**
		* Decompresses data.
		*
		* @param {Buffer} data Compressed data
		* @param {Function} cb Callback
		* @private
		*/
		decompress(data, cb) {
			this._extensions[PerMessageDeflate.extensionName].decompress(data, this._fin, (err, buf) => {
				if (err) return cb(err);
				if (buf.length) {
					this._messageLength += buf.length;
					if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
						cb(this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"));
						return;
					}
					if (this._maxFragments > 0 && this._fragments.length >= this._maxFragments) {
						cb(this.createError(RangeError, "Too many message fragments", false, 1008, "WS_ERR_TOO_MANY_BUFFERED_PARTS"));
						return;
					}
					this._fragments.push(buf);
				}
				this.dataMessage(cb);
				if (this._state === GET_INFO) this.startLoop(cb);
			});
		}
		/**
		* Handles a data message.
		*
		* @param {Function} cb Callback
		* @private
		*/
		dataMessage(cb) {
			if (!this._fin) {
				this._state = GET_INFO;
				return;
			}
			const messageLength = this._messageLength;
			const fragments = this._fragments;
			this._totalPayloadLength = 0;
			this._messageLength = 0;
			this._fragmented = 0;
			this._fragments = [];
			if (this._opcode === 2) {
				let data;
				if (this._binaryType === "nodebuffer") data = concat(fragments, messageLength);
				else if (this._binaryType === "arraybuffer") data = toArrayBuffer(concat(fragments, messageLength));
				else if (this._binaryType === "blob") data = new Blob(fragments);
				else data = fragments;
				if (this._allowSynchronousEvents) {
					this.emit("message", data, true);
					this._state = GET_INFO;
				} else {
					this._state = DEFER_EVENT;
					setImmediate(() => {
						this.emit("message", data, true);
						this._state = GET_INFO;
						this.startLoop(cb);
					});
				}
			} else {
				const buf = concat(fragments, messageLength);
				if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
					cb(this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8"));
					return;
				}
				if (this._state === INFLATING || this._allowSynchronousEvents) {
					this.emit("message", buf, false);
					this._state = GET_INFO;
				} else {
					this._state = DEFER_EVENT;
					setImmediate(() => {
						this.emit("message", buf, false);
						this._state = GET_INFO;
						this.startLoop(cb);
					});
				}
			}
		}
		/**
		* Handles a control message.
		*
		* @param {Buffer} data Data to handle
		* @return {(Error|RangeError|undefined)} A possible error
		* @private
		*/
		controlMessage(data, cb) {
			if (this._opcode === 8) {
				if (data.length === 0) {
					this._loop = false;
					this.emit("conclude", 1005, EMPTY_BUFFER);
					this.end();
				} else {
					const code = data.readUInt16BE(0);
					if (!isValidStatusCode(code)) {
						cb(this.createError(RangeError, `invalid status code ${code}`, true, 1002, "WS_ERR_INVALID_CLOSE_CODE"));
						return;
					}
					const buf = new FastBuffer(data.buffer, data.byteOffset + 2, data.length - 2);
					if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
						cb(this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8"));
						return;
					}
					this._loop = false;
					this.emit("conclude", code, buf);
					this.end();
				}
				this._state = GET_INFO;
				return;
			}
			if (this._allowSynchronousEvents) {
				this.emit(this._opcode === 9 ? "ping" : "pong", data);
				this._state = GET_INFO;
			} else {
				this._state = DEFER_EVENT;
				setImmediate(() => {
					this.emit(this._opcode === 9 ? "ping" : "pong", data);
					this._state = GET_INFO;
					this.startLoop(cb);
				});
			}
		}
		/**
		* Builds an error object.
		*
		* @param {function(new:Error|RangeError)} ErrorCtor The error constructor
		* @param {String} message The error message
		* @param {Boolean} prefix Specifies whether or not to add a default prefix to
		*     `message`
		* @param {Number} statusCode The status code
		* @param {String} errorCode The exposed error code
		* @return {(Error|RangeError)} The error
		* @private
		*/
		createError(ErrorCtor, message, prefix, statusCode, errorCode) {
			this._loop = false;
			this._errored = true;
			const err = new ErrorCtor(prefix ? `Invalid WebSocket frame: ${message}` : message);
			Error.captureStackTrace(err, this.createError);
			err.code = errorCode;
			err[kStatusCode] = statusCode;
			return err;
		}
	};
	module.exports = Receiver;
}));
var require_sender = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const { Duplex: Duplex$3 } = __require$2("stream");
	const { randomFillSync } = __require$2("crypto");
	const { types: { isUint8Array } } = __require$2("util");
	const PerMessageDeflate = require_permessage_deflate();
	const { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
	const { isBlob, isValidStatusCode } = require_validation();
	const { mask: applyMask, toBuffer } = require_buffer_util();
	const kByteLength = Symbol("kByteLength");
	const maskBuffer = Buffer.alloc(4);
	const RANDOM_POOL_SIZE = 8 * 1024;
	let randomPool;
	let randomPoolPointer = RANDOM_POOL_SIZE;
	const DEFAULT = 0;
	const DEFLATING = 1;
	const GET_BLOB_DATA = 2;
	module.exports = class Sender {
		/**
		* Creates a Sender instance.
		*
		* @param {Duplex} socket The connection socket
		* @param {Object} [extensions] An object containing the negotiated extensions
		* @param {Function} [generateMask] The function used to generate the masking
		*     key
		*/
		constructor(socket, extensions, generateMask) {
			this._extensions = extensions || {};
			if (generateMask) {
				this._generateMask = generateMask;
				this._maskBuffer = Buffer.alloc(4);
			}
			this._socket = socket;
			this._firstFragment = true;
			this._compress = false;
			this._bufferedBytes = 0;
			this._queue = [];
			this._state = DEFAULT;
			this.onerror = NOOP;
			this[kWebSocket] = void 0;
		}
		/**
		* Frames a piece of data according to the HyBi WebSocket protocol.
		*
		* @param {(Buffer|String)} data The data to frame
		* @param {Object} options Options object
		* @param {Boolean} [options.fin=false] Specifies whether or not to set the
		*     FIN bit
		* @param {Function} [options.generateMask] The function used to generate the
		*     masking key
		* @param {Boolean} [options.mask=false] Specifies whether or not to mask
		*     `data`
		* @param {Buffer} [options.maskBuffer] The buffer used to store the masking
		*     key
		* @param {Number} options.opcode The opcode
		* @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
		*     modified
		* @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
		*     RSV1 bit
		* @return {(Buffer|String)[]} The framed data
		* @public
		*/
		static frame(data, options) {
			let mask;
			let merge = false;
			let offset = 2;
			let skipMasking = false;
			if (options.mask) {
				mask = options.maskBuffer || maskBuffer;
				if (options.generateMask) options.generateMask(mask);
				else {
					if (randomPoolPointer === RANDOM_POOL_SIZE) {
						/* istanbul ignore else  */
						if (randomPool === void 0) randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
						randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
						randomPoolPointer = 0;
					}
					mask[0] = randomPool[randomPoolPointer++];
					mask[1] = randomPool[randomPoolPointer++];
					mask[2] = randomPool[randomPoolPointer++];
					mask[3] = randomPool[randomPoolPointer++];
				}
				skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
				offset = 6;
			}
			let dataLength;
			if (typeof data === "string") if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) dataLength = options[kByteLength];
			else {
				data = Buffer.from(data);
				dataLength = data.length;
			}
			else {
				dataLength = data.length;
				merge = options.mask && options.readOnly && !skipMasking;
			}
			let payloadLength = dataLength;
			if (dataLength >= 65536) {
				offset += 8;
				payloadLength = 127;
			} else if (dataLength > 125) {
				offset += 2;
				payloadLength = 126;
			}
			const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
			target[0] = options.fin ? options.opcode | 128 : options.opcode;
			if (options.rsv1) target[0] |= 64;
			target[1] = payloadLength;
			if (payloadLength === 126) target.writeUInt16BE(dataLength, 2);
			else if (payloadLength === 127) {
				target[2] = target[3] = 0;
				target.writeUIntBE(dataLength, 4, 6);
			}
			if (!options.mask) return [target, data];
			target[1] |= 128;
			target[offset - 4] = mask[0];
			target[offset - 3] = mask[1];
			target[offset - 2] = mask[2];
			target[offset - 1] = mask[3];
			if (skipMasking) return [target, data];
			if (merge) {
				applyMask(data, mask, target, offset, dataLength);
				return [target];
			}
			applyMask(data, mask, data, 0, dataLength);
			return [target, data];
		}
		/**
		* Sends a close message to the other peer.
		*
		* @param {Number} [code] The status code component of the body
		* @param {(String|Buffer)} [data] The message component of the body
		* @param {Boolean} [mask=false] Specifies whether or not to mask the message
		* @param {Function} [cb] Callback
		* @public
		*/
		close(code, data, mask, cb) {
			let buf;
			if (code === void 0) buf = EMPTY_BUFFER;
			else if (typeof code !== "number" || !isValidStatusCode(code)) throw new TypeError("First argument must be a valid error code number");
			else if (data === void 0 || !data.length) {
				buf = Buffer.allocUnsafe(2);
				buf.writeUInt16BE(code, 0);
			} else {
				const length = Buffer.byteLength(data);
				if (length > 123) throw new RangeError("The message must not be greater than 123 bytes");
				buf = Buffer.allocUnsafe(2 + length);
				buf.writeUInt16BE(code, 0);
				if (typeof data === "string") buf.write(data, 2);
				else if (isUint8Array(data)) buf.set(data, 2);
				else throw new TypeError("Second argument must be a string or a Uint8Array");
			}
			const options = {
				[kByteLength]: buf.length,
				fin: true,
				generateMask: this._generateMask,
				mask,
				maskBuffer: this._maskBuffer,
				opcode: 8,
				readOnly: false,
				rsv1: false
			};
			if (this._state !== DEFAULT) this.enqueue([
				this.dispatch,
				buf,
				false,
				options,
				cb
			]);
			else this.sendFrame(Sender.frame(buf, options), cb);
		}
		/**
		* Sends a ping message to the other peer.
		*
		* @param {*} data The message to send
		* @param {Boolean} [mask=false] Specifies whether or not to mask `data`
		* @param {Function} [cb] Callback
		* @public
		*/
		ping(data, mask, cb) {
			let byteLength;
			let readOnly;
			if (typeof data === "string") {
				byteLength = Buffer.byteLength(data);
				readOnly = false;
			} else if (isBlob(data)) {
				byteLength = data.size;
				readOnly = false;
			} else {
				data = toBuffer(data);
				byteLength = data.length;
				readOnly = toBuffer.readOnly;
			}
			if (byteLength > 125) throw new RangeError("The data size must not be greater than 125 bytes");
			const options = {
				[kByteLength]: byteLength,
				fin: true,
				generateMask: this._generateMask,
				mask,
				maskBuffer: this._maskBuffer,
				opcode: 9,
				readOnly,
				rsv1: false
			};
			if (isBlob(data)) if (this._state !== DEFAULT) this.enqueue([
				this.getBlobData,
				data,
				false,
				options,
				cb
			]);
			else this.getBlobData(data, false, options, cb);
			else if (this._state !== DEFAULT) this.enqueue([
				this.dispatch,
				data,
				false,
				options,
				cb
			]);
			else this.sendFrame(Sender.frame(data, options), cb);
		}
		/**
		* Sends a pong message to the other peer.
		*
		* @param {*} data The message to send
		* @param {Boolean} [mask=false] Specifies whether or not to mask `data`
		* @param {Function} [cb] Callback
		* @public
		*/
		pong(data, mask, cb) {
			let byteLength;
			let readOnly;
			if (typeof data === "string") {
				byteLength = Buffer.byteLength(data);
				readOnly = false;
			} else if (isBlob(data)) {
				byteLength = data.size;
				readOnly = false;
			} else {
				data = toBuffer(data);
				byteLength = data.length;
				readOnly = toBuffer.readOnly;
			}
			if (byteLength > 125) throw new RangeError("The data size must not be greater than 125 bytes");
			const options = {
				[kByteLength]: byteLength,
				fin: true,
				generateMask: this._generateMask,
				mask,
				maskBuffer: this._maskBuffer,
				opcode: 10,
				readOnly,
				rsv1: false
			};
			if (isBlob(data)) if (this._state !== DEFAULT) this.enqueue([
				this.getBlobData,
				data,
				false,
				options,
				cb
			]);
			else this.getBlobData(data, false, options, cb);
			else if (this._state !== DEFAULT) this.enqueue([
				this.dispatch,
				data,
				false,
				options,
				cb
			]);
			else this.sendFrame(Sender.frame(data, options), cb);
		}
		/**
		* Sends a data message to the other peer.
		*
		* @param {*} data The message to send
		* @param {Object} options Options object
		* @param {Boolean} [options.binary=false] Specifies whether `data` is binary
		*     or text
		* @param {Boolean} [options.compress=false] Specifies whether or not to
		*     compress `data`
		* @param {Boolean} [options.fin=false] Specifies whether the fragment is the
		*     last one
		* @param {Boolean} [options.mask=false] Specifies whether or not to mask
		*     `data`
		* @param {Function} [cb] Callback
		* @public
		*/
		send(data, options, cb) {
			const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
			let opcode = options.binary ? 2 : 1;
			let rsv1 = options.compress;
			let byteLength;
			let readOnly;
			if (typeof data === "string") {
				byteLength = Buffer.byteLength(data);
				readOnly = false;
			} else if (isBlob(data)) {
				byteLength = data.size;
				readOnly = false;
			} else {
				data = toBuffer(data);
				byteLength = data.length;
				readOnly = toBuffer.readOnly;
			}
			if (this._firstFragment) {
				this._firstFragment = false;
				if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) rsv1 = byteLength >= perMessageDeflate._threshold;
				this._compress = rsv1;
			} else {
				rsv1 = false;
				opcode = 0;
			}
			if (options.fin) this._firstFragment = true;
			const opts = {
				[kByteLength]: byteLength,
				fin: options.fin,
				generateMask: this._generateMask,
				mask: options.mask,
				maskBuffer: this._maskBuffer,
				opcode,
				readOnly,
				rsv1
			};
			if (isBlob(data)) if (this._state !== DEFAULT) this.enqueue([
				this.getBlobData,
				data,
				this._compress,
				opts,
				cb
			]);
			else this.getBlobData(data, this._compress, opts, cb);
			else if (this._state !== DEFAULT) this.enqueue([
				this.dispatch,
				data,
				this._compress,
				opts,
				cb
			]);
			else this.dispatch(data, this._compress, opts, cb);
		}
		/**
		* Gets the contents of a blob as binary data.
		*
		* @param {Blob} blob The blob
		* @param {Boolean} [compress=false] Specifies whether or not to compress
		*     the data
		* @param {Object} options Options object
		* @param {Boolean} [options.fin=false] Specifies whether or not to set the
		*     FIN bit
		* @param {Function} [options.generateMask] The function used to generate the
		*     masking key
		* @param {Boolean} [options.mask=false] Specifies whether or not to mask
		*     `data`
		* @param {Buffer} [options.maskBuffer] The buffer used to store the masking
		*     key
		* @param {Number} options.opcode The opcode
		* @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
		*     modified
		* @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
		*     RSV1 bit
		* @param {Function} [cb] Callback
		* @private
		*/
		getBlobData(blob, compress, options, cb) {
			this._bufferedBytes += options[kByteLength];
			this._state = GET_BLOB_DATA;
			blob.arrayBuffer().then((arrayBuffer) => {
				if (this._socket.destroyed) {
					const err = /* @__PURE__ */ new Error("The socket was closed while the blob was being read");
					process.nextTick(callCallbacks, this, err, cb);
					return;
				}
				this._bufferedBytes -= options[kByteLength];
				const data = toBuffer(arrayBuffer);
				if (!compress) {
					this._state = DEFAULT;
					this.sendFrame(Sender.frame(data, options), cb);
					this.dequeue();
				} else this.dispatch(data, compress, options, cb);
			}).catch((err) => {
				process.nextTick(onError, this, err, cb);
			});
		}
		/**
		* Dispatches a message.
		*
		* @param {(Buffer|String)} data The message to send
		* @param {Boolean} [compress=false] Specifies whether or not to compress
		*     `data`
		* @param {Object} options Options object
		* @param {Boolean} [options.fin=false] Specifies whether or not to set the
		*     FIN bit
		* @param {Function} [options.generateMask] The function used to generate the
		*     masking key
		* @param {Boolean} [options.mask=false] Specifies whether or not to mask
		*     `data`
		* @param {Buffer} [options.maskBuffer] The buffer used to store the masking
		*     key
		* @param {Number} options.opcode The opcode
		* @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
		*     modified
		* @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
		*     RSV1 bit
		* @param {Function} [cb] Callback
		* @private
		*/
		dispatch(data, compress, options, cb) {
			if (!compress) {
				this.sendFrame(Sender.frame(data, options), cb);
				return;
			}
			const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
			this._bufferedBytes += options[kByteLength];
			this._state = DEFLATING;
			perMessageDeflate.compress(data, options.fin, (_, buf) => {
				if (this._socket.destroyed) {
					const err = /* @__PURE__ */ new Error("The socket was closed while data was being compressed");
					callCallbacks(this, err, cb);
					return;
				}
				this._bufferedBytes -= options[kByteLength];
				this._state = DEFAULT;
				options.readOnly = false;
				this.sendFrame(Sender.frame(buf, options), cb);
				this.dequeue();
			});
		}
		/**
		* Executes queued send operations.
		*
		* @private
		*/
		dequeue() {
			while (this._state === DEFAULT && this._queue.length) {
				const params = this._queue.shift();
				this._bufferedBytes -= params[3][kByteLength];
				Reflect.apply(params[0], this, params.slice(1));
			}
		}
		/**
		* Enqueues a send operation.
		*
		* @param {Array} params Send operation parameters.
		* @private
		*/
		enqueue(params) {
			this._bufferedBytes += params[3][kByteLength];
			this._queue.push(params);
		}
		/**
		* Sends a frame.
		*
		* @param {(Buffer | String)[]} list The frame to send
		* @param {Function} [cb] Callback
		* @private
		*/
		sendFrame(list, cb) {
			if (list.length === 2) {
				this._socket.cork();
				this._socket.write(list[0]);
				this._socket.write(list[1], cb);
				this._socket.uncork();
			} else this._socket.write(list[0], cb);
		}
	};
	/**
	* Calls queued callbacks with an error.
	*
	* @param {Sender} sender The `Sender` instance
	* @param {Error} err The error to call the callbacks with
	* @param {Function} [cb] The first callback
	* @private
	*/
	function callCallbacks(sender, err, cb) {
		if (typeof cb === "function") cb(err);
		for (let i = 0; i < sender._queue.length; i++) {
			const params = sender._queue[i];
			const callback = params[params.length - 1];
			if (typeof callback === "function") callback(err);
		}
	}
	/**
	* Handles a `Sender` error.
	*
	* @param {Sender} sender The `Sender` instance
	* @param {Error} err The error
	* @param {Function} [cb] The first pending callback
	* @private
	*/
	function onError(sender, err, cb) {
		callCallbacks(sender, err, cb);
		sender.onerror(err);
	}
}));
var require_event_target = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const { kForOnEventAttribute, kListener } = require_constants();
	const kCode = Symbol("kCode");
	const kData = Symbol("kData");
	const kError = Symbol("kError");
	const kMessage = Symbol("kMessage");
	const kReason = Symbol("kReason");
	const kTarget = Symbol("kTarget");
	const kType = Symbol("kType");
	const kWasClean = Symbol("kWasClean");
	/**
	* Class representing an event.
	*/
	var Event = class {
		/**
		* Create a new `Event`.
		*
		* @param {String} type The name of the event
		* @throws {TypeError} If the `type` argument is not specified
		*/
		constructor(type) {
			this[kTarget] = null;
			this[kType] = type;
		}
		/**
		* @type {*}
		*/
		get target() {
			return this[kTarget];
		}
		/**
		* @type {String}
		*/
		get type() {
			return this[kType];
		}
	};
	Object.defineProperty(Event.prototype, "target", { enumerable: true });
	Object.defineProperty(Event.prototype, "type", { enumerable: true });
	/**
	* Class representing a close event.
	*
	* @extends Event
	*/
	var CloseEvent = class extends Event {
		/**
		* Create a new `CloseEvent`.
		*
		* @param {String} type The name of the event
		* @param {Object} [options] A dictionary object that allows for setting
		*     attributes via object members of the same name
		* @param {Number} [options.code=0] The status code explaining why the
		*     connection was closed
		* @param {String} [options.reason=''] A human-readable string explaining why
		*     the connection was closed
		* @param {Boolean} [options.wasClean=false] Indicates whether or not the
		*     connection was cleanly closed
		*/
		constructor(type, options = {}) {
			super(type);
			this[kCode] = options.code === void 0 ? 0 : options.code;
			this[kReason] = options.reason === void 0 ? "" : options.reason;
			this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
		}
		/**
		* @type {Number}
		*/
		get code() {
			return this[kCode];
		}
		/**
		* @type {String}
		*/
		get reason() {
			return this[kReason];
		}
		/**
		* @type {Boolean}
		*/
		get wasClean() {
			return this[kWasClean];
		}
	};
	Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
	Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
	Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
	/**
	* Class representing an error event.
	*
	* @extends Event
	*/
	var ErrorEvent = class extends Event {
		/**
		* Create a new `ErrorEvent`.
		*
		* @param {String} type The name of the event
		* @param {Object} [options] A dictionary object that allows for setting
		*     attributes via object members of the same name
		* @param {*} [options.error=null] The error that generated this event
		* @param {String} [options.message=''] The error message
		*/
		constructor(type, options = {}) {
			super(type);
			this[kError] = options.error === void 0 ? null : options.error;
			this[kMessage] = options.message === void 0 ? "" : options.message;
		}
		/**
		* @type {*}
		*/
		get error() {
			return this[kError];
		}
		/**
		* @type {String}
		*/
		get message() {
			return this[kMessage];
		}
	};
	Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
	Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
	/**
	* Class representing a message event.
	*
	* @extends Event
	*/
	var MessageEvent = class extends Event {
		/**
		* Create a new `MessageEvent`.
		*
		* @param {String} type The name of the event
		* @param {Object} [options] A dictionary object that allows for setting
		*     attributes via object members of the same name
		* @param {*} [options.data=null] The message content
		*/
		constructor(type, options = {}) {
			super(type);
			this[kData] = options.data === void 0 ? null : options.data;
		}
		/**
		* @type {*}
		*/
		get data() {
			return this[kData];
		}
	};
	Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
	module.exports = {
		CloseEvent,
		ErrorEvent,
		Event,
		EventTarget: {
			/**
			* Register an event listener.
			*
			* @param {String} type A string representing the event type to listen for
			* @param {(Function|Object)} handler The listener to add
			* @param {Object} [options] An options object specifies characteristics about
			*     the event listener
			* @param {Boolean} [options.once=false] A `Boolean` indicating that the
			*     listener should be invoked at most once after being added. If `true`,
			*     the listener would be automatically removed when invoked.
			* @public
			*/
			addEventListener(type, handler, options = {}) {
				for (const listener of this.listeners(type)) if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) return;
				let wrapper;
				if (type === "message") wrapper = function onMessage(data, isBinary) {
					const event = new MessageEvent("message", { data: isBinary ? data : data.toString() });
					event[kTarget] = this;
					callListener(handler, this, event);
				};
				else if (type === "close") wrapper = function onClose(code, message) {
					const event = new CloseEvent("close", {
						code,
						reason: message.toString(),
						wasClean: this._closeFrameReceived && this._closeFrameSent
					});
					event[kTarget] = this;
					callListener(handler, this, event);
				};
				else if (type === "error") wrapper = function onError(error) {
					const event = new ErrorEvent("error", {
						error,
						message: error.message
					});
					event[kTarget] = this;
					callListener(handler, this, event);
				};
				else if (type === "open") wrapper = function onOpen() {
					const event = new Event("open");
					event[kTarget] = this;
					callListener(handler, this, event);
				};
				else return;
				wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
				wrapper[kListener] = handler;
				if (options.once) this.once(type, wrapper);
				else this.on(type, wrapper);
			},
			/**
			* Remove an event listener.
			*
			* @param {String} type A string representing the event type to remove
			* @param {(Function|Object)} handler The listener to remove
			* @public
			*/
			removeEventListener(type, handler) {
				for (const listener of this.listeners(type)) if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
					this.removeListener(type, listener);
					break;
				}
			}
		},
		MessageEvent
	};
	/**
	* Call an event listener
	*
	* @param {(Function|Object)} listener The listener to call
	* @param {*} thisArg The value to use as `this`` when calling the listener
	* @param {Event} event The event to pass to the listener
	* @private
	*/
	function callListener(listener, thisArg, event) {
		if (typeof listener === "object" && listener.handleEvent) listener.handleEvent.call(listener, event);
		else listener.call(thisArg, event);
	}
}));
var require_extension = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const { tokenChars } = require_validation();
	/**
	* Adds an offer to the map of extension offers or a parameter to the map of
	* parameters.
	*
	* @param {Object} dest The map of extension offers or parameters
	* @param {String} name The extension or parameter name
	* @param {(Object|Boolean|String)} elem The extension parameters or the
	*     parameter value
	* @private
	*/
	function push(dest, name, elem) {
		if (dest[name] === void 0) dest[name] = [elem];
		else dest[name].push(elem);
	}
	/**
	* Parses the `Sec-WebSocket-Extensions` header into an object.
	*
	* @param {String} header The field value of the header
	* @return {Object} The parsed object
	* @public
	*/
	function parse(header) {
		const offers = Object.create(null);
		let params = Object.create(null);
		let mustUnescape = false;
		let isEscaping = false;
		let inQuotes = false;
		let extensionName;
		let paramName;
		let start = -1;
		let code = -1;
		let end = -1;
		let i = 0;
		for (; i < header.length; i++) {
			code = header.charCodeAt(i);
			if (extensionName === void 0) if (end === -1 && tokenChars[code] === 1) {
				if (start === -1) start = i;
			} else if (i !== 0 && (code === 32 || code === 9)) {
				if (end === -1 && start !== -1) end = i;
			} else if (code === 59 || code === 44) {
				if (start === -1) throw new SyntaxError(`Unexpected character at index ${i}`);
				if (end === -1) end = i;
				const name = header.slice(start, end);
				if (code === 44) {
					push(offers, name, params);
					params = Object.create(null);
				} else extensionName = name;
				start = end = -1;
			} else throw new SyntaxError(`Unexpected character at index ${i}`);
			else if (paramName === void 0) if (end === -1 && tokenChars[code] === 1) {
				if (start === -1) start = i;
			} else if (code === 32 || code === 9) {
				if (end === -1 && start !== -1) end = i;
			} else if (code === 59 || code === 44) {
				if (start === -1) throw new SyntaxError(`Unexpected character at index ${i}`);
				if (end === -1) end = i;
				push(params, header.slice(start, end), true);
				if (code === 44) {
					push(offers, extensionName, params);
					params = Object.create(null);
					extensionName = void 0;
				}
				start = end = -1;
			} else if (code === 61 && start !== -1 && end === -1) {
				paramName = header.slice(start, i);
				start = end = -1;
			} else throw new SyntaxError(`Unexpected character at index ${i}`);
			else if (isEscaping) {
				if (tokenChars[code] !== 1) throw new SyntaxError(`Unexpected character at index ${i}`);
				if (start === -1) start = i;
				else if (!mustUnescape) mustUnescape = true;
				isEscaping = false;
			} else if (inQuotes) if (tokenChars[code] === 1) {
				if (start === -1) start = i;
			} else if (code === 34 && start !== -1) {
				inQuotes = false;
				end = i;
			} else if (code === 92) isEscaping = true;
			else throw new SyntaxError(`Unexpected character at index ${i}`);
			else if (code === 34 && header.charCodeAt(i - 1) === 61) inQuotes = true;
			else if (end === -1 && tokenChars[code] === 1) {
				if (start === -1) start = i;
			} else if (start !== -1 && (code === 32 || code === 9)) {
				if (end === -1) end = i;
			} else if (code === 59 || code === 44) {
				if (start === -1) throw new SyntaxError(`Unexpected character at index ${i}`);
				if (end === -1) end = i;
				let value = header.slice(start, end);
				if (mustUnescape) {
					value = value.replace(/\\/g, "");
					mustUnescape = false;
				}
				push(params, paramName, value);
				if (code === 44) {
					push(offers, extensionName, params);
					params = Object.create(null);
					extensionName = void 0;
				}
				paramName = void 0;
				start = end = -1;
			} else throw new SyntaxError(`Unexpected character at index ${i}`);
		}
		if (start === -1 || inQuotes || code === 32 || code === 9) throw new SyntaxError("Unexpected end of input");
		if (end === -1) end = i;
		const token = header.slice(start, end);
		if (extensionName === void 0) push(offers, token, params);
		else {
			if (paramName === void 0) push(params, token, true);
			else if (mustUnescape) push(params, paramName, token.replace(/\\/g, ""));
			else push(params, paramName, token);
			push(offers, extensionName, params);
		}
		return offers;
	}
	/**
	* Builds the `Sec-WebSocket-Extensions` header field value.
	*
	* @param {Object} extensions The map of extensions and parameters to format
	* @return {String} A string representing the given object
	* @public
	*/
	function format(extensions) {
		return Object.keys(extensions).map((extension) => {
			let configurations = extensions[extension];
			if (!Array.isArray(configurations)) configurations = [configurations];
			return configurations.map((params) => {
				return [extension].concat(Object.keys(params).map((k) => {
					let values = params[k];
					if (!Array.isArray(values)) values = [values];
					return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
				})).join("; ");
			}).join(", ");
		}).join(", ");
	}
	module.exports = {
		format,
		parse
	};
}));
var require_websocket = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const EventEmitter$2 = __require$2("events");
	const https$3 = __require$2("https");
	const http$5 = __require$2("http");
	const net$1 = __require$2("net");
	const tls = __require$2("tls");
	const { randomBytes, createHash: createHash$1 } = __require$2("crypto");
	const { Duplex: Duplex$2, Readable } = __require$2("stream");
	const { URL: URL$2 } = __require$2("url");
	const PerMessageDeflate = require_permessage_deflate();
	const Receiver = require_receiver();
	const Sender = require_sender();
	const { isBlob } = require_validation();
	const { BINARY_TYPES, CLOSE_TIMEOUT, EMPTY_BUFFER, GUID, kForOnEventAttribute, kListener, kStatusCode, kWebSocket, NOOP } = require_constants();
	const { EventTarget: { addEventListener, removeEventListener } } = require_event_target();
	const { format, parse } = require_extension();
	const { toBuffer } = require_buffer_util();
	const kAborted = Symbol("kAborted");
	const protocolVersions = [8, 13];
	const readyStates = [
		"CONNECTING",
		"OPEN",
		"CLOSING",
		"CLOSED"
	];
	const subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
	/**
	* Class representing a WebSocket.
	*
	* @extends EventEmitter
	*/
	var WebSocket = class WebSocket extends EventEmitter$2 {
		/**
		* Create a new `WebSocket`.
		*
		* @param {(String|URL)} address The URL to which to connect
		* @param {(String|String[])} [protocols] The subprotocols
		* @param {Object} [options] Connection options
		*/
		constructor(address, protocols, options) {
			super();
			this._binaryType = BINARY_TYPES[0];
			this._closeCode = 1006;
			this._closeFrameReceived = false;
			this._closeFrameSent = false;
			this._closeMessage = EMPTY_BUFFER;
			this._closeTimer = null;
			this._errorEmitted = false;
			this._extensions = {};
			this._paused = false;
			this._protocol = "";
			this._readyState = WebSocket.CONNECTING;
			this._receiver = null;
			this._sender = null;
			this._socket = null;
			if (address !== null) {
				this._bufferedAmount = 0;
				this._isServer = false;
				this._redirects = 0;
				if (protocols === void 0) protocols = [];
				else if (!Array.isArray(protocols)) if (typeof protocols === "object" && protocols !== null) {
					options = protocols;
					protocols = [];
				} else protocols = [protocols];
				initAsClient(this, address, protocols, options);
			} else {
				this._autoPong = options.autoPong;
				this._closeTimeout = options.closeTimeout;
				this._isServer = true;
			}
		}
		/**
		* For historical reasons, the custom "nodebuffer" type is used by the default
		* instead of "blob".
		*
		* @type {String}
		*/
		get binaryType() {
			return this._binaryType;
		}
		set binaryType(type) {
			if (!BINARY_TYPES.includes(type)) return;
			this._binaryType = type;
			if (this._receiver) this._receiver._binaryType = type;
		}
		/**
		* @type {Number}
		*/
		get bufferedAmount() {
			if (!this._socket) return this._bufferedAmount;
			return this._socket._writableState.length + this._sender._bufferedBytes;
		}
		/**
		* @type {String}
		*/
		get extensions() {
			return Object.keys(this._extensions).join();
		}
		/**
		* @type {Boolean}
		*/
		get isPaused() {
			return this._paused;
		}
		/**
		* @type {Function}
		*/
		/* istanbul ignore next */
		get onclose() {
			return null;
		}
		/**
		* @type {Function}
		*/
		/* istanbul ignore next */
		get onerror() {
			return null;
		}
		/**
		* @type {Function}
		*/
		/* istanbul ignore next */
		get onopen() {
			return null;
		}
		/**
		* @type {Function}
		*/
		/* istanbul ignore next */
		get onmessage() {
			return null;
		}
		/**
		* @type {String}
		*/
		get protocol() {
			return this._protocol;
		}
		/**
		* @type {Number}
		*/
		get readyState() {
			return this._readyState;
		}
		/**
		* @type {String}
		*/
		get url() {
			return this._url;
		}
		/**
		* Set up the socket and the internal resources.
		*
		* @param {Duplex} socket The network socket between the server and client
		* @param {Buffer} head The first packet of the upgraded stream
		* @param {Object} options Options object
		* @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
		*     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
		*     multiple times in the same tick
		* @param {Function} [options.generateMask] The function used to generate the
		*     masking key
		* @param {Number} [options.maxBufferedChunks=0] The maximum number of
		*     buffered data chunks
		* @param {Number} [options.maxFragments=0] The maximum number of message
		*     fragments
		* @param {Number} [options.maxPayload=0] The maximum allowed message size
		* @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
		*     not to skip UTF-8 validation for text and close messages
		* @private
		*/
		setSocket(socket, head, options) {
			const receiver = new Receiver({
				allowSynchronousEvents: options.allowSynchronousEvents,
				binaryType: this.binaryType,
				extensions: this._extensions,
				isServer: this._isServer,
				maxBufferedChunks: options.maxBufferedChunks,
				maxFragments: options.maxFragments,
				maxPayload: options.maxPayload,
				skipUTF8Validation: options.skipUTF8Validation
			});
			const sender = new Sender(socket, this._extensions, options.generateMask);
			this._receiver = receiver;
			this._sender = sender;
			this._socket = socket;
			receiver[kWebSocket] = this;
			sender[kWebSocket] = this;
			socket[kWebSocket] = this;
			receiver.on("conclude", receiverOnConclude);
			receiver.on("drain", receiverOnDrain);
			receiver.on("error", receiverOnError);
			receiver.on("message", receiverOnMessage);
			receiver.on("ping", receiverOnPing);
			receiver.on("pong", receiverOnPong);
			sender.onerror = senderOnError;
			if (socket.setTimeout) socket.setTimeout(0);
			if (socket.setNoDelay) socket.setNoDelay();
			if (head.length > 0) socket.unshift(head);
			socket.on("close", socketOnClose);
			socket.on("data", socketOnData);
			socket.on("end", socketOnEnd);
			socket.on("error", socketOnError);
			this._readyState = WebSocket.OPEN;
			this.emit("open");
		}
		/**
		* Emit the `'close'` event.
		*
		* @private
		*/
		emitClose() {
			if (!this._socket) {
				this._readyState = WebSocket.CLOSED;
				this.emit("close", this._closeCode, this._closeMessage);
				return;
			}
			if (this._extensions[PerMessageDeflate.extensionName]) this._extensions[PerMessageDeflate.extensionName].cleanup();
			this._receiver.removeAllListeners();
			this._readyState = WebSocket.CLOSED;
			this.emit("close", this._closeCode, this._closeMessage);
		}
		/**
		* Start a closing handshake.
		*
		*          +----------+   +-----------+   +----------+
		*     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
		*    |     +----------+   +-----------+   +----------+     |
		*          +----------+   +-----------+         |
		* CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
		*          +----------+   +-----------+   |
		*    |           |                        |   +---+        |
		*                +------------------------+-->|fin| - - - -
		*    |         +---+                      |   +---+
		*     - - - - -|fin|<---------------------+
		*              +---+
		*
		* @param {Number} [code] Status code explaining why the connection is closing
		* @param {(String|Buffer)} [data] The reason why the connection is
		*     closing
		* @public
		*/
		close(code, data) {
			if (this.readyState === WebSocket.CLOSED) return;
			if (this.readyState === WebSocket.CONNECTING) {
				abortHandshake(this, this._req, "WebSocket was closed before the connection was established");
				return;
			}
			if (this.readyState === WebSocket.CLOSING) {
				if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) this._socket.end();
				return;
			}
			this._readyState = WebSocket.CLOSING;
			this._sender.close(code, data, !this._isServer, (err) => {
				if (err) return;
				this._closeFrameSent = true;
				if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) this._socket.end();
			});
			setCloseTimer(this);
		}
		/**
		* Pause the socket.
		*
		* @public
		*/
		pause() {
			if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) return;
			this._paused = true;
			this._socket.pause();
		}
		/**
		* Send a ping.
		*
		* @param {*} [data] The data to send
		* @param {Boolean} [mask] Indicates whether or not to mask `data`
		* @param {Function} [cb] Callback which is executed when the ping is sent
		* @public
		*/
		ping(data, mask, cb) {
			if (this.readyState === WebSocket.CONNECTING) throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
			if (typeof data === "function") {
				cb = data;
				data = mask = void 0;
			} else if (typeof mask === "function") {
				cb = mask;
				mask = void 0;
			}
			if (typeof data === "number") data = data.toString();
			if (this.readyState !== WebSocket.OPEN) {
				sendAfterClose(this, data, cb);
				return;
			}
			if (mask === void 0) mask = !this._isServer;
			this._sender.ping(data || EMPTY_BUFFER, mask, cb);
		}
		/**
		* Send a pong.
		*
		* @param {*} [data] The data to send
		* @param {Boolean} [mask] Indicates whether or not to mask `data`
		* @param {Function} [cb] Callback which is executed when the pong is sent
		* @public
		*/
		pong(data, mask, cb) {
			if (this.readyState === WebSocket.CONNECTING) throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
			if (typeof data === "function") {
				cb = data;
				data = mask = void 0;
			} else if (typeof mask === "function") {
				cb = mask;
				mask = void 0;
			}
			if (typeof data === "number") data = data.toString();
			if (this.readyState !== WebSocket.OPEN) {
				sendAfterClose(this, data, cb);
				return;
			}
			if (mask === void 0) mask = !this._isServer;
			this._sender.pong(data || EMPTY_BUFFER, mask, cb);
		}
		/**
		* Resume the socket.
		*
		* @public
		*/
		resume() {
			if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) return;
			this._paused = false;
			if (!this._receiver._writableState.needDrain) this._socket.resume();
		}
		/**
		* Send a data message.
		*
		* @param {*} data The message to send
		* @param {Object} [options] Options object
		* @param {Boolean} [options.binary] Specifies whether `data` is binary or
		*     text
		* @param {Boolean} [options.compress] Specifies whether or not to compress
		*     `data`
		* @param {Boolean} [options.fin=true] Specifies whether the fragment is the
		*     last one
		* @param {Boolean} [options.mask] Specifies whether or not to mask `data`
		* @param {Function} [cb] Callback which is executed when data is written out
		* @public
		*/
		send(data, options, cb) {
			if (this.readyState === WebSocket.CONNECTING) throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
			if (typeof options === "function") {
				cb = options;
				options = {};
			}
			if (typeof data === "number") data = data.toString();
			if (this.readyState !== WebSocket.OPEN) {
				sendAfterClose(this, data, cb);
				return;
			}
			const opts = {
				binary: typeof data !== "string",
				mask: !this._isServer,
				compress: true,
				fin: true,
				...options
			};
			if (!this._extensions[PerMessageDeflate.extensionName]) opts.compress = false;
			this._sender.send(data || EMPTY_BUFFER, opts, cb);
		}
		/**
		* Forcibly close the connection.
		*
		* @public
		*/
		terminate() {
			if (this.readyState === WebSocket.CLOSED) return;
			if (this.readyState === WebSocket.CONNECTING) {
				abortHandshake(this, this._req, "WebSocket was closed before the connection was established");
				return;
			}
			if (this._socket) {
				this._readyState = WebSocket.CLOSING;
				this._socket.destroy();
			}
		}
	};
	/**
	* @constant {Number} CONNECTING
	* @memberof WebSocket
	*/
	Object.defineProperty(WebSocket, "CONNECTING", {
		enumerable: true,
		value: readyStates.indexOf("CONNECTING")
	});
	/**
	* @constant {Number} CONNECTING
	* @memberof WebSocket.prototype
	*/
	Object.defineProperty(WebSocket.prototype, "CONNECTING", {
		enumerable: true,
		value: readyStates.indexOf("CONNECTING")
	});
	/**
	* @constant {Number} OPEN
	* @memberof WebSocket
	*/
	Object.defineProperty(WebSocket, "OPEN", {
		enumerable: true,
		value: readyStates.indexOf("OPEN")
	});
	/**
	* @constant {Number} OPEN
	* @memberof WebSocket.prototype
	*/
	Object.defineProperty(WebSocket.prototype, "OPEN", {
		enumerable: true,
		value: readyStates.indexOf("OPEN")
	});
	/**
	* @constant {Number} CLOSING
	* @memberof WebSocket
	*/
	Object.defineProperty(WebSocket, "CLOSING", {
		enumerable: true,
		value: readyStates.indexOf("CLOSING")
	});
	/**
	* @constant {Number} CLOSING
	* @memberof WebSocket.prototype
	*/
	Object.defineProperty(WebSocket.prototype, "CLOSING", {
		enumerable: true,
		value: readyStates.indexOf("CLOSING")
	});
	/**
	* @constant {Number} CLOSED
	* @memberof WebSocket
	*/
	Object.defineProperty(WebSocket, "CLOSED", {
		enumerable: true,
		value: readyStates.indexOf("CLOSED")
	});
	/**
	* @constant {Number} CLOSED
	* @memberof WebSocket.prototype
	*/
	Object.defineProperty(WebSocket.prototype, "CLOSED", {
		enumerable: true,
		value: readyStates.indexOf("CLOSED")
	});
	[
		"binaryType",
		"bufferedAmount",
		"extensions",
		"isPaused",
		"protocol",
		"readyState",
		"url"
	].forEach((property) => {
		Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
	});
	[
		"open",
		"error",
		"close",
		"message"
	].forEach((method) => {
		Object.defineProperty(WebSocket.prototype, `on${method}`, {
			enumerable: true,
			get() {
				for (const listener of this.listeners(method)) if (listener[kForOnEventAttribute]) return listener[kListener];
				return null;
			},
			set(handler) {
				for (const listener of this.listeners(method)) if (listener[kForOnEventAttribute]) {
					this.removeListener(method, listener);
					break;
				}
				if (typeof handler !== "function") return;
				this.addEventListener(method, handler, { [kForOnEventAttribute]: true });
			}
		});
	});
	WebSocket.prototype.addEventListener = addEventListener;
	WebSocket.prototype.removeEventListener = removeEventListener;
	module.exports = WebSocket;
	/**
	* Initialize a WebSocket client.
	*
	* @param {WebSocket} websocket The client to initialize
	* @param {(String|URL)} address The URL to which to connect
	* @param {Array} protocols The subprotocols
	* @param {Object} [options] Connection options
	* @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether any
	*     of the `'message'`, `'ping'`, and `'pong'` events can be emitted multiple
	*     times in the same tick
	* @param {Boolean} [options.autoPong=true] Specifies whether or not to
	*     automatically send a pong in response to a ping
	* @param {Number} [options.closeTimeout=30000] Duration in milliseconds to wait
	*     for the closing handshake to finish after `websocket.close()` is called
	* @param {Function} [options.finishRequest] A function which can be used to
	*     customize the headers of each http request before it is sent
	* @param {Boolean} [options.followRedirects=false] Whether or not to follow
	*     redirects
	* @param {Function} [options.generateMask] The function used to generate the
	*     masking key
	* @param {Number} [options.handshakeTimeout] Timeout in milliseconds for the
	*     handshake request
	* @param {Number} [options.maxBufferedChunks=1048576] The maximum number of
	*     buffered data chunks
	* @param {Number} [options.maxFragments=131072] The maximum number of message
	*     fragments
	* @param {Number} [options.maxPayload=104857600] The maximum allowed message
	*     size
	* @param {Number} [options.maxRedirects=10] The maximum number of redirects
	*     allowed
	* @param {String} [options.origin] Value of the `Origin` or
	*     `Sec-WebSocket-Origin` header
	* @param {(Boolean|Object)} [options.perMessageDeflate=true] Enable/disable
	*     permessage-deflate
	* @param {Number} [options.protocolVersion=13] Value of the
	*     `Sec-WebSocket-Version` header
	* @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
	*     not to skip UTF-8 validation for text and close messages
	* @private
	*/
	function initAsClient(websocket, address, protocols, options) {
		const opts = {
			allowSynchronousEvents: true,
			autoPong: true,
			closeTimeout: CLOSE_TIMEOUT,
			protocolVersion: protocolVersions[1],
			maxBufferedChunks: 1024 * 1024,
			maxFragments: 128 * 1024,
			maxPayload: 100 * 1024 * 1024,
			skipUTF8Validation: false,
			perMessageDeflate: true,
			followRedirects: false,
			maxRedirects: 10,
			...options,
			socketPath: void 0,
			hostname: void 0,
			protocol: void 0,
			timeout: void 0,
			method: "GET",
			host: void 0,
			path: void 0,
			port: void 0
		};
		websocket._autoPong = opts.autoPong;
		websocket._closeTimeout = opts.closeTimeout;
		if (!protocolVersions.includes(opts.protocolVersion)) throw new RangeError(`Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`);
		let parsedUrl;
		if (address instanceof URL$2) parsedUrl = address;
		else try {
			parsedUrl = new URL$2(address);
		} catch {
			throw new SyntaxError(`Invalid URL: ${address}`);
		}
		if (parsedUrl.protocol === "http:") parsedUrl.protocol = "ws:";
		else if (parsedUrl.protocol === "https:") parsedUrl.protocol = "wss:";
		websocket._url = parsedUrl.href;
		const isSecure = parsedUrl.protocol === "wss:";
		const isIpcUrl = parsedUrl.protocol === "ws+unix:";
		let invalidUrlMessage;
		if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) invalidUrlMessage = "The URL's protocol must be one of \"ws:\", \"wss:\", \"http:\", \"https:\", or \"ws+unix:\"";
		else if (isIpcUrl && !parsedUrl.pathname) invalidUrlMessage = "The URL's pathname is empty";
		else if (parsedUrl.hash) invalidUrlMessage = "The URL contains a fragment identifier";
		if (invalidUrlMessage) {
			const err = new SyntaxError(invalidUrlMessage);
			if (websocket._redirects === 0) throw err;
			else {
				emitErrorAndClose(websocket, err);
				return;
			}
		}
		const defaultPort = isSecure ? 443 : 80;
		const key = randomBytes(16).toString("base64");
		const request = isSecure ? https$3.request : http$5.request;
		const protocolSet = /* @__PURE__ */ new Set();
		let perMessageDeflate;
		opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
		opts.defaultPort = opts.defaultPort || defaultPort;
		opts.port = parsedUrl.port || defaultPort;
		opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
		opts.headers = {
			...opts.headers,
			"Sec-WebSocket-Version": opts.protocolVersion,
			"Sec-WebSocket-Key": key,
			Connection: "Upgrade",
			Upgrade: "websocket"
		};
		opts.path = parsedUrl.pathname + parsedUrl.search;
		opts.timeout = opts.handshakeTimeout;
		if (opts.perMessageDeflate) {
			perMessageDeflate = new PerMessageDeflate({
				...opts.perMessageDeflate,
				isServer: false,
				maxPayload: opts.maxPayload
			});
			opts.headers["Sec-WebSocket-Extensions"] = format({ [PerMessageDeflate.extensionName]: perMessageDeflate.offer() });
		}
		if (protocols.length) {
			for (const protocol of protocols) {
				if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) throw new SyntaxError("An invalid or duplicated subprotocol was specified");
				protocolSet.add(protocol);
			}
			opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
		}
		if (opts.origin) if (opts.protocolVersion < 13) opts.headers["Sec-WebSocket-Origin"] = opts.origin;
		else opts.headers.Origin = opts.origin;
		if (parsedUrl.username || parsedUrl.password) opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
		if (isIpcUrl) {
			const parts = opts.path.split(":");
			opts.socketPath = parts[0];
			opts.path = parts[1];
		}
		let req;
		if (opts.followRedirects) {
			if (websocket._redirects === 0) {
				websocket._originalIpc = isIpcUrl;
				websocket._originalSecure = isSecure;
				websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
				const headers = options && options.headers;
				options = {
					...options,
					headers: {}
				};
				if (headers) for (const [key, value] of Object.entries(headers)) options.headers[key.toLowerCase()] = value;
			} else if (websocket.listenerCount("redirect") === 0) {
				const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
				if (!isSameHost || websocket._originalSecure && !isSecure) {
					delete opts.headers.authorization;
					delete opts.headers.cookie;
					if (!isSameHost) delete opts.headers.host;
					opts.auth = void 0;
				}
			}
			if (opts.auth && !options.headers.authorization) options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
			req = websocket._req = request(opts);
			if (websocket._redirects) websocket.emit("redirect", websocket.url, req);
		} else req = websocket._req = request(opts);
		if (opts.timeout) req.on("timeout", () => {
			abortHandshake(websocket, req, "Opening handshake has timed out");
		});
		req.on("error", (err) => {
			if (req === null || req[kAborted]) return;
			req = websocket._req = null;
			emitErrorAndClose(websocket, err);
		});
		req.on("response", (res) => {
			const location = res.headers.location;
			const statusCode = res.statusCode;
			if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
				if (++websocket._redirects > opts.maxRedirects) {
					abortHandshake(websocket, req, "Maximum redirects exceeded");
					return;
				}
				req.abort();
				let addr;
				try {
					addr = new URL$2(location, address);
				} catch (e) {
					emitErrorAndClose(websocket, /* @__PURE__ */ new SyntaxError(`Invalid URL: ${location}`));
					return;
				}
				initAsClient(websocket, addr, protocols, options);
			} else if (!websocket.emit("unexpected-response", req, res)) abortHandshake(websocket, req, `Unexpected server response: ${res.statusCode}`);
		});
		req.on("upgrade", (res, socket, head) => {
			websocket.emit("upgrade", res);
			if (websocket.readyState !== WebSocket.CONNECTING) return;
			req = websocket._req = null;
			const upgrade = res.headers.upgrade;
			if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
				abortHandshake(websocket, socket, "Invalid Upgrade header");
				return;
			}
			const digest = createHash$1("sha1").update(key + GUID).digest("base64");
			if (res.headers["sec-websocket-accept"] !== digest) {
				abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
				return;
			}
			const serverProt = res.headers["sec-websocket-protocol"];
			let protError;
			if (serverProt !== void 0) {
				if (!protocolSet.size) protError = "Server sent a subprotocol but none was requested";
				else if (!protocolSet.has(serverProt)) protError = "Server sent an invalid subprotocol";
			} else if (protocolSet.size) protError = "Server sent no subprotocol";
			if (protError) {
				abortHandshake(websocket, socket, protError);
				return;
			}
			if (serverProt) websocket._protocol = serverProt;
			const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
			if (secWebSocketExtensions !== void 0) {
				if (!perMessageDeflate) {
					abortHandshake(websocket, socket, "Server sent a Sec-WebSocket-Extensions header but no extension was requested");
					return;
				}
				let extensions;
				try {
					extensions = parse(secWebSocketExtensions);
				} catch (err) {
					abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Extensions header");
					return;
				}
				const extensionNames = Object.keys(extensions);
				if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
					abortHandshake(websocket, socket, "Server indicated an extension that was not requested");
					return;
				}
				try {
					perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
				} catch (err) {
					abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Extensions header");
					return;
				}
				websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
			}
			websocket.setSocket(socket, head, {
				allowSynchronousEvents: opts.allowSynchronousEvents,
				generateMask: opts.generateMask,
				maxBufferedChunks: opts.maxBufferedChunks,
				maxFragments: opts.maxFragments,
				maxPayload: opts.maxPayload,
				skipUTF8Validation: opts.skipUTF8Validation
			});
		});
		if (opts.finishRequest) opts.finishRequest(req, websocket);
		else req.end();
	}
	/**
	* Emit the `'error'` and `'close'` events.
	*
	* @param {WebSocket} websocket The WebSocket instance
	* @param {Error} The error to emit
	* @private
	*/
	function emitErrorAndClose(websocket, err) {
		websocket._readyState = WebSocket.CLOSING;
		websocket._errorEmitted = true;
		websocket.emit("error", err);
		websocket.emitClose();
	}
	/**
	* Create a `net.Socket` and initiate a connection.
	*
	* @param {Object} options Connection options
	* @return {net.Socket} The newly created socket used to start the connection
	* @private
	*/
	function netConnect(options) {
		options.path = options.socketPath;
		return net$1.connect(options);
	}
	/**
	* Create a `tls.TLSSocket` and initiate a connection.
	*
	* @param {Object} options Connection options
	* @return {tls.TLSSocket} The newly created socket used to start the connection
	* @private
	*/
	function tlsConnect(options) {
		options.path = void 0;
		if (!options.servername && options.servername !== "") options.servername = net$1.isIP(options.host) ? "" : options.host;
		return tls.connect(options);
	}
	/**
	* Abort the handshake and emit an error.
	*
	* @param {WebSocket} websocket The WebSocket instance
	* @param {(http.ClientRequest|net.Socket|tls.Socket)} stream The request to
	*     abort or the socket to destroy
	* @param {String} message The error message
	* @private
	*/
	function abortHandshake(websocket, stream, message) {
		websocket._readyState = WebSocket.CLOSING;
		const err = new Error(message);
		Error.captureStackTrace(err, abortHandshake);
		if (stream.setHeader) {
			stream[kAborted] = true;
			stream.abort();
			if (stream.socket && !stream.socket.destroyed) stream.socket.destroy();
			process.nextTick(emitErrorAndClose, websocket, err);
		} else {
			stream.destroy(err);
			stream.once("error", websocket.emit.bind(websocket, "error"));
			stream.once("close", websocket.emitClose.bind(websocket));
		}
	}
	/**
	* Handle cases where the `ping()`, `pong()`, or `send()` methods are called
	* when the `readyState` attribute is `CLOSING` or `CLOSED`.
	*
	* @param {WebSocket} websocket The WebSocket instance
	* @param {*} [data] The data to send
	* @param {Function} [cb] Callback
	* @private
	*/
	function sendAfterClose(websocket, data, cb) {
		if (data) {
			const length = isBlob(data) ? data.size : toBuffer(data).length;
			if (websocket._socket) websocket._sender._bufferedBytes += length;
			else websocket._bufferedAmount += length;
		}
		if (cb) {
			const err = /* @__PURE__ */ new Error(`WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`);
			process.nextTick(cb, err);
		}
	}
	/**
	* The listener of the `Receiver` `'conclude'` event.
	*
	* @param {Number} code The status code
	* @param {Buffer} reason The reason for closing
	* @private
	*/
	function receiverOnConclude(code, reason) {
		const websocket = this[kWebSocket];
		websocket._closeFrameReceived = true;
		websocket._closeMessage = reason;
		websocket._closeCode = code;
		if (websocket._socket[kWebSocket] === void 0) return;
		websocket._socket.removeListener("data", socketOnData);
		process.nextTick(resume, websocket._socket);
		if (code === 1005) websocket.close();
		else websocket.close(code, reason);
	}
	/**
	* The listener of the `Receiver` `'drain'` event.
	*
	* @private
	*/
	function receiverOnDrain() {
		const websocket = this[kWebSocket];
		if (!websocket.isPaused) websocket._socket.resume();
	}
	/**
	* The listener of the `Receiver` `'error'` event.
	*
	* @param {(RangeError|Error)} err The emitted error
	* @private
	*/
	function receiverOnError(err) {
		const websocket = this[kWebSocket];
		if (websocket._socket[kWebSocket] !== void 0) {
			websocket._socket.removeListener("data", socketOnData);
			process.nextTick(resume, websocket._socket);
			websocket.close(err[kStatusCode]);
		}
		if (!websocket._errorEmitted) {
			websocket._errorEmitted = true;
			websocket.emit("error", err);
		}
	}
	/**
	* The listener of the `Receiver` `'finish'` event.
	*
	* @private
	*/
	function receiverOnFinish() {
		this[kWebSocket].emitClose();
	}
	/**
	* The listener of the `Receiver` `'message'` event.
	*
	* @param {Buffer|ArrayBuffer|Buffer[])} data The message
	* @param {Boolean} isBinary Specifies whether the message is binary or not
	* @private
	*/
	function receiverOnMessage(data, isBinary) {
		this[kWebSocket].emit("message", data, isBinary);
	}
	/**
	* The listener of the `Receiver` `'ping'` event.
	*
	* @param {Buffer} data The data included in the ping frame
	* @private
	*/
	function receiverOnPing(data) {
		const websocket = this[kWebSocket];
		if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
		websocket.emit("ping", data);
	}
	/**
	* The listener of the `Receiver` `'pong'` event.
	*
	* @param {Buffer} data The data included in the pong frame
	* @private
	*/
	function receiverOnPong(data) {
		this[kWebSocket].emit("pong", data);
	}
	/**
	* Resume a readable stream
	*
	* @param {Readable} stream The readable stream
	* @private
	*/
	function resume(stream) {
		stream.resume();
	}
	/**
	* The `Sender` error event handler.
	*
	* @param {Error} The error
	* @private
	*/
	function senderOnError(err) {
		const websocket = this[kWebSocket];
		if (websocket.readyState === WebSocket.CLOSED) return;
		if (websocket.readyState === WebSocket.OPEN) {
			websocket._readyState = WebSocket.CLOSING;
			setCloseTimer(websocket);
		}
		this._socket.end();
		if (!websocket._errorEmitted) {
			websocket._errorEmitted = true;
			websocket.emit("error", err);
		}
	}
	/**
	* Set a timer to destroy the underlying raw socket of a WebSocket.
	*
	* @param {WebSocket} websocket The WebSocket instance
	* @private
	*/
	function setCloseTimer(websocket) {
		websocket._closeTimer = setTimeout(websocket._socket.destroy.bind(websocket._socket), websocket._closeTimeout);
	}
	/**
	* The listener of the socket `'close'` event.
	*
	* @private
	*/
	function socketOnClose() {
		const websocket = this[kWebSocket];
		this.removeListener("close", socketOnClose);
		this.removeListener("data", socketOnData);
		this.removeListener("end", socketOnEnd);
		websocket._readyState = WebSocket.CLOSING;
		if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
			const chunk = this.read(this._readableState.length);
			websocket._receiver.write(chunk);
		}
		websocket._receiver.end();
		this[kWebSocket] = void 0;
		clearTimeout(websocket._closeTimer);
		if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) websocket.emitClose();
		else {
			websocket._receiver.on("error", receiverOnFinish);
			websocket._receiver.on("finish", receiverOnFinish);
		}
	}
	/**
	* The listener of the socket `'data'` event.
	*
	* @param {Buffer} chunk A chunk of data
	* @private
	*/
	function socketOnData(chunk) {
		if (!this[kWebSocket]._receiver.write(chunk)) this.pause();
	}
	/**
	* The listener of the socket `'end'` event.
	*
	* @private
	*/
	function socketOnEnd() {
		const websocket = this[kWebSocket];
		websocket._readyState = WebSocket.CLOSING;
		websocket._receiver.end();
		this.end();
	}
	/**
	* The listener of the socket `'error'` event.
	*
	* @private
	*/
	function socketOnError() {
		const websocket = this[kWebSocket];
		this.removeListener("error", socketOnError);
		this.on("error", NOOP);
		if (websocket) {
			websocket._readyState = WebSocket.CLOSING;
			this.destroy();
		}
	}
}));
var require_stream = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	require_websocket();
	const { Duplex: Duplex$1 } = __require$2("stream");
	/**
	* Emits the `'close'` event on a stream.
	*
	* @param {Duplex} stream The stream.
	* @private
	*/
	function emitClose(stream) {
		stream.emit("close");
	}
	/**
	* The listener of the `'end'` event.
	*
	* @private
	*/
	function duplexOnEnd() {
		if (!this.destroyed && this._writableState.finished) this.destroy();
	}
	/**
	* The listener of the `'error'` event.
	*
	* @param {Error} err The error
	* @private
	*/
	function duplexOnError(err) {
		this.removeListener("error", duplexOnError);
		this.destroy();
		if (this.listenerCount("error") === 0) this.emit("error", err);
	}
	/**
	* Wraps a `WebSocket` in a duplex stream.
	*
	* @param {WebSocket} ws The `WebSocket` to wrap
	* @param {Object} [options] The options for the `Duplex` constructor
	* @return {Duplex} The duplex stream
	* @public
	*/
	function createWebSocketStream(ws, options) {
		let terminateOnDestroy = true;
		const duplex = new Duplex$1({
			...options,
			autoDestroy: false,
			emitClose: false,
			objectMode: false,
			writableObjectMode: false
		});
		ws.on("message", function message(msg, isBinary) {
			const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
			if (!duplex.push(data)) ws.pause();
		});
		ws.once("error", function error(err) {
			if (duplex.destroyed) return;
			terminateOnDestroy = false;
			duplex.destroy(err);
		});
		ws.once("close", function close() {
			if (duplex.destroyed) return;
			duplex.push(null);
		});
		duplex._destroy = function(err, callback) {
			if (ws.readyState === ws.CLOSED) {
				callback(err);
				process.nextTick(emitClose, duplex);
				return;
			}
			let called = false;
			ws.once("error", function error(err) {
				called = true;
				callback(err);
			});
			ws.once("close", function close() {
				if (!called) callback(err);
				process.nextTick(emitClose, duplex);
			});
			if (terminateOnDestroy) ws.terminate();
		};
		duplex._final = function(callback) {
			if (ws.readyState === ws.CONNECTING) {
				ws.once("open", function open() {
					duplex._final(callback);
				});
				return;
			}
			if (ws._socket === null) return;
			if (ws._socket._writableState.finished) {
				callback();
				if (duplex._readableState.endEmitted) duplex.destroy();
			} else {
				ws._socket.once("finish", function finish() {
					callback();
				});
				ws.close();
			}
		};
		duplex._read = function() {
			if (ws.isPaused) ws.resume();
		};
		duplex._write = function(chunk, encoding, callback) {
			if (ws.readyState === ws.CONNECTING) {
				ws.once("open", function open() {
					duplex._write(chunk, encoding, callback);
				});
				return;
			}
			ws.send(chunk, callback);
		};
		duplex.on("end", duplexOnEnd);
		duplex.on("error", duplexOnError);
		return duplex;
	}
	module.exports = createWebSocketStream;
}));
var require_subprotocol = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const { tokenChars } = require_validation();
	/**
	* Parses the `Sec-WebSocket-Protocol` header into a set of subprotocol names.
	*
	* @param {String} header The field value of the header
	* @return {Set} The subprotocol names
	* @public
	*/
	function parse(header) {
		const protocols = /* @__PURE__ */ new Set();
		let start = -1;
		let end = -1;
		let i = 0;
		for (; i < header.length; i++) {
			const code = header.charCodeAt(i);
			if (end === -1 && tokenChars[code] === 1) {
				if (start === -1) start = i;
			} else if (i !== 0 && (code === 32 || code === 9)) {
				if (end === -1 && start !== -1) end = i;
			} else if (code === 44) {
				if (start === -1) throw new SyntaxError(`Unexpected character at index ${i}`);
				if (end === -1) end = i;
				const protocol = header.slice(start, end);
				if (protocols.has(protocol)) throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
				protocols.add(protocol);
				start = end = -1;
			} else throw new SyntaxError(`Unexpected character at index ${i}`);
		}
		if (start === -1 || end !== -1) throw new SyntaxError("Unexpected end of input");
		const protocol = header.slice(start, i);
		if (protocols.has(protocol)) throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
		protocols.add(protocol);
		return protocols;
	}
	module.exports = { parse };
}));
var require_websocket_server = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const EventEmitter$1 = __require$2("events");
	const http$4 = __require$2("http");
	const { Duplex } = __require$2("stream");
	const { createHash } = __require$2("crypto");
	const extension = require_extension();
	const PerMessageDeflate = require_permessage_deflate();
	const subprotocol = require_subprotocol();
	const WebSocket = require_websocket();
	const { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
	const keyRegex = /^[+/0-9A-Za-z]{22}==$/;
	const RUNNING = 0;
	const CLOSING = 1;
	const CLOSED = 2;
	/**
	* Class representing a WebSocket server.
	*
	* @extends EventEmitter
	*/
	var WebSocketServer = class extends EventEmitter$1 {
		/**
		* Create a `WebSocketServer` instance.
		*
		* @param {Object} options Configuration options
		* @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
		*     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
		*     multiple times in the same tick
		* @param {Boolean} [options.autoPong=true] Specifies whether or not to
		*     automatically send a pong in response to a ping
		* @param {Number} [options.backlog=511] The maximum length of the queue of
		*     pending connections
		* @param {Boolean} [options.clientTracking=true] Specifies whether or not to
		*     track clients
		* @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
		*     wait for the closing handshake to finish after `websocket.close()` is
		*     called
		* @param {Function} [options.handleProtocols] A hook to handle protocols
		* @param {String} [options.host] The hostname where to bind the server
		* @param {Number} [options.maxBufferedChunks=1048576] The maximum number of
		*     buffered data chunks
		* @param {Number} [options.maxFragments=131072] The maximum number of message
		*     fragments
		* @param {Number} [options.maxPayload=104857600] The maximum allowed message
		*     size
		* @param {Boolean} [options.noServer=false] Enable no server mode
		* @param {String} [options.path] Accept only connections matching this path
		* @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
		*     permessage-deflate
		* @param {Number} [options.port] The port where to bind the server
		* @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
		*     server to use
		* @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
		*     not to skip UTF-8 validation for text and close messages
		* @param {Function} [options.verifyClient] A hook to reject connections
		* @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
		*     class to use. It must be the `WebSocket` class or class that extends it
		* @param {Function} [callback] A listener for the `listening` event
		*/
		constructor(options, callback) {
			super();
			options = {
				allowSynchronousEvents: true,
				autoPong: true,
				maxBufferedChunks: 1024 * 1024,
				maxFragments: 128 * 1024,
				maxPayload: 100 * 1024 * 1024,
				skipUTF8Validation: false,
				perMessageDeflate: false,
				handleProtocols: null,
				clientTracking: true,
				closeTimeout: CLOSE_TIMEOUT,
				verifyClient: null,
				noServer: false,
				backlog: null,
				server: null,
				host: null,
				path: null,
				port: null,
				WebSocket,
				...options
			};
			if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) throw new TypeError("One and only one of the \"port\", \"server\", or \"noServer\" options must be specified");
			if (options.port != null) {
				this._server = http$4.createServer((req, res) => {
					const body = http$4.STATUS_CODES[426];
					res.writeHead(426, {
						"Content-Length": body.length,
						"Content-Type": "text/plain"
					});
					res.end(body);
				});
				this._server.listen(options.port, options.host, options.backlog, callback);
			} else if (options.server) this._server = options.server;
			if (this._server) {
				const emitConnection = this.emit.bind(this, "connection");
				this._removeListeners = addListeners(this._server, {
					listening: this.emit.bind(this, "listening"),
					error: this.emit.bind(this, "error"),
					upgrade: (req, socket, head) => {
						this.handleUpgrade(req, socket, head, emitConnection);
					}
				});
			}
			if (options.perMessageDeflate === true) options.perMessageDeflate = {};
			if (options.clientTracking) {
				this.clients = /* @__PURE__ */ new Set();
				this._shouldEmitClose = false;
			}
			this.options = options;
			this._state = RUNNING;
		}
		/**
		* Returns the bound address, the address family name, and port of the server
		* as reported by the operating system if listening on an IP socket.
		* If the server is listening on a pipe or UNIX domain socket, the name is
		* returned as a string.
		*
		* @return {(Object|String|null)} The address of the server
		* @public
		*/
		address() {
			if (this.options.noServer) throw new Error("The server is operating in \"noServer\" mode");
			if (!this._server) return null;
			return this._server.address();
		}
		/**
		* Stop the server from accepting new connections and emit the `'close'` event
		* when all existing connections are closed.
		*
		* @param {Function} [cb] A one-time listener for the `'close'` event
		* @public
		*/
		close(cb) {
			if (this._state === CLOSED) {
				if (cb) this.once("close", () => {
					cb(/* @__PURE__ */ new Error("The server is not running"));
				});
				process.nextTick(emitClose, this);
				return;
			}
			if (cb) this.once("close", cb);
			if (this._state === CLOSING) return;
			this._state = CLOSING;
			if (this.options.noServer || this.options.server) {
				if (this._server) {
					this._removeListeners();
					this._removeListeners = this._server = null;
				}
				if (this.clients) if (!this.clients.size) process.nextTick(emitClose, this);
				else this._shouldEmitClose = true;
				else process.nextTick(emitClose, this);
			} else {
				const server = this._server;
				this._removeListeners();
				this._removeListeners = this._server = null;
				server.close(() => {
					emitClose(this);
				});
			}
		}
		/**
		* See if a given request should be handled by this server instance.
		*
		* @param {http.IncomingMessage} req Request object to inspect
		* @return {Boolean} `true` if the request is valid, else `false`
		* @public
		*/
		shouldHandle(req) {
			if (this.options.path) {
				const index = req.url.indexOf("?");
				if ((index !== -1 ? req.url.slice(0, index) : req.url) !== this.options.path) return false;
			}
			return true;
		}
		/**
		* Handle a HTTP Upgrade request.
		*
		* @param {http.IncomingMessage} req The request object
		* @param {Duplex} socket The network socket between the server and client
		* @param {Buffer} head The first packet of the upgraded stream
		* @param {Function} cb Callback
		* @public
		*/
		handleUpgrade(req, socket, head, cb) {
			socket.on("error", socketOnError);
			const key = req.headers["sec-websocket-key"];
			const upgrade = req.headers.upgrade;
			const version = +req.headers["sec-websocket-version"];
			if (req.method !== "GET") {
				abortHandshakeOrEmitwsClientError(this, req, socket, 405, "Invalid HTTP method");
				return;
			}
			if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
				abortHandshakeOrEmitwsClientError(this, req, socket, 400, "Invalid Upgrade header");
				return;
			}
			if (key === void 0 || !keyRegex.test(key)) {
				abortHandshakeOrEmitwsClientError(this, req, socket, 400, "Missing or invalid Sec-WebSocket-Key header");
				return;
			}
			if (version !== 13 && version !== 8) {
				abortHandshakeOrEmitwsClientError(this, req, socket, 400, "Missing or invalid Sec-WebSocket-Version header", { "Sec-WebSocket-Version": "13, 8" });
				return;
			}
			if (!this.shouldHandle(req)) {
				abortHandshake(socket, 400);
				return;
			}
			const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
			let protocols = /* @__PURE__ */ new Set();
			if (secWebSocketProtocol !== void 0) try {
				protocols = subprotocol.parse(secWebSocketProtocol);
			} catch (err) {
				abortHandshakeOrEmitwsClientError(this, req, socket, 400, "Invalid Sec-WebSocket-Protocol header");
				return;
			}
			const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
			const extensions = {};
			if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
				const perMessageDeflate = new PerMessageDeflate({
					...this.options.perMessageDeflate,
					isServer: true,
					maxPayload: this.options.maxPayload
				});
				try {
					const offers = extension.parse(secWebSocketExtensions);
					if (offers[PerMessageDeflate.extensionName]) {
						perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
						extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
					}
				} catch (err) {
					abortHandshakeOrEmitwsClientError(this, req, socket, 400, "Invalid or unacceptable Sec-WebSocket-Extensions header");
					return;
				}
			}
			if (this.options.verifyClient) {
				const info = {
					origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
					secure: !!(req.socket.authorized || req.socket.encrypted),
					req
				};
				if (this.options.verifyClient.length === 2) {
					this.options.verifyClient(info, (verified, code, message, headers) => {
						if (!verified) return abortHandshake(socket, code || 401, message, headers);
						this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
					});
					return;
				}
				if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
			}
			this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
		}
		/**
		* Upgrade the connection to WebSocket.
		*
		* @param {Object} extensions The accepted extensions
		* @param {String} key The value of the `Sec-WebSocket-Key` header
		* @param {Set} protocols The subprotocols
		* @param {http.IncomingMessage} req The request object
		* @param {Duplex} socket The network socket between the server and client
		* @param {Buffer} head The first packet of the upgraded stream
		* @param {Function} cb Callback
		* @throws {Error} If called more than once with the same socket
		* @private
		*/
		completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
			if (!socket.readable || !socket.writable) return socket.destroy();
			if (socket[kWebSocket]) throw new Error("server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration");
			if (this._state > RUNNING) return abortHandshake(socket, 503);
			const headers = [
				"HTTP/1.1 101 Switching Protocols",
				"Upgrade: websocket",
				"Connection: Upgrade",
				`Sec-WebSocket-Accept: ${createHash("sha1").update(key + GUID).digest("base64")}`
			];
			const ws = new this.options.WebSocket(null, void 0, this.options);
			if (protocols.size) {
				const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
				if (protocol) {
					headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
					ws._protocol = protocol;
				}
			}
			if (extensions[PerMessageDeflate.extensionName]) {
				const params = extensions[PerMessageDeflate.extensionName].params;
				const value = extension.format({ [PerMessageDeflate.extensionName]: [params] });
				headers.push(`Sec-WebSocket-Extensions: ${value}`);
				ws._extensions = extensions;
			}
			this.emit("headers", headers, req);
			socket.write(headers.concat("\r\n").join("\r\n"));
			socket.removeListener("error", socketOnError);
			ws.setSocket(socket, head, {
				allowSynchronousEvents: this.options.allowSynchronousEvents,
				maxBufferedChunks: this.options.maxBufferedChunks,
				maxFragments: this.options.maxFragments,
				maxPayload: this.options.maxPayload,
				skipUTF8Validation: this.options.skipUTF8Validation
			});
			if (this.clients) {
				this.clients.add(ws);
				ws.on("close", () => {
					this.clients.delete(ws);
					if (this._shouldEmitClose && !this.clients.size) process.nextTick(emitClose, this);
				});
			}
			cb(ws, req);
		}
	};
	module.exports = WebSocketServer;
	/**
	* Add event listeners on an `EventEmitter` using a map of <event, listener>
	* pairs.
	*
	* @param {EventEmitter} server The event emitter
	* @param {Object.<String, Function>} map The listeners to add
	* @return {Function} A function that will remove the added listeners when
	*     called
	* @private
	*/
	function addListeners(server, map) {
		for (const event of Object.keys(map)) server.on(event, map[event]);
		return function removeListeners() {
			for (const event of Object.keys(map)) server.removeListener(event, map[event]);
		};
	}
	/**
	* Emit a `'close'` event on an `EventEmitter`.
	*
	* @param {EventEmitter} server The event emitter
	* @private
	*/
	function emitClose(server) {
		server._state = CLOSED;
		server.emit("close");
	}
	/**
	* Handle socket errors.
	*
	* @private
	*/
	function socketOnError() {
		this.destroy();
	}
	/**
	* Close the connection when preconditions are not fulfilled.
	*
	* @param {Duplex} socket The socket of the upgrade request
	* @param {Number} code The HTTP response status code
	* @param {String} [message] The HTTP response body
	* @param {Object} [headers] Additional HTTP response headers
	* @private
	*/
	function abortHandshake(socket, code, message, headers) {
		message = message || http$4.STATUS_CODES[code];
		headers = {
			Connection: "close",
			"Content-Type": "text/html",
			"Content-Length": Buffer.byteLength(message),
			...headers
		};
		socket.once("finish", socket.destroy);
		socket.end(`HTTP/1.1 ${code} ${http$4.STATUS_CODES[code]}\r\n` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message);
	}
	/**
	* Emit a `'wsClientError'` event on a `WebSocketServer` if there is at least
	* one listener for it, otherwise call `abortHandshake()`.
	*
	* @param {WebSocketServer} server The WebSocket server
	* @param {http.IncomingMessage} req The request object
	* @param {Duplex} socket The socket of the upgrade request
	* @param {Number} code The HTTP response status code
	* @param {String} message The HTTP response body
	* @param {Object} [headers] The HTTP response headers
	* @private
	*/
	function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
		if (server.listenerCount("wsClientError")) {
			const err = new Error(message);
			Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
			server.emit("wsClientError", err, socket, req);
		} else abortHandshake(socket, code, message, headers);
	}
}));
require_stream();
require_extension();
require_permessage_deflate();
require_receiver();
require_sender();
require_subprotocol();
require_websocket();
var import_websocket_server = /* @__PURE__ */ __toESM$2(require_websocket_server(), 1);
process.versions.bun ? import.meta.require("ws").WebSocketServer : import_websocket_server.default;
var require_ms = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Helpers.
	*/
	var s = 1e3;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var w = d * 7;
	var y = d * 365.25;
	/**
	* Parse or format the given `val`.
	*
	* Options:
	*
	*  - `long` verbose formatting [false]
	*
	* @param {String|Number} val
	* @param {Object} [options]
	* @throws {Error} throw an error if val is not a non-empty string or a number
	* @return {String|Number}
	* @api public
	*/
	module.exports = function(val, options) {
		options = options || {};
		var type = typeof val;
		if (type === "string" && val.length > 0) return parse(val);
		else if (type === "number" && isFinite(val)) return options.long ? fmtLong(val) : fmtShort(val);
		throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
	};
	/**
	* Parse the given `str` and return milliseconds.
	*
	* @param {String} str
	* @return {Number}
	* @api private
	*/
	function parse(str) {
		str = String(str);
		if (str.length > 100) return;
		var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
		if (!match) return;
		var n = parseFloat(match[1]);
		switch ((match[2] || "ms").toLowerCase()) {
			case "years":
			case "year":
			case "yrs":
			case "yr":
			case "y": return n * y;
			case "weeks":
			case "week":
			case "w": return n * w;
			case "days":
			case "day":
			case "d": return n * d;
			case "hours":
			case "hour":
			case "hrs":
			case "hr":
			case "h": return n * h;
			case "minutes":
			case "minute":
			case "mins":
			case "min":
			case "m": return n * m;
			case "seconds":
			case "second":
			case "secs":
			case "sec":
			case "s": return n * s;
			case "milliseconds":
			case "millisecond":
			case "msecs":
			case "msec":
			case "ms": return n;
			default: return;
		}
	}
	/**
	* Short format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtShort(ms) {
		var msAbs = Math.abs(ms);
		if (msAbs >= d) return Math.round(ms / d) + "d";
		if (msAbs >= h) return Math.round(ms / h) + "h";
		if (msAbs >= m) return Math.round(ms / m) + "m";
		if (msAbs >= s) return Math.round(ms / s) + "s";
		return ms + "ms";
	}
	/**
	* Long format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtLong(ms) {
		var msAbs = Math.abs(ms);
		if (msAbs >= d) return plural(ms, msAbs, d, "day");
		if (msAbs >= h) return plural(ms, msAbs, h, "hour");
		if (msAbs >= m) return plural(ms, msAbs, m, "minute");
		if (msAbs >= s) return plural(ms, msAbs, s, "second");
		return ms + " ms";
	}
	/**
	* Pluralization helper.
	*/
	function plural(ms, msAbs, n, name) {
		var isPlural = msAbs >= n * 1.5;
		return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
	}
}));
var require_common$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* This is the common logic for both the Node.js and web browser
	* implementations of `debug()`.
	*/
	function setup(env) {
		createDebug.debug = createDebug;
		createDebug.default = createDebug;
		createDebug.coerce = coerce;
		createDebug.disable = disable;
		createDebug.enable = enable;
		createDebug.enabled = enabled;
		createDebug.humanize = require_ms();
		createDebug.destroy = destroy;
		Object.keys(env).forEach((key) => {
			createDebug[key] = env[key];
		});
		/**
		* The currently active debug mode names, and names to skip.
		*/
		createDebug.names = [];
		createDebug.skips = [];
		/**
		* Map of special "%n" handling functions, for the debug "format" argument.
		*
		* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
		*/
		createDebug.formatters = {};
		/**
		* Selects a color for a debug namespace
		* @param {String} namespace The namespace string for the debug instance to be colored
		* @return {Number|String} An ANSI color code for the given namespace
		* @api private
		*/
		function selectColor(namespace) {
			let hash = 0;
			for (let i = 0; i < namespace.length; i++) {
				hash = (hash << 5) - hash + namespace.charCodeAt(i);
				hash |= 0;
			}
			return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
		}
		createDebug.selectColor = selectColor;
		/**
		* Create a debugger with the given `namespace`.
		*
		* @param {String} namespace
		* @return {Function}
		* @api public
		*/
		function createDebug(namespace) {
			let prevTime;
			let enableOverride = null;
			let namespacesCache;
			let enabledCache;
			function debug(...args) {
				if (!debug.enabled) return;
				const self = debug;
				const curr = Number(/* @__PURE__ */ new Date());
				self.diff = curr - (prevTime || curr);
				self.prev = prevTime;
				self.curr = curr;
				prevTime = curr;
				args[0] = createDebug.coerce(args[0]);
				if (typeof args[0] !== "string") args.unshift("%O");
				let index = 0;
				args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
					if (match === "%%") return "%";
					index++;
					const formatter = createDebug.formatters[format];
					if (typeof formatter === "function") {
						match = formatter.call(self, args[index]);
						args.splice(index, 1);
						index--;
					}
					return match;
				});
				createDebug.formatArgs.call(self, args);
				(self.log || createDebug.log).apply(self, args);
			}
			debug.namespace = namespace;
			debug.useColors = createDebug.useColors();
			debug.color = createDebug.selectColor(namespace);
			debug.extend = extend;
			debug.destroy = createDebug.destroy;
			Object.defineProperty(debug, "enabled", {
				enumerable: true,
				configurable: false,
				get: () => {
					if (enableOverride !== null) return enableOverride;
					if (namespacesCache !== createDebug.namespaces) {
						namespacesCache = createDebug.namespaces;
						enabledCache = createDebug.enabled(namespace);
					}
					return enabledCache;
				},
				set: (v) => {
					enableOverride = v;
				}
			});
			if (typeof createDebug.init === "function") createDebug.init(debug);
			return debug;
		}
		function extend(namespace, delimiter) {
			const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
			newDebug.log = this.log;
			return newDebug;
		}
		/**
		* Enables a debug mode by namespaces. This can include modes
		* separated by a colon and wildcards.
		*
		* @param {String} namespaces
		* @api public
		*/
		function enable(namespaces) {
			createDebug.save(namespaces);
			createDebug.namespaces = namespaces;
			createDebug.names = [];
			createDebug.skips = [];
			const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
			for (const ns of split) if (ns[0] === "-") createDebug.skips.push(ns.slice(1));
			else createDebug.names.push(ns);
		}
		/**
		* Checks if the given string matches a namespace template, honoring
		* asterisks as wildcards.
		*
		* @param {String} search
		* @param {String} template
		* @return {Boolean}
		*/
		function matchesTemplate(search, template) {
			let searchIndex = 0;
			let templateIndex = 0;
			let starIndex = -1;
			let matchIndex = 0;
			while (searchIndex < search.length) if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) if (template[templateIndex] === "*") {
				starIndex = templateIndex;
				matchIndex = searchIndex;
				templateIndex++;
			} else {
				searchIndex++;
				templateIndex++;
			}
			else if (starIndex !== -1) {
				templateIndex = starIndex + 1;
				matchIndex++;
				searchIndex = matchIndex;
			} else return false;
			while (templateIndex < template.length && template[templateIndex] === "*") templateIndex++;
			return templateIndex === template.length;
		}
		/**
		* Disable debug output.
		*
		* @return {String} namespaces
		* @api public
		*/
		function disable() {
			const namespaces = [...createDebug.names, ...createDebug.skips.map((namespace) => "-" + namespace)].join(",");
			createDebug.enable("");
			return namespaces;
		}
		/**
		* Returns true if the given mode name is enabled, false otherwise.
		*
		* @param {String} name
		* @return {Boolean}
		* @api public
		*/
		function enabled(name) {
			for (const skip of createDebug.skips) if (matchesTemplate(name, skip)) return false;
			for (const ns of createDebug.names) if (matchesTemplate(name, ns)) return true;
			return false;
		}
		/**
		* Coerce `val`.
		*
		* @param {Mixed} val
		* @return {Mixed}
		* @api private
		*/
		function coerce(val) {
			if (val instanceof Error) return val.stack || val.message;
			return val;
		}
		/**
		* XXX DO NOT USE. This is a temporary stub function.
		* XXX It WILL be removed in the next major release.
		*/
		function destroy() {
			console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
		}
		createDebug.enable(createDebug.load());
		return createDebug;
	}
	module.exports = setup;
}));
var require_browser = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* This is the web browser implementation of `debug()`.
	*/
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = localstorage();
	exports.destroy = (() => {
		let warned = false;
		return () => {
			if (!warned) {
				warned = true;
				console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
			}
		};
	})();
	/**
	* Colors.
	*/
	exports.colors = [
		"#0000CC",
		"#0000FF",
		"#0033CC",
		"#0033FF",
		"#0066CC",
		"#0066FF",
		"#0099CC",
		"#0099FF",
		"#00CC00",
		"#00CC33",
		"#00CC66",
		"#00CC99",
		"#00CCCC",
		"#00CCFF",
		"#3300CC",
		"#3300FF",
		"#3333CC",
		"#3333FF",
		"#3366CC",
		"#3366FF",
		"#3399CC",
		"#3399FF",
		"#33CC00",
		"#33CC33",
		"#33CC66",
		"#33CC99",
		"#33CCCC",
		"#33CCFF",
		"#6600CC",
		"#6600FF",
		"#6633CC",
		"#6633FF",
		"#66CC00",
		"#66CC33",
		"#9900CC",
		"#9900FF",
		"#9933CC",
		"#9933FF",
		"#99CC00",
		"#99CC33",
		"#CC0000",
		"#CC0033",
		"#CC0066",
		"#CC0099",
		"#CC00CC",
		"#CC00FF",
		"#CC3300",
		"#CC3333",
		"#CC3366",
		"#CC3399",
		"#CC33CC",
		"#CC33FF",
		"#CC6600",
		"#CC6633",
		"#CC9900",
		"#CC9933",
		"#CCCC00",
		"#CCCC33",
		"#FF0000",
		"#FF0033",
		"#FF0066",
		"#FF0099",
		"#FF00CC",
		"#FF00FF",
		"#FF3300",
		"#FF3333",
		"#FF3366",
		"#FF3399",
		"#FF33CC",
		"#FF33FF",
		"#FF6600",
		"#FF6633",
		"#FF9900",
		"#FF9933",
		"#FFCC00",
		"#FFCC33"
	];
	/**
	* Currently only WebKit-based Web Inspectors, Firefox >= v31,
	* and the Firebug extension (any Firefox version) are known
	* to support "%c" CSS customizations.
	*
	* TODO: add a `localStorage` variable to explicitly enable/disable colors
	*/
	function useColors() {
		if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) return true;
		if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) return false;
		let m;
		return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
	}
	/**
	* Colorize log arguments if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
		if (!this.useColors) return;
		const c = "color: " + this.color;
		args.splice(1, 0, c, "color: inherit");
		let index = 0;
		let lastC = 0;
		args[0].replace(/%[a-zA-Z%]/g, (match) => {
			if (match === "%%") return;
			index++;
			if (match === "%c") lastC = index;
		});
		args.splice(lastC, 0, c);
	}
	/**
	* Invokes `console.debug()` when available.
	* No-op when `console.debug` is not a "function".
	* If `console.debug` is not available, falls back
	* to `console.log`.
	*
	* @api public
	*/
	exports.log = console.debug || console.log || (() => {});
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		try {
			if (namespaces) exports.storage.setItem("debug", namespaces);
			else exports.storage.removeItem("debug");
		} catch (error) {}
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		let r;
		try {
			r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
		} catch (error) {}
		if (!r && typeof process !== "undefined" && "env" in process) r = process.env.DEBUG;
		return r;
	}
	/**
	* Localstorage attempts to return the localstorage.
	*
	* This is necessary because safari throws
	* when a user disables cookies/localstorage
	* and you attempt to access it.
	*
	* @return {LocalStorage}
	* @api private
	*/
	function localstorage() {
		try {
			return localStorage;
		} catch (error) {}
	}
	module.exports = require_common$1()(exports);
	const { formatters } = module.exports;
	/**
	* Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	*/
	formatters.j = function(v) {
		try {
			return JSON.stringify(v);
		} catch (error) {
			return "[UnexpectedJSONParseError]: " + error.message;
		}
	};
}));
var require_node = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module dependencies.
	*/
	const tty = __require$2("tty");
	const util = __require$2("util");
	/**
	* This is the Node.js implementation of `debug()`.
	*/
	exports.init = init;
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.destroy = util.deprecate(() => {}, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
	/**
	* Colors.
	*/
	exports.colors = [
		6,
		2,
		3,
		4,
		5,
		1
	];
	try {
		const supportsColor = __require$2("supports-color");
		if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) exports.colors = [
			20,
			21,
			26,
			27,
			32,
			33,
			38,
			39,
			40,
			41,
			42,
			43,
			44,
			45,
			56,
			57,
			62,
			63,
			68,
			69,
			74,
			75,
			76,
			77,
			78,
			79,
			80,
			81,
			92,
			93,
			98,
			99,
			112,
			113,
			128,
			129,
			134,
			135,
			148,
			149,
			160,
			161,
			162,
			163,
			164,
			165,
			166,
			167,
			168,
			169,
			170,
			171,
			172,
			173,
			178,
			179,
			184,
			185,
			196,
			197,
			198,
			199,
			200,
			201,
			202,
			203,
			204,
			205,
			206,
			207,
			208,
			209,
			214,
			215,
			220,
			221
		];
	} catch (error) {}
	/**
	* Build up the default `inspectOpts` object from the environment variables.
	*
	*   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
	*/
	exports.inspectOpts = Object.keys(process.env).filter((key) => {
		return /^debug_/i.test(key);
	}).reduce((obj, key) => {
		const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
			return k.toUpperCase();
		});
		let val = process.env[key];
		if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
		else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
		else if (val === "null") val = null;
		else val = Number(val);
		obj[prop] = val;
		return obj;
	}, {});
	/**
	* Is stdout a TTY? Colored output is enabled when `true`.
	*/
	function useColors() {
		return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
	}
	/**
	* Adds ANSI color escape codes if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		const { namespace: name, useColors } = this;
		if (useColors) {
			const c = this.color;
			const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
			const prefix = `  ${colorCode};1m${name} \u001B[0m`;
			args[0] = prefix + args[0].split("\n").join("\n" + prefix);
			args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
		} else args[0] = getDate() + name + " " + args[0];
	}
	function getDate() {
		if (exports.inspectOpts.hideDate) return "";
		return (/* @__PURE__ */ new Date()).toISOString() + " ";
	}
	/**
	* Invokes `util.formatWithOptions()` with the specified arguments and writes to stderr.
	*/
	function log(...args) {
		return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
	}
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		if (namespaces) process.env.DEBUG = namespaces;
		else delete process.env.DEBUG;
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		return process.env.DEBUG;
	}
	/**
	* Init logic for `debug` instances.
	*
	* Create a new `inspectOpts` object in case `useColors` is set
	* differently for a particular `debug` instance.
	*/
	function init(debug) {
		debug.inspectOpts = {};
		const keys = Object.keys(exports.inspectOpts);
		for (let i = 0; i < keys.length; i++) debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
	}
	module.exports = require_common$1()(exports);
	const { formatters } = module.exports;
	/**
	* Map %o to `util.inspect()`, all on a single line.
	*/
	formatters.o = function(v) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
	};
	/**
	* Map %O to `util.inspect()`, allowing multiple lines if needed.
	*/
	formatters.O = function(v) {
		this.inspectOpts.colors = this.useColors;
		return util.inspect(v, this.inspectOpts);
	};
}));
var require_src$2 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Detect Electron renderer / nwjs process, which is node, but we should
	* treat as a browser.
	*/
	if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) module.exports = require_browser();
	else module.exports = require_node();
}));
var require_debug = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	var debug;
	module.exports = function() {
		if (!debug) {
			try {
				debug = require_src$2()("follow-redirects");
			} catch (error) {}
			if (typeof debug !== "function") debug = function() {};
		}
		debug.apply(null, arguments);
	};
}));
var require_follow_redirects = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	var url$1 = __require$2("url");
	var URL = url$1.URL;
	var http$3 = __require$2("http");
	var https$2 = __require$2("https");
	var Writable = __require$2("stream").Writable;
	var assert$1 = __require$2("assert");
	var debug = require_debug();
	// istanbul ignore next
	(function detectUnsupportedEnvironment() {
		var looksLikeNode = typeof process !== "undefined";
		var looksLikeBrowser = typeof window !== "undefined" && typeof document !== "undefined";
		var looksLikeV8 = isFunction(Error.captureStackTrace);
		if (!looksLikeNode && (looksLikeBrowser || !looksLikeV8)) console.warn("The follow-redirects package should be excluded from browser builds.");
	})();
	var useNativeURL = false;
	try {
		assert$1(new URL(""));
	} catch (error) {
		useNativeURL = error.code === "ERR_INVALID_URL";
	}
	var sensitiveHeaders = [
		"Authorization",
		"Proxy-Authorization",
		"Cookie"
	];
	var preservedUrlFields = [
		"auth",
		"host",
		"hostname",
		"href",
		"path",
		"pathname",
		"port",
		"protocol",
		"query",
		"search",
		"hash"
	];
	var events = [
		"abort",
		"aborted",
		"connect",
		"error",
		"socket",
		"timeout"
	];
	var eventHandlers = Object.create(null);
	events.forEach(function(event) {
		eventHandlers[event] = function(arg1, arg2, arg3) {
			this._redirectable.emit(event, arg1, arg2, arg3);
		};
	});
	var InvalidUrlError = createErrorType("ERR_INVALID_URL", "Invalid URL", TypeError);
	var RedirectionError = createErrorType("ERR_FR_REDIRECTION_FAILURE", "Redirected request failed");
	var TooManyRedirectsError = createErrorType("ERR_FR_TOO_MANY_REDIRECTS", "Maximum number of redirects exceeded", RedirectionError);
	var MaxBodyLengthExceededError = createErrorType("ERR_FR_MAX_BODY_LENGTH_EXCEEDED", "Request body larger than maxBodyLength limit");
	var WriteAfterEndError = createErrorType("ERR_STREAM_WRITE_AFTER_END", "write after end");
	// istanbul ignore next
	var destroy = Writable.prototype.destroy || noop;
	function RedirectableRequest(options, responseCallback) {
		Writable.call(this);
		this._sanitizeOptions(options);
		this._options = options;
		this._ended = false;
		this._ending = false;
		this._redirectCount = 0;
		this._redirects = [];
		this._requestBodyLength = 0;
		this._requestBodyBuffers = [];
		if (responseCallback) this.on("response", responseCallback);
		var self = this;
		this._onNativeResponse = function(response) {
			try {
				self._processResponse(response);
			} catch (cause) {
				self.emit("error", cause instanceof RedirectionError ? cause : new RedirectionError({ cause }));
			}
		};
		this._headerFilter = new RegExp("^(?:" + sensitiveHeaders.concat(options.sensitiveHeaders).map(escapeRegex).join("|") + ")$", "i");
		this._performRequest();
	}
	RedirectableRequest.prototype = Object.create(Writable.prototype);
	RedirectableRequest.prototype.abort = function() {
		destroyRequest(this._currentRequest);
		this._currentRequest.abort();
		this.emit("abort");
	};
	RedirectableRequest.prototype.destroy = function(error) {
		destroyRequest(this._currentRequest, error);
		destroy.call(this, error);
		return this;
	};
	RedirectableRequest.prototype.write = function(data, encoding, callback) {
		if (this._ending) throw new WriteAfterEndError();
		if (!isString(data) && !isBuffer(data)) throw new TypeError("data should be a string, Buffer or Uint8Array");
		if (isFunction(encoding)) {
			callback = encoding;
			encoding = null;
		}
		if (data.length === 0) {
			if (callback) callback();
			return;
		}
		if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
			this._requestBodyLength += data.length;
			this._requestBodyBuffers.push({
				data,
				encoding
			});
			this._currentRequest.write(data, encoding, callback);
		} else {
			this.emit("error", new MaxBodyLengthExceededError());
			this.abort();
		}
	};
	RedirectableRequest.prototype.end = function(data, encoding, callback) {
		if (isFunction(data)) {
			callback = data;
			data = encoding = null;
		} else if (isFunction(encoding)) {
			callback = encoding;
			encoding = null;
		}
		if (!data) {
			this._ended = this._ending = true;
			this._currentRequest.end(null, null, callback);
		} else {
			var self = this;
			var currentRequest = this._currentRequest;
			this.write(data, encoding, function() {
				self._ended = true;
				currentRequest.end(null, null, callback);
			});
			this._ending = true;
		}
	};
	RedirectableRequest.prototype.setHeader = function(name, value) {
		this._options.headers[name] = value;
		this._currentRequest.setHeader(name, value);
	};
	RedirectableRequest.prototype.removeHeader = function(name) {
		delete this._options.headers[name];
		this._currentRequest.removeHeader(name);
	};
	RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
		var self = this;
		function destroyOnTimeout(socket) {
			socket.setTimeout(msecs);
			socket.removeListener("timeout", socket.destroy);
			socket.addListener("timeout", socket.destroy);
		}
		function startTimer(socket) {
			if (self._timeout) clearTimeout(self._timeout);
			self._timeout = setTimeout(function() {
				self.emit("timeout");
				clearTimer();
			}, msecs);
			destroyOnTimeout(socket);
		}
		function clearTimer() {
			if (self._timeout) {
				clearTimeout(self._timeout);
				self._timeout = null;
			}
			self.removeListener("abort", clearTimer);
			self.removeListener("error", clearTimer);
			self.removeListener("response", clearTimer);
			self.removeListener("close", clearTimer);
			if (callback) self.removeListener("timeout", callback);
			if (!self.socket) self._currentRequest.removeListener("socket", startTimer);
		}
		if (callback) this.on("timeout", callback);
		if (this.socket) startTimer(this.socket);
		else this._currentRequest.once("socket", startTimer);
		this.on("socket", destroyOnTimeout);
		this.on("abort", clearTimer);
		this.on("error", clearTimer);
		this.on("response", clearTimer);
		this.on("close", clearTimer);
		return this;
	};
	[
		"flushHeaders",
		"getHeader",
		"setNoDelay",
		"setSocketKeepAlive"
	].forEach(function(method) {
		RedirectableRequest.prototype[method] = function(a, b) {
			return this._currentRequest[method](a, b);
		};
	});
	[
		"aborted",
		"connection",
		"socket"
	].forEach(function(property) {
		Object.defineProperty(RedirectableRequest.prototype, property, { get: function() {
			return this._currentRequest[property];
		} });
	});
	RedirectableRequest.prototype._sanitizeOptions = function(options) {
		if (!options.headers) options.headers = {};
		if (!isArray(options.sensitiveHeaders)) options.sensitiveHeaders = [];
		if (options.host) {
			if (!options.hostname) options.hostname = options.host;
			delete options.host;
		}
		if (!options.pathname && options.path) {
			var searchPos = options.path.indexOf("?");
			if (searchPos < 0) options.pathname = options.path;
			else {
				options.pathname = options.path.substring(0, searchPos);
				options.search = options.path.substring(searchPos);
			}
		}
	};
	RedirectableRequest.prototype._performRequest = function() {
		var protocol = this._options.protocol;
		var nativeProtocol = this._options.nativeProtocols[protocol];
		if (!nativeProtocol) throw new TypeError("Unsupported protocol " + protocol);
		if (this._options.agents) {
			var scheme = protocol.slice(0, -1);
			this._options.agent = this._options.agents[scheme];
		}
		var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
		request._redirectable = this;
		for (var event of events) request.on(event, eventHandlers[event]);
		this._currentUrl = /^\//.test(this._options.path) ? url$1.format(this._options) : this._options.path;
		if (this._isRedirect) {
			var i = 0;
			var self = this;
			var buffers = this._requestBodyBuffers;
			(function writeNext(error) {
				// istanbul ignore else
				if (request === self._currentRequest) {
					// istanbul ignore if
					if (error) self.emit("error", error);
					else if (i < buffers.length) {
						var buffer = buffers[i++];
						// istanbul ignore else
						if (!request.finished) request.write(buffer.data, buffer.encoding, writeNext);
					} else if (self._ended) request.end();
				}
			})();
		}
	};
	RedirectableRequest.prototype._processResponse = function(response) {
		var statusCode = response.statusCode;
		if (this._options.trackRedirects) this._redirects.push({
			url: this._currentUrl,
			headers: response.headers,
			statusCode
		});
		var location = response.headers.location;
		if (!location || this._options.followRedirects === false || statusCode < 300 || statusCode >= 400) {
			response.responseUrl = this._currentUrl;
			response.redirects = this._redirects;
			this.emit("response", response);
			this._requestBodyBuffers = [];
			return;
		}
		destroyRequest(this._currentRequest);
		response.destroy();
		if (++this._redirectCount > this._options.maxRedirects) throw new TooManyRedirectsError();
		var requestHeaders;
		var beforeRedirect = this._options.beforeRedirect;
		if (beforeRedirect) requestHeaders = Object.assign({ Host: response.req.getHeader("host") }, this._options.headers);
		var method = this._options.method;
		if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
			this._options.method = "GET";
			this._requestBodyBuffers = [];
			removeMatchingHeaders(/^content-/i, this._options.headers);
		}
		var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);
		var currentUrlParts = parseUrl(this._currentUrl);
		var currentHost = currentHostHeader || currentUrlParts.host;
		var currentUrl = /^\w+:/.test(location) ? this._currentUrl : url$1.format(Object.assign(currentUrlParts, { host: currentHost }));
		var redirectUrl = resolveUrl(location, currentUrl);
		debug("redirecting to", redirectUrl.href);
		this._isRedirect = true;
		spreadUrlObject(redirectUrl, this._options);
		if (redirectUrl.protocol !== currentUrlParts.protocol && redirectUrl.protocol !== "https:" || redirectUrl.host !== currentHost && !isSubdomain(redirectUrl.host, currentHost)) removeMatchingHeaders(this._headerFilter, this._options.headers);
		if (isFunction(beforeRedirect)) {
			var responseDetails = {
				headers: response.headers,
				statusCode
			};
			var requestDetails = {
				url: currentUrl,
				method,
				headers: requestHeaders
			};
			beforeRedirect(this._options, responseDetails, requestDetails);
			this._sanitizeOptions(this._options);
		}
		this._performRequest();
	};
	function wrap(protocols) {
		var exports$1 = {
			maxRedirects: 21,
			maxBodyLength: 10 * 1024 * 1024
		};
		var nativeProtocols = {};
		Object.keys(protocols).forEach(function(scheme) {
			var protocol = scheme + ":";
			var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
			var wrappedProtocol = exports$1[scheme] = Object.create(nativeProtocol);
			function request(input, options, callback) {
				if (isURL(input)) input = spreadUrlObject(input);
				else if (isString(input)) input = spreadUrlObject(parseUrl(input));
				else {
					callback = options;
					options = validateUrl(input);
					input = { protocol };
				}
				if (isFunction(options)) {
					callback = options;
					options = null;
				}
				options = Object.assign({
					maxRedirects: exports$1.maxRedirects,
					maxBodyLength: exports$1.maxBodyLength
				}, input, options);
				options.nativeProtocols = nativeProtocols;
				if (!isString(options.host) && !isString(options.hostname)) options.hostname = "::1";
				assert$1.equal(options.protocol, protocol, "protocol mismatch");
				debug("options", options);
				return new RedirectableRequest(options, callback);
			}
			function get(input, options, callback) {
				var wrappedRequest = wrappedProtocol.request(input, options, callback);
				wrappedRequest.end();
				return wrappedRequest;
			}
			Object.defineProperties(wrappedProtocol, {
				request: {
					value: request,
					configurable: true,
					enumerable: true,
					writable: true
				},
				get: {
					value: get,
					configurable: true,
					enumerable: true,
					writable: true
				}
			});
		});
		return exports$1;
	}
	function noop() {}
	function parseUrl(input) {
		var parsed;
		// istanbul ignore else
		if (useNativeURL) parsed = new URL(input);
		else {
			parsed = validateUrl(url$1.parse(input));
			if (!isString(parsed.protocol)) throw new InvalidUrlError({ input });
		}
		return parsed;
	}
	function resolveUrl(relative, base) {
		// istanbul ignore next
		return useNativeURL ? new URL(relative, base) : parseUrl(url$1.resolve(base, relative));
	}
	function validateUrl(input) {
		if (/^\[/.test(input.hostname) && !/^\[[:0-9a-f]+\]$/i.test(input.hostname)) throw new InvalidUrlError({ input: input.href || input });
		if (/^\[/.test(input.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)) throw new InvalidUrlError({ input: input.href || input });
		return input;
	}
	function spreadUrlObject(urlObject, target) {
		var spread = target || {};
		for (var key of preservedUrlFields) spread[key] = urlObject[key];
		if (spread.hostname.startsWith("[")) spread.hostname = spread.hostname.slice(1, -1);
		if (spread.port !== "") spread.port = Number(spread.port);
		spread.path = spread.search ? spread.pathname + spread.search : spread.pathname;
		return spread;
	}
	function removeMatchingHeaders(regex, headers) {
		var lastValue;
		for (var header in headers) if (regex.test(header)) {
			lastValue = headers[header];
			delete headers[header];
		}
		return lastValue === null || typeof lastValue === "undefined" ? void 0 : String(lastValue).trim();
	}
	function createErrorType(code, message, baseClass) {
		function CustomError(properties) {
			// istanbul ignore else
			if (isFunction(Error.captureStackTrace)) Error.captureStackTrace(this, this.constructor);
			Object.assign(this, properties || {});
			this.code = code;
			this.message = this.cause ? message + ": " + this.cause.message : message;
		}
		CustomError.prototype = new (baseClass || Error)();
		Object.defineProperties(CustomError.prototype, {
			constructor: {
				value: CustomError,
				enumerable: false
			},
			name: {
				value: "Error [" + code + "]",
				enumerable: false
			}
		});
		return CustomError;
	}
	function destroyRequest(request, error) {
		for (var event of events) request.removeListener(event, eventHandlers[event]);
		request.on("error", noop);
		request.destroy(error);
	}
	function isSubdomain(subdomain, domain) {
		assert$1(isString(subdomain) && isString(domain));
		var dot = subdomain.length - domain.length - 1;
		return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
	}
	function isArray(value) {
		return value instanceof Array;
	}
	function isString(value) {
		return typeof value === "string" || value instanceof String;
	}
	function isFunction(value) {
		return typeof value === "function";
	}
	function isBuffer(value) {
		return typeof value === "object" && "length" in value;
	}
	function isURL(value) {
		return URL && value instanceof URL;
	}
	function escapeRegex(regex) {
		return regex.replace(/[\]\\/()*+?.$]/g, "\\$&");
	}
	module.exports = wrap({
		http: http$3,
		https: https$2
	});
	module.exports.wrap = wrap;
}));
var require_common = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isSSL = void 0;
	exports.setupOutgoing = setupOutgoing;
	exports.setupSocket = setupSocket;
	exports.getPort = getPort;
	exports.hasEncryptedConnection = hasEncryptedConnection;
	exports.urlJoin = urlJoin;
	exports.rewriteCookieProperty = rewriteCookieProperty;
	exports.toURL = toURL;
	const node_tls_1 = __require$2("node:tls");
	const upgradeHeader = /(^|,)\s*upgrade\s*($|,)/i;
	exports.isSSL = /^https|wss/;
	const HEADER_BLACKLIST = "trailer";
	const HTTP2_HEADER_BLACKLIST = [
		":method",
		":path",
		":scheme",
		":authority",
		"connection",
		"keep-alive"
	];
	function setupOutgoing(outgoing, options, req, forward) {
		const target = options[forward || "target"];
		outgoing.port = +(target.port ?? (target.protocol !== void 0 && exports.isSSL.test(target.protocol) ? 443 : 80));
		for (const e of [
			"host",
			"hostname",
			"socketPath",
			"pfx",
			"key",
			"passphrase",
			"cert",
			"ca",
			"ciphers",
			"secureProtocol"
		]) outgoing[e] = target[e];
		if (outgoing.hostname?.startsWith("[") && outgoing.hostname.endsWith("]")) outgoing.hostname = outgoing.hostname.slice(1, -1);
		outgoing.method = options.method || req.method;
		outgoing.headers = { ...req.headers };
		if (req.headers?.[":authority"]) outgoing.headers.host = req.headers[":authority"];
		if (options.headers) outgoing.headers = {
			...outgoing.headers,
			...options.headers
		};
		for (const header in outgoing.headers) if (HEADER_BLACKLIST == header.toLowerCase()) {
			delete outgoing.headers[header];
			break;
		}
		if (req.httpVersionMajor > 1) for (const header of HTTP2_HEADER_BLACKLIST) delete outgoing.headers[header];
		if (options.auth) {
			delete outgoing.headers.authorization;
			outgoing.auth = options.auth;
		}
		if (options.ca) outgoing.ca = options.ca;
		if (target.protocol !== void 0 && exports.isSSL.test(target.protocol)) outgoing.rejectUnauthorized = typeof options.secure === "undefined" ? true : options.secure;
		outgoing.agent = options.agent || false;
		outgoing.localAddress = options.localAddress;
		if (!outgoing.agent) {
			outgoing.headers = outgoing.headers || {};
			if (typeof outgoing.headers.connection !== "string" || !upgradeHeader.test(outgoing.headers.connection)) outgoing.headers.connection = "close";
		}
		const targetPath = target && options.prependPath !== false && "pathname" in target ? getPath(`${target.pathname}${target.search ?? ""}`) : "/";
		let outgoingPath = options.toProxy ? req.url : getPath(req.url);
		outgoingPath = !options.ignorePath ? outgoingPath : "";
		outgoing.path = urlJoin(targetPath, outgoingPath ?? "");
		if (options.changeOrigin) outgoing.headers.host = target.protocol !== void 0 && required(outgoing.port, target.protocol) && !hasPort(outgoing.host) ? outgoing.host + ":" + outgoing.port : outgoing.host;
		outgoing.url = "href" in target && target.href || (target.protocol === "https" ? "https" : "http") + "://" + outgoing.host + (outgoing.port ? ":" + outgoing.port : "");
		if (req.httpVersionMajor > 1) for (const header of HTTP2_HEADER_BLACKLIST) delete outgoing.headers[header];
		return outgoing;
	}
	function setupSocket(socket) {
		socket.setTimeout(0);
		socket.setNoDelay(true);
		socket.setKeepAlive(true, 0);
		return socket;
	}
	function getPort(req) {
		const hostHeader = req.headers[":authority"] || req.headers.host;
		const res = hostHeader ? hostHeader.match(/:(\d+)/) : "";
		return res ? res[1] : hasEncryptedConnection(req) ? "443" : "80";
	}
	function hasEncryptedConnection(req) {
		const conn = req.connection;
		return conn instanceof node_tls_1.TLSSocket && conn.encrypted || Boolean(conn.pair);
	}
	function urlJoin(...args) {
		const queryParams = [];
		let queryParamRaw = "";
		args.forEach((url, index) => {
			const qpStart = url.indexOf("?");
			if (qpStart !== -1) {
				queryParams.push(url.substring(qpStart + 1));
				args[index] = url.substring(0, qpStart);
			}
		});
		queryParamRaw = queryParams.filter(Boolean).join("&");
		let retSegs = "";
		for (const seg of args) {
			if (!seg) continue;
			if (retSegs.endsWith("/")) if (seg.startsWith("/")) retSegs += seg.slice(1);
			else retSegs += seg;
			else if (seg.startsWith("/")) retSegs += seg;
			else retSegs += "/" + seg;
		}
		return queryParamRaw ? retSegs + "?" + queryParamRaw : retSegs;
	}
	function rewriteCookieProperty(header, config, property) {
		if (Array.isArray(header)) return header.map((headerElement) => {
			return rewriteCookieProperty(headerElement, config, property);
		});
		return header.replace(new RegExp("(;\\s*" + property + "=)([^;]+)", "i"), (match, prefix, previousValue) => {
			let newValue;
			if (previousValue in config) newValue = config[previousValue];
			else if ("*" in config) newValue = config["*"];
			else return match;
			if (newValue) return prefix + newValue;
			else return "";
		});
	}
	function hasPort(host) {
		if (host.startsWith("[")) {
			const closingBracket = host.indexOf("]");
			return closingBracket !== -1 && host.length > closingBracket + 1;
		}
		return host.includes(":");
	}
	function getPath(url) {
		if (url === "" || url?.startsWith("?")) return url;
		const u = toURL(url);
		return `${u.pathname ?? ""}${u.search ?? ""}`;
	}
	function toURL(url) {
		if (url instanceof URL) return url;
		else if (typeof url === "object" && "href" in url && typeof url.href === "string") url = url.href;
		if (!url) url = "";
		if (typeof url != "string") url = `${url}`;
		if (url.startsWith("//")) url = `http://base.invalid${url}`;
		return new URL(url, "http://base.invalid");
	}
	function required(port, protocol) {
		protocol = protocol.split(":")[0];
		port = +port;
		if (!port) return false;
		switch (protocol) {
			case "http":
			case "ws": return port !== 80;
			case "https":
			case "wss": return port !== 443;
		}
		return port !== 0;
	}
}));
var require_web_outgoing = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || (function() {
		var ownKeys = function(o) {
			ownKeys = Object.getOwnPropertyNames || function(o) {
				var ar = [];
				for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
				return ar;
			};
			return ownKeys(o);
		};
		return function(mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null) {
				for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
			}
			__setModuleDefault(result, mod);
			return result;
		};
	})();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.OUTGOING_PASSES = void 0;
	exports.removeChunked = removeChunked;
	exports.setConnection = setConnection;
	exports.setRedirectHostRewrite = setRedirectHostRewrite;
	exports.writeHeaders = writeHeaders;
	exports.writeStatusCode = writeStatusCode;
	const common = __importStar(require_common());
	const redirectRegex = /^201|30(1|2|7|8)$/;
	function removeChunked(_req, _res, proxyRes) {
		delete proxyRes.headers["transfer-encoding"];
	}
	function setConnection(req, _res, proxyRes) {
		if (req.httpVersion === "1.0") proxyRes.headers["connection"] = req.headers["connection"] || "close";
		else if (req.httpVersion !== "2.0" && !proxyRes.headers["connection"]) proxyRes.headers["connection"] = req.headers["connection"] || "keep-alive";
	}
	function setRedirectHostRewrite(req, _res, proxyRes, options) {
		if ((options.hostRewrite || options.autoRewrite || options.protocolRewrite) && proxyRes.headers["location"] && redirectRegex.test(`${proxyRes.statusCode}`)) {
			const target = common.toURL(options.target);
			const location = proxyRes.headers["location"];
			if (typeof location != "string") return;
			const u = common.toURL(location);
			if (target.host != u.host) return;
			if (options.hostRewrite) u.host = options.hostRewrite;
			else if (options.autoRewrite) u.host = req.headers[":authority"] ?? req.headers["host"] ?? "";
			if (options.protocolRewrite) u.protocol = options.protocolRewrite;
			proxyRes.headers["location"] = u.toString();
		}
	}
	function writeHeaders(_req, res, proxyRes, options) {
		const rewriteCookieDomainConfig = typeof options.cookieDomainRewrite === "string" ? { "*": options.cookieDomainRewrite } : options.cookieDomainRewrite;
		const rewriteCookiePathConfig = typeof options.cookiePathRewrite === "string" ? { "*": options.cookiePathRewrite } : options.cookiePathRewrite;
		const preserveHeaderKeyCase = options.preserveHeaderKeyCase;
		const setHeader = (key, header) => {
			if (header == void 0) return;
			if (rewriteCookieDomainConfig && key.toLowerCase() === "set-cookie") header = common.rewriteCookieProperty(header, rewriteCookieDomainConfig, "domain");
			if (rewriteCookiePathConfig && key.toLowerCase() === "set-cookie") header = common.rewriteCookieProperty(header, rewriteCookiePathConfig, "path");
			res.setHeader(String(key).trim(), header);
		};
		let rawHeaderKeyMap;
		if (preserveHeaderKeyCase && proxyRes.rawHeaders != void 0) {
			rawHeaderKeyMap = {};
			for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
				const key = proxyRes.rawHeaders[i];
				rawHeaderKeyMap[key.toLowerCase()] = key;
			}
		}
		for (const key0 in proxyRes.headers) {
			let key = key0;
			if (_req.httpVersionMajor > 1 && (key === "connection" || key === "keep-alive")) continue;
			const header = proxyRes.headers[key];
			if (preserveHeaderKeyCase && rawHeaderKeyMap) key = rawHeaderKeyMap[key] ?? key;
			setHeader(key, header);
		}
	}
	function writeStatusCode(_req, res, proxyRes) {
		res.statusCode = proxyRes.statusCode;
		if (proxyRes.statusMessage && _req.httpVersionMajor === 1) res.statusMessage = proxyRes.statusMessage;
	}
	exports.OUTGOING_PASSES = {
		removeChunked,
		setConnection,
		setRedirectHostRewrite,
		writeHeaders,
		writeStatusCode
	};
}));
var require_web_incoming = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || (function() {
		var ownKeys = function(o) {
			ownKeys = Object.getOwnPropertyNames || function(o) {
				var ar = [];
				for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
				return ar;
			};
			return ownKeys(o);
		};
		return function(mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null) {
				for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
			}
			__setModuleDefault(result, mod);
			return result;
		};
	})();
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.WEB_PASSES = void 0;
	exports.deleteLength = deleteLength;
	exports.timeout = timeout;
	exports.XHeaders = XHeaders;
	exports.stream = stream;
	const http$2 = __importStar(__require$2("node:http"));
	const https$1 = __importStar(__require$2("node:https"));
	const followRedirects = __importStar(require_follow_redirects());
	const common = __importStar(require_common());
	const web_outgoing_1 = require_web_outgoing();
	const node_stream_1 = __require$2("node:stream");
	const web_o = Object.values(web_outgoing_1.OUTGOING_PASSES);
	const nativeAgents = {
		http: http$2,
		https: https$1
	};
	function deleteLength(req) {
		if ((req.method === "DELETE" || req.method === "OPTIONS") && !req.headers["content-length"]) {
			req.headers["content-length"] = "0";
			delete req.headers["transfer-encoding"];
		}
	}
	function timeout(req, _res, options) {
		if (options.timeout) req.socket.setTimeout(options.timeout);
	}
	function XHeaders(req, _res, options) {
		if (!options.xfwd) return;
		const encrypted = common.hasEncryptedConnection(req);
		const values = {
			for: req.connection.remoteAddress || req.socket.remoteAddress,
			port: common.getPort(req),
			proto: encrypted ? "https" : "http"
		};
		for (const header of [
			"for",
			"port",
			"proto"
		]) req.headers["x-forwarded-" + header] = (req.headers["x-forwarded-" + header] || "") + (req.headers["x-forwarded-" + header] ? "," : "") + values[header];
		req.headers["x-forwarded-host"] = req.headers["x-forwarded-host"] || req.headers[":authority"] || req.headers["host"] || "";
	}
	function stream(req, res, options, _, server, cb) {
		server.emit("start", req, res, options.target || options.forward);
		if (options.fetch || options.fetchOptions || process.env.FORCE_FETCH_PATH === "true") return stream2(req, res, options, _, server, cb);
		const agents = options.followRedirects ? followRedirects : nativeAgents;
		const http = agents.http;
		const https = agents.https;
		if (options.forward) {
			const proto = options.forward.protocol === "https:" ? https : http;
			const outgoingOptions = common.setupOutgoing(options.ssl || {}, options, req, "forward");
			const forwardReq = proto.request(outgoingOptions);
			const forwardError = createErrorHandler(forwardReq, options.forward);
			req.on("error", forwardError);
			forwardReq.on("error", forwardError);
			(options.buffer || req).pipe(forwardReq);
			if (!options.target) return res.end();
		}
		const proto = options.target.protocol === "https:" ? https : http;
		const outgoingOptions = common.setupOutgoing(options.ssl || {}, options, req);
		const proxyReq = proto.request(outgoingOptions);
		proxyReq.on("socket", (socket) => {
			if (server && !proxyReq.getHeader("expect")) server.emit("proxyReq", proxyReq, req, res, options, socket);
		});
		if (options.proxyTimeout) proxyReq.setTimeout(options.proxyTimeout, () => {
			proxyReq.destroy();
		});
		res.on("close", () => {
			if (!res.writableFinished) proxyReq.destroy();
		});
		const proxyError = createErrorHandler(proxyReq, options.target);
		req.on("error", proxyError);
		proxyReq.on("error", proxyError);
		function createErrorHandler(proxyReq, url) {
			return (err) => {
				if (req.socket.destroyed && err.code === "ECONNRESET") {
					server.emit("econnreset", err, req, res, url);
					proxyReq.destroy();
					return;
				}
				if (cb) cb(err, req, res, url);
				else server.emit("error", err, req, res, url);
			};
		}
		(options.buffer || req).pipe(proxyReq);
		proxyReq.on("response", (proxyRes) => {
			server?.emit("proxyRes", proxyRes, req, res);
			if (!res.headersSent && !options.selfHandleResponse) for (const pass of web_o) pass(req, res, proxyRes, options);
			if (!res.finished) {
				proxyRes.on("end", () => {
					server?.emit("end", req, res, proxyRes);
				});
				if (!options.selfHandleResponse) proxyRes.pipe(res);
			} else server?.emit("end", req, res, proxyRes);
		});
	}
	async function stream2(req, res, options, _, server, cb) {
		const handleError = (err, target) => {
			const e = err;
			if (e.code === void 0 && e.cause?.code) e.code = e.cause.code;
			if (cb) cb(err, req, res, target);
			else server.emit("error", err, req, res, target);
		};
		req.on("error", (err) => {
			if (req.socket.destroyed && err.code === "ECONNRESET") {
				const target = options.target || options.forward;
				if (target) server.emit("econnreset", err, req, res, target);
				return;
			}
			handleError(err);
		});
		const customFetch = options.fetch || fetch;
		const fetchOptions = options.fetchOptions ?? {};
		const prepareRequest = (outgoing) => {
			const requestOptions = {
				method: outgoing.method,
				...fetchOptions.requestOptions
			};
			const headers = new Headers(fetchOptions.requestOptions?.headers);
			if (!fetchOptions.requestOptions?.headers && outgoing.headers) {
				for (const [key, value] of Object.entries(outgoing.headers)) if (typeof key === "string") {
					if (Array.isArray(value)) for (const v of value) headers.append(key, v);
					else if (value != null) headers.append(key, value);
				}
			}
			if (options.auth) headers.set("authorization", `Basic ${Buffer.from(options.auth).toString("base64")}`);
			if (options.proxyTimeout) requestOptions.signal = AbortSignal.timeout(options.proxyTimeout);
			requestOptions.headers = headers;
			if (options.buffer) requestOptions.body = options.buffer;
			else if (req.method !== "GET" && req.method !== "HEAD") {
				requestOptions.body = req;
				requestOptions.duplex = "half";
			}
			return requestOptions;
		};
		if (options.forward) {
			const outgoingOptions = common.setupOutgoing(options.ssl || {}, options, req, "forward");
			const requestOptions = prepareRequest(outgoingOptions);
			let targetUrl = new URL(outgoingOptions.url).origin + outgoingOptions.path;
			if (targetUrl.startsWith("ws")) targetUrl = targetUrl.replace("ws", "http");
			if (fetchOptions.onBeforeRequest) try {
				await fetchOptions.onBeforeRequest(requestOptions, req, res, options);
			} catch (err) {
				handleError(err, options.forward);
				return;
			}
			try {
				const result = await customFetch(targetUrl, requestOptions);
				if (fetchOptions.onAfterResponse) try {
					await fetchOptions.onAfterResponse(result, req, res, options);
				} catch (err) {
					handleError(err, options.forward);
					return;
				}
			} catch (err) {
				handleError(err, options.forward);
			}
			if (!options.target) return res.end();
		}
		const outgoingOptions = common.setupOutgoing(options.ssl || {}, options, req);
		const requestOptions = prepareRequest(outgoingOptions);
		let targetUrl = new URL(outgoingOptions.url).origin + outgoingOptions.path;
		if (targetUrl.startsWith("ws")) targetUrl = targetUrl.replace("ws", "http");
		if (fetchOptions.onBeforeRequest) try {
			await fetchOptions.onBeforeRequest(requestOptions, req, res, options);
		} catch (err) {
			handleError(err, options.target);
			return;
		}
		try {
			const response = await customFetch(targetUrl, requestOptions);
			if (fetchOptions.onAfterResponse) try {
				await fetchOptions.onAfterResponse(response, req, res, options);
			} catch (err) {
				handleError(err, options.target);
				return;
			}
			const fakeProxyRes = {
				statusCode: response.status,
				statusMessage: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
				rawHeaders: Object.entries(response.headers).flatMap(([key, value]) => {
					if (Array.isArray(value)) return value.flatMap((v) => v != null ? [key, v] : []);
					return value != null ? [key, value] : [];
				})
			};
			server?.emit("proxyRes", fakeProxyRes, req, res);
			if (!res.headersSent && !options.selfHandleResponse) for (const pass of web_o) pass(req, res, fakeProxyRes, options);
			if (!res.writableEnded) {
				const nodeStream = response.body ? node_stream_1.Readable.from(response.body) : null;
				if (nodeStream) {
					nodeStream.on("error", (err) => {
						handleError(err, options.target);
					});
					nodeStream.on("end", () => {
						server?.emit("end", req, res, fakeProxyRes);
					});
					if (!options.selfHandleResponse) nodeStream.pipe(res, { end: true });
					else nodeStream.resume();
				} else server?.emit("end", req, res, fakeProxyRes);
			} else server?.emit("end", req, res, fakeProxyRes);
		} catch (err) {
			handleError(err, options.target);
		}
	}
	exports.WEB_PASSES = {
		deleteLength,
		timeout,
		XHeaders,
		stream
	};
}));
var require_ws_incoming = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || (function() {
		var ownKeys = function(o) {
			ownKeys = Object.getOwnPropertyNames || function(o) {
				var ar = [];
				for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
				return ar;
			};
			return ownKeys(o);
		};
		return function(mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null) {
				for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
			}
			__setModuleDefault(result, mod);
			return result;
		};
	})();
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.WS_PASSES = void 0;
	exports.numOpenSockets = numOpenSockets;
	exports.checkMethodAndHeader = checkMethodAndHeader;
	exports.XHeaders = XHeaders;
	exports.stream = stream;
	const http$1 = __importStar(__require$2("node:http"));
	const https = __importStar(__require$2("node:https"));
	const common = __importStar(require_common());
	const web_outgoing_1 = require_web_outgoing();
	const log = (0, __importDefault(require_src$2()).default)("http-proxy-3:ws-incoming");
	const web_o = Object.values(web_outgoing_1.OUTGOING_PASSES);
	function createSocketCounter(name) {
		let sockets = /* @__PURE__ */ new Set();
		return ({ add, rm } = {}) => {
			if (add) {
				if (!add.id) add.id = Math.random();
				if (!sockets.has(add.id)) sockets.add(add.id);
			}
			if (rm) {
				if (!rm.id) rm.id = Math.random();
				if (sockets.has(rm.id)) sockets.delete(rm.id);
			}
			log("socket counter:", { [name]: sockets.size }, add ? "add" : rm ? "rm" : "");
			return sockets.size;
		};
	}
	const socketCounter = createSocketCounter("socket");
	const proxySocketCounter = createSocketCounter("proxySocket");
	var MockResponse = class {
		constructor() {
			this.headers = {};
			this.statusCode = 200;
			this.statusMessage = "";
		}
		setHeader(key, value) {
			this.headers[key] = value;
			return this;
		}
	};
	function numOpenSockets() {
		return socketCounter() + proxySocketCounter();
	}
	function checkMethodAndHeader(req, socket) {
		log("websocket: checkMethodAndHeader");
		if (req.method !== "GET" || !req.headers.upgrade) {
			socket.destroy();
			return true;
		}
		if (req.headers.upgrade.toLowerCase() !== "websocket") {
			socket.destroy();
			return true;
		}
	}
	function XHeaders(req, _socket, options) {
		if (!options.xfwd) return;
		log("websocket: XHeaders");
		const values = {
			for: req.connection.remoteAddress || req.socket.remoteAddress,
			port: common.getPort(req),
			proto: common.hasEncryptedConnection(req) ? "wss" : "ws"
		};
		for (const header of [
			"for",
			"port",
			"proto"
		]) req.headers["x-forwarded-" + header] = (req.headers["x-forwarded-" + header] || "") + (req.headers["x-forwarded-" + header] ? "," : "") + values[header];
	}
	function stream(req, socket, options, head, server, cb) {
		log("websocket: new stream");
		const proxySockets = [];
		socketCounter({ add: socket });
		const cleanUpProxySockets = () => {
			for (const p of proxySockets) p.end();
		};
		socket.on("close", () => {
			socketCounter({ rm: socket });
			cleanUpProxySockets();
		});
		socket.on("error", cleanUpProxySockets);
		const createHttpHeader = (line, headers) => {
			return Object.keys(headers).reduce((head, key) => {
				const value = headers[key];
				if (!Array.isArray(value)) {
					head.push(key + ": " + value);
					return head;
				}
				for (let i = 0; i < value.length; i++) head.push(key + ": " + value[i]);
				return head;
			}, [line]).join("\r\n") + "\r\n\r\n";
		};
		common.setupSocket(socket);
		if (head && head.length) socket.unshift(head);
		const proto = common.isSSL.test(options.target.protocol) ? https : http$1;
		const outgoingOptions = common.setupOutgoing(options.ssl || {}, options, req);
		const proxyReq = proto.request(outgoingOptions);
		if (server) server.emit("proxyReqWs", proxyReq, req, socket, options, head);
		proxyReq.on("error", onOutgoingError);
		proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
			log("upgrade");
			proxySocketCounter({ add: proxySocket });
			proxySockets.push(proxySocket);
			proxySocket.on("close", () => {
				proxySocketCounter({ rm: proxySocket });
			});
			proxySocket.on("error", onOutgoingError);
			proxySocket.on("end", () => {
				server.emit("close", proxyRes, proxySocket, proxyHead);
			});
			proxySocket.on("close", () => {
				socket.end();
			});
			common.setupSocket(proxySocket);
			if (proxyHead && proxyHead.length) proxySocket.unshift(proxyHead);
			socket.write(createHttpHeader("HTTP/1.1 101 Switching Protocols", proxyRes.headers));
			proxySocket.pipe(socket).pipe(proxySocket);
			server.emit("open", proxySocket);
		});
		function onOutgoingError(err) {
			if (cb) cb(err, req, socket);
			else server.emit("error", err, req, socket);
			socket.destroySoon();
		}
		proxyReq.on("response", (proxyRes) => {
			log("got non-ws HTTP response", {
				statusCode: proxyRes.statusCode,
				statusMessage: proxyRes.statusMessage
			});
			const res = new MockResponse();
			for (const pass of web_o) pass(req, res, proxyRes, options);
			let writeChunk = (chunk) => {
				socket.write(chunk);
			};
			if (req.httpVersion === "1.1" && proxyRes.headers["content-length"] === void 0) {
				res.headers["transfer-encoding"] = "chunked";
				writeChunk = (chunk) => {
					socket.write(chunk.length.toString(16));
					socket.write("\r\n");
					socket.write(chunk);
					socket.write("\r\n");
				};
			}
			const proxyHead = createHttpHeader(`HTTP/${req.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}`, res.headers);
			if (!socket.destroyed) {
				socket.write(proxyHead);
				proxyRes.on("data", (chunk) => {
					writeChunk(chunk);
				});
				proxyRes.on("end", () => {
					writeChunk("");
					socket.destroySoon();
				});
			} else proxyRes.resume();
		});
		proxyReq.end();
	}
	exports.WS_PASSES = {
		checkMethodAndHeader,
		XHeaders,
		stream
	};
}));
var require_http_proxy = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		var desc = Object.getOwnPropertyDescriptor(m, k);
		if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) desc = {
			enumerable: true,
			get: function() {
				return m[k];
			}
		};
		Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
		if (k2 === void 0) k2 = k;
		o[k2] = m[k];
	}));
	var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
		Object.defineProperty(o, "default", {
			enumerable: true,
			value: v
		});
	}) : function(o, v) {
		o["default"] = v;
	});
	var __importStar = exports && exports.__importStar || (function() {
		var ownKeys = function(o) {
			ownKeys = Object.getOwnPropertyNames || function(o) {
				var ar = [];
				for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
				return ar;
			};
			return ownKeys(o);
		};
		return function(mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null) {
				for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
			}
			__setModuleDefault(result, mod);
			return result;
		};
	})();
	var __importDefault = exports && exports.__importDefault || function(mod) {
		return mod && mod.__esModule ? mod : { "default": mod };
	};
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.ProxyServer = void 0;
	const http = __importStar(__require$2("node:http"));
	const http2 = __importStar(__require$2("node:http2"));
	const web_incoming_1 = require_web_incoming();
	const ws_incoming_1 = require_ws_incoming();
	const node_events_1 = __require$2("node:events");
	const debug_1 = __importDefault(require_src$2());
	const common_1 = require_common();
	const log = (0, debug_1.default)("http-proxy-3");
	exports.ProxyServer = class ProxyServer extends node_events_1.EventEmitter {
		/**
		* Creates the proxy server with specified options.
		* @param options - Config object passed to the proxy
		*/
		constructor(options = {}) {
			super();
			this.createRightProxy = (type) => {
				log("createRightProxy", { type });
				return (options) => {
					return (...args) => {
						const req = args[0];
						log("proxy: ", {
							type,
							path: req.url
						});
						const res = args[1];
						const passes = type === "ws" ? this.wsPasses : this.webPasses;
						if (type == "ws") res.on("error", (err) => {
							this.emit("error", err, req, res);
						});
						let counter = args.length - 1;
						let head;
						let cb;
						if (typeof args[counter] === "function") {
							cb = args[counter];
							counter--;
						}
						let requestOptions;
						if (!(args[counter] instanceof Buffer) && args[counter] !== res) {
							requestOptions = {
								...options,
								...args[counter]
							};
							counter--;
						} else requestOptions = { ...options };
						if (args[counter] instanceof Buffer) head = args[counter];
						for (const e of ["target", "forward"]) if (typeof requestOptions[e] === "string") requestOptions[e] = (0, common_1.toURL)(requestOptions[e]);
						if (!requestOptions.target && !requestOptions.forward) {
							this.emit("error", /* @__PURE__ */ new Error("Must set target or forward"), req, res);
							return;
						}
						for (const pass of passes)
 /**
						* Call of passes functions
						*     pass(req, res, options, head)
						*
						* In WebSockets case, the `res` variable
						* refer to the connection socket
						*    pass(req, socket, options, head)
						*/
						if (pass(req, res, requestOptions, head, this, cb)) break;
					};
				};
			};
			this.onError = (err) => {
				if (this.listeners("error").length === 1) throw err;
			};
			/**
			* A function that wraps the object in a webserver, for your convenience
			* @param port - Port to listen on
			* @param hostname - The hostname to listen on
			*/
			this.listen = (port, hostname) => {
				log("listen", {
					port,
					hostname
				});
				const requestListener = (req, res) => {
					this.web(req, res);
				};
				this._server = this.options.ssl ? http2.createSecureServer({
					...this.options.ssl,
					allowHTTP1: true
				}, requestListener) : http.createServer(requestListener);
				if (this.options.ws) this._server.on("upgrade", (req, socket, head) => {
					this.ws(req, socket, head);
				});
				this._server.listen(port, hostname);
				return this;
			};
			this.address = () => {
				return this._server?.address();
			};
			/**
			* A function that closes the inner webserver and stops listening on given port
			*/
			this.close = (cb) => {
				if (this._server == null) {
					cb?.();
					return;
				}
				this._server.close((err) => {
					this._server = null;
					cb?.(err);
				});
			};
			this.before = (type, passName, cb) => {
				if (type !== "ws" && type !== "web") throw new Error("type must be `web` or `ws`");
				const passes = type === "ws" ? this.wsPasses : this.webPasses;
				let i = false;
				passes.forEach((v, idx) => {
					if (v.name === passName) i = idx;
				});
				if (i === false) throw new Error("No such pass");
				passes.splice(i, 0, cb);
			};
			this.after = (type, passName, cb) => {
				if (type !== "ws" && type !== "web") throw new Error("type must be `web` or `ws`");
				const passes = type === "ws" ? this.wsPasses : this.webPasses;
				let i = false;
				passes.forEach((v, idx) => {
					if (v.name === passName) i = idx;
				});
				if (i === false) throw new Error("No such pass");
				passes.splice(i++, 0, cb);
			};
			log("creating a ProxyServer", options);
			options.prependPath = options.prependPath !== false;
			this.options = options;
			this.web = this.createRightProxy("web")(options);
			this.ws = this.createRightProxy("ws")(options);
			this.webPasses = Object.values(web_incoming_1.WEB_PASSES);
			this.wsPasses = Object.values(ws_incoming_1.WS_PASSES);
			this.on("error", this.onError);
		}
		/**
		* Creates the proxy server with specified options.
		* @param options Config object passed to the proxy
		* @returns Proxy object with handlers for `ws` and `web` requests
		*/
		static createProxyServer(options) {
			return new ProxyServer(options);
		}
		/**
		* Creates the proxy server with specified options.
		* @param options Config object passed to the proxy
		* @returns Proxy object with handlers for `ws` and `web` requests
		*/
		static createServer(options) {
			return new ProxyServer(options);
		}
		/**
		* Creates the proxy server with specified options.
		* @param options Config object passed to the proxy
		* @returns Proxy object with handlers for `ws` and `web` requests
		*/
		static createProxy(options) {
			return new ProxyServer(options);
		}
	};
}));
(/* @__PURE__ */ __commonJSMin$1(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.numOpenSockets = exports.ProxyServer = void 0;
	exports.createProxyServer = createProxyServer;
	const index_1 = require_http_proxy();
	Object.defineProperty(exports, "ProxyServer", {
		enumerable: true,
		get: function() {
			return index_1.ProxyServer;
		}
	});
	var ws_incoming_1 = require_ws_incoming();
	Object.defineProperty(exports, "numOpenSockets", {
		enumerable: true,
		get: function() {
			return ws_incoming_1.numOpenSockets;
		}
	});
	/**
	* Creates the proxy server.
	*
	* Examples:
	*
	*    httpProxy.createProxyServer({ .. }, 8000)
	*    // => '{ web: [Function], ws: [Function] ... }'
	*
	* @param {Object} Options Config object passed to the proxy
	*
	* @return {Object} Proxy Proxy object with handlers for `ws` and `web` requests
	*
	* @api public
	*/
	function createProxyServer(options = {}) {
		return new index_1.ProxyServer(options);
	}
})))();
createDebugger("vite:proxy");
createDebugger("vite:html-fallback");
var require_convert_source_map = /* @__PURE__ */ __commonJSMin$1(((exports) => {
	Object.defineProperty(exports, "commentRegex", { get: function getCommentRegex() {
		return /^\s*?\/[\/\*][@#]\s+?sourceMappingURL=data:(((?:application|text)\/json)(?:;charset=([^;,]+?)?)?)?(?:;(base64))?,(.*?)$/gm;
	} });
	Object.defineProperty(exports, "mapFileCommentRegex", { get: function getMapFileCommentRegex() {
		return /(?:\/\/[@#][ \t]+?sourceMappingURL=([^\s'"`]+?)[ \t]*?$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^*]+?)[ \t]*?(?:\*\/){1}[ \t]*?$)/gm;
	} });
	var decodeBase64;
	if (typeof Buffer !== "undefined") if (typeof Buffer.from === "function") decodeBase64 = decodeBase64WithBufferFrom;
	else decodeBase64 = decodeBase64WithNewBuffer;
	else decodeBase64 = decodeBase64WithAtob;
	function decodeBase64WithBufferFrom(base64) {
		return Buffer.from(base64, "base64").toString();
	}
	function decodeBase64WithNewBuffer(base64) {
		if (typeof value === "number") throw new TypeError("The value to decode must not be of type number.");
		return new Buffer(base64, "base64").toString();
	}
	function decodeBase64WithAtob(base64) {
		return decodeURIComponent(escape(atob(base64)));
	}
	function stripComment(sm) {
		return sm.split(",").pop();
	}
	function readFromFileMap(sm, read) {
		var r = exports.mapFileCommentRegex.exec(sm);
		var filename = r[1] || r[2];
		try {
			var sm = read(filename);
			if (sm != null && typeof sm.catch === "function") return sm.catch(throwError);
			else return sm;
		} catch (e) {
			throwError(e);
		}
		function throwError(e) {
			throw new Error("An error occurred while trying to read the map file at " + filename + "\n" + e.stack);
		}
	}
	function Converter(sm, opts) {
		opts = opts || {};
		if (opts.hasComment) sm = stripComment(sm);
		if (opts.encoding === "base64") sm = decodeBase64(sm);
		else if (opts.encoding === "uri") sm = decodeURIComponent(sm);
		if (opts.isJSON || opts.encoding) sm = JSON.parse(sm);
		this.sourcemap = sm;
	}
	Converter.prototype.toJSON = function(space) {
		return JSON.stringify(this.sourcemap, null, space);
	};
	if (typeof Buffer !== "undefined") if (typeof Buffer.from === "function") Converter.prototype.toBase64 = encodeBase64WithBufferFrom;
	else Converter.prototype.toBase64 = encodeBase64WithNewBuffer;
	else Converter.prototype.toBase64 = encodeBase64WithBtoa;
	function encodeBase64WithBufferFrom() {
		var json = this.toJSON();
		return Buffer.from(json, "utf8").toString("base64");
	}
	function encodeBase64WithNewBuffer() {
		var json = this.toJSON();
		if (typeof json === "number") throw new TypeError("The json to encode must not be of type number.");
		return new Buffer(json, "utf8").toString("base64");
	}
	function encodeBase64WithBtoa() {
		var json = this.toJSON();
		return btoa(unescape(encodeURIComponent(json)));
	}
	Converter.prototype.toURI = function() {
		var json = this.toJSON();
		return encodeURIComponent(json);
	};
	Converter.prototype.toComment = function(options) {
		var encoding, content, data;
		if (options != null && options.encoding === "uri") {
			encoding = "";
			content = this.toURI();
		} else {
			encoding = ";base64";
			content = this.toBase64();
		}
		data = "sourceMappingURL=data:application/json;charset=utf-8" + encoding + "," + content;
		return options != null && options.multiline ? "/*# " + data + " */" : "//# " + data;
	};
	Converter.prototype.toObject = function() {
		return JSON.parse(this.toJSON());
	};
	Converter.prototype.addProperty = function(key, value) {
		if (this.sourcemap.hasOwnProperty(key)) throw new Error("property \"" + key + "\" already exists on the sourcemap, use set property instead");
		return this.setProperty(key, value);
	};
	Converter.prototype.setProperty = function(key, value) {
		this.sourcemap[key] = value;
		return this;
	};
	Converter.prototype.getProperty = function(key) {
		return this.sourcemap[key];
	};
	exports.fromObject = function(obj) {
		return new Converter(obj);
	};
	exports.fromJSON = function(json) {
		return new Converter(json, { isJSON: true });
	};
	exports.fromURI = function(uri) {
		return new Converter(uri, { encoding: "uri" });
	};
	exports.fromBase64 = function(base64) {
		return new Converter(base64, { encoding: "base64" });
	};
	exports.fromComment = function(comment) {
		var m, encoding;
		comment = comment.replace(/^\/\*/g, "//").replace(/\*\/$/g, "");
		m = exports.commentRegex.exec(comment);
		encoding = m && m[4] || "uri";
		return new Converter(comment, {
			encoding,
			hasComment: true
		});
	};
	function makeConverter(sm) {
		return new Converter(sm, { isJSON: true });
	}
	exports.fromMapFileComment = function(comment, read) {
		if (typeof read === "string") throw new Error("String directory paths are no longer supported with `fromMapFileComment`\nPlease review the Upgrading documentation at https://github.com/thlorenz/convert-source-map#upgrading");
		var sm = readFromFileMap(comment, read);
		if (sm != null && typeof sm.then === "function") return sm.then(makeConverter);
		else return makeConverter(sm);
	};
	exports.fromSource = function(content) {
		var m = content.match(exports.commentRegex);
		return m ? exports.fromComment(m.pop()) : null;
	};
	exports.fromMapFileSource = function(content, read) {
		if (typeof read === "string") throw new Error("String directory paths are no longer supported with `fromMapFileSource`\nPlease review the Upgrading documentation at https://github.com/thlorenz/convert-source-map#upgrading");
		var m = content.match(exports.mapFileCommentRegex);
		return m ? exports.fromMapFileComment(m.pop(), read) : null;
	};
	exports.removeComments = function(src) {
		return src.replace(exports.commentRegex, "");
	};
	exports.removeMapFileComments = function(src) {
		return src.replace(exports.mapFileCommentRegex, "");
	};
	exports.generateMapFileComment = function(file, options) {
		var data = "sourceMappingURL=" + file;
		return options && options.multiline ? "/*# " + data + " */" : "//# " + data;
	};
}));
/*!
* etag
* Copyright(c) 2014-2016 Douglas Christopher Wilson
* MIT Licensed
*/
var require_etag = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	/**
	* Module exports.
	* @public
	*/
	module.exports = etag;
	/**
	* Module dependencies.
	* @private
	*/
	var crypto$1 = __require$2("crypto");
	var Stats = __require$2("fs").Stats;
	/**
	* Module variables.
	* @private
	*/
	var toString = Object.prototype.toString;
	/**
	* Generate an entity tag.
	*
	* @param {Buffer|string} entity
	* @return {string}
	* @private
	*/
	function entitytag(entity) {
		if (entity.length === 0) return "\"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk\"";
		var hash = crypto$1.createHash("sha1").update(entity, "utf8").digest("base64").substring(0, 27);
		return "\"" + (typeof entity === "string" ? Buffer.byteLength(entity, "utf8") : entity.length).toString(16) + "-" + hash + "\"";
	}
	/**
	* Create a simple ETag.
	*
	* @param {string|Buffer|Stats} entity
	* @param {object} [options]
	* @param {boolean} [options.weak]
	* @return {String}
	* @public
	*/
	function etag(entity, options) {
		if (entity == null) throw new TypeError("argument entity is required");
		var isStats = isstats(entity);
		var weak = options && typeof options.weak === "boolean" ? options.weak : isStats;
		if (!isStats && typeof entity !== "string" && !Buffer.isBuffer(entity)) throw new TypeError("argument entity must be string, Buffer, or fs.Stats");
		var tag = isStats ? stattag(entity) : entitytag(entity);
		return weak ? "W/" + tag : tag;
	}
	/**
	* Determine if object is a Stats object.
	*
	* @param {object} obj
	* @return {boolean}
	* @api private
	*/
	function isstats(obj) {
		if (typeof Stats === "function" && obj instanceof Stats) return true;
		return obj && typeof obj === "object" && "ctime" in obj && toString.call(obj.ctime) === "[object Date]" && "mtime" in obj && toString.call(obj.mtime) === "[object Date]" && "ino" in obj && typeof obj.ino === "number" && "size" in obj && typeof obj.size === "number";
	}
	/**
	* Generate a tag for a stat.
	*
	* @param {object} stat
	* @return {string}
	* @private
	*/
	function stattag(stat) {
		var mtime = stat.mtime.getTime().toString(16);
		return "\"" + stat.size.toString(16) + "-" + mtime + "\"";
	}
}));
require_convert_source_map();
createDebugger("vite:sourcemap", { onlyWhenFocused: true });
require_etag();
createDebugger("vite:send", { onlyWhenFocused: true });
require_escape_html();
createDebugger("vite:load");
createDebugger("vite:transform");
createDebugger("vite:cache");
(/* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	var HashbangComment, Identifier, JSXIdentifier, JSXPunctuator, JSXString, JSXText, KeywordsWithExpressionAfter, KeywordsWithNoLineTerminatorAfter, LineTerminatorSequence, MultiLineComment, Newline, NumericLiteral, Punctuator, RegularExpressionLiteral = /\/(?![*\/])(?:\[(?:[^\]\\\n\r\u2028\u2029]+|\\.)*\]?|[^\/[\\\n\r\u2028\u2029]+|\\.)*(\/[$_\u200C\u200D\p{ID_Continue}]*|\\)?/uy, SingleLineComment, StringLiteral, Template, TokensNotPrecedingObjectLiteral, TokensPrecedingExpression, WhiteSpace;
	Punctuator = /--|\+\+|=>|\.{3}|\??\.(?!\d)|(?:&&|\|\||\?\?|[+\-%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2}|\/(?![\/*]))=?|[?~,:;[\](){}]/y;
	Identifier = /(\x23?)(?=[$_\p{ID_Start}\\])(?:[$_\u200C\u200D\p{ID_Continue}]+|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+/uy;
	StringLiteral = /(['"])(?:[^'"\\\n\r]+|(?!\1)['"]|\\(?:\r\n|[^]))*(\1)?/y;
	NumericLiteral = /(?:0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[oO][0-7](?:_?[0-7])*|0[bB][01](?:_?[01])*)n?|0n|[1-9](?:_?\d)*n|(?:(?:0(?!\d)|0\d*[89]\d*|[1-9](?:_?\d)*)(?:\.(?:\d(?:_?\d)*)?)?|\.\d(?:_?\d)*)(?:[eE][+-]?\d(?:_?\d)*)?|0[0-7]+/y;
	Template = /[`}](?:[^`\\$]+|\\[^]|\$(?!\{))*(`|\$\{)?/y;
	WhiteSpace = /[\t\v\f\ufeff\p{Zs}]+/uy;
	LineTerminatorSequence = /\r?\n|[\r\u2028\u2029]/y;
	MultiLineComment = /\/\*(?:[^*]+|\*(?!\/))*(\*\/)?/y;
	SingleLineComment = /\/\/.*/y;
	HashbangComment = /^#!.*/;
	JSXPunctuator = /[<>.:={}]|\/(?![\/*])/y;
	JSXIdentifier = /[$_\p{ID_Start}][$_\u200C\u200D\p{ID_Continue}-]*/uy;
	JSXString = /(['"])(?:[^'"]+|(?!\1)['"])*(\1)?/y;
	JSXText = /[^<>{}]+/y;
	TokensPrecedingExpression = /^(?:[\/+-]|\.{3}|\?(?:InterpolationIn(?:JSX|Template)|NoLineTerminatorHere|NonExpressionParenEnd|UnaryIncDec))?$|[{}([,;<>=*%&|^!~?:]$/;
	TokensNotPrecedingObjectLiteral = /^(?:=>|[;\]){}]|else|\?(?:NoLineTerminatorHere|NonExpressionParenEnd))?$/;
	KeywordsWithExpressionAfter = /^(?:await|case|default|delete|do|else|instanceof|new|return|throw|typeof|void|yield)$/;
	KeywordsWithNoLineTerminatorAfter = /^(?:return|throw|yield)$/;
	Newline = RegExp(LineTerminatorSequence.source);
	module.exports = function* (input, { jsx = false } = {}) {
		var braces, firstCodePoint, isExpression, lastIndex, lastSignificantToken, length, match, mode, nextLastIndex, nextLastSignificantToken, parenNesting, postfixIncDec, punctuator, stack;
		({length} = input);
		lastIndex = 0;
		lastSignificantToken = "";
		stack = [{ tag: "JS" }];
		braces = [];
		parenNesting = 0;
		postfixIncDec = false;
		if (match = HashbangComment.exec(input)) {
			yield {
				type: "HashbangComment",
				value: match[0]
			};
			lastIndex = match[0].length;
		}
		while (lastIndex < length) {
			mode = stack[stack.length - 1];
			switch (mode.tag) {
				case "JS":
				case "JSNonExpressionParen":
				case "InterpolationInTemplate":
				case "InterpolationInJSX":
					if (input[lastIndex] === "/" && (TokensPrecedingExpression.test(lastSignificantToken) || KeywordsWithExpressionAfter.test(lastSignificantToken))) {
						RegularExpressionLiteral.lastIndex = lastIndex;
						if (match = RegularExpressionLiteral.exec(input)) {
							lastIndex = RegularExpressionLiteral.lastIndex;
							lastSignificantToken = match[0];
							postfixIncDec = true;
							yield {
								type: "RegularExpressionLiteral",
								value: match[0],
								closed: match[1] !== void 0 && match[1] !== "\\"
							};
							continue;
						}
					}
					Punctuator.lastIndex = lastIndex;
					if (match = Punctuator.exec(input)) {
						punctuator = match[0];
						nextLastIndex = Punctuator.lastIndex;
						nextLastSignificantToken = punctuator;
						switch (punctuator) {
							case "(":
								if (lastSignificantToken === "?NonExpressionParenKeyword") stack.push({
									tag: "JSNonExpressionParen",
									nesting: parenNesting
								});
								parenNesting++;
								postfixIncDec = false;
								break;
							case ")":
								parenNesting--;
								postfixIncDec = true;
								if (mode.tag === "JSNonExpressionParen" && parenNesting === mode.nesting) {
									stack.pop();
									nextLastSignificantToken = "?NonExpressionParenEnd";
									postfixIncDec = false;
								}
								break;
							case "{":
								Punctuator.lastIndex = 0;
								isExpression = !TokensNotPrecedingObjectLiteral.test(lastSignificantToken) && (TokensPrecedingExpression.test(lastSignificantToken) || KeywordsWithExpressionAfter.test(lastSignificantToken));
								braces.push(isExpression);
								postfixIncDec = false;
								break;
							case "}":
								switch (mode.tag) {
									case "InterpolationInTemplate":
										if (braces.length === mode.nesting) {
											Template.lastIndex = lastIndex;
											match = Template.exec(input);
											lastIndex = Template.lastIndex;
											lastSignificantToken = match[0];
											if (match[1] === "${") {
												lastSignificantToken = "?InterpolationInTemplate";
												postfixIncDec = false;
												yield {
													type: "TemplateMiddle",
													value: match[0]
												};
											} else {
												stack.pop();
												postfixIncDec = true;
												yield {
													type: "TemplateTail",
													value: match[0],
													closed: match[1] === "`"
												};
											}
											continue;
										}
										break;
									case "InterpolationInJSX": if (braces.length === mode.nesting) {
										stack.pop();
										lastIndex += 1;
										lastSignificantToken = "}";
										yield {
											type: "JSXPunctuator",
											value: "}"
										};
										continue;
									}
								}
								postfixIncDec = braces.pop();
								nextLastSignificantToken = postfixIncDec ? "?ExpressionBraceEnd" : "}";
								break;
							case "]":
								postfixIncDec = true;
								break;
							case "++":
							case "--":
								nextLastSignificantToken = postfixIncDec ? "?PostfixIncDec" : "?UnaryIncDec";
								break;
							case "<":
								if (jsx && (TokensPrecedingExpression.test(lastSignificantToken) || KeywordsWithExpressionAfter.test(lastSignificantToken))) {
									stack.push({ tag: "JSXTag" });
									lastIndex += 1;
									lastSignificantToken = "<";
									yield {
										type: "JSXPunctuator",
										value: punctuator
									};
									continue;
								}
								postfixIncDec = false;
								break;
							default: postfixIncDec = false;
						}
						lastIndex = nextLastIndex;
						lastSignificantToken = nextLastSignificantToken;
						yield {
							type: "Punctuator",
							value: punctuator
						};
						continue;
					}
					Identifier.lastIndex = lastIndex;
					if (match = Identifier.exec(input)) {
						lastIndex = Identifier.lastIndex;
						nextLastSignificantToken = match[0];
						switch (match[0]) {
							case "for":
							case "if":
							case "while":
							case "with": if (lastSignificantToken !== "." && lastSignificantToken !== "?.") nextLastSignificantToken = "?NonExpressionParenKeyword";
						}
						lastSignificantToken = nextLastSignificantToken;
						postfixIncDec = !KeywordsWithExpressionAfter.test(match[0]);
						yield {
							type: match[1] === "#" ? "PrivateIdentifier" : "IdentifierName",
							value: match[0]
						};
						continue;
					}
					StringLiteral.lastIndex = lastIndex;
					if (match = StringLiteral.exec(input)) {
						lastIndex = StringLiteral.lastIndex;
						lastSignificantToken = match[0];
						postfixIncDec = true;
						yield {
							type: "StringLiteral",
							value: match[0],
							closed: match[2] !== void 0
						};
						continue;
					}
					NumericLiteral.lastIndex = lastIndex;
					if (match = NumericLiteral.exec(input)) {
						lastIndex = NumericLiteral.lastIndex;
						lastSignificantToken = match[0];
						postfixIncDec = true;
						yield {
							type: "NumericLiteral",
							value: match[0]
						};
						continue;
					}
					Template.lastIndex = lastIndex;
					if (match = Template.exec(input)) {
						lastIndex = Template.lastIndex;
						lastSignificantToken = match[0];
						if (match[1] === "${") {
							lastSignificantToken = "?InterpolationInTemplate";
							stack.push({
								tag: "InterpolationInTemplate",
								nesting: braces.length
							});
							postfixIncDec = false;
							yield {
								type: "TemplateHead",
								value: match[0]
							};
						} else {
							postfixIncDec = true;
							yield {
								type: "NoSubstitutionTemplate",
								value: match[0],
								closed: match[1] === "`"
							};
						}
						continue;
					}
					break;
				case "JSXTag":
				case "JSXTagEnd":
					JSXPunctuator.lastIndex = lastIndex;
					if (match = JSXPunctuator.exec(input)) {
						lastIndex = JSXPunctuator.lastIndex;
						nextLastSignificantToken = match[0];
						switch (match[0]) {
							case "<":
								stack.push({ tag: "JSXTag" });
								break;
							case ">":
								stack.pop();
								if (lastSignificantToken === "/" || mode.tag === "JSXTagEnd") {
									nextLastSignificantToken = "?JSX";
									postfixIncDec = true;
								} else stack.push({ tag: "JSXChildren" });
								break;
							case "{":
								stack.push({
									tag: "InterpolationInJSX",
									nesting: braces.length
								});
								nextLastSignificantToken = "?InterpolationInJSX";
								postfixIncDec = false;
								break;
							case "/": if (lastSignificantToken === "<") {
								stack.pop();
								if (stack[stack.length - 1].tag === "JSXChildren") stack.pop();
								stack.push({ tag: "JSXTagEnd" });
							}
						}
						lastSignificantToken = nextLastSignificantToken;
						yield {
							type: "JSXPunctuator",
							value: match[0]
						};
						continue;
					}
					JSXIdentifier.lastIndex = lastIndex;
					if (match = JSXIdentifier.exec(input)) {
						lastIndex = JSXIdentifier.lastIndex;
						lastSignificantToken = match[0];
						yield {
							type: "JSXIdentifier",
							value: match[0]
						};
						continue;
					}
					JSXString.lastIndex = lastIndex;
					if (match = JSXString.exec(input)) {
						lastIndex = JSXString.lastIndex;
						lastSignificantToken = match[0];
						yield {
							type: "JSXString",
							value: match[0],
							closed: match[2] !== void 0
						};
						continue;
					}
					break;
				case "JSXChildren":
					JSXText.lastIndex = lastIndex;
					if (match = JSXText.exec(input)) {
						lastIndex = JSXText.lastIndex;
						lastSignificantToken = match[0];
						yield {
							type: "JSXText",
							value: match[0]
						};
						continue;
					}
					switch (input[lastIndex]) {
						case "<":
							stack.push({ tag: "JSXTag" });
							lastIndex++;
							lastSignificantToken = "<";
							yield {
								type: "JSXPunctuator",
								value: "<"
							};
							continue;
						case "{":
							stack.push({
								tag: "InterpolationInJSX",
								nesting: braces.length
							});
							lastIndex++;
							lastSignificantToken = "?InterpolationInJSX";
							postfixIncDec = false;
							yield {
								type: "JSXPunctuator",
								value: "{"
							};
							continue;
					}
			}
			WhiteSpace.lastIndex = lastIndex;
			if (match = WhiteSpace.exec(input)) {
				lastIndex = WhiteSpace.lastIndex;
				yield {
					type: "WhiteSpace",
					value: match[0]
				};
				continue;
			}
			LineTerminatorSequence.lastIndex = lastIndex;
			if (match = LineTerminatorSequence.exec(input)) {
				lastIndex = LineTerminatorSequence.lastIndex;
				postfixIncDec = false;
				if (KeywordsWithNoLineTerminatorAfter.test(lastSignificantToken)) lastSignificantToken = "?NoLineTerminatorHere";
				yield {
					type: "LineTerminatorSequence",
					value: match[0]
				};
				continue;
			}
			MultiLineComment.lastIndex = lastIndex;
			if (match = MultiLineComment.exec(input)) {
				lastIndex = MultiLineComment.lastIndex;
				if (Newline.test(match[0])) {
					postfixIncDec = false;
					if (KeywordsWithNoLineTerminatorAfter.test(lastSignificantToken)) lastSignificantToken = "?NoLineTerminatorHere";
				}
				yield {
					type: "MultiLineComment",
					value: match[0],
					closed: match[1] !== void 0
				};
				continue;
			}
			SingleLineComment.lastIndex = lastIndex;
			if (match = SingleLineComment.exec(input)) {
				lastIndex = SingleLineComment.lastIndex;
				postfixIncDec = false;
				yield {
					type: "SingleLineComment",
					value: match[0]
				};
				continue;
			}
			firstCodePoint = String.fromCodePoint(input.codePointAt(lastIndex));
			lastIndex += firstCodePoint.length;
			lastSignificantToken = firstCodePoint;
			postfixIncDec = false;
			yield {
				type: mode.tag.startsWith("JSX") ? "JSXInvalid" : "Invalid",
				value: firstCodePoint
			};
		}
	};
})))();
Buffer$1.from("version https://git-lfs.github.com");
var require_src$1 = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const path$2 = __require$2("path");
	const fs$1 = __require$2("fs");
	const os$1 = __require$2("os");
	const url = __require$2("url");
	const fsReadFileAsync = fs$1.promises.readFile;
	/** @type {(name: string, sync: boolean) => string[]} */
	function getDefaultSearchPlaces(name, sync) {
		return [
			"package.json",
			`.${name}rc.json`,
			`.${name}rc.js`,
			`.${name}rc.cjs`,
			...sync ? [] : [`.${name}rc.mjs`],
			`.config/${name}rc`,
			`.config/${name}rc.json`,
			`.config/${name}rc.js`,
			`.config/${name}rc.cjs`,
			...sync ? [] : [`.config/${name}rc.mjs`],
			`${name}.config.js`,
			`${name}.config.cjs`,
			...sync ? [] : [`${name}.config.mjs`]
		];
	}
	/**
	* @type {(p: string) => string}
	*
	* see #17
	* On *nix, if cwd is not under homedir,
	* the last path will be '', ('/build' -> '')
	* but it should be '/' actually.
	* And on Windows, this will never happen. ('C:\build' -> 'C:')
	*/
	function parentDir(p) {
		return path$2.dirname(p) || path$2.sep;
	}
	/** @type {import('./index').LoaderSync} */
	const jsonLoader = (_, content) => JSON.parse(content);
	const requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : __require$2;
	/** @type {import('./index').LoadersSync} */
	const defaultLoadersSync = Object.freeze({
		".js": requireFunc,
		".json": requireFunc,
		".cjs": requireFunc,
		noExt: jsonLoader
	});
	module.exports.defaultLoadersSync = defaultLoadersSync;
	/** @type {import('./index').Loader} */
	const dynamicImport = async (id) => {
		try {
			return (await import(
				/* webpackIgnore: true */
				url.pathToFileURL(id).href
)).default;
		} catch (e) {
			try {
				return requireFunc(id);
			} catch (requireE) {
				if (requireE.code === "ERR_REQUIRE_ESM" || requireE instanceof SyntaxError && requireE.toString().includes("Cannot use import statement outside a module")) throw e;
				throw requireE;
			}
		}
	};
	/** @type {import('./index').Loaders} */
	const defaultLoaders = Object.freeze({
		".js": dynamicImport,
		".mjs": dynamicImport,
		".cjs": dynamicImport,
		".json": jsonLoader,
		noExt: jsonLoader
	});
	module.exports.defaultLoaders = defaultLoaders;
	/**
	* @param {string} name
	* @param {import('./index').Options | import('./index').OptionsSync} options
	* @param {boolean} sync
	* @returns {Required<import('./index').Options | import('./index').OptionsSync>}
	*/
	function getOptions(name, options, sync) {
		/** @type {Required<import('./index').Options>} */
		const conf = {
			stopDir: os$1.homedir(),
			searchPlaces: getDefaultSearchPlaces(name, sync),
			ignoreEmptySearchPlaces: true,
			cache: true,
			transform: (x) => x,
			packageProp: [name],
			...options,
			loaders: {
				...sync ? defaultLoadersSync : defaultLoaders,
				...options.loaders
			}
		};
		conf.searchPlaces.forEach((place) => {
			const key = path$2.extname(place) || "noExt";
			const loader = conf.loaders[key];
			if (!loader) throw new Error(`Missing loader for extension "${place}"`);
			if (typeof loader !== "function") throw new Error(`Loader for extension "${place}" is not a function: Received ${typeof loader}.`);
		});
		return conf;
	}
	/** @type {(props: string | string[], obj: Record<string, any>) => unknown} */
	function getPackageProp(props, obj) {
		if (typeof props === "string" && props in obj) return obj[props];
		return (Array.isArray(props) ? props : props.split(".")).reduce((acc, prop) => acc === void 0 ? acc : acc[prop], obj) || null;
	}
	/** @param {string} filepath */
	function validateFilePath(filepath) {
		if (!filepath) throw new Error("load must pass a non-empty string");
	}
	/** @type {(loader: import('./index').Loader, ext: string) => void} */
	function validateLoader(loader, ext) {
		if (!loader) throw new Error(`No loader specified for extension "${ext}"`);
		if (typeof loader !== "function") throw new Error("loader is not a function");
	}
	/** @type {(enableCache: boolean) => <T>(c: Map<string, T>, filepath: string, res: T) => T} */
	const makeEmplace = (enableCache) => (c, filepath, res) => {
		if (enableCache) c.set(filepath, res);
		return res;
	};
	/** @type {import('./index').lilconfig} */
	module.exports.lilconfig = function lilconfig(name, options) {
		const { ignoreEmptySearchPlaces, loaders, packageProp, searchPlaces, stopDir, transform, cache } = getOptions(name, options ?? {}, false);
		const searchCache = /* @__PURE__ */ new Map();
		const loadCache = /* @__PURE__ */ new Map();
		const emplace = makeEmplace(cache);
		return {
			async search(searchFrom = process.cwd()) {
				/** @type {import('./index').LilconfigResult} */
				const result = {
					config: null,
					filepath: ""
				};
				/** @type {Set<string>} */
				const visited = /* @__PURE__ */ new Set();
				let dir = searchFrom;
				dirLoop: while (true) {
					if (cache) {
						const r = searchCache.get(dir);
						if (r !== void 0) {
							for (const p of visited) searchCache.set(p, r);
							return r;
						}
						visited.add(dir);
					}
					for (const searchPlace of searchPlaces) {
						const filepath = path$2.join(dir, searchPlace);
						try {
							await fs$1.promises.access(filepath);
						} catch {
							continue;
						}
						const content = String(await fsReadFileAsync(filepath));
						const loaderKey = path$2.extname(searchPlace) || "noExt";
						const loader = loaders[loaderKey];
						if (searchPlace === "package.json") {
							const pkg = await loader(filepath, content);
							const maybeConfig = getPackageProp(packageProp, pkg);
							if (maybeConfig != null) {
								result.config = maybeConfig;
								result.filepath = filepath;
								break dirLoop;
							}
							continue;
						}
						const isEmpty = content.trim() === "";
						if (isEmpty && ignoreEmptySearchPlaces) continue;
						if (isEmpty) {
							result.isEmpty = true;
							result.config = void 0;
						} else {
							validateLoader(loader, loaderKey);
							result.config = await loader(filepath, content);
						}
						result.filepath = filepath;
						break dirLoop;
					}
					if (dir === stopDir || dir === parentDir(dir)) break dirLoop;
					dir = parentDir(dir);
				}
				const transformed = result.filepath === "" && result.config === null ? transform(null) : transform(result);
				if (cache) for (const p of visited) searchCache.set(p, transformed);
				return transformed;
			},
			async load(filepath) {
				validateFilePath(filepath);
				const absPath = path$2.resolve(process.cwd(), filepath);
				if (cache && loadCache.has(absPath)) return loadCache.get(absPath);
				const { base, ext } = path$2.parse(absPath);
				const loaderKey = ext || "noExt";
				const loader = loaders[loaderKey];
				validateLoader(loader, loaderKey);
				const content = String(await fsReadFileAsync(absPath));
				if (base === "package.json") {
					const pkg = await loader(absPath, content);
					return emplace(loadCache, absPath, transform({
						config: getPackageProp(packageProp, pkg),
						filepath: absPath
					}));
				}
				/** @type {import('./index').LilconfigResult} */
				const result = {
					config: null,
					filepath: absPath
				};
				const isEmpty = content.trim() === "";
				if (isEmpty && ignoreEmptySearchPlaces) return emplace(loadCache, absPath, transform({
					config: void 0,
					filepath: absPath,
					isEmpty: true
				}));
				result.config = isEmpty ? void 0 : await loader(absPath, content);
				return emplace(loadCache, absPath, transform(isEmpty ? {
					...result,
					isEmpty,
					config: void 0
				} : result));
			},
			clearLoadCache() {
				if (cache) loadCache.clear();
			},
			clearSearchCache() {
				if (cache) searchCache.clear();
			},
			clearCaches() {
				if (cache) {
					loadCache.clear();
					searchCache.clear();
				}
			}
		};
	};
	/** @type {import('./index').lilconfigSync} */
	module.exports.lilconfigSync = function lilconfigSync(name, options) {
		const { ignoreEmptySearchPlaces, loaders, packageProp, searchPlaces, stopDir, transform, cache } = getOptions(name, options ?? {}, true);
		const searchCache = /* @__PURE__ */ new Map();
		const loadCache = /* @__PURE__ */ new Map();
		const emplace = makeEmplace(cache);
		return {
			search(searchFrom = process.cwd()) {
				/** @type {import('./index').LilconfigResult} */
				const result = {
					config: null,
					filepath: ""
				};
				/** @type {Set<string>} */
				const visited = /* @__PURE__ */ new Set();
				let dir = searchFrom;
				dirLoop: while (true) {
					if (cache) {
						const r = searchCache.get(dir);
						if (r !== void 0) {
							for (const p of visited) searchCache.set(p, r);
							return r;
						}
						visited.add(dir);
					}
					for (const searchPlace of searchPlaces) {
						const filepath = path$2.join(dir, searchPlace);
						try {
							fs$1.accessSync(filepath);
						} catch {
							continue;
						}
						const loaderKey = path$2.extname(searchPlace) || "noExt";
						const loader = loaders[loaderKey];
						const content = String(fs$1.readFileSync(filepath));
						if (searchPlace === "package.json") {
							const pkg = loader(filepath, content);
							const maybeConfig = getPackageProp(packageProp, pkg);
							if (maybeConfig != null) {
								result.config = maybeConfig;
								result.filepath = filepath;
								break dirLoop;
							}
							continue;
						}
						const isEmpty = content.trim() === "";
						if (isEmpty && ignoreEmptySearchPlaces) continue;
						if (isEmpty) {
							result.isEmpty = true;
							result.config = void 0;
						} else {
							validateLoader(loader, loaderKey);
							result.config = loader(filepath, content);
						}
						result.filepath = filepath;
						break dirLoop;
					}
					if (dir === stopDir || dir === parentDir(dir)) break dirLoop;
					dir = parentDir(dir);
				}
				const transformed = result.filepath === "" && result.config === null ? transform(null) : transform(result);
				if (cache) for (const p of visited) searchCache.set(p, transformed);
				return transformed;
			},
			load(filepath) {
				validateFilePath(filepath);
				const absPath = path$2.resolve(process.cwd(), filepath);
				if (cache && loadCache.has(absPath)) return loadCache.get(absPath);
				const { base, ext } = path$2.parse(absPath);
				const loaderKey = ext || "noExt";
				const loader = loaders[loaderKey];
				validateLoader(loader, loaderKey);
				const content = String(fs$1.readFileSync(absPath));
				if (base === "package.json") {
					const pkg = loader(absPath, content);
					return transform({
						config: getPackageProp(packageProp, pkg),
						filepath: absPath
					});
				}
				const result = {
					config: null,
					filepath: absPath
				};
				const isEmpty = content.trim() === "";
				if (isEmpty && ignoreEmptySearchPlaces) return emplace(loadCache, absPath, transform({
					filepath: absPath,
					config: void 0,
					isEmpty: true
				}));
				result.config = isEmpty ? void 0 : loader(absPath, content);
				return emplace(loadCache, absPath, transform(isEmpty ? {
					...result,
					isEmpty,
					config: void 0
				} : result));
			},
			clearLoadCache() {
				if (cache) loadCache.clear();
			},
			clearSearchCache() {
				if (cache) searchCache.clear();
			},
			clearCaches() {
				if (cache) {
					loadCache.clear();
					searchCache.clear();
				}
			}
		};
	};
}));
var require_req = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const { createRequire: createRequire$2 } = __require$2("node:module");
	const { fileURLToPath: fileURLToPath$2, pathToFileURL: pathToFileURL$1 } = __require$2("node:url");
	const TS_EXT_RE = /\.[mc]?ts$/;
	let tsx;
	let jiti;
	let importError = [];
	/**
	* @param {string} name
	* @param {string} rootFile
	* @returns {Promise<any>}
	*/
	async function req(name, rootFile = fileURLToPath$2(import.meta.url)) {
		let url = createRequire$2(rootFile).resolve(name);
		try {
			return (await import(`${pathToFileURL$1(url)}?t=${Date.now()}`)).default;
		} catch (err) {
			if (!TS_EXT_RE.test(url))
 /* c8 ignore start */
			throw err;
		}
		if (tsx === void 0) try {
			tsx = await import("tsx/cjs/api");
		} catch (error) {
			importError.push(error);
		}
		if (tsx) {
			let loaded = tsx.require(name, rootFile);
			return loaded && "__esModule" in loaded ? loaded.default : loaded;
		}
		if (jiti === void 0) try {
			jiti = (await import("./jiti-C_gpxI8J.mjs")).default;
		} catch (error) {
			importError.push(error);
		}
		if (jiti) return jiti(rootFile, { interopDefault: true })(name);
		throw new Error(`'tsx' or 'jiti' is required for the TypeScript configuration files. Make sure it is installed\nError: ${importError.map((error) => error.message).join("\n")}`);
	}
	module.exports = req;
}));
var require_options = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const req = require_req();
	/**
	* Load Options
	*
	* @private
	* @method options
	*
	* @param  {Object} config  PostCSS Config
	*
	* @return {Promise<Object>} options PostCSS Options
	*/
	async function options(config, file) {
		if (config.parser && typeof config.parser === "string") try {
			config.parser = await req(config.parser, file);
		} catch (err) {
			throw new Error(`Loading PostCSS Parser failed: ${err.message}\n\n(@${file})`);
		}
		if (config.syntax && typeof config.syntax === "string") try {
			config.syntax = await req(config.syntax, file);
		} catch (err) {
			throw new Error(`Loading PostCSS Syntax failed: ${err.message}\n\n(@${file})`);
		}
		if (config.stringifier && typeof config.stringifier === "string") try {
			config.stringifier = await req(config.stringifier, file);
		} catch (err) {
			throw new Error(`Loading PostCSS Stringifier failed: ${err.message}\n\n(@${file})`);
		}
		return config;
	}
	module.exports = options;
}));
var require_plugins = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const req = require_req();
	/**
	* Plugin Loader
	*
	* @private
	* @method load
	*
	* @param  {String} plugin PostCSS Plugin Name
	* @param  {Object} options PostCSS Plugin Options
	*
	* @return {Promise<Function>} PostCSS Plugin
	*/
	async function load(plugin, options, file) {
		try {
			if (options === null || options === void 0 || Object.keys(options).length === 0) return await req(plugin, file);
			else return (await req(plugin, file))(options);
		} catch (err) {
			throw new Error(`Loading PostCSS Plugin failed: ${err.message}\n\n(@${file})`);
		}
	}
	/**
	* Load Plugins
	*
	* @private
	* @method plugins
	*
	* @param {Object} config PostCSS Config Plugins
	*
	* @return {Promise<Array>} plugins PostCSS Plugins
	*/
	async function plugins(config, file) {
		let list = [];
		if (Array.isArray(config.plugins)) list = config.plugins.filter(Boolean);
		else {
			list = Object.entries(config.plugins).filter(([, options]) => {
				return options !== false;
			}).map(([plugin, options]) => {
				return load(plugin, options, file);
			});
			list = await Promise.all(list);
		}
		if (list.length && list.length > 0) list.forEach((plugin, i) => {
			if (plugin.default) plugin = plugin.default;
			if (plugin.postcss === true) plugin = plugin();
			else if (plugin.postcss) plugin = plugin.postcss;
			if (!(typeof plugin === "object" && Array.isArray(plugin.plugins) || typeof plugin === "object" && plugin.postcssPlugin || typeof plugin === "function")) throw new TypeError(`Invalid PostCSS Plugin found at: plugins[${i}]\n\n(@${file})`);
		});
		return list;
	}
	module.exports = plugins;
}));
var require_src = /* @__PURE__ */ __commonJSMin$1(((exports, module) => {
	const { resolve: resolve$3 } = __require$2("node:path");
	const config = require_src$1();
	const loadOptions = require_options();
	const loadPlugins = require_plugins();
	const req = require_req();
	const interopRequireDefault = (obj) => obj && obj.__esModule ? obj : { default: obj };
	/**
	* Process the result from cosmiconfig
	*
	* @param  {Object} ctx Config Context
	* @param  {Object} result Cosmiconfig result
	*
	* @return {Promise<Object>} PostCSS Config
	*/
	async function processResult(ctx, result) {
		let file = result.filepath || "";
		let projectConfig = interopRequireDefault(result.config).default || {};
		if (typeof projectConfig === "function") projectConfig = projectConfig(ctx);
		else projectConfig = Object.assign({}, projectConfig, ctx);
		if (!projectConfig.plugins) projectConfig.plugins = [];
		let res = {
			file,
			options: await loadOptions(projectConfig, file),
			plugins: await loadPlugins(projectConfig, file)
		};
		delete projectConfig.plugins;
		return res;
	}
	/**
	* Builds the Config Context
	*
	* @param  {Object} ctx Config Context
	*
	* @return {Object} Config Context
	*/
	function createContext(ctx) {
		/**
		* @type {Object}
		*
		* @prop {String} cwd=process.cwd() Config search start location
		* @prop {String} env=process.env.NODE_ENV Config Enviroment, will be set to `development` by `postcss-load-config` if `process.env.NODE_ENV` is `undefined`
		*/
		ctx = Object.assign({
			cwd: process.cwd(),
			env: process.env.NODE_ENV
		}, ctx);
		if (!ctx.env) process.env.NODE_ENV = "development";
		return ctx;
	}
	async function loader(filepath) {
		return req(filepath);
	}
	let yaml;
	async function yamlLoader(_, content) {
		if (!yaml) try {
			yaml = await import("./dist2-DWsr6UAl.mjs").then((m) => /* @__PURE__ */ __toESM$2(m.default));
		} catch (e) {
			/* c8 ignore start */
			throw new Error(`'yaml' is required for the YAML configuration files. Make sure it is installed\nError: ${e.message}`);
		}
		return yaml.parse(content);
	}
	/** @return {import('lilconfig').Options} */
	const withLoaders = (options = {}) => {
		let moduleName = "postcss";
		return {
			...options,
			loaders: {
				...options.loaders,
				".cjs": loader,
				".cts": loader,
				".js": loader,
				".mjs": loader,
				".mts": loader,
				".ts": loader,
				".yaml": yamlLoader,
				".yml": yamlLoader
			},
			searchPlaces: [
				...options.searchPlaces || [],
				"package.json",
				`.${moduleName}rc`,
				`.${moduleName}rc.json`,
				`.${moduleName}rc.yaml`,
				`.${moduleName}rc.yml`,
				`.${moduleName}rc.ts`,
				`.${moduleName}rc.cts`,
				`.${moduleName}rc.mts`,
				`.${moduleName}rc.js`,
				`.${moduleName}rc.cjs`,
				`.${moduleName}rc.mjs`,
				`${moduleName}.config.ts`,
				`${moduleName}.config.cts`,
				`${moduleName}.config.mts`,
				`${moduleName}.config.js`,
				`${moduleName}.config.cjs`,
				`${moduleName}.config.mjs`
			]
		};
	};
	/**
	* Load Config
	*
	* @method rc
	*
	* @param  {Object} ctx Config Context
	* @param  {String} path Config Path
	* @param  {Object} options Config Options
	*
	* @return {Promise} config PostCSS Config
	*/
	function rc(ctx, path, options) {
		/**
		* @type {Object} The full Config Context
		*/
		ctx = createContext(ctx);
		/**
		* @type {String} `process.cwd()`
		*/
		path = path ? resolve$3(path) : process.cwd();
		return config.lilconfig("postcss", withLoaders(options)).search(path).then((result) => {
			if (!result) throw new Error(`No PostCSS Config found in: ${path}`);
			return processResult(ctx, result);
		});
	}
	/**
	* Autoload Config for PostCSS
	*
	* @author Michael Ciniawsky @michael-ciniawsky <michael.ciniawsky@gmail.com>
	* @license MIT
	*
	* @module postcss-load-config
	* @version 2.1.0
	*
	* @requires comsiconfig
	* @requires ./options
	* @requires ./plugins
	*/
	module.exports = rc;
}));
import_picocolors.default.blue, import_picocolors.default.magenta, import_picocolors.default.green, import_picocolors.default.gray;
require_src();
new TextDecoder();
const cssConfigDefaults = Object.freeze({
	/** @experimental */
	transformer: "postcss",
	preprocessorMaxWorkers: true,
	/** @experimental */
	devSourcemap: false
});
new RegExp(`\\.module${CSS_LANGS_RE.source}`);
const functionCallRE = /^[A-Z_][.\w-]*\(/i;
const nonEscapedDoubleQuoteRe = /(?<!\\)"/g;
const cssUrlRE = /(?<!@import\s+)(?<=^|[^\w\-\u0080-\uffff])url\((\s*('[^']+'|"[^"]+")\s*|(?:\\.|[^'")\\])+)\)/;
const cssImageSetRE = /(?<=image-set\()((?:[\w-]{1,256}\([^)]*\)|[^)])*)(?=\))/;
const UrlRewritePostcssPlugin = (opts) => {
	if (!opts) throw new Error("base or replace is required");
	return {
		postcssPlugin: "vite-url-rewrite",
		Once(root) {
			const promises = [];
			root.walkDecls((declaration) => {
				const importer = declaration.source?.input.file;
				if (!importer) opts.logger.warnOnce("\nA PostCSS plugin did not pass the `from` option to `postcss.parse`. This may cause imported assets to be incorrectly transformed. If you've recently added a PostCSS plugin that raised this warning, please contact the package author to fix the issue.");
				const isCssUrl = cssUrlRE.test(declaration.value);
				const isCssImageSet = cssImageSetRE.test(declaration.value);
				if (isCssUrl || isCssImageSet) {
					const replacerForDeclaration = async (rawUrl) => {
						const [newUrl, resolvedId] = await opts.resolver(rawUrl, importer);
						if (resolvedId) opts.deps.add(resolvedId);
						return newUrl;
					};
					if (isCssUrl && isCssImageSet) promises.push(rewriteCssUrls(declaration.value, replacerForDeclaration).then((url) => rewriteCssImageSet(url, replacerForDeclaration)).then((url) => {
						declaration.value = url;
					}));
					else promises.push((isCssImageSet ? rewriteCssImageSet : rewriteCssUrls)(declaration.value, replacerForDeclaration).then((url) => {
						declaration.value = url;
					}));
				}
			});
			if (promises.length) return Promise.all(promises);
		}
	};
};
UrlRewritePostcssPlugin.postcss = true;
function rewriteCssUrls(css, replacer) {
	return asyncReplace(css, cssUrlRE, async (match) => {
		const [matched, rawUrl] = match;
		return await doUrlReplace(rawUrl.trim(), matched, replacer);
	});
}
const cssNotProcessedRE = /(?:gradient|element|cross-fade|image)\(/;
async function rewriteCssImageSet(css, replacer) {
	return await asyncReplace(css, cssImageSetRE, async (match) => {
		const [, rawUrl] = match;
		return await processSrcSet(rawUrl, async ({ url }) => {
			if (cssUrlRE.test(url)) return await rewriteCssUrls(url, replacer);
			if (!cssNotProcessedRE.test(url)) return await doUrlReplace(url, url, replacer);
			return url;
		});
	});
}
function skipUrlReplacer(unquotedUrl) {
	return isExternalUrl(unquotedUrl) || isDataUrl(unquotedUrl) || unquotedUrl[0] === "#" || functionCallRE.test(unquotedUrl) || unquotedUrl.startsWith("__VITE_ASSET__") || unquotedUrl.startsWith("__VITE_PUBLIC_ASSET__");
}
async function doUrlReplace(rawUrl, matched, replacer, funcName = "url") {
	let wrap = "";
	const first = rawUrl[0];
	let unquotedUrl = rawUrl;
	if (first === `"` || first === `'`) {
		wrap = first;
		unquotedUrl = rawUrl.slice(1, -1);
	}
	if (skipUrlReplacer(unquotedUrl)) return matched;
	unquotedUrl = unquotedUrl.replace(/\\(\W)/g, "$1");
	let newUrl = await replacer(unquotedUrl, rawUrl);
	if (newUrl === false) return matched;
	if (wrap === "" && (newUrl !== encodeURI(newUrl) || newUrl.includes(")"))) wrap = "\"";
	if (wrap === "'" && newUrl.includes("'")) wrap = "\"";
	if (wrap === "\"" && newUrl.includes("\"")) newUrl = newUrl.replace(nonEscapedDoubleQuoteRe, "\\\"");
	return `${funcName}(${wrap}${newUrl}${wrap})`;
}
new RegExp([/[ \t]*<script[^>]*type\s*=\s*(?:"module"|'module'|module)[^>]*>/i, /[ \t]*<link[^>]*rel\s*=\s*(?:"modulepreload"|'modulepreload'|modulepreload)[\s\S]*?>/i].map((r) => r.source).join("|"), "i");
createDebugger("vite:cache");
normalizePath$1(CLIENT_ENTRY);
normalizePath$1(ENV_ENTRY);
createDebugger("vite:time");
Object.freeze({});
require_connect();
require_lib$1();
require_chokidar();
require_launch_editor_middleware();
require_dist();
const serverConfigDefaults = Object.freeze({
	port: DEFAULT_DEV_PORT,
	strictPort: false,
	host: "localhost",
	allowedHosts: [],
	https: void 0,
	open: false,
	proxy: void 0,
	cors: { origin: defaultAllowedOrigins },
	headers: {},
	warmup: {
		clientFiles: [],
		ssrFiles: []
	},
	middlewareMode: false,
	fs: {
		strict: true,
		deny: [
			".env",
			".env.*",
			"*.{crt,pem,key,p12,pfx,cer,der}",
			".npmrc",
			".yarnrc.yml",
			"**/.git/**"
		]
	},
	preTransformRequests: true,
	perEnvironmentStartEndDuringDev: false,
	perEnvironmentWatchChangeDuringDev: false,
	forwardConsole: void 0
});
createDebugger("vite:hmr");
normalizePath$1(CLIENT_DIR);
createDebugger("vite:external");
createDebugger("vite:import-analysis");
normalizePath$1(CLIENT_DIR);
const interopHelper = (m, n) => n || !m?.__esModule ? {
	...typeof m === "object" && !Array.isArray(m) || typeof m === "function" ? m : {},
	default: m
} : m;
interopHelper.toString().replaceAll("\n", "");
const wasmHelper = async (opts = {}, url) => {
	let result;
	if (url.startsWith("data:")) {
		const urlContent = url.replace(/^data:.*?base64,/, "");
		let bytes;
		if (typeof Buffer === "function" && typeof Buffer.from === "function") bytes = Buffer.from(urlContent, "base64");
		else if (typeof atob === "function") {
			const binaryString = atob(urlContent);
			bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
		} else throw new Error("Failed to decode base64-encoded data URL, Buffer and atob are not supported");
		result = await WebAssembly.instantiate(bytes, opts);
	} else result = await instantiateFromUrl(url, opts);
	return result.instance;
};
wasmHelper.toString();
const instantiateFromUrl = async (url, opts) => {
	const response = await fetch(url);
	const contentType = response.headers.get("Content-Type") || "";
	if ("instantiateStreaming" in WebAssembly && contentType.startsWith("application/wasm")) return WebAssembly.instantiateStreaming(response, opts);
	else {
		const buffer = await response.arrayBuffer();
		return WebAssembly.instantiate(buffer, opts);
	}
};
instantiateFromUrl.toString();
const instantiateFromFile = async (fileUrlString, opts) => {
	const { readFile } = await import("node:fs/promises");
	const buffer = await readFile(new URL(
		fileUrlString,
		/** #__KEEP__ */
		import.meta.url
	));
	return WebAssembly.instantiate(buffer, opts);
};
instantiateFromFile.toString();
new RegExp(`__VITE_PRELOAD__`, "g");
const { basename: basename$2, dirname: dirname$2, relative: relative$2 } = posix;
",".charCodeAt(0);
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var intToChar = /* @__PURE__ */ new Uint8Array(64);
var charToInt = /* @__PURE__ */ new Uint8Array(128);
for (let i = 0; i < chars.length; i++) {
	const c = chars.charCodeAt(i);
	intToChar[i] = c;
	charToInt[c] = i;
}
const NOW_LENGTH = Date.now().toString().length;
new RegExp(`vitest=\\d{${NOW_LENGTH}}`);
Object.freeze({});
process.env.DEBUG_VITE_SOURCEMAP_COMBINE_FILTER;
createDebugger("vite:sourcemap-combine", { onlyWhenFocused: true });
createDebugger("vite:resolve");
createDebugger("vite:plugin-resolve", { onlyWhenFocused: "vite:plugin" });
createDebugger("vite:plugin-transform", { onlyWhenFocused: "vite:plugin" });
createDebugger("vite:plugin-container-context");
fsp.appendFile, fsp.copyFile, fsp.mkdir, fsp.mkdtemp, fsp.readdir, fsp.readFile, fsp.realpath, fsp.rename, fsp.rmdir, fsp.stat, fsp.lstat, fsp.unlink, fsp.writeFile;
createDebugger("vite:deps");
[...KNOWN_ASSET_TYPES];
createDebugger("vite:deps");
[
	{
		path: "node_modules/.package-lock.json",
		checkPatchesDir: "patches",
		manager: "npm"
	},
	{
		path: "node_modules/.yarn-state.yml",
		checkPatchesDir: false,
		manager: "yarn"
	},
	{
		path: ".pnp.cjs",
		checkPatchesDir: ".yarn/patches",
		manager: "yarn"
	},
	{
		path: ".pnp.js",
		checkPatchesDir: ".yarn/patches",
		manager: "yarn"
	},
	{
		path: "node_modules/.yarn-integrity",
		checkPatchesDir: "patches",
		manager: "yarn"
	},
	{
		path: "node_modules/.pnpm/lock.yaml",
		checkPatchesDir: false,
		manager: "pnpm"
	},
	{
		path: ".rush/temp/shrinkwrap-deps.json",
		checkPatchesDir: false,
		manager: "pnpm"
	},
	{
		path: "bun.lock",
		checkPatchesDir: "patches",
		manager: "bun"
	},
	{
		path: "bun.lockb",
		checkPatchesDir: "patches",
		manager: "bun"
	}
].sort((_, { manager }) => {
	return process.env.npm_config_user_agent?.startsWith(manager) ? 1 : -1;
}).map((l) => l.path);
const GRACEFUL_RENAME_TIMEOUT = 5e3;
promisify(function gracefulRename(from, to, cb) {
	const start = Date.now();
	let backoff = 0;
	fs.rename(from, to, function CB(er) {
		if (er && (er.code === "EACCES" || er.code === "EPERM") && Date.now() - start < GRACEFUL_RENAME_TIMEOUT) {
			setTimeout(function() {
				fs.stat(to, function(stater, _st) {
					if (stater && stater.code === "ENOENT") fs.rename(from, to, CB);
					else CB(er);
				});
			}, backoff);
			if (backoff < 100) backoff += 10;
			return;
		}
		cb(er);
	});
});
normalizePath$1(CLIENT_ENTRY);
normalizePath$1(ENV_ENTRY);
createDebugger("vite:resolve-details", { onlyWhenFocused: true });
Object.freeze({ fileName: ".vite/license.md" });
const buildEnvironmentOptionsDefaults = Object.freeze({
	target: "baseline-widely-available",
	/** @deprecated */
	polyfillModulePreload: true,
	modulePreload: true,
	outDir: "dist",
	assetsDir: "assets",
	assetsInlineLimit: DEFAULT_ASSETS_INLINE_LIMIT,
	sourcemap: false,
	terserOptions: {},
	chunkImportMap: false,
	rolldownOptions: {},
	commonjsOptions: {
		include: [/node_modules/],
		extensions: [".js", ".cjs"]
	},
	dynamicImportVarsOptions: { exclude: [/node_modules/] },
	write: true,
	emptyOutDir: null,
	copyPublicDir: true,
	license: false,
	manifest: false,
	lib: false,
	ssrManifest: false,
	ssrEmitAssets: false,
	reportCompressedSize: true,
	chunkSizeWarningLimit: 500,
	watch: null
});
const builderOptionsDefaults = Object.freeze({
	sharedConfigBuild: false,
	sharedPlugins: false
});
new RegExp(`//# ${SOURCEMAPPING_URL}=data:application/json[^,]+base64,([A-Za-z0-9+/=]+)$`, "gm");
createDebugger("vite:deps");
createDebugger("vite:full-bundle-mode");
const ssrConfigDefaults = Object.freeze({
	target: "node",
	optimizeDeps: {}
});
createDebugger("vite:config", { depth: 10 });
promisify(fs.realpath);
Object.freeze({
	define: {},
	dev: {
		warmup: [],
		/** @experimental */
		sourcemap: { js: true },
		sourcemapIgnoreList: void 0
	},
	build: buildEnvironmentOptionsDefaults,
	resolve: {
		externalConditions: [...DEFAULT_EXTERNAL_CONDITIONS],
		extensions: DEFAULT_EXTENSIONS,
		dedupe: [],
		/** @experimental */
		noExternal: [],
		external: [],
		preserveSymlinks: false,
		tsconfigPaths: false,
		alias: []
	},
	base: "/",
	publicDir: "public",
	plugins: [],
	html: { cspNonce: void 0 },
	css: cssConfigDefaults,
	json: {
		namedExports: true,
		stringify: "auto"
	},
	assetsInclude: void 0,
	/** @experimental */
	builder: builderOptionsDefaults,
	server: serverConfigDefaults,
	preview: { port: DEFAULT_PREVIEW_PORT },
	/** @experimental */
	experimental: {
		importGlobRestoreExtension: false,
		renderBuiltUrl: void 0,
		hmrPartialAccept: false,
		bundledDev: false
	},
	future: {
		removePluginHookHandleHotUpdate: void 0,
		removePluginHookSsrArgument: void 0,
		removeServerModuleGraph: void 0,
		removeServerHot: void 0,
		removeServerTransformRequest: void 0,
		removeServerWarmupRequest: void 0,
		removeSsrLoadModule: void 0
	},
	legacy: { skipWebSocketTokenCheck: false },
	logLevel: "info",
	customLogger: void 0,
	clearScreen: true,
	envDir: void 0,
	envPrefix: "VITE_",
	worker: {
		format: "iife",
		plugins: () => []
	},
	optimizeDeps: {
		include: [],
		exclude: [],
		needsInterop: [],
		rolldownOptions: {},
		/** @experimental */
		extensions: [],
		/** @deprecated @experimental */
		disabled: "build",
		/** @experimental */
		holdUntilCrawlEnd: true,
		/** @experimental */
		force: false,
		/** @experimental */
		ignoreOutdatedRequests: false
	},
	ssr: ssrConfigDefaults,
	environments: {},
	appType: "spa"
});
path.posix.join(FS_PREFIX, normalizePath$1(ENV_ENTRY)), path.posix.join(FS_PREFIX, normalizePath$1(CLIENT_ENTRY));
createRequire(
	/** #__KEEP__ */
	import.meta.url
);
//#endregion
//#region node_modules/.pnpm/vitest@4.1.9_@types+node@24_c7d0bcb158c80190ad8e8ed3163452ed/node_modules/vitest/dist/config.js
function defineConfig(config) {
	return config;
}
//#endregion
//#region node_modules/.pnpm/vite-plus@0.2.2_@types+node_465d8f3ccf09c3dc13b7dda609ccff94/node_modules/vite-plus/dist/define-config-CSgy0zML.js
const getFilename = () => fileURLToPath(import.meta.url);
const getDirname = () => path.dirname(getFilename());
const __dirname = /* @__PURE__ */ getDirname();
/**
* `require` anchored at THIS module's location so `require.resolve` reaches
* the `vitest` / `@vitest/*` family that the `vite-plus` package directly
* depends on — even from a consumer project where they are only transitive.
* Used to locate the bundled `vitest` package (its `package.json`), NOT to
* resolve module ENTRIES: `require.resolve` applies the `require` export
* condition, which selects Vitest's CJS entries — for the bare `vitest` root
* a throw-stub (`index.cjs` — "Vitest cannot be imported … using require()"),
* and for subpaths the CJS build (e.g. `vitest/config` → `config.cjs`) rather
* than the ESM entry the test server's module graph needs. Module entries are
* resolved through Vite's own resolver instead (see
* [[vitePlusVitestResolverPlugin]]), which honours ESM conditions.
*
* `define-config.ts` is bundled by tsdown in BOTH formats: ESM (`shims: true`,
* which defines a module-scoped `__dirname`) and CJS (where `__dirname` is the
* Node global). The guard picks `__dirname` whenever it exists and otherwise
* falls back to `import.meta.url`; tsdown rewrites the latter to
* `pathToFileURL(__filename).href` in the CJS bundle, so it is safe in both.
*/
const vitePlusRequire = createRequire(typeof __dirname !== "undefined" ? __dirname : import.meta.url);
/**
* Absolute path to THIS module, used as a `this.resolve` importer so Vite's
* resolver roots the `vitest` / `@vitest/*` family at `vite-plus`'s own
* location — reaching its direct deps (`vitest`, `vitest/*`, `@vitest/browser*`)
* even from a consumer project where they are only transitive.
*
* `import.meta.url` is native in the ESM bundle and rewritten by tsdown to
* `pathToFileURL(__filename).href` in the CJS bundle, so it is a valid file URL
* in both.
*/
const vitePlusModuleFile = fileURLToPath(import.meta.url);
/**
* Absolute path to the bundled `vitest` package's `package.json`, used as a
* second `this.resolve` importer. The nested `@vitest/*` family (`@vitest/expect`,
* `@vitest/runner`, `@vitest/snapshot`, …) are dependencies of `vitest` itself —
* not direct deps of `vite-plus` — so under pnpm's isolated layout they are
* reachable from `vitest`'s location but not from [[vitePlusModuleFile]].
* Resolving `package.json` is condition-agnostic, so this is safe with
* `require.resolve`. Cached; `null` once an attempt has failed so we never retry.
*/
let vitestAnchor;
function getVitestAnchor() {
	if (vitestAnchor !== void 0) return vitestAnchor;
	try {
		vitestAnchor = vitePlusRequire.resolve("vitest/package.json");
	} catch {
		vitestAnchor = null;
	}
	return vitestAnchor;
}
/**
* Match the `vitest` / `@vitest/*` family of bare specifiers — the imports a
* browser-mode Vite dev server must resolve. Any query string is stripped
* first; relative (`./`), absolute (`/`), and virtual (`\0`) ids never match.
*
* Exported for unit testing.
*/
function isVitestFamilySpecifier(id) {
	const bare = id.split("?")[0];
	if (bare.startsWith(".") || bare.startsWith("/") || bare.startsWith("\0")) return false;
	return bare === "vitest" || bare.startsWith("vitest/") || bare === "@vitest/browser" || bare.startsWith("@vitest/");
}
/**
* Rescue `vitest` / `@vitest/*` resolution for browser-mode tests.
*
* In an established project that depends only on `vite-plus`, both `vitest`
* and `@vitest/browser` are transitive deps. pnpm's isolated layout only
* exposes a package's *direct* deps, so the browser-mode Vite dev server
* (rooted at the consumer project) cannot resolve `vitest/internal/browser`,
* `@vitest/expect`, etc. Non-browser tests are unaffected — vitest's own
* module runner handles resolution there.
*
* This plugin re-resolves the `vitest` / `@vitest/*` family through Vite's OWN
* resolver, but ROOTED at `vite-plus`'s location ([[vitePlusModuleFile]]) and
* then the bundled `vitest`'s location ([[getVitestAnchor]]) BEFORE the
* project. So every such import binds to the same physical (pinned) Vitest that
* `vp test` spawns as the runner (see `resolveBundled` in `resolve-test.ts`)
* and that the `vite-plus/test*` shims re-export. Were a project-local Vitest
* preferred instead, a project that keeps its own `vitest` dependency would
* split the run across two physical Vitest module instances — the runner
* (bundled) vs. the test files' `vi`/`expect`/runner internals (project) — a
* classic source of internal-state and mock-hoisting mismatches. For the common
* migrated layout (a project depending only on `vite-plus`) nothing in this
* family is resolvable from the project root under pnpm's isolated layout
* anyway, so default resolution would return `null` there regardless;
* bundle-first only changes the project-keeps-its-own-`vitest` case, which is
* exactly the case we want pinned.
*
* Resolution goes through `this.resolve` (NOT [[vitePlusRequire]].resolve) so
* Vite's ESM export conditions are honoured: a raw `require.resolve` would pick
* Vitest's CJS `require`-condition entry — a throw-stub for the bare `vitest`
* root (`index.cjs`), and the CJS build for subpaths (e.g. `vitest/config` →
* `config.cjs`) instead of the ESM entry. Two bundled anchors are tried because `@vitest/browser*` are
* direct deps of `vite-plus` (reachable from [[vitePlusModuleFile]]) while the
* nested `@vitest/*` family are deps of `vitest` (reachable only from the
* `vitest` anchor). The project root remains the last resort for any family id
* the bundled tree cannot resolve, so this is never worse than deferring first.
*
* Two intentional limits of routing through `this.resolve`:
*   - An EXPLICIT project `resolve.alias` / `resolve.dedupe` on the vitest
*     family takes precedence (Vite's pipeline applies it even from a bundled
*     anchor). Neither is set by default in Vitest 4.x, so this only affects
*     projects that deliberately re-point the family — treated as an opt-out of
*     pinning, not defeated silently.
*   - Coverage providers (`@vitest/coverage-v8` / `-istanbul`) are NOT shipped
*     with `vite-plus`, so they hit the project fallback below. Under
*     `--coverage`, a project-installed provider of a different version pairs
*     with the bundled runner; Vitest only WARNS on the version skew and then
*     runs mixed versions (its provider `_initialize` logs and continues, it
*     does not throw), which silently yields unreliable coverage — so
*     [[vitePlusCoverageVersionGuardPlugin]] fails fast on a mismatch instead.
*/
function vitePlusVitestResolverPlugin() {
	return {
		name: "vite-plus:vitest-resolver",
		enforce: "pre",
		async resolveId(id, importer, options) {
			if (!isVitestFamilySpecifier(id)) return null;
			if (id.includes("?")) return null;
			const vitestAnchorPath = getVitestAnchor();
			const bundledAnchors = vitestAnchorPath ? [vitePlusModuleFile, vitestAnchorPath] : [vitePlusModuleFile];
			for (const anchor of bundledAnchors) {
				const resolved = await this.resolve(id, anchor, {
					...options,
					skipSelf: true
				});
				if (resolved) return resolved;
			}
			return this.resolve(id, importer, {
				...options,
				skipSelf: true
			});
		}
	};
}
/**
* Packages that register Vitest `expect` matchers via `expect.extend()` from
* a side-effect import. When Vite serves these from a separate module graph
* than the test runtime, the matchers register on a different `expect`
* instance and `expect(...).<matcher>` is undefined at call time (vitest
* issue #897). Inlining them into the test server's module graph forces
* registration on the same instance.
*
* Only packages that are **installed** in the consumer project are inlined.
* Absent packages are silently skipped so the server-deps optimizer never
* tries to resolve a name that does not exist in the project's node_modules.
*
* The check is deferred to a `configResolved` plugin hook so that
* `resolvedConfig.root` points at the actual project root (the value vite has
* already normalised), rather than relying on `process.cwd()` at config-load
* time (which can differ in workspace / monorepo setups).
*
* Exported for unit testing.
*/
const AUTO_INLINE_DEPS = [
	"@testing-library/jest-dom",
	"@storybook/test",
	"jest-extended"
];
/**
* Compute the merged `test.server.deps.inline` list for a given project root,
* appending only those entries from [[AUTO_INLINE_DEPS]] that are actually
* installed in the project.
*
* Returns `null` when nothing needs to change (either `inline: true` or an
* empty result), so the caller can skip the mutation step.
*
* Exported for unit testing. The `_createRequire` parameter lets tests inject
* a controlled resolver without needing to spy on Node's ESM module namespace.
*/
function computeAutoInlineList(existingInline, projectRoot, _createRequire = createRequire) {
	if (existingInline === true) return null;
	const projectRequire = _createRequire(`${projectRoot}/package.json`);
	const merged = Array.isArray(existingInline) ? [...existingInline] : [];
	for (const pkg of AUTO_INLINE_DEPS) {
		if (merged.some((entry) => entry === pkg || entry instanceof RegExp && entry.test(pkg))) continue;
		try {
			projectRequire.resolve(pkg);
		} catch {
			continue;
		}
		merged.push(pkg);
	}
	const hadEntries = Array.isArray(existingInline) ? existingInline.length : 0;
	if (merged.length === hadEntries) return null;
	return merged;
}
function vitePlusAutoInlineMatcherPlugin() {
	return {
		name: "vite-plus:auto-inline-matcher-deps",
		enforce: "pre",
		configResolved(resolvedConfig) {
			const testConfig = resolvedConfig.test;
			const merged = computeAutoInlineList(testConfig?.server?.deps?.inline, resolvedConfig.root);
			if (merged === null) return;
			if (!testConfig) resolvedConfig.test = { server: { deps: { inline: merged } } };
			else {
				if (!testConfig.server) testConfig.server = {};
				if (!testConfig.server.deps) testConfig.server.deps = {};
				testConfig.server.deps.inline = merged;
			}
		}
	};
}
/** Coverage providers vite-plus can version-check against the bundled runner. */
const KNOWN_COVERAGE_PROVIDERS = /* @__PURE__ */ new Set(["v8", "istanbul"]);
/**
* Resolve the coverage provider package name that should be version-checked, or
* `null` when no check applies (coverage off, or a `custom`/unknown provider
* vite-plus does not bundle a runner for).
*
* Takes Vitest's OWN resolved coverage options (`enabled`/`provider`), which the
* `configureVitest` hook exposes AFTER Vitest's CLI parser has run — so the
* `--coverage` family of flags is already folded into `enabled`/`provider` and
* we never re-parse `process.argv` ourselves. Unset `provider` defaults to `v8`
* (Vitest's default).
*
* Exported for unit testing.
*/
function resolveCoverageProviderToCheck(coverage) {
	if (!coverage?.enabled) return null;
	const name = coverage.provider ?? "v8";
	return KNOWN_COVERAGE_PROVIDERS.has(name) ? `@vitest/coverage-${name}` : null;
}
/**
* vite-plus bundles `vitest@VITEST_VERSION` as the test runner, but coverage
* providers (`@vitest/coverage-v8` / `-istanbul`) are project-installed peer
* deps it does not ship. Vitest only PRINTS A WARNING on a provider/runner
* version skew and then runs mixed versions (verified in 4.1.9: the provider's
* `_initialize` calls `logger.warn`, it never throws), silently producing
* unreliable coverage. Fail fast instead.
*
* Exported for unit testing.
*/
function assertCoverageProviderVersionMatch(providerPackageName, installedVersion, expectedVersion = VITEST_VERSION) {
	if (installedVersion && installedVersion !== expectedVersion) throw new Error(`vite-plus bundles vitest@${expectedVersion}, but ${providerPackageName}@${installedVersion} is installed. A coverage provider must match the test runner version: Vitest only prints a warning on a mismatch and then runs mixed versions, which produces unreliable coverage. Pin ${providerPackageName} to ${expectedVersion} in your dependencies.`);
}
/**
* The bundled vitest's `package.json` path — the SAME anchor Vitest's own
* `import('@vitest/coverage-*')` resolves against (its dist walks up from here).
* Used as a fallback resolution anchor for the coverage guard. Lazily computed
* and cached; `null` when the bundled vitest is somehow unreachable, in which
* case the guard simply relies on the project-root anchor.
*/
let bundledVitestAnchorCache;
function bundledVitestAnchor() {
	if (bundledVitestAnchorCache === void 0) try {
		bundledVitestAnchorCache = createRequire(import.meta.url).resolve("vitest/package.json");
	} catch {
		bundledVitestAnchorCache = null;
	}
	return bundledVitestAnchorCache;
}
/**
* Read a project-installed coverage provider's version, mirroring how Vitest
* itself resolves the provider. Vitest install-checks it from BOTH the runner
* root AND its own bundled dir (`isPackageExists(dep, {paths:[root, vitestDir]})`)
* and then loads it via a bare `import('@vitest/coverage-*')` anchored at that
* bundled dir. So the guard tries the project root FIRST — the supported layout
* where a directly-declared provider is symlinked at the root, the same copy the
* bundled vitest walks up to — then falls back to the bundled-vitest anchor,
* which catches hoisted / pnpm peer-set layouts where the provider lives next to
* vitest but is not resolvable from the project root (a silent skip otherwise).
* `@vitest/coverage-*`'s exports map has a `"./*": "./*"` catch-all, so
* `./package.json` is resolvable. Returns `null` when no anchor can resolve it —
* Vitest then emits its own (already clear) missing-provider error.
*
* The `_createRequire` / `_readFile` parameters let tests inject controlled
* resolvers without spying on Node's module/fs namespaces.
*/
function readInstalledCoverageProviderVersion(providerPackageName, projectRoot, _createRequire = createRequire, _readFile = (path) => readFileSync(path, "utf8")) {
	const anchors = [`${projectRoot}/package.json`, bundledVitestAnchor()];
	for (const anchor of anchors) {
		if (!anchor) continue;
		try {
			const pkgJsonPath = _createRequire(anchor).resolve(`${providerPackageName}/package.json`);
			const parsed = JSON.parse(_readFile(pkgJsonPath));
			if (parsed.version) return parsed.version;
		} catch {}
	}
	return null;
}
/**
* Orchestrates the coverage version guard: detect the active provider from
* Vitest's resolved coverage options, read its installed version from the
* project root, and throw on a mismatch. A no-op when coverage is off or the
* provider is not installed.
*
* Exported (with injectable `deps`) for unit testing.
*/
function checkCoverageProviderVersion(coverage, projectRoot, deps = {}) {
	const providerPackageName = resolveCoverageProviderToCheck(coverage);
	if (!providerPackageName) return;
	assertCoverageProviderVersionMatch(providerPackageName, readInstalledCoverageProviderVersion(providerPackageName, projectRoot, deps.createRequire, deps.readFile));
}
/**
* Vitest instances the guard has already handled. The `configureVitest` hook
* fires once PER PROJECT but `vitest` is shared and coverage is global, so this
* runs the whole guard exactly once per instance (and never leaks, since it is
* keyed weakly on identity).
*/
const coverageGuardedVitestInstances = /* @__PURE__ */ new WeakSet();
function vitePlusCoverageVersionGuardPlugin() {
	return {
		name: "vite-plus:coverage-version-guard",
		configureVitest(context) {
			const { vitest } = context;
			if (coverageGuardedVitestInstances.has(vitest)) return;
			coverageGuardedVitestInstances.add(vitest);
			checkCoverageProviderVersion(vitest.config.coverage, vitest.config.root);
			const enableCoverage = vitest.enableCoverage.bind(vitest);
			vitest.enableCoverage = async () => {
				checkCoverageProviderVersion({
					enabled: true,
					provider: vitest.config.coverage?.provider
				}, vitest.config.root);
				return enableCoverage();
			};
		}
	};
}
/**
* Inject the vitest resolver plugin, the auto-inline matcher plugin, and the
* coverage version guard into a single inline project config. Used both for
* root configs and for object-shaped entries inside `test.projects`.
*
* The shapes overlap (both have an optional top-level `plugins` array and
* an optional `test.server.deps.inline`), so a shared helper keeps the
* wiring consistent.
*/
function injectPluginIntoInlineConfig(config) {
	return {
		...config,
		plugins: [
			vitePlusVitestResolverPlugin(),
			vitePlusAutoInlineMatcherPlugin(),
			vitePlusCoverageVersionGuardPlugin(),
			...config.plugins ?? []
		]
	};
}
/**
* Walk `config.test?.projects` and inject the vite-plus plugins into each
* project entry. Vitest spins up an independent Vite pipeline per project, so
* root-level plugins do NOT propagate — without this, files matched by a
* project's `include` glob never get the vitest resolver / auto-inline plugins.
*
* Entry shapes (from `TestProjectConfiguration`):
*   - string  (glob path like `'./packages/*'`)  → passed through unchanged.
*   - object  (inline config with `test: {...}`) → clone and prepend plugin.
*   - function (sync or async)                   → wrap so its result is injected.
*   - Promise (resolves to inline config)        → chain `.then(injectPlugin)`.
*
* String/glob entries cannot be cloned, so they carry no injected plugin. This
* only weakens the COVERAGE guard, and only narrowly: coverage is global, and
* the migration rewrites every nested config file to vite-plus
* `defineConfig`/`defineProject` (which re-inject the guard), so a migrated
* workspace still fires it from its resolved projects. The residual gap is a
* hand-authored workspace whose string globs resolve to raw `vitest/config`
* sub-configs or bare directory projects — there a provider/runner skew falls
* back to Vitest's own (softer) warning instead of the guard's hard error.
*/
function injectPluginIntoProject(project) {
	if (typeof project === "string") return project;
	if (typeof project === "function") {
		const wrapped = (env) => {
			const result = project(env);
			if (result instanceof Promise) return result.then(injectPluginIntoInlineConfig);
			return injectPluginIntoInlineConfig(result);
		};
		return wrapped;
	}
	if (project instanceof Promise) return project.then(injectPluginIntoInlineConfig);
	if (typeof project === "object" && project !== null) return injectPluginIntoInlineConfig(project);
	return project;
}
function injectPlugin(config) {
	const injected = injectPluginIntoInlineConfig(config);
	const projects = injected.test?.projects;
	if (!projects || projects.length === 0) return injected;
	return {
		...injected,
		test: {
			...injected.test,
			projects: projects.map(injectPluginIntoProject)
		}
	};
}
function injectPluginIntoConfig(config) {
	if (typeof config === "function") return (env) => {
		const result = config(env);
		if (result instanceof Promise) return result.then(injectPlugin);
		return injectPlugin(result);
	};
	if (config instanceof Promise) return config.then(injectPlugin);
	return injectPlugin(config);
}
function defineConfig$1(config) {
	return defineConfig(injectPluginIntoConfig(config));
}
//#endregion
//#region scripts/lib/public-config.ts
const REPO_ROOT = NodePath.dirname(NodePath.dirname(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url))));
function loadRepoEnv({ baseEnv = process.env, repoRoot = REPO_ROOT } = {}) {
	const rootEnv = readEnvFile(NodePath.join(repoRoot, ".env"));
	const localEnv = readEnvFile(NodePath.join(repoRoot, ".env.local"));
	const config = resolvePublicConfig(baseEnv, localEnv, rootEnv);
	return {
		...rootEnv,
		...localEnv,
		...baseEnv,
		...config.clerkPublishableKey ? {
			RUNE_CLERK_PUBLISHABLE_KEY: config.clerkPublishableKey,
			VITE_CLERK_PUBLISHABLE_KEY: config.clerkPublishableKey,
			EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: config.clerkPublishableKey
		} : {},
		...config.clerkJwtTemplate ? {
			RUNE_CLERK_JWT_TEMPLATE: config.clerkJwtTemplate,
			VITE_CLERK_JWT_TEMPLATE: config.clerkJwtTemplate,
			EXPO_PUBLIC_CLERK_JWT_TEMPLATE: config.clerkJwtTemplate
		} : {},
		...config.clerkCliOAuthClientId ? {
			RUNE_CLERK_CLI_OAUTH_CLIENT_ID: config.clerkCliOAuthClientId,
			VITE_CLERK_CLI_OAUTH_CLIENT_ID: config.clerkCliOAuthClientId
		} : {},
		...config.relayUrl ? {
			RUNE_RELAY_URL: config.relayUrl,
			VITE_RUNE_RELAY_URL: config.relayUrl
		} : {},
		...config.mobileOtlpTracesUrl ? {
			RUNE_MOBILE_OTLP_TRACES_URL: config.mobileOtlpTracesUrl,
			EXPO_PUBLIC_OTLP_TRACES_URL: config.mobileOtlpTracesUrl
		} : {},
		...config.mobileOtlpTracesDataset ? {
			RUNE_MOBILE_OTLP_TRACES_DATASET: config.mobileOtlpTracesDataset,
			EXPO_PUBLIC_OTLP_TRACES_DATASET: config.mobileOtlpTracesDataset
		} : {},
		...config.mobileOtlpTracesToken ? {
			RUNE_MOBILE_OTLP_TRACES_TOKEN: config.mobileOtlpTracesToken,
			EXPO_PUBLIC_OTLP_TRACES_TOKEN: config.mobileOtlpTracesToken
		} : {},
		...config.relayClientOtlpTracesUrl ? {
			RUNE_RELAY_CLIENT_OTLP_TRACES_URL: config.relayClientOtlpTracesUrl,
			VITE_RELAY_OTLP_TRACES_URL: config.relayClientOtlpTracesUrl
		} : {},
		...config.relayClientOtlpTracesDataset ? {
			RUNE_RELAY_CLIENT_OTLP_TRACES_DATASET: config.relayClientOtlpTracesDataset,
			VITE_RELAY_OTLP_TRACES_DATASET: config.relayClientOtlpTracesDataset
		} : {},
		...config.relayClientOtlpTracesToken ? {
			RUNE_RELAY_CLIENT_OTLP_TRACES_TOKEN: config.relayClientOtlpTracesToken,
			VITE_RELAY_OTLP_TRACES_TOKEN: config.relayClientOtlpTracesToken
		} : {}
	};
}
function resolvePublicConfig(...sources) {
	return {
		clerkPublishableKey: firstNonEmpty(sources, "RUNE_CLERK_PUBLISHABLE_KEY", "VITE_CLERK_PUBLISHABLE_KEY", "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"),
		clerkJwtTemplate: firstNonEmpty(sources, "RUNE_CLERK_JWT_TEMPLATE", "VITE_CLERK_JWT_TEMPLATE", "EXPO_PUBLIC_CLERK_JWT_TEMPLATE"),
		clerkCliOAuthClientId: firstNonEmpty(sources, "RUNE_CLERK_CLI_OAUTH_CLIENT_ID", "VITE_CLERK_CLI_OAUTH_CLIENT_ID"),
		relayUrl: firstNonEmpty(sources, "RUNE_RELAY_URL", "VITE_RUNE_RELAY_URL"),
		mobileOtlpTracesUrl: firstNonEmpty(sources, "RUNE_MOBILE_OTLP_TRACES_URL", "EXPO_PUBLIC_OTLP_TRACES_URL"),
		mobileOtlpTracesDataset: firstNonEmpty(sources, "RUNE_MOBILE_OTLP_TRACES_DATASET", "EXPO_PUBLIC_OTLP_TRACES_DATASET"),
		mobileOtlpTracesToken: firstNonEmpty(sources, "RUNE_MOBILE_OTLP_TRACES_TOKEN", "EXPO_PUBLIC_OTLP_TRACES_TOKEN"),
		relayClientOtlpTracesUrl: firstNonEmpty(sources, "RUNE_RELAY_CLIENT_OTLP_TRACES_URL", "VITE_RELAY_OTLP_TRACES_URL"),
		relayClientOtlpTracesDataset: firstNonEmpty(sources, "RUNE_RELAY_CLIENT_OTLP_TRACES_DATASET", "VITE_RELAY_OTLP_TRACES_DATASET"),
		relayClientOtlpTracesToken: firstNonEmpty(sources, "RUNE_RELAY_CLIENT_OTLP_TRACES_TOKEN", "VITE_RELAY_OTLP_TRACES_TOKEN")
	};
}
function firstNonEmpty(sources, ...names) {
	for (const source of sources) for (const name of names) {
		const value = source[name]?.trim();
		if (value) return value;
	}
}
function readEnvFile(path) {
	return NodeFS.existsSync(path) ? NodeUtil.parseEnv(NodeFS.readFileSync(path, "utf8")) : {};
}
//#endregion
//#region apps/desktop/vite.config.ts
const repoEnv = loadRepoEnv();
const shouldLaunchElectronAfterPack = process.env.RUNE_DESKTOP_DEV === "1";
const publicConfigDefine = { __RUNE_BUILD_CLERK_PUBLISHABLE_KEY__: JSON.stringify(repoEnv.RUNE_CLERK_PUBLISHABLE_KEY?.trim() ?? "") };
var vite_config_default = defineConfig$1({
	run: { tasks: {
		build: {
			command: "node scripts/build-preview-annotation-css.mjs && vp pack",
			dependsOn: ["@rune/server#build"],
			cache: false
		},
		dev: {
			command: "node scripts/build-preview-annotation-css.mjs && cross-env RUNE_DESKTOP_DEV=1 vp pack --watch",
			dependsOn: ["@rune/server#build"],
			cache: false
		},
		"dev:bundle": {
			command: "node scripts/build-preview-annotation-css.mjs && vp pack --watch",
			cache: false
		},
		"dev:electron": {
			command: "node scripts/dev-electron.mjs",
			dependsOn: ["@rune/server#build"],
			cache: false
		}
	} },
	pack: [
		{
			format: "cjs",
			outDir: "dist-electron",
			sourcemap: true,
			outExtensions: () => ({ js: ".cjs" }),
			define: publicConfigDefine,
			entry: ["src/main.ts"],
			clean: true,
			deps: { alwaysBundle: (id) => id.startsWith("@rune/") },
			...shouldLaunchElectronAfterPack ? { onSuccess: "node scripts/dev-electron.mjs" } : {}
		},
		{
			format: "cjs",
			outDir: "dist-electron",
			sourcemap: true,
			outExtensions: () => ({ js: ".cjs" }),
			define: publicConfigDefine,
			entry: ["src/preload.ts"],
			deps: { alwaysBundle: (id) => id === "@clerk/electron" || id.startsWith("@clerk/electron/") }
		},
		{
			format: "cjs",
			outDir: "dist-electron",
			sourcemap: true,
			outExtensions: () => ({ js: ".cjs" }),
			entry: ["src/preview-pick-preload.ts"],
			deps: { alwaysBundle: (id) => id === "react-grab" || id.startsWith("react-grab/") }
		},
		{
			format: "cjs",
			outDir: "dist-electron",
			sourcemap: true,
			outExtensions: () => ({ js: ".cjs" }),
			entry: ["src/preview-pip-preload.ts"]
		},
		{
			format: "cjs",
			outDir: "dist-electron",
			sourcemap: true,
			outExtensions: () => ({ js: ".cjs" }),
			entry: ["src/window/startupSplash.preload.ts"]
		}
	]
});
//#endregion
export { vite_config_default as default };
