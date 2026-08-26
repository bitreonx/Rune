import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "node:readline";
//#region node_modules/.pnpm/@voidzero-dev+vite-plus-cor_9ee31ae90aa32dad556c960eb1521494/node_modules/@voidzero-dev/vite-plus-core/dist/vite/node/chunks/logger.js
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
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
var require_picocolors = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	let p = process || {}, argv = p.argv || [], env = p.env || {};
	let isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env.TERM !== "dumb" || !!env.CI);
	let formatter = (open, close, replace = open) => (input) => {
		let string = "" + input, index = string.indexOf(close, open.length);
		return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
	};
	let replaceClose = (string, close, replace, index) => {
		let result = "", cursor = 0;
		do {
			result += string.substring(cursor, index) + replace;
			cursor = index + close.length;
			index = string.indexOf(close, cursor);
		} while (~index);
		return result + string.substring(cursor);
	};
	let createColors = (enabled = isColorSupported) => {
		let f = enabled ? formatter : () => String;
		return {
			isColorSupported: enabled,
			reset: f("\x1B[0m", "\x1B[0m"),
			bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
			dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
			italic: f("\x1B[3m", "\x1B[23m"),
			underline: f("\x1B[4m", "\x1B[24m"),
			inverse: f("\x1B[7m", "\x1B[27m"),
			hidden: f("\x1B[8m", "\x1B[28m"),
			strikethrough: f("\x1B[9m", "\x1B[29m"),
			black: f("\x1B[30m", "\x1B[39m"),
			red: f("\x1B[31m", "\x1B[39m"),
			green: f("\x1B[32m", "\x1B[39m"),
			yellow: f("\x1B[33m", "\x1B[39m"),
			blue: f("\x1B[34m", "\x1B[39m"),
			magenta: f("\x1B[35m", "\x1B[39m"),
			cyan: f("\x1B[36m", "\x1B[39m"),
			white: f("\x1B[37m", "\x1B[39m"),
			gray: f("\x1B[90m", "\x1B[39m"),
			bgBlack: f("\x1B[40m", "\x1B[49m"),
			bgRed: f("\x1B[41m", "\x1B[49m"),
			bgGreen: f("\x1B[42m", "\x1B[49m"),
			bgYellow: f("\x1B[43m", "\x1B[49m"),
			bgBlue: f("\x1B[44m", "\x1B[49m"),
			bgMagenta: f("\x1B[45m", "\x1B[49m"),
			bgCyan: f("\x1B[46m", "\x1B[49m"),
			bgWhite: f("\x1B[47m", "\x1B[49m"),
			blackBright: f("\x1B[90m", "\x1B[39m"),
			redBright: f("\x1B[91m", "\x1B[39m"),
			greenBright: f("\x1B[92m", "\x1B[39m"),
			yellowBright: f("\x1B[93m", "\x1B[39m"),
			blueBright: f("\x1B[94m", "\x1B[39m"),
			magentaBright: f("\x1B[95m", "\x1B[39m"),
			cyanBright: f("\x1B[96m", "\x1B[39m"),
			whiteBright: f("\x1B[97m", "\x1B[39m"),
			bgBlackBright: f("\x1B[100m", "\x1B[49m"),
			bgRedBright: f("\x1B[101m", "\x1B[49m"),
			bgGreenBright: f("\x1B[102m", "\x1B[49m"),
			bgYellowBright: f("\x1B[103m", "\x1B[49m"),
			bgBlueBright: f("\x1B[104m", "\x1B[49m"),
			bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
			bgCyanBright: f("\x1B[106m", "\x1B[49m"),
			bgWhiteBright: f("\x1B[107m", "\x1B[49m")
		};
	};
	module.exports = createColors();
	module.exports.createColors = createColors;
}));
process.env.VP_VERSION;
const DEFAULT_MAIN_FIELDS = [
	"browser",
	"module",
	"jsnext:main",
	"jsnext"
];
Object.freeze(DEFAULT_MAIN_FIELDS);
Object.freeze(DEFAULT_MAIN_FIELDS.filter((f) => f !== "browser"));
const DEFAULT_CONDITIONS = [
	"module",
	"browser",
	"node",
	`development|production`
];
Object.freeze(DEFAULT_CONDITIONS.filter((c) => c !== "node"));
Object.freeze(DEFAULT_CONDITIONS.filter((c) => c !== "browser"));
const DEFAULT_EXTERNAL_CONDITIONS = Object.freeze(["node", "module-sync"]);
const DEFAULT_EXTENSIONS = [
	".mjs",
	".js",
	".mts",
	".ts",
	".jsx",
	".tsx",
	".json"
];
const CSS_LANGS_RE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/;
/**
* Prefix for resolved fs paths, since windows paths may not be valid as URLs.
*/
const FS_PREFIX = `/@fs/`;
const CLIENT_PUBLIC_PATH = `/@vite/client`;
const ENV_PUBLIC_PATH = `/@vite/env`;
const VITE_PACKAGE_DIR = path.join(fileURLToPath(
	/** #__KEEP__ */
	import.meta.url
), "..", "..", "..", "..", "..");
const CLIENT_ENTRY = path.join(VITE_PACKAGE_DIR, "dist/vite/client/client.mjs");
const ENV_ENTRY = path.join(VITE_PACKAGE_DIR, "dist/vite/client/env.mjs");
const CLIENT_DIR = path.dirname(CLIENT_ENTRY);
const KNOWN_ASSET_TYPES = [
	"apng",
	"bmp",
	"png",
	"jpe?g",
	"jfif",
	"pjpeg",
	"pjp",
	"gif",
	"svg",
	"ico",
	"webp",
	"avif",
	"cur",
	"jxl",
	"mp4",
	"webm",
	"ogg",
	"mp3",
	"wav",
	"flac",
	"aac",
	"opus",
	"mov",
	"m4a",
	"vtt",
	"woff2?",
	"eot",
	"ttf",
	"otf",
	"webmanifest",
	"pdf",
	"txt"
];
new RegExp(`\\.(` + KNOWN_ASSET_TYPES.join("|") + `)(\\?.*)?$`, "i");
const DEFAULT_DEV_PORT = 5173;
const DEFAULT_PREVIEW_PORT = 4173;
const DEFAULT_ASSETS_INLINE_LIMIT = 4096;
const defaultAllowedOrigins = /^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
require_picocolors();
//#endregion
export { defaultAllowedOrigins as _, DEFAULT_ASSETS_INLINE_LIMIT as a, DEFAULT_EXTERNAL_CONDITIONS as c, ENV_PUBLIC_PATH as d, FS_PREFIX as f, __toESM as g, __require as h, CSS_LANGS_RE as i, DEFAULT_PREVIEW_PORT as l, __commonJSMin as m, CLIENT_ENTRY as n, DEFAULT_DEV_PORT as o, KNOWN_ASSET_TYPES as p, CLIENT_PUBLIC_PATH as r, DEFAULT_EXTENSIONS as s, CLIENT_DIR as t, ENV_ENTRY as u, require_picocolors as v };
