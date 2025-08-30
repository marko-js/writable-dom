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
  const isIncomplete = (node: ParentNode) =>
    !(resolve || node.nextSibling || /<\/\w+>$/.test(curChunk));
  let appendedTargets = new Set<ParentNode>();
  let scanNode: Node | null = null;
  let resolve: void | (() => void);
  let isBlocked = false;
  let curChunk = "";

  return {
    write(chunk: string) {
      curChunk = chunk;
      doc.write(chunk);
      walk();
    },
    abort() {
      if (isBlocked) {
        (targetNodes.get(walker.currentNode) as Element).remove();
      }
    },
    close() {
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
        } else if (!isIncomplete(node)) {
          targetNodes
            .get(node)!
            .appendChild(owner.importNode(startNode, false));
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
