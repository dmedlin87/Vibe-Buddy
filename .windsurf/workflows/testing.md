---
description: expand critical coverage with vitest + react testing library
---

# Testing workflow

1. Install test tooling (Vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom).
2. Add Vitest config in vite.config.ts test block (environment jsdom, globals true, setupFiles).
3. Create test setup file to extend expect with jest-dom matchers.
4. Add npm scripts: "test", "test:watch", "test:coverage".
5. Write focused tests for critical components/services covering edge cases and interactions.
6. Run tests and ensure coverage passes.
