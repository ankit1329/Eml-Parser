## Extra modernization ideas (to review later)

- **API ergonomics / DX**
  - Factory helpers like `fromEmlBuffer` / `fromMsgBuffer` that wrap `new EmlParser(fileReadStream)`.
  - Clear option objects for highlighting and PDF conversion (e.g. `HighlightOptions`, `PdfRenderOptions`).

- **Safety & correctness**
  - Optional HTML sanitization or a documented \"safe mode\" for `getEmailAsHtml` / `getMessageAsHtml`.
  - Safer keyword highlighting: escape regex special characters and guard against pathological patterns.
  - Centralized charset / encoding handling and documented supported encodings.

- **Extensibility**
  - Pluggable PDF backend (adapter interface around `html-pdf`, with possible `puppeteer` support later).
  - Custom keyword highlighter hook (e.g. `highlight(text, options) => text`).

- **Observability / debugging**
  - Structured error types with codes like `EML_PARSE_ERROR`, `MSG_PARSE_ERROR`, `PDF_RENDER_ERROR`.
  - Optional logger or `onDebug` callback for advanced consumers.

- **Runtime & distribution**
  - More tree-shakeable internal structure with named exports for advanced users.
  - Clarified `sideEffects` configuration in `package.json`.

- **Examples & ecosystem**
  - `examples/` directory with runnable Node and TS examples.
  - Recipe-style docs for common tasks (saving attachments, HTTP streaming, web UI rendering).

- **Quality & maintenance**
  - Simple benchmark script for large `.eml` / `.msg` files.
  - GitHub issue and PR templates for better bug reports and contributions.

