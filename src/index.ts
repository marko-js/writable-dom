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
  const doc = createDocument(target, nextSibling);
  doc.write("<!DOCTYPE html><body><template>");
  const root = (doc.body.firstChild as HTMLTemplateElement).content;
  const walker = doc.createTreeWalker(root);
  const targetNodes = new WeakMap<Node, Node>([[root, target]]);
  const targetFragments = new WeakMap<ParentNode, DocumentFragment>();
  let appendedTargets = new Set<ParentNode>();
  let scanNode: Node | null = null;
  let resolve: void | (() => void);
  let isBlocked = false;

  return {
    write(chunk: string) {
      doc.write(chunk);
      walk();
    },
    abort() {
      if (isBlocked) {
        (targetNodes.get(walker.currentNode) as Element).remove();
      }
    },
    close() {
      return isBlocked
        ? new Promise<void>((_) => (resolve = _))
        : Promise.resolve();
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
        const link = getPreloadLink((scanNode = node));
        if (link) {
          link.onload = link.onerror = () => target.removeChild(link);
          target.insertBefore(link, nextSibling);
        }
      }

      walker.currentNode = startNode;
    } else {
      if (startNode.nodeType === NodeType.TEXT_NODE) {
        if (isInlineScriptOrStyleTag(startNode.parentNode!)) {
          if (resolve || walker.nextNode()) {
            targetNodes
              .get(startNode.parentNode!)!
              .appendChild(document.importNode(startNode, false));
            walker.currentNode = startNode;
          }
        } else {
          (targetNodes.get(startNode) as Text).data = (startNode as Text).data;
        }
      }

      while ((node = walker.nextNode())) {
        if (
          !resolve &&
          node.nodeType === NodeType.TEXT_NODE &&
          isInlineScriptOrStyleTag(node.parentNode!)
        ) {
          if (walker.nextNode()) {
            walker.currentNode = node;
          } else {
            break;
          }
        }

        const parentNode = targetNodes.get(node.parentNode!) as ParentNode;
        const clone = document.importNode(node, false);
        let insertParent: ParentNode = parentNode;
        targetNodes.set(node, clone);

        if (parentNode.isConnected) {
          appendedTargets.add(parentNode);
          (insertParent = targetFragments.get(parentNode)!) ||
            targetFragments.set(
              parentNode,
              (insertParent = new DocumentFragment()),
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
    ((node.tagName === "SCRIPT" &&
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

function getPreloadLink(node: any) {
  let link: HTMLLinkElement | undefined;
  if (node.nodeType === NodeType.ELEMENT_NODE) {
    switch (node.tagName) {
      case "SCRIPT":
        if (node.src && !node.noModule) {
          link = document.createElement("link");
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
          link = document.createElement("link");
          link.href = node.href;
          link.rel = "preload";
          link.as = "style";
        }
        break;
      case "IMG":
        link = document.createElement("link");
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

function isInlineScriptOrStyleTag(node: Node) {
  const { tagName } = node as Element;
  return (
    (tagName === "SCRIPT" && !(node as HTMLScriptElement).src) ||
    tagName === "STYLE"
  );
}
