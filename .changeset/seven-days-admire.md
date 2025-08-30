---
"writable-dom": patch
---

Allow inline script/style tags to be injected without waiting for a nextSibling or final flush. (Checks if last flush ended with the closing tag).
