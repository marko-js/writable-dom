import assert from "assert";
import crypto from "crypto";
import format from "diffable-html";
import { once } from "events";
import fs from "fs";
import http from "http";
import snap from "mocha-snap";
import net from "net";
import path from "path";
import * as playwright from "playwright";

import built from "./built";

type Step = string | ((page: playwright.Page) => unknown);
declare const __coverage__: unknown;
declare const __track__: (html: string) => void;
declare const writableDOM: typeof import("../index");
declare let writer: ReturnType<typeof import("../index")>;

const sampleGif = fs.readFileSync(path.join(__dirname, "images/sample.gif"));
let page: playwright.Page;
let browser: playwright.Browser | undefined;
let changes: string[] = [];

export default (step?: Step[] | Step) => {
  const steps = step ? (Array.isArray(step) ? step : [step]) : [];
  return async function () {
    await page.evaluate(() => {
      writer = writableDOM(document.body);
    });

    let snapshot = "";
    let stepId = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      await waitForPendingRequests(
        page,
        typeof step === "function"
          ? step
          : () => page.evaluate((step) => writer.write(step), step),
      );

      if (i === steps.length - 1) {
        await page.evaluate(() => writer.close());
      }

      await new Promise((r) => setTimeout(r, 500));

      if (changes.length) {
        snapshot += `# Step ${stepId++}\n\n`;
        for (const html of changes) {
          snapshot += `\`\`\`html\n${html}\n\`\`\`\n\n`;
        }
        changes = [];
      }
    }

    assert.ok(
      !changes.length,
      "Should not have any mutations after we've finished writing.",
    );

    await snap(snapshot, { ext: ".md" });
  };
};

// Starts the playwright instance and records mutation data.
before(async () => {
  browser = await playwright.chromium.launch();
  const context = await browser.newContext();
  const server = http.createServer().listen().unref();
  const code = await built;
  const routes = new Map<
    RegExp,
    (url: URL, res: http.ServerResponse) => void | Promise<void>
  >([
    [
      /^\/$/,
      async (_url, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(
          `<head><script>${code}</script><script>(${(() => {
            const { port1, port2 } = new MessageChannel();
            port1.onmessage = () => {
              if (document.body.innerHTML) {
                __track__(document.body.innerHTML);
              }
              observe();
            };
            // Tracks all mutations in the dom.
            const observer = new MutationObserver(() => {
              if (document.body) {
                // throttle the observer so we only snapshot once per frame.
                observer.disconnect();
                requestAnimationFrame(() => port2.postMessage(0));
              }
            });

            observe();
            function observe() {
              observer.observe(document, {
                subtree: true,
                childList: true,
                attributes: true,
                characterData: true,
              });
            }
          }).toString()})()</script></head>`,
        );
      },
    ],
    [
      /\.js$/,
      (url, res) => {
        res.setHeader("Content-Type", "application/javascript");
        res.end(
          `(window.scriptValues || (window.scriptValues = [])).push(${JSON.stringify(
            url.searchParams.get("value"),
          )});`,
        );
      },
    ],
    [
      /\.css$/,
      (url, res) => {
        res.setHeader("Content-Type", "text/css");
        res.end(`body { color: ${url.searchParams.get("color")} }`);
      },
    ],
    [
      /\.gif$/,
      (_url, res) => {
        res.setHeader("Content-Type", "image/gif");
        res.end(sampleGif);
      },
    ],
  ]);

  await once(server, "listening");
  const origin = `http://localhost:${
    (server.address() as net.AddressInfo).port
  }`;

  let pendingRequest = Promise.resolve();
  server.on("request", async (req, res) => {
    // Ensure requests processed in order to avoid race conditions loading assets during tests.
    await (pendingRequest = pendingRequest.then(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    ));

    const url = new URL(req.url!, origin);
    for (const [match, handler] of routes) {
      if (match.test(url.pathname)) {
        return handler(url, res);
      }
    }

    res.statusCode = 404;
    res.end();
  });

  await context.exposeFunction("__track__", (html: string) => {
    const formatted = format(html.replace(/http:\/\/[^/]+/g, "")).trim();

    if (changes.at(-1) !== formatted) {
      changes.push(formatted);
    }
  });

  page = await context.newPage();
  await page.goto(origin);
});

beforeEach(() => page.reload());
after(() => browser?.close());

if (process.env.NYC_CONFIG) {
  const NYC_CONFIG = JSON.parse(process.env.NYC_CONFIG) as {
    tempDir: string;
    cwd: string;
  };
  let report = 0;

  // Save coverage after each test.
  afterEach(async () => {
    const coverage = await page.evaluate(() => JSON.stringify(__coverage__));

    if (coverage) {
      await fs.promises.writeFile(
        path.join(
          NYC_CONFIG.cwd,
          NYC_CONFIG.tempDir,
          `web-${report++}-${crypto.randomBytes(16).toString("hex")}.json`,
        ),
        coverage,
      );
    }
  });
}

/**
 * Utility to run a function against the current page and wait until every
 * in flight network request has completed before continuing.
 */
async function waitForPendingRequests(
  page: playwright.Page,
  action: (page: playwright.Page) => unknown,
) {
  let remaining = 0;
  let resolve!: () => void;
  const addOne = () => remaining++;
  const finishOne = async () => {
    if (!--remaining) {
      // wait some time to see if new requests start from this one.
      await page.evaluate(() => {});
      await new Promise((r) => setTimeout(r, 200));
      if (!remaining) resolve();
    }
  };
  const pending = new Promise<void>((_resolve) => (resolve = _resolve));

  page.on("request", addOne);
  page.on("requestfinished", finishOne);
  page.on("requestfailed", finishOne);

  try {
    addOne();
    await action(page);
    finishOne();
    await pending;
  } finally {
    page.off("request", addOne);
    page.off("requestfinished", finishOne);
    page.off("requestfailed", finishOne);
  }
}
