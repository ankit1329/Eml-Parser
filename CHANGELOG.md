## 2.1.0 - Modernization & header redesign

- Add TypeScript declaration file `index.d.ts` with full typings for `EmlParser`.
- Refine keyword highlighting with safer regular expressions.
- Add JSDoc documentation to public API and key helpers.
- Introduce ESLint, Prettier, and Node's built-in test runner with initial tests.
- Require Node.js >= 18 and refresh core dependencies (`mailparser`, `@kenjiuno/msgreader`, `iconv-lite`, `rtf-stream-parser`).
- `getEmailAsHtml` / `getMessageAsHtml` now produce a complete HTML5 document (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`) with an Outlook-style header section:
  - Circular avatar with sender initial.
  - From name and address on the first row.
  - To recipients and formatted date on the second row.
  - Cc recipients on the third row.
- Long To/Cc recipient lists are automatically truncated after 3 visible entries with a CSS-only "+N more" toggle that expands to show all recipients (no JavaScript required).
- Cc line now uses the same flex layout and spacing as the To line for visual consistency.
- `includeSubject` option (defaults to `true`) to show or hide the subject heading.
- Email body is now wrapped in a `<div>` instead of `<p>` to allow valid block-level HTML content.
- Test script scoped to `test/` directory to prevent `sample/*.ts` files from being auto-discovered by `node --test`.
- Expanded unit tests from 3 to 34, covering all 16 public methods.

