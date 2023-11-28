// src/build-reporter-plugin.ts
import reportBuild from "bugsnag-build-reporter";
import colors2 from "picocolors";

// src/utils.ts
import createDebugger from "debug";
import pLimit from "p-limit";
import colors from "picocolors";

// src/constants.ts
var parallelismLimit = 10;

// src/utils.ts
var debug = createDebugger("vite-plugin-bugsnag");
function warn(message) {
  return debug(`${colors.yellow("[warning]")} ${message}`);
}
var limitParallelism = pLimit(parallelismLimit);

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
          await reportBuild(build, options);
      } catch (error) {
        warn(`unable to report build
${colors2.red(error.message)}`);
      }
    }
  };
}

// src/source-map-uploader-plugin.ts
import { extname, resolve } from "path";
import { existsSync } from "fs";
import glob from "fast-glob";
import { browser } from "@bugsnag/source-maps";
import colors3 from "picocolors";
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
    debug(`uploading sourcemap for "${colors3.blue(url)}"`);
    console.log(`[BugsnagSourceMapUploader] uploading sourcemap for "${url}"`);
    console.log({ url, source, map });
    return browser.uploadOne({
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
        const sourceFilename = resolve(outputDir, sourcePath);
        if (ignoredBundleExtensions.includes(extname(sourcePath)))
          return [];
        if (!existsSync(sourceFilename)) {
          warn(`no corresponding source found for "${mapPath}"`);
          return [];
        }
        return [
          {
            map: resolve(outputDir, mapPath),
            source: sourceFilename,
            url: `${base}${sourcePath}`
          }
        ];
      }
      const files = await glob("./**/*.map", { cwd: outputDir });
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
export {
  BugsnagBuildReporterPlugin,
  BugsnagSourceMapUploaderPlugin
};
