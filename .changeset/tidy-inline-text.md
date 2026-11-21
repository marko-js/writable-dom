---
"writable-dom": patch
---

Avoid duplicating inline script and style text when traversal resumes. Keep partial inline content inert when chunks end in tag-like text, and recognize closing tags split across writes.
