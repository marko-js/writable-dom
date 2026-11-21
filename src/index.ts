enum NodeType {
  ELEMENT_NODE = 1,
  TEXT_NODE = 3,
}

type Writable = {
  write(html: string): void;
  abort(err: Error): void;
  close(): Promise<void>;
};

const createHTMLDocument = () => document.implementation.createHTMLDocument("");
let createDocument = (
  target: ParentNode,
  nextSibling: ChildNode | null,
): Document => {
  const testDoc = createHTMLDocument();
  testDoc.write("<script>");
  /**
   * Safari and potentially other browsers strip script tags from detached documents.
   * If that's the case we'll fallback to an iframe implementation.
   */
  createDocument = testDoc.scripts.length
    ? createHTMLDocument
    : (target, nextSibling) => {
        const frame = document.createElement("iframe");
        frame.src = "";
        frame.style.display = "none";
        target.insertBefore(frame, nextSibling);
        const doc = frame.contentDocument!;
        const { close } = doc;
        doc.close = () => {
          target.removeChild(frame);
          close.call(doc);
        };

        return doc;
      };

  return createDocument(target, nextSibling);
};

export = function writableDOM(
  this: unknown,
  target: ParentNode,
  previousSibling?: ChildNode | null,
): Writable | WritableStream<string> {
  if (this instanceof writableDOM) {
    return new WritableStream(writableDOM(target, previousSibling));
  }

  const nextSibling = previousSibling ? previousSibling.nextSibling : null;
  const owner = target.ownerDocument!;
  const doc = createDocument(target, nextSibling);
  doc.write("<!DOCTYPE html><body><template>");
  const root = (doc.body.firstChild as HTMLTemplateElement).content;
  const walker = doc.createTreeWalker(root);
  const targetNodes = new WeakMap<Node, Node>([[root, target]]);
  const targetFragments = new WeakMap<ParentNode, DocumentFragment>();
  // Native parsing can insert nodes before earlier siblings (table foster
  // parenting), so consume parser additions rather than advancing a tree cursor.
  const parserAdditions = new MutationObserver(() => {});
  const seenInline = new WeakSet<Node>();
  const completedInline = new WeakSet<ParentNode>();
  let inline: { node: Element; consume: (chunk: string) => number } | undefined;
  const isIncomplete = (node: ParentNode) =>
    !(resolve || node.nextSibling || completedInline.has(node));
  let appendedTargets = new Set<ParentNode>();
  let scanNode: Node | null = null;
  let resolve: void | (() => void);
  let isBlocked = false;

  return {
    write(chunk: string) {
      // Let the native parser establish element starts. Splitting at token
      // terminators lets us start tracking raw text immediately after its opener,
      // without interpreting comments, attributes, or surrounding HTML ourselves.
      let start = 0;
      while (start < chunk.length) {
        const trackOpening = !inline;
        let end: number;
        if (inline) {
          const consumed = inline.consume(chunk.slice(start));
          end = consumed < 0 ? chunk.length : start + consumed;
          if (consumed >= 0) {
            completedInline.add(inline.node);
            inline = undefined;
          }
        } else {
          const delimiter = chunk.indexOf(">", start);
          end = delimiter < 0 ? chunk.length : delimiter + 1;
        }
        // Only an opening-token segment can create a new raw-text element.
        // The raw body is processed in bulk without mutation-record overhead.
        if (trackOpening)
          parserAdditions.observe(root, { childList: true, subtree: true });
        doc.write(chunk.slice(start, end));
        for (const record of parserAdditions.takeRecords()) {
          record.addedNodes.forEach((node) => {
            if (
              node.nodeType === NodeType.ELEMENT_NODE &&
              isInlineScriptOrStyleTag(node as Element) &&
              !seenInline.has(node)
            ) {
              seenInline.add(node);
              inline = {
                node: node as Element,
                consume: inlineTextBoundary((node as Element).tagName),
              };
            }
          });
        }
        parserAdditions.disconnect();
        start = end;
      }
      walk();
    },
    abort() {
      parserAdditions.disconnect();
      if (isBlocked) {
        (targetNodes.get(walker.currentNode) as Element).remove();
      }
    },
    close() {
      parserAdditions.disconnect();
      return new Promise((_) => {
        resolve = _;
        if (!isBlocked) walk();
      });
    },
  };

  function walk(): void {
    const startNode = walker.currentNode;
    let node: Node | null;
    if (isBlocked) {
      // If we are blocked, we walk ahead and preload
      // any assets we can ahead of the last checked node.
      if (scanNode) walker.currentNode = scanNode;

      while ((node = walker.nextNode())) {
        const link = getPreloadLink((scanNode = node), owner);
        if (link) {
          link.onload = link.onerror = () => target.removeChild(link);
          target.insertBefore(link, nextSibling);
        }
      }

      walker.currentNode = startNode;
    } else {
      if (startNode.nodeType === NodeType.TEXT_NODE) {
        if (!isInlineScriptOrStyleTag((node = startNode.parentNode!))) {
          (targetNodes.get(startNode) as Text).data = (startNode as Text).data;
        } else if (!isIncomplete(node) && !targetNodes.has(startNode)) {
          const clone = owner.importNode(startNode, false);
          targetNodes.set(startNode, clone);
          targetNodes.get(node)!.appendChild(clone);
        }
      }

      while ((node = walker.nextNode())) {
        const parentNode = node.parentNode!;
        if (
          node.nodeType === NodeType.TEXT_NODE &&
          isInlineScriptOrStyleTag(parentNode) &&
          isIncomplete(parentNode)
        ) {
          break;
        }

        const cloneParent = targetNodes.get(parentNode) as ParentNode;
        const clone = owner.importNode(node, false);
        let insertParent: ParentNode = cloneParent;
        targetNodes.set(node, clone);

        if (cloneParent.isConnected) {
          appendedTargets.add(cloneParent);
          (insertParent = targetFragments.get(cloneParent)!) ||
            targetFragments.set(
              cloneParent,
              (insertParent = owner.createDocumentFragment()),
            );
        }

        if (isBlocking(clone)) {
          isBlocked = true;
          clone.onload = clone.onerror = () => {
            isBlocked = false;
            // Continue the normal content injecting walk.
            if (clone.parentNode) walk();
          };
        }

        insertParent.appendChild(clone);
        if (isBlocked) break;
      }

      for (const targetNode of appendedTargets) {
        targetNode.insertBefore(
          targetFragments.get(targetNode)!,
          targetNode === target ? nextSibling : null,
        );
      }

      appendedTargets = new Set();

      if (isBlocked) {
        walk();
      } else if (resolve) {
        // Some blocking content could have prevented load.
        resolve();
      }
    }
  }
} as {
  new (
    target: ParentNode,
    previousSibling?: ChildNode | null,
  ): WritableStream<string>;
  (target: ParentNode, previousSibling?: ChildNode | null): Writable;
};

function isBlocking(node: any): node is HTMLElement {
  return (
    node.nodeType === NodeType.ELEMENT_NODE &&
    (node.blocking === "render" ||
      (node.tagName === "SCRIPT" &&
        node.src &&
        !(
          node.noModule ||
          node.type === "module" ||
          node.hasAttribute("async") ||
          node.hasAttribute("defer")
        )) ||
      (node.tagName === "LINK" &&
        node.rel === "stylesheet" &&
        (!node.media || matchMedia(node.media).matches)))
  );
}

function getPreloadLink(node: any, owner: Document) {
  let link: HTMLLinkElement | undefined;
  if (node.nodeType === NodeType.ELEMENT_NODE) {
    switch (node.tagName) {
      case "SCRIPT":
        if (node.src && !node.noModule) {
          link = owner.createElement("link");
          link.href = node.src;
          if (node.getAttribute("type") === "module") {
            link.rel = "modulepreload";
          } else {
            link.rel = "preload";
            link.as = "script";
          }
        }
        break;
      case "LINK":
        if (
          node.rel === "stylesheet" &&
          (!node.media || matchMedia(node.media).matches)
        ) {
          link = owner.createElement("link");
          link.href = node.href;
          link.rel = "preload";
          link.as = "style";
        }
        break;
      case "IMG":
        link = owner.createElement("link");
        link.rel = "preload";
        link.as = "image";
        if (node.srcset) {
          link.imageSrcset = node.srcset;
          link.imageSizes = node.sizes;
        } else {
          link.href = node.src;
        }
        break;
    }

    if (link) {
      if (node.integrity) {
        link.integrity = node.integrity;
      }

      if (node.crossOrigin) {
        link.crossOrigin = node.crossOrigin;
      }
    }
  }

  return link;
}

function isInlineScriptOrStyleTag(
  node: ParentNode,
): node is HTMLScriptElement | HTMLStyleElement {
  return (
    (node as Element).tagName === "STYLE" ||
    ((node as Element).tagName === "SCRIPT" && !(node as HTMLScriptElement).src)
  );
}

/**
 * Tracks the HTML raw-text and script escaped/double-escaped states.
 * Returns the offset after a closing tag, or -1 when more input is needed.
 * https://html.spec.whatwg.org/multipage/parsing.html#tokenization
 */
function inlineTextBoundary(tagName: string) {
  const script = tagName === "SCRIPT";
  const name = tagName.toLowerCase();
  let mode: "data" | "escaped" | "double-escaped" = "data";
  let pending: "" | "<" | "</" | "<!" | "<!-" | "word" | "end-word" = "";
  let word = "";
  let dashes = 0;
  let attribute:
    | ""
    | "before"
    | "name"
    | "after-name"
    | "value"
    | "unquoted"
    | "quoted"
    | "after-value"
    | "self-closing" = "";
  let quote = "";

  return (chunk: string): number => {
    for (let offset = 0; offset < chunk.length; offset++) {
      // Ordinary raw text cannot change state until a less-than sign. Skip it
      // in one pass rather than splitting large scripts at every greater-than.
      if (!attribute && !pending && mode === "data") {
        offset = chunk.indexOf("<", offset);
        if (offset < 0) return -1;
      }
      const char = chunk[offset];
      let reconsume = true;
      while (reconsume) {
        reconsume = false;
        if (attribute) {
          if (attribute === "quoted") {
            if (char === quote) attribute = "after-value";
          } else if (char === ">") {
            return offset + 1;
          } else if (attribute === "value") {
            if (char === '"' || char === "'") {
              quote = char;
              attribute = "quoted";
            } else if (!htmlSpace(char)) attribute = "unquoted";
          } else if (attribute === "unquoted") {
            if (htmlSpace(char)) attribute = "before";
          } else if (
            attribute === "after-value" ||
            attribute === "self-closing"
          ) {
            attribute = "before";
            reconsume = true;
          } else if (char === "/") {
            attribute = "self-closing";
          } else if (char === "=" && attribute !== "before") {
            attribute = "value";
          } else if (htmlSpace(char)) {
            if (attribute === "name") attribute = "after-name";
          } else {
            attribute = "name";
          }
          continue;
        }

        if (pending) {
          if (pending === "<") {
            if (char === "/") pending = "</";
            else if (script && mode === "data" && char === "!") pending = "<!";
            else if (script && mode === "escaped" && asciiLetter(char)) {
              pending = "word";
              word = char.toLowerCase();
            } else {
              pending = "";
              reconsume = true;
            }
          } else if (pending === "<!" || pending === "<!-") {
            if (char === "-") {
              if (pending === "<!-") {
                mode = "escaped";
                dashes = 2;
                pending = "";
              } else pending = "<!-";
            } else {
              pending = "";
              reconsume = true;
            }
          } else if (pending === "</") {
            if (asciiLetter(char)) {
              pending = "end-word";
              word = char.toLowerCase();
            } else {
              pending = "";
              reconsume = true;
            }
          } else if (asciiLetter(char)) {
            // Only "script" and "style" can match; bound storage for long names.
            if (word.length <= 6) word += char.toLowerCase();
          } else {
            const delimiter = htmlSpace(char) || char === "/" || char === ">";
            if (
              delimiter &&
              pending === "end-word" &&
              mode !== "double-escaped" &&
              word === name
            ) {
              if (char === ">") return offset + 1;
              attribute = char === "/" ? "self-closing" : "before";
            } else if (
              delimiter &&
              script &&
              word === "script" &&
              pending === "word"
            ) {
              mode = "double-escaped";
            } else if (
              delimiter &&
              script &&
              word === "script" &&
              mode === "double-escaped"
            ) {
              mode = "escaped";
            } else {
              reconsume = true;
            }
            pending = "";
          }
          continue;
        }

        if (char === "<") {
          pending = "<";
          dashes = 0;
        } else if (mode !== "data" && char === "-") {
          dashes = Math.min(2, dashes + 1);
        } else {
          if (mode !== "data" && char === ">" && dashes === 2) mode = "data";
          dashes = 0;
        }
      }
    }
    return -1;
  };
}

function asciiLetter(char: string): boolean {
  const code = char.charCodeAt(0) | 32;
  return code >= 97 && code <= 122;
}

function htmlSpace(char: string): boolean {
  return (
    char === " " ||
    char === "\t" ||
    char === "\n" ||
    char === "\r" ||
    char === "\f"
  );
}
