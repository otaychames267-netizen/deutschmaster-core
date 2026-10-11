/**
 * Keeps the app alive when the browser's page translator (Chrome / Edge "Translate this page", Google Translate) rewrites the DOM under React.
 * The translator replaces text nodes with <font> wrappers; the next React update then asks the DOM to remove / insert a node relative to a node that
 * is no longer its child and the browser throws "NotFoundError: Failed to execute 'insertBefore' on 'Node': The node before which the new node is to
 * be inserted is not a child of this node" — the whole page falls into the error boundary. Seen in production on 2026-10-10/11 for students with Arabic /
 * French browsers (client_error_log kind "boundary", ~18 events, 7 users in two days). The two guards below are the well-known workaround
 * (React issue #11538): when the reference node is not a child, do nothing instead of throwing. Idempotent, client only.
 */
let installed = false;

export function installDomTranslateGuard(): void {
  if (installed || typeof window === "undefined" || typeof Node !== "function" || !Node.prototype) return;
  installed = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
