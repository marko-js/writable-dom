# writable-dom

## 1.0.6

### Patch Changes

- [#14](https://github.com/marko-js/writable-dom/pull/14) [`b206400`](https://github.com/marko-js/writable-dom/commit/b206400457b6d367e938aef04cf5894e9a977b14) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Allow inline script/style tags to be injected without waiting for a nextSibling or final flush. (Checks if last flush ended with the closing tag).

## 1.0.5

### Patch Changes

- [#12](https://github.com/marko-js/writable-dom/pull/12) [`242e990`](https://github.com/marko-js/writable-dom/commit/242e990dec74c227c9e7dcd7bbb9b819a32c97d1) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Support blocking=render attribute.

- [#12](https://github.com/marko-js/writable-dom/pull/12) [`242e990`](https://github.com/marko-js/writable-dom/commit/242e990dec74c227c9e7dcd7bbb9b819a32c97d1) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Prefer importing new nodes into the target document (better support for writable dom into an iframe).

- [#12](https://github.com/marko-js/writable-dom/pull/12) [`242e990`](https://github.com/marko-js/writable-dom/commit/242e990dec74c227c9e7dcd7bbb9b819a32c97d1) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Fix issue with script/style text not inserted if it was the last child of the document.

## 1.0.4

### Patch Changes

- [#10](https://github.com/marko-js/writable-dom/pull/10) [`08e9e6d`](https://github.com/marko-js/writable-dom/commit/08e9e6d851d51ef115e7b0f40b913f846f7fa1db) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Reduce dom mutations by using document fragments at insertion points.

- [#10](https://github.com/marko-js/writable-dom/pull/10) [`a297c5e`](https://github.com/marko-js/writable-dom/commit/a297c5ead7d96e4c9fab64c0507149e66346d89c) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Fixes an issue where an inline host node
  would remain empty if it was the last node in
  the tree and a blocking node was encountered.
