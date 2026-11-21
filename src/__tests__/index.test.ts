import assert from "assert";

import fixture from "./fixture";

declare const writableDOM: typeof import("../index");

declare const writer: ReturnType<typeof import("../index")>;

declare const scriptValues: unknown[];
declare let inlineScriptValues: unknown[];

it("stream-text", fixture(["Hello", "World"]));

it("stream-elements", fixture(["<h1>H1</h1>", "<h2>H2</h2>", "<h3>H3</h3>"]));

it(
  "blocking-scripts",
  fixture([
    `Embedded App.
<script>window.inlineScriptValues = []</script>
<script src="/external.js?value=a"></script>
<script>inlineScriptValues.push(0, scriptValues.at(-1));</script>
<script src="/external.js?value=b"></script>
<script>inlineScriptValues.push(1, scriptValues.at(-1));</script>
<script src="/external.js?value=c"></script>
<script>inlineScriptValues.push(2, scriptValues.at(-1));</script>
After blocking.`,
    async (page) => {
      assert.deepStrictEqual(
        await page.evaluate(() => ({
          inlineScriptValues,
          scriptValues,
        })),
        {
          scriptValues: ["a", "b", "c"],
          inlineScriptValues: [0, "a", 1, "b", 2, "c"],
        },
      );
    },
  ]),
);

it(
  "blocking-styles",
  fixture([
    `Embedded App.
<script>window.inlineScriptValues = []</script>
<link rel="stylesheet" href="/external.css?color=rgb(255, 0, 0)"/>
<script>inlineScriptValues.push(getComputedStyle(document.body).color);</script>
<link rel="stylesheet" href="/external.css?color=rgb(0, 255, 0)"/>
<script>inlineScriptValues.push(getComputedStyle(document.body).color);</script>
<link rel="stylesheet" href="/external.css?color=rgb(0, 0, 255)"/>
<script>inlineScriptValues.push(getComputedStyle(document.body).color);</script>
After blocking.`,
    async (page) => {
      assert.deepStrictEqual(await page.evaluate(() => inlineScriptValues), [
        "rgb(255, 0, 0)",
        "rgb(0, 255, 0)",
        "rgb(0, 0, 255)",
      ]);
    },
  ]),
);

it(
  "crossorigin-and-integrity-preloads",
  fixture([
    `Embedded App.
<script src="/external.js?value=a"></script>
<script src="/external.js?value=b" crossorigin="use-credentials"></script>
<script src="/external.js?value=c" integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"></script>
After blocking.`,
    async (page) => {
      assert.deepStrictEqual(await page.evaluate(() => scriptValues), [
        "a",
        "b",
      ]);
    },
  ]),
);

// Skipped in CI for now since it's flakey 😭
!process.env.CI &&
  it(
    "image-preloads",
    fixture(
      `Embedded App.
<script src="/external.js?value=a"></script>
<img src="/external-a.gif"/>
<img
  srcset="/external-b.gif 480w, /external-c.gif 800w"
  sizes="(max-width: 600px) 480px, 800px"
  src="/external-d.gif"/>
After blocking.`,
    ),
  );

it(
  "stylesheet-preloads",
  fixture(
    `Embedded App.
<link rel="stylesheet" href="/external.css?color=#cb95fc">
<link rel="alternate" href="/external.css?color=#5bbfb8" >
<link rel="stylesheet" href="/external.css?color=#763eee" media="print">
<link rel="stylesheet" href="/external.css?color=#851cd7">
After blocking.`,
  ),
);

it(
  "script-preloads",
  fixture([
    `Embedded App.
<script src="/external.js?value=a"></script>
<script src="/external.js?value=b" async></script>
<script src="/external.js?value=c" nomodule></script>
<script src="/external.js?value=d" type="module"></script>
After blocking.`,
    async (page) => {
      const assets = (await page.evaluate(() => scriptValues)) as string[];
      assert.equal(assets[0], "a"); // `a` must be first since it is a blocking script.

      // b being async will arrive at a non deterministic time, so we'll just make sure it's there.
      assert.ok(assets.includes("b"), "should include b");
      assert.ok(assets.includes("d"), "should include d");

      // c should never be loaded.
      assert.ok(!assets.includes("c"), "should not include c");
    },
  ]),
);

it(
  "inline-scripts",
  fixture([
    "Embedded App.",
    '<script>scriptValues = ["a',
    '", "b"];</script>',
    "After Script.",
    async (page) => {
      assert.deepStrictEqual(await page.evaluate(() => scriptValues), [
        "a",
        "b",
      ]);
    },
  ]),
);

it(
  "inline-styles",
  fixture([
    "Embedded App. ",
    "<style> h1 { colo",
    "r: red; } </style>",
    " After Styles.",
  ]),
);

// Exercise the same node again when a later write or close resumes traversal.
for (const [tag, text] of [
  ["style", ".x{color:red}"],
  ["script", 'window.inlineScriptValues = ["once"];'],
]) {
  for (const [name, chunks] of [
    ["complete", [`<${tag}>${text}</${tag}>`]],
    ["split", [`<${tag}>${text.slice(0, 5)}`, `${text.slice(5)}</${tag}>`]],
    ["unterminated", [`<${tag}>${text}`]],
  ] as const) {
    it(
      `inline-${tag}-${name}-text-once`,
      fixture(async (page) => {
        const result = await page.evaluate(
          async ({ tag, chunks }) => {
            for (const chunk of chunks) writer.write(chunk);
            // Resume once more before close, without advancing to another node.
            writer.write("");
            await writer.close();
            const element = document.body.querySelector(tag)!;
            return {
              text: element.textContent,
              childCount: element.childNodes.length,
            };
          },
          { tag, chunks },
        );
        assert.deepStrictEqual(result, { text, childCount: 1 });
      }),
    );
  }
}

for (const [name, chunks] of [
  ["complete", ["<style>/*</div>*/body{color:red}</style>"]],
  ["unfinished-rule", ["<style>/*</div>*/body{", "color:red}</style>"]],
  ["closing-tag-in-comment", ["<style>/*</div>", "*/body{color:red}</style>"]],
] as const) {
  it(
    `inline-style-${name}-preserves-growing-text`,
    fixture([
      async (page) => {
        await page.evaluate((chunk) => writer.write(chunk), chunks[0]);
        if (chunks.length > 1) {
          assert.equal(
            await page.evaluate(
              () => document.body.querySelector("style")!.textContent,
            ),
            "",
          );
        }
      },
      async (page) => {
        const result = await page.evaluate(async (chunks) => {
          for (const chunk of chunks.slice(1)) writer.write(chunk);
          await writer.close();
          const style = document.body.querySelector("style")!;
          return {
            text: style.textContent,
            childCount: style.childNodes.length,
            color: getComputedStyle(document.body).color,
          };
        }, chunks);
        assert.deepStrictEqual(result, {
          text: "/*</div>*/body{color:red}",
          childCount: 1,
          color: "rgb(255, 0, 0)",
        });
      },
    ]),
  );
}

for (const [name, chunks] of [
  [
    "other-end-tag-in-comment",
    [
      '<script>inlineScriptValues.push("first"); //</div>',
      '\ninlineScriptValues.push("last");</script>',
    ],
  ],
  [
    "split-end-tag",
    ['<script>inlineScriptValues.push("first", "last");</scr', "ipt>"],
  ],
  [
    "mixed-case-split-end-tag-with-whitespace",
    ['<script>inlineScriptValues.push("first", "last");</ScR', "IpT \r\n>"],
  ],
  [
    "closing-parent-boundary",
    ['<h1><script>inlineScriptValues.push("first", "last");', "</script></h1>"],
  ],
  [
    "reconstructed-formatting-before-quoted-opener",
    [
      "<p><b>one</p>",
      'two<script data-note=">">inlineScriptValues.push("first", "last");</script>',
    ],
  ],
  [
    "foster-parented-script",
    [
      "",
      '<table><div><script>inlineScriptValues.push("first", "last");</script></div></table>',
    ],
  ],
  [
    "single-write-identical-text-and-closing-tag",
    [
      "",
      '<script><!--\ninlineScriptValues.push("first", "last"); //<script></script></script>',
    ],
  ],
  [
    "quoted-end-tag-attribute",
    [
      '<script>inlineScriptValues.push("first", "last");</script data-note=">',
      '">',
    ],
  ],
  [
    "quoted-start-tag-attribute",
    [
      '<script data-note=">',
      '">inlineScriptValues.push("first", "last");</script>',
    ],
  ],
  [
    "identical-text-and-closing-tag",
    [
      '<script><!--\ninlineScriptValues.push("first", "last"); //<script></script>',
      "</script>",
    ],
  ],
  [
    "double-escaped-end-tag",
    [
      '<script><!--\ninlineScriptValues.push("first"); //<script></script>',
      '\ninlineScriptValues.push("last");\n//-->\n</script>',
    ],
  ],
] as const) {
  it(
    `inline-script-${name}-executes-only-when-complete`,
    fixture([
      async (page) => {
        await page.evaluate((chunk) => {
          inlineScriptValues = [];
          writer.write(chunk);
        }, chunks[0]);
        assert.deepStrictEqual(
          await page.evaluate(() => inlineScriptValues),
          [],
        );
      },
      async (page) => {
        await page.evaluate((chunk) => writer.write(chunk), chunks[1]);
        assert.deepStrictEqual(await page.evaluate(() => inlineScriptValues), [
          "first",
          "last",
        ]);
      },
      async (page) => {
        await page.evaluate(async () => {
          writer.write("");
          await writer.close();
        });
        assert.deepStrictEqual(await page.evaluate(() => inlineScriptValues), [
          "first",
          "last",
        ]);
        assert.equal(
          await page.evaluate(
            () => document.body.querySelector("script")!.childNodes.length,
          ),
          1,
        );
      },
    ]),
  );
}

it(
  "inline-boundaries-match-native-parser",
  fixture(async (page) => {
    const failures = await page.evaluate(async () => {
      const failures: object[] = [];
      for (const tag of ["script", "style"]) {
        for (const text of [
          "abc",
          "/*</div>",
          "<!--",
          "<!--<script>",
          "<!--<script></script>",
          "<!--<script>-->",
          "<!--x--",
          "<!--<script>--",
          "<",
          "</",
          "<!--<scripted>",
          "<!--<SCRIPT / >",
        ]) {
          for (const end of [
            "",
            `</${tag}>`,
            `</${tag.toUpperCase()} \n>`,
            `</${tag} a=">">`,
            `</${tag} a='>'>`,
            `</${tag} a=xx>`,
            `</${tag} a" >`,
            `</${tag}/>`,
            `</${tag} a='>`,
            `</${tag} a=`,
            `</${tag}x>`,
          ]) {
            for (const prefix of [
              "",
              "<div></div>",
              "<!--<script>ignored</script>-->",
              '<div data-value="<script>"></div>',
              "<textarea><script>ignored</script></textarea>",
            ]) {
              const html = `${prefix}<${tag} type="text/plain">${text}${end}`;
              const reference = document.createElement("template");
              // A marker outside the raw-text element proves the native parser
              // consumed a closing tag, rather than merely closing it at EOF.
              reference.innerHTML = html + "<b data-boundary-probe></b>";
              const expected = reference.content.querySelector(
                "[data-boundary-probe]",
              )
                ? reference.content.querySelector(tag)!.textContent
                : "";
              for (const chunks of [[html], html.split("")]) {
                const target = document.body.appendChild(
                  document.createElement("div"),
                );
                const stream = writableDOM(target);
                for (const chunk of chunks) stream.write(chunk);
                const actual = target.querySelector(tag)?.textContent ?? "";
                if (actual !== expected)
                  failures.push({
                    html,
                    chunks: chunks.length,
                    expected,
                    actual,
                  });
                await stream.close();
                target.remove();
              }
            }
          }
        }
      }
      return failures;
    });
    assert.deepStrictEqual(failures, []);
  }),
);
