<h1 align="center">
  <!-- Logo -->
  <br/>
  writable-dom
	<br/>

  <!-- Format -->
  <a href="https://github.com/prettier/prettier">
    <img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg" alt="Styled with prettier"/>
  </a>
  <!-- CI -->
  <a href="https://github.com/marko-js/writable-dom/actions/workflows/ci.yml">
    <img src="https://github.com/marko-js/writable-dom/actions/workflows/ci.yml/badge.svg" alt="Build status"/>
  </a>
  <!-- Coverage -->
  <a href="https://codecov.io/gh/marko-js/writable-dom">
    <img src="https://codecov.io/gh/marko-js/writable-dom/branch/master/graph/badge.svg?token=06lKJj8my3" alt="Code coverage"/>
  </a>
  <!-- NPM Version -->
  <a href="https://npmjs.org/package/writable-dom">
    <img src="https://img.shields.io/npm/v/writable-dom.svg" alt="NPM version"/>
  </a>
  <!-- Downloads -->
  <a href="https://npmjs.org/package/writable-dom">
    <img src="https://img.shields.io/npm/dm/writable-dom.svg" alt="Downloads"/>
  </a>
</h1>

<p align="center">
  Utility to stream HTML content into a live document.
</p>

# Installation

```console
npm install writable-dom
```

# How it works

This module allows you to write multiple partial chunks of raw HTML into an existing element in the DOM.
Each chunk of HTML is handled in a way that is similar to how browsers process and display it.

Specifically blocking assets, including stylesheets and scripts, prevent adding newly parsed nodes to the target element.
This means that there is no flash of unstyled, and that scripts execution order follows the same rules as normal.

On top of that this module will look ahead for additional assets to preload while it is blocked.

# Examples

The following examples fetch an HTML stream and place the content into a `#root` container element.

```js
import writableDOM from "writable-dom";

const res = await fetch("https://ebay.com");
const decoder = new TextDecoder();
const reader = res.body.getReader();
const myEl = document.getElementById("root");

// create a writable object to stream data into.
const writable = writableDOM(myEl);

try {
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      // wait for blocking assets to finish.
      await writable.close();
      break;
    }

    // write partial chunks of html.
    writable.write(decoder.decode(value));
  }
} catch (err) {
  // ensure the writable dom stops if there is an error.
  writable.abort(err);
}
```

If you only support browsers that provide [`WritableStream's`](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream) you can have this module give you a `WritableStream` instance by calling the top level api with [`new`](#user-content-new-writable-dom).

```js
import WritableDOMStream from "writable-dom";

const res = await fetch("http://ebay.com");
const myEl = document.getElementById("root");

await res.body
  .pipeThrough(new TextDecoderStream())
  .pipeTo(new WritableDOMStream(myEl)); // Much cleaner... Firefox it's time to support this!
```

# API

<h2 id="writable-dom">
  <pre><code>writableDOM(
  target: ParentNode,
  previousSibling?: ChildNode | null
): Writable</code></pre>
</h2>
Creates a new `Writable` instance that allows you to write HTML into the `target` element.
You can also provide `previousSibling` to have all written HTML be placed _after_ that node.

### `Writable::write(html: string): void`

Writes a partial chunk of HTML content to the `target` element.

### `Writable::close(): Promise<void>`

Indicates that no additional HTML is going to be written.
Returns a promise that will resolve when all blocking assets have loaded and the content is being displayed in the document.

### `Writable::abort(err: Error): void`

Prevents any additional HTML from being written into the document and aborts any blocking assets.
You should not call `write` after calling `abort`.

<h2 id="new-writable-dom">
  <pre><code>new WritableDOM(
  target: ParentNode,
  previousSibling?: ChildNode | null
): WritableStream<string></code></pre>
</h2>

If you call the top level api with the `new` keyword, instead of returning a custom `Writable`, it will return a [WritableStream<string>](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream).

Ideally this would be the only api exposed by this module, but as it stands browser support for `WritableStream` is limited.

# Code of Conduct

This project adheres to the [eBay Code of Conduct](./.github/CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
