import { transform } from "esbuild";
import fs from "fs";
import { createInstrumenter } from "istanbul-lib-instrument";
import path from "path";

/**
 * Builds writable dom for the browser so it can be inlined in playwright.
 * When running with NYC we also instrument the output to gather test coverage.
 */
export default (async () => {
  const sourcefile = path.join(__dirname, "../index.ts");
  const { code, map } = await transform(
    await fs.promises.readFile(sourcefile, "utf-8"),
    {
      sourcefile,
      loader: "ts",
      format: "iife",
      globalName: "writableDOM",
      sourcemap: process.env.NYC_CONFIG ? "external" : "inline",
    },
  );

  if (process.env.NYC_CONFIG) {
    const instrumenter = createInstrumenter();
    return `${instrumenter.instrumentSync(
      code,
      sourcefile,
      JSON.parse(map),
    )}\n//#sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(
      JSON.stringify(instrumenter.lastSourceMap()),
      "utf-8",
    ).toString("base64")}`;
  }

  return code;
})();
