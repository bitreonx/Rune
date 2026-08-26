import { n as __require, r as __toESM, t as __commonJSMin } from "./rolldown-runtime-C7HZzL1F.mjs";
//#region node_modules/.pnpm/detect-libc@2.1.2/node_modules/detect-libc/lib/process.js
var require_process = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const isLinux = () => process.platform === "linux";
	let report = null;
	const getReport = () => {
		if (!report)
 /* istanbul ignore next */
		if (isLinux() && process.report) {
			const orig = process.report.excludeNetwork;
			process.report.excludeNetwork = true;
			report = process.report.getReport();
			process.report.excludeNetwork = orig;
		} else report = {};
		return report;
	};
	module.exports = {
		isLinux,
		getReport
	};
}));
//#endregion
//#region node_modules/.pnpm/detect-libc@2.1.2/node_modules/detect-libc/lib/filesystem.js
var require_filesystem = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const fs = __require("fs");
	const LDD_PATH = "/usr/bin/ldd";
	const SELF_PATH = "/proc/self/exe";
	const MAX_LENGTH = 2048;
	/**
	* Read the content of a file synchronous
	*
	* @param {string} path
	* @returns {Buffer}
	*/
	const readFileSync = (path) => {
		const fd = fs.openSync(path, "r");
		const buffer = Buffer.alloc(MAX_LENGTH);
		const bytesRead = fs.readSync(fd, buffer, 0, MAX_LENGTH, 0);
		fs.close(fd, () => {});
		return buffer.subarray(0, bytesRead);
	};
	/**
	* Read the content of a file
	*
	* @param {string} path
	* @returns {Promise<Buffer>}
	*/
	const readFile = (path) => new Promise((resolve, reject) => {
		fs.open(path, "r", (err, fd) => {
			if (err) reject(err);
			else {
				const buffer = Buffer.alloc(MAX_LENGTH);
				fs.read(fd, buffer, 0, MAX_LENGTH, 0, (_, bytesRead) => {
					resolve(buffer.subarray(0, bytesRead));
					fs.close(fd, () => {});
				});
			}
		});
	});
	module.exports = {
		LDD_PATH,
		SELF_PATH,
		readFileSync,
		readFile
	};
}));
//#endregion
//#region node_modules/.pnpm/detect-libc@2.1.2/node_modules/detect-libc/lib/elf.js
var require_elf = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const interpreterPath = (elf) => {
		if (elf.length < 64) return null;
		if (elf.readUInt32BE(0) !== 2135247942) return null;
		if (elf.readUInt8(4) !== 2) return null;
		if (elf.readUInt8(5) !== 1) return null;
		const offset = elf.readUInt32LE(32);
		const size = elf.readUInt16LE(54);
		const count = elf.readUInt16LE(56);
		for (let i = 0; i < count; i++) {
			const headerOffset = offset + i * size;
			if (elf.readUInt32LE(headerOffset) === 3) {
				const fileOffset = elf.readUInt32LE(headerOffset + 8);
				const fileSize = elf.readUInt32LE(headerOffset + 32);
				return elf.subarray(fileOffset, fileOffset + fileSize).toString().replace(/\0.*$/g, "");
			}
		}
		return null;
	};
	module.exports = { interpreterPath };
}));
//#endregion
//#region node_modules/.pnpm/detect-libc@2.1.2/node_modules/detect-libc/lib/detect-libc.js
var require_detect_libc = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const childProcess = __require("child_process");
	const { isLinux, getReport } = require_process();
	const { LDD_PATH, SELF_PATH, readFile, readFileSync } = require_filesystem();
	const { interpreterPath } = require_elf();
	let cachedFamilyInterpreter;
	let cachedFamilyFilesystem;
	let cachedVersionFilesystem;
	const command = "getconf GNU_LIBC_VERSION 2>&1 || true; ldd --version 2>&1 || true";
	let commandOut = "";
	const safeCommand = () => {
		if (!commandOut) return new Promise((resolve) => {
			childProcess.exec(command, (err, out) => {
				commandOut = err ? " " : out;
				resolve(commandOut);
			});
		});
		return commandOut;
	};
	const safeCommandSync = () => {
		if (!commandOut) try {
			commandOut = childProcess.execSync(command, { encoding: "utf8" });
		} catch (_err) {
			commandOut = " ";
		}
		return commandOut;
	};
	/**
	* A String constant containing the value `glibc`.
	* @type {string}
	* @public
	*/
	const GLIBC = "glibc";
	/**
	* A Regexp constant to get the GLIBC Version.
	* @type {string}
	*/
	const RE_GLIBC_VERSION = /LIBC[a-z0-9 \-).]*?(\d+\.\d+)/i;
	/**
	* A String constant containing the value `musl`.
	* @type {string}
	* @public
	*/
	const MUSL = "musl";
	const isFileMusl = (f) => f.includes("libc.musl-") || f.includes("ld-musl-");
	const familyFromReport = () => {
		const report = getReport();
		if (report.header && report.header.glibcVersionRuntime) return GLIBC;
		if (Array.isArray(report.sharedObjects)) {
			if (report.sharedObjects.some(isFileMusl)) return MUSL;
		}
		return null;
	};
	const familyFromCommand = (out) => {
		const [getconf, ldd1] = out.split(/[\r\n]+/);
		if (getconf && getconf.includes(GLIBC)) return GLIBC;
		if (ldd1 && ldd1.includes(MUSL)) return MUSL;
		return null;
	};
	const familyFromInterpreterPath = (path) => {
		if (path) {
			if (path.includes("/ld-musl-")) return MUSL;
			else if (path.includes("/ld-linux-")) return GLIBC;
		}
		return null;
	};
	const getFamilyFromLddContent = (content) => {
		content = content.toString();
		if (content.includes("musl")) return MUSL;
		if (content.includes("GNU C Library")) return GLIBC;
		return null;
	};
	const familyFromFilesystem = async () => {
		if (cachedFamilyFilesystem !== void 0) return cachedFamilyFilesystem;
		cachedFamilyFilesystem = null;
		try {
			const lddContent = await readFile(LDD_PATH);
			cachedFamilyFilesystem = getFamilyFromLddContent(lddContent);
		} catch (e) {}
		return cachedFamilyFilesystem;
	};
	const familyFromFilesystemSync = () => {
		if (cachedFamilyFilesystem !== void 0) return cachedFamilyFilesystem;
		cachedFamilyFilesystem = null;
		try {
			const lddContent = readFileSync(LDD_PATH);
			cachedFamilyFilesystem = getFamilyFromLddContent(lddContent);
		} catch (e) {}
		return cachedFamilyFilesystem;
	};
	const familyFromInterpreter = async () => {
		if (cachedFamilyInterpreter !== void 0) return cachedFamilyInterpreter;
		cachedFamilyInterpreter = null;
		try {
			const selfContent = await readFile(SELF_PATH);
			const path = interpreterPath(selfContent);
			cachedFamilyInterpreter = familyFromInterpreterPath(path);
		} catch (e) {}
		return cachedFamilyInterpreter;
	};
	const familyFromInterpreterSync = () => {
		if (cachedFamilyInterpreter !== void 0) return cachedFamilyInterpreter;
		cachedFamilyInterpreter = null;
		try {
			const selfContent = readFileSync(SELF_PATH);
			const path = interpreterPath(selfContent);
			cachedFamilyInterpreter = familyFromInterpreterPath(path);
		} catch (e) {}
		return cachedFamilyInterpreter;
	};
	/**
	* Resolves with the libc family when it can be determined, `null` otherwise.
	* @returns {Promise<?string>}
	*/
	const family = async () => {
		let family = null;
		if (isLinux()) {
			family = await familyFromInterpreter();
			if (!family) {
				family = await familyFromFilesystem();
				if (!family) family = familyFromReport();
				if (!family) {
					const out = await safeCommand();
					family = familyFromCommand(out);
				}
			}
		}
		return family;
	};
	/**
	* Returns the libc family when it can be determined, `null` otherwise.
	* @returns {?string}
	*/
	const familySync = () => {
		let family = null;
		if (isLinux()) {
			family = familyFromInterpreterSync();
			if (!family) {
				family = familyFromFilesystemSync();
				if (!family) family = familyFromReport();
				if (!family) {
					const out = safeCommandSync();
					family = familyFromCommand(out);
				}
			}
		}
		return family;
	};
	/**
	* Resolves `true` only when the platform is Linux and the libc family is not `glibc`.
	* @returns {Promise<boolean>}
	*/
	const isNonGlibcLinux = async () => isLinux() && await family() !== GLIBC;
	/**
	* Returns `true` only when the platform is Linux and the libc family is not `glibc`.
	* @returns {boolean}
	*/
	const isNonGlibcLinuxSync = () => isLinux() && familySync() !== GLIBC;
	const versionFromFilesystem = async () => {
		if (cachedVersionFilesystem !== void 0) return cachedVersionFilesystem;
		cachedVersionFilesystem = null;
		try {
			const versionMatch = (await readFile(LDD_PATH)).match(RE_GLIBC_VERSION);
			if (versionMatch) cachedVersionFilesystem = versionMatch[1];
		} catch (e) {}
		return cachedVersionFilesystem;
	};
	const versionFromFilesystemSync = () => {
		if (cachedVersionFilesystem !== void 0) return cachedVersionFilesystem;
		cachedVersionFilesystem = null;
		try {
			const versionMatch = readFileSync(LDD_PATH).match(RE_GLIBC_VERSION);
			if (versionMatch) cachedVersionFilesystem = versionMatch[1];
		} catch (e) {}
		return cachedVersionFilesystem;
	};
	const versionFromReport = () => {
		const report = getReport();
		if (report.header && report.header.glibcVersionRuntime) return report.header.glibcVersionRuntime;
		return null;
	};
	const versionSuffix = (s) => s.trim().split(/\s+/)[1];
	const versionFromCommand = (out) => {
		const [getconf, ldd1, ldd2] = out.split(/[\r\n]+/);
		if (getconf && getconf.includes(GLIBC)) return versionSuffix(getconf);
		if (ldd1 && ldd2 && ldd1.includes(MUSL)) return versionSuffix(ldd2);
		return null;
	};
	/**
	* Resolves with the libc version when it can be determined, `null` otherwise.
	* @returns {Promise<?string>}
	*/
	const version = async () => {
		let version = null;
		if (isLinux()) {
			version = await versionFromFilesystem();
			if (!version) version = versionFromReport();
			if (!version) {
				const out = await safeCommand();
				version = versionFromCommand(out);
			}
		}
		return version;
	};
	/**
	* Returns the libc version when it can be determined, `null` otherwise.
	* @returns {?string}
	*/
	const versionSync = () => {
		let version = null;
		if (isLinux()) {
			version = versionFromFilesystemSync();
			if (!version) version = versionFromReport();
			if (!version) {
				const out = safeCommandSync();
				version = versionFromCommand(out);
			}
		}
		return version;
	};
	module.exports = {
		GLIBC,
		MUSL,
		family,
		familySync,
		isNonGlibcLinux,
		isNonGlibcLinuxSync,
		version,
		versionSync
	};
}));
//#endregion
//#region node_modules/.pnpm/lightningcss@1.32.0/node_modules/lightningcss/node/browserslistToTargets.js
var require_browserslistToTargets = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const BROWSER_MAPPING = {
		and_chr: "chrome",
		and_ff: "firefox",
		ie_mob: "ie",
		op_mob: "opera",
		and_qq: null,
		and_uc: null,
		baidu: null,
		bb: null,
		kaios: null,
		op_mini: null
	};
	function browserslistToTargets(browserslist) {
		let targets = {};
		for (let browser of browserslist) {
			let [name, v] = browser.split(" ");
			if (BROWSER_MAPPING[name] === null) continue;
			let version = parseVersion(v);
			if (version == null) continue;
			if (targets[name] == null || version < targets[name]) targets[name] = version;
		}
		return targets;
	}
	function parseVersion(version) {
		let [major, minor = 0, patch = 0] = version.split("-")[0].split(".").map((v) => parseInt(v, 10));
		if (isNaN(major) || isNaN(minor) || isNaN(patch)) return null;
		return major << 16 | minor << 8 | patch;
	}
	module.exports = browserslistToTargets;
}));
//#endregion
//#region node_modules/.pnpm/lightningcss@1.32.0/node_modules/lightningcss/node/composeVisitors.js
var require_composeVisitors = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/** @typedef {import('./index').Visitor} Visitor */
	/** @typedef {import('./index').VisitorFunction} VisitorFunction */
	/**
	* Composes multiple visitor objects into a single one.
	* @param {(Visitor | VisitorFunction)[]} visitors 
	* @return {Visitor | VisitorFunction}
	*/
	function composeVisitors(visitors) {
		if (visitors.length === 1) return visitors[0];
		if (visitors.some((v) => typeof v === "function")) return (opts) => {
			return composeVisitors(visitors.map((v) => typeof v === "function" ? v(opts) : v));
		};
		/** @type Visitor */
		let res = {};
		composeSimpleVisitors(res, visitors, "StyleSheet");
		composeSimpleVisitors(res, visitors, "StyleSheetExit");
		composeObjectVisitors(res, visitors, "Rule", ruleVisitor, wrapCustomAndUnknownAtRule);
		composeObjectVisitors(res, visitors, "RuleExit", ruleVisitor, wrapCustomAndUnknownAtRule);
		composeObjectVisitors(res, visitors, "Declaration", declarationVisitor, wrapCustomProperty);
		composeObjectVisitors(res, visitors, "DeclarationExit", declarationVisitor, wrapCustomProperty);
		composeSimpleVisitors(res, visitors, "Url");
		composeSimpleVisitors(res, visitors, "Color");
		composeSimpleVisitors(res, visitors, "Image");
		composeSimpleVisitors(res, visitors, "ImageExit");
		composeSimpleVisitors(res, visitors, "Length");
		composeSimpleVisitors(res, visitors, "Angle");
		composeSimpleVisitors(res, visitors, "Ratio");
		composeSimpleVisitors(res, visitors, "Resolution");
		composeSimpleVisitors(res, visitors, "Time");
		composeSimpleVisitors(res, visitors, "CustomIdent");
		composeSimpleVisitors(res, visitors, "DashedIdent");
		composeArrayFunctions(res, visitors, "MediaQuery");
		composeArrayFunctions(res, visitors, "MediaQueryExit");
		composeSimpleVisitors(res, visitors, "SupportsCondition");
		composeSimpleVisitors(res, visitors, "SupportsConditionExit");
		composeArrayFunctions(res, visitors, "Selector");
		composeTokenVisitors(res, visitors, "Token", "token", false);
		composeTokenVisitors(res, visitors, "Function", "function", false);
		composeTokenVisitors(res, visitors, "FunctionExit", "function", true);
		composeTokenVisitors(res, visitors, "Variable", "var", false);
		composeTokenVisitors(res, visitors, "VariableExit", "var", true);
		composeTokenVisitors(res, visitors, "EnvironmentVariable", "env", false);
		composeTokenVisitors(res, visitors, "EnvironmentVariableExit", "env", true);
		return res;
	}
	module.exports = composeVisitors;
	function wrapCustomAndUnknownAtRule(k, f) {
		if (k === "unknown") return ((value) => f({
			type: "unknown",
			value
		}));
		if (k === "custom") return ((value) => f({
			type: "custom",
			value
		}));
		return f;
	}
	function wrapCustomProperty(k, f) {
		return k === "custom" ? ((value) => f({
			property: "custom",
			value
		})) : f;
	}
	/**
	* @param {import('./index').Visitor['Rule']} f 
	* @param {import('./ast').Rule} item 
	*/
	function ruleVisitor(f, item) {
		if (typeof f === "object") {
			if (item.type === "unknown") {
				let v = f.unknown;
				if (typeof v === "object") v = v[item.value.name];
				return v?.(item.value);
			}
			if (item.type === "custom") {
				let v = f.custom;
				if (typeof v === "object") v = v[item.value.name];
				return v?.(item.value);
			}
			return f[item.type]?.(item);
		}
		return f?.(item);
	}
	/**
	* @param {import('./index').Visitor['Declaration']} f 
	* @param {import('./ast').Declaration} item 
	*/
	function declarationVisitor(f, item) {
		if (typeof f === "object") {
			/** @type {string} */
			let name = item.property;
			if (item.property === "unparsed") name = item.value.propertyId.property;
			else if (item.property === "custom") {
				let v = f.custom;
				if (typeof v === "object") v = v[item.value.name];
				return v?.(item.value);
			}
			return f[name]?.(item);
		}
		return f?.(item);
	}
	/**
	* 
	* @param {Visitor[]} visitors 
	* @param {string} key 
	* @returns {[any[], boolean, Set<string>]}
	*/
	function extractObjectsOrFunctions(visitors, key) {
		let values = [];
		let hasFunction = false;
		let allKeys = /* @__PURE__ */ new Set();
		for (let visitor of visitors) {
			let v = visitor[key];
			if (v) {
				if (typeof v === "function") hasFunction = true;
				else for (let key in v) allKeys.add(key);
				values.push(v);
			}
		}
		return [
			values,
			hasFunction,
			allKeys
		];
	}
	/**
	* @template {keyof Visitor} K
	* @param {Visitor} res
	* @param {Visitor[]} visitors
	* @param {K} key
	* @param {(visitor: Visitor[K], item: any) => any | any[] | void} apply 
	* @param {(k: string, f: any) => any} wrapKey 
	*/
	function composeObjectVisitors(res, visitors, key, apply, wrapKey) {
		let [values, hasFunction, allKeys] = extractObjectsOrFunctions(visitors, key);
		if (values.length === 0) return;
		if (values.length === 1) {
			res[key] = values[0];
			return;
		}
		let f = createArrayVisitor(visitors, (visitor, item) => apply(visitor[key], item));
		if (hasFunction) res[key] = f;
		else {
			/** @type {any} */
			let v = {};
			for (let k of allKeys) v[k] = wrapKey(k, f);
			res[key] = v;
		}
	}
	/**
	* @param {Visitor} res 
	* @param {Visitor[]} visitors 
	* @param {string} key 
	* @param {import('./ast').TokenOrValue['type']} type 
	* @param {boolean} isExit 
	*/
	function composeTokenVisitors(res, visitors, key, type, isExit) {
		let [values, hasFunction, allKeys] = extractObjectsOrFunctions(visitors, key);
		if (values.length === 0) return;
		if (values.length === 1) {
			res[key] = values[0];
			return;
		}
		let f = createTokenVisitor(visitors, type, isExit);
		if (hasFunction) res[key] = f;
		else {
			let v = {};
			for (let key of allKeys) v[key] = f;
			res[key] = v;
		}
	}
	/**
	* @param {Visitor[]} visitors 
	* @param {import('./ast').TokenOrValue['type']} type 
	*/
	function createTokenVisitor(visitors, type, isExit) {
		let v = createArrayVisitor(visitors, (visitor, item) => {
			let f;
			switch (item.type) {
				case "token":
					f = visitor.Token;
					if (typeof f === "object") f = f[item.value.type];
					break;
				case "function":
					f = isExit ? visitor.FunctionExit : visitor.Function;
					if (typeof f === "object") f = f[item.value.name];
					break;
				case "var":
					f = isExit ? visitor.VariableExit : visitor.Variable;
					break;
				case "env":
					f = isExit ? visitor.EnvironmentVariableExit : visitor.EnvironmentVariable;
					if (typeof f === "object") {
						let name;
						switch (item.value.name.type) {
							case "ua":
							case "unknown":
								name = item.value.name.value;
								break;
							case "custom":
								name = item.value.name.ident;
								break;
						}
						f = f[name];
					}
					break;
				case "color":
					f = visitor.Color;
					break;
				case "url":
					f = visitor.Url;
					break;
				case "length":
					f = visitor.Length;
					break;
				case "angle":
					f = visitor.Angle;
					break;
				case "time":
					f = visitor.Time;
					break;
				case "resolution":
					f = visitor.Resolution;
					break;
				case "dashed-ident":
					f = visitor.DashedIdent;
					break;
			}
			if (!f) return;
			let res = f(item.value);
			switch (item.type) {
				case "color":
				case "url":
				case "length":
				case "angle":
				case "time":
				case "resolution":
				case "dashed-ident":
					if (Array.isArray(res)) res = res.map((value) => ({
						type: item.type,
						value
					}));
					else if (res) res = {
						type: item.type,
						value: res
					};
					break;
			}
			return res;
		});
		return (value) => v({
			type,
			value
		});
	}
	/**
	* @param {Visitor[]} visitors 
	* @param {string} key 
	*/
	function extractFunctions(visitors, key) {
		let functions = [];
		for (let visitor of visitors) {
			let f = visitor[key];
			if (f) functions.push(f);
		}
		return functions;
	}
	/**
	* @param {Visitor} res 
	* @param {Visitor[]} visitors 
	* @param {string} key 
	*/
	function composeSimpleVisitors(res, visitors, key) {
		let functions = extractFunctions(visitors, key);
		if (functions.length === 0) return;
		if (functions.length === 1) {
			res[key] = functions[0];
			return;
		}
		res[key] = (arg) => {
			let mutated = false;
			for (let f of functions) {
				let res = f(arg);
				if (res) {
					arg = res;
					mutated = true;
				}
			}
			return mutated ? arg : void 0;
		};
	}
	/**
	* @param {Visitor} res 
	* @param {Visitor[]} visitors 
	* @param {string} key 
	*/
	function composeArrayFunctions(res, visitors, key) {
		let functions = extractFunctions(visitors, key);
		if (functions.length === 0) return;
		if (functions.length === 1) {
			res[key] = functions[0];
			return;
		}
		res[key] = createArrayVisitor(functions, (f, item) => f(item));
	}
	/**
	* @template T
	* @template V
	* @param {T[]} visitors 
	* @param {(visitor: T, item: V) => V | V[] | void} apply 
	* @returns {(item: V) => V | V[] | void}
	*/
	function createArrayVisitor(visitors, apply) {
		let seen = new Bitset(visitors.length);
		return (arg) => {
			let arr = [arg];
			let mutated = false;
			seen.clear();
			for (let i = 0; i < arr.length; i++) for (let v = 0; v < visitors.length && i < arr.length;) {
				if (seen.get(v)) {
					v++;
					continue;
				}
				let item = arr[i];
				let visitor = visitors[v];
				let res = apply(visitor, item);
				if (Array.isArray(res)) {
					if (res.length === 0) arr.splice(i, 1);
					else if (res.length === 1) arr[i] = res[0];
					else arr.splice(i, 1, ...res);
					mutated = true;
					seen.set(v);
					v = 0;
				} else if (res) {
					arr[i] = res;
					mutated = true;
					seen.set(v);
					v = 0;
				} else v++;
			}
			if (!mutated) return;
			return arr.length === 1 ? arr[0] : arr;
		};
	}
	var Bitset = class {
		constructor(maxBits = 32) {
			this.bits = 0;
			this.more = maxBits > 32 ? new Uint32Array(Math.ceil((maxBits - 32) / 32)) : null;
		}
		/** @param {number} bit */
		get(bit) {
			if (bit >= 32 && this.more) {
				let i = Math.floor((bit - 32) / 32);
				let b = bit % 32;
				return Boolean(this.more[i] & 1 << b);
			} else return Boolean(this.bits & 1 << bit);
		}
		/** @param {number} bit */
		set(bit) {
			if (bit >= 32 && this.more) {
				let i = Math.floor((bit - 32) / 32);
				let b = bit % 32;
				this.more[i] |= 1 << b;
			} else this.bits |= 1 << bit;
		}
		clear() {
			this.bits = 0;
			if (this.more) this.more.fill(0);
		}
	};
}));
//#endregion
//#region node_modules/.pnpm/lightningcss@1.32.0/node_modules/lightningcss/node/flags.js
var require_flags = /* @__PURE__ */ __commonJSMin(((exports) => {
	exports.Features = {
		Nesting: 1,
		NotSelectorList: 2,
		DirSelector: 4,
		LangSelectorList: 8,
		IsSelector: 16,
		TextDecorationThicknessPercent: 32,
		MediaIntervalSyntax: 64,
		MediaRangeSyntax: 128,
		CustomMediaQueries: 256,
		ClampFunction: 512,
		ColorFunction: 1024,
		OklabColors: 2048,
		LabColors: 4096,
		P3Colors: 8192,
		HexAlphaColors: 16384,
		SpaceSeparatedColorNotation: 32768,
		FontFamilySystemUi: 65536,
		DoublePositionGradients: 131072,
		VendorPrefixes: 262144,
		LogicalProperties: 524288,
		LightDark: 1048576,
		Selectors: 31,
		MediaQueries: 448,
		Colors: 1113088
	};
}));
const { transform, transformStyleAttribute, bundle, bundleAsync, browserslistToTargets, composeVisitors, Features } = (/* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	let parts = [process.platform, process.arch];
	if (process.platform === "linux") {
		const { MUSL, familySync } = require_detect_libc();
		if (familySync() === MUSL) parts.push("musl");
		else if (process.arch === "arm") parts.push("gnueabihf");
		else parts.push("gnu");
	} else if (process.platform === "win32") parts.push("msvc");
	let native;
	try {
		native = __require(`lightningcss-${parts.join("-")}`);
	} catch (err) {
		native = __require(`../lightningcss.${parts.join("-")}.node`);
	}
	module.exports.transform = wrap(native.transform);
	module.exports.transformStyleAttribute = wrap(native.transformStyleAttribute);
	module.exports.bundle = wrap(native.bundle);
	module.exports.bundleAsync = wrap(native.bundleAsync);
	module.exports.browserslistToTargets = require_browserslistToTargets();
	module.exports.composeVisitors = require_composeVisitors();
	module.exports.Features = require_flags().Features;
	function wrap(call) {
		return (options) => {
			if (typeof options.visitor === "function") {
				let deps = [];
				options.visitor = options.visitor({ addDependency(dep) {
					deps.push(dep);
				} });
				let result = call(options);
				if (result instanceof Promise) result = result.then((res) => {
					if (deps.length) {
						res.dependencies ??= [];
						res.dependencies.push(...deps);
					}
					return res;
				});
				else if (deps.length) {
					result.dependencies ??= [];
					result.dependencies.push(...deps);
				}
				return result;
			} else return call(options);
		};
	}
})))(), 1)).default;
//#endregion
export { Features, browserslistToTargets, bundle, bundleAsync, composeVisitors, transform, transformStyleAttribute };
