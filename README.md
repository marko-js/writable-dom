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
    <img src="https://codecov.io/gh/marko-js/writable-dom/branch/main/graph/badge.svg?token=06lKJj8my3" alt="Code coverage"/>
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

This module allows you to write a stream of raw HTML chunks into an existing element in the DOM.
Each chunk of HTML is handled in a way that is similar to how browsers process and display it.

Specifically blocking assets, including stylesheets and scripts, prevent adding newly parsed nodes to the target element.
This means that there are no flashes of unstyled content, and that scripts execution order follows the same rules as normal.

On top of that this module will look ahead for additional assets to preload while it is blocked.

# Examples

The following examples fetch an HTML stream and place the content into a `#root` container element.

```js
import WritableDOMStream from "writable-dom";

const res = await fetch("http://ebay.com");
const myEl = document.getElementById("root");

await res.body
  .pipeThrough(new TextDecoderStream())
  .pipeTo(new WritableDOMStream(myEl));
```

The presented example relies on the [`WritableStream`](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream)s API.

An alternative API is also available to use in case legacy browsers not implementing `WritableStream`s need to be supported.

The following is a version of the previous example implemented using the alternative API.

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

# API

The module exposes a single default constructor function, once imported it can be used via one of the two following APIs.

## `WritableStream` API

```ts
import writableDOMStream from "writable-dom";

new WritableDOMStream(
  target: ParentNode,
  previousSibling?: ChildNode | null
): WritableStream
```

By instantiating a new object via the `new` keyword on the constructor function, the generated object will be of type [WritableStream\<string\>](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream), which you can for example combine with your original stream via the [`pipeTo`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/pipeTo) method.

You can also provide `previousSibling` to have all written HTML be placed _after_ that node.

## `Writable` API

```ts
import writableDOM from "writable-dom";

writableDOM(
  target: ParentNode,
  previousSibling?: ChildNode | null
): Writable
```

Calling the function directly creates a new `Writable` object which you can use to manually write HTML into the `target` element.

Again, you can also provide `previousSibling` to have all written HTML be placed _after_ that node.

A `Writable` object provides the following methods:

- `write(html: string): void`\
  Writes a partial chunk of HTML content into the `target` element.

- `close(): Promise<void>`\
  Indicates that no additional HTML is going to be written.
  Returns a promise that will resolve when all blocking assets have loaded and the content is being displayed in the document.
  You should not call `write` after calling `close`.

- `abort(err: Error): void`
  Prevents any additional HTML from being written into the document and aborts any blocking assets.
  You should not call `write` after calling `abort`.

# Code of Conduct

This project adheres to the [eBay Code of Conduct](./.github/CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
