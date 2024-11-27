---
"writable-dom": patch
---

Fixes an issue where an inline host node
would remain empty if it was the last node in
the tree and a blocking node was encountered.
