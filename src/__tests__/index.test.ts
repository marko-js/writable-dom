import assert from "assert";
import fixture from "./fixture";

declare const scriptValues: unknown[];
declare const inlineScriptValues: unknown[];

it("stream-text", fixture(["Hello", "World"]));

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
        }
      );
    },
  ])
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
  ])
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
  ])
);

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
After blocking.`
  )
);

it(
  "stylesheet-preloads",
  fixture(
    `Embedded App.
<link rel="stylesheet" href="/external.css?color=#cb95fc">
<link rel="alternate" href="/external.css?color=#5bbfb8" >
<link rel="stylesheet" href="/external.css?color=#763eee" media="print">
<link rel="stylesheet" href="/external.css?color=#851cd7">
After blocking.`
  )
);

it(
  "script-preloads",
  fixture([
    `Embedded App.
<script src="/external.js?value=a"></script>
<script src="/external.js?value=b" async></script>
<script src="/external.js?value=c" defer></script>
<script src="/external.js?value=d" nomodule></script>
<script src="/external.js?value=e" type="module"></script>
After blocking.`,
    async (page) => {
      assert.deepStrictEqual(await page.evaluate(() => scriptValues), [
        "a",
        "b",
        "c",
        "e",
      ]);
    },
  ])
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
  ])
);

it(
  "inline-styles",
  fixture([
    "Embedded App. ",
    "<style> h1 { colo",
    "r: red; } </style>",
    " After Styles.",
  ])
);
