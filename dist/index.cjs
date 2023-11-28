"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  BugsnagBuildReporterPlugin: () => BugsnagBuildReporterPlugin,
  BugsnagSourceMapUploaderPlugin: () => BugsnagSourceMapUploaderPlugin
});
module.exports = __toCommonJS(src_exports);

// src/build-reporter-plugin.ts
var import_bugsnag_build_reporter = __toESM(require("bugsnag-build-reporter"), 1);
var import_picocolors2 = __toESM(require("picocolors"), 1);

// src/utils.ts
var import_debug = __toESM(require("debug"), 1);
var import_p_limit = __toESM(require("p-limit"), 1);
var import_picocolors = __toESM(require("picocolors"), 1);

// src/constants.ts
var parallelismLimit = 10;

// src/utils.ts
var debug = (0, import_debug.default)("vite-plugin-bugsnag");
function warn(message) {
  return debug(`${import_picocolors.default.yellow("[warning]")} ${message}`);
}
var limitParallelism = (0, import_p_limit.default)(parallelismLimit);

// src/build-reporter-plugin.ts
function BugsnagBuildReporterPlugin(config) {
  let { sendReport, logLevel = "warn", logger, path, endpoint, ..._build } = config;
  const build = { buildTool: "vite-plugin-bugsnag", ..._build };
  const options = { logLevel, logger, path, endpoint };
  return {
    name: "bugsnag-build-reporter",
    apply: "build",
    configResolved(config2) {
      if (sendReport === void 0)
        sendReport = config2.mode === "production";
    },
    buildEnd(error) {
      if (error)
        sendReport = false;
    },
    async writeBundle() {
      try {
        if (sendReport)
          await (0, import_bugsnag_build_reporter.default)(build, options);
      } catch (error) {
        warn(`unable to report build
${import_picocolors2.default.red(error.message)}`);
      }
    }
  };
}

// src/source-map-uploader-plugin.ts
var import_path = require("path");
var import_fs = require("fs");
var import_fast_glob = __toESM(require("fast-glob"), 1);
var import_source_maps = require("@bugsnag/source-maps");
var import_picocolors3 = __toESM(require("picocolors"), 1);
function BugsnagSourceMapUploaderPlugin(config) {
  let { base, ignoredBundleExtensions = [".css"], ...options } = config;
  const uploadedMaps = /* @__PURE__ */ new Set();
  if (typeof options.apiKey !== "string" || options.apiKey.length < 1) {
    throw new Error(
      `[BugsnagSourceMapUploader] "apiKey" is required.
Provided:
${JSON.stringify(
        options
      )}`
    );
  }
  function uploadSourcemap({ url, source, map }) {
    debug(`uploading sourcemap for "${import_picocolors3.default.blue(url)}"`);
    console.log(`[BugsnagSourceMapUploader] uploading sourcemap for "${url}"`);
    console.log({ url, source, map });
    return import_source_maps.browser.uploadOne({
      bundleUrl: url,
      bundle: source,
      sourceMap: map,
      ...options
    });
  }
  return {
    name: "bugsnag-source-map-uploader",
    apply: "build",
    config({ build }, { mode }) {
      return {
        build: {
          sourcemap: (build == null ? void 0 : build.sourcemap) !== void 0 ? build.sourcemap : mode !== "development"
        }
      };
    },
    configResolved(config2) {
      if (base === void 0)
        base = config2.base;
      base = base.replace(/[^/]$/, "$&/");
    },
    async writeBundle(outputConfig, bundle) {
      const outputDir = outputConfig.dir || "";
      function sourcemapFromFile(mapPath) {
        const sourcePath = mapPath.replace(/\.map$/, "");
        const sourceFilename = (0, import_path.resolve)(outputDir, sourcePath);
        if (ignoredBundleExtensions.includes((0, import_path.extname)(sourcePath)))
          return [];
        if (!(0, import_fs.existsSync)(sourceFilename)) {
          warn(`no corresponding source found for "${mapPath}"`);
          return [];
        }
        return [
          {
            map: (0, import_path.resolve)(outputDir, mapPath),
            source: sourceFilename,
            url: `${base}${sourcePath}`
          }
        ];
      }
      const files = await (0, import_fast_glob.default)("./**/*.map", { cwd: outputDir });
      console.log(JSON.stringify(files, null, 2));
      const sourcemaps = files.flatMap(sourcemapFromFile);
      const newSourcemaps = sourcemaps.filter(
        ({ map }) => !uploadedMaps.has(map)
      );
      newSourcemaps.forEach(({ map }) => uploadedMaps.add(map));
      await Promise.all(
        newSourcemaps.map(
          (sourcemap) => limitParallelism(() => uploadSourcemap(sourcemap))
        )
      );
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BugsnagBuildReporterPlugin,
  BugsnagSourceMapUploaderPlugin
});
