# 📧 eml-parser

[![npm version](https://img.shields.io/npm/v/eml-parser.svg)](https://www.npmjs.com/package/eml-parser)
[![license](https://img.shields.io/npm/l/eml-parser.svg)](https://github.com/ankit1329/Eml-Parser/blob/master/LICENSE)
[![CI](https://github.com/ankit1329/Eml-Parser/actions/workflows/ci.yml/badge.svg)](https://github.com/ankit1329/Eml-Parser/actions/workflows/ci.yml)

> Parse `.eml` and `.msg` files, extract headers and attachments, or convert messages to PDF / HTML / image formats.

## ✨ Features

- 📨 **Parse** `.eml` and `.msg` email files
- 📋 **Extract** headers, body, attachments, and embedded files
- 🎨 **Render** emails as complete HTML documents with an Outlook-style header (avatar, recipients, date)
- 🔗 **Expand / collapse** long recipient lists with a CSS-only toggle — no JavaScript
- 🔍 **Highlight** keywords in email body with `<mark>` tags
- 📄 **Convert** emails to PDF, PNG, or JPEG (stream or buffer)
- 🔤 **TypeScript** declarations included out of the box
- ⚡ Requires **Node.js 18+**

---

## 📖 Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [TypeScript](#-typescript)
- [API Reference](#-api-reference)
  - [Constructor](#constructor)
  - [Shared Options](#shared-options)
  - [.eml Methods](#eml-methods)
  - [.msg Methods](#msg-methods)
- [HTML Output](#-html-output)
- [Keyword Highlighting](#-keyword-highlighting)
- [License](#-license)

---

## 📦 Installation

```bash
npm install eml-parser
```

Requires **Node.js 18 or later**.

---

## 🚀 Quick Start

### .eml file

```js
const fs = require('fs');
const EmlParser = require('eml-parser');

const parser = new EmlParser(fs.createReadStream('./email.eml'));

// Get headers
const headers = await parser.getEmailHeaders();
console.log(headers.subject, headers.from, headers.to);

// Get full HTML (with styled header)
const html = await parser.getEmailAsHtml();
fs.writeFileSync('email.html', html);

// Extract attachments
const attachments = await parser.getEmailAttachments();
for (const att of attachments) {
  fs.writeFileSync(att.filename, att.content);
}
```

### .msg file

```js
const parser = new EmlParser(fs.createReadStream('./email.msg'));

const headers = await parser.getMessageHeaders();
console.log(headers.subject, headers.from, headers.to);

const html = await parser.getMessageAsHtml();
fs.writeFileSync('email.html', html);
```

### Convert to PDF

```js
const parser = new EmlParser(fs.createReadStream('./email.eml'));
const stream = await parser.convertEmailToStream('pdf');
stream.pipe(fs.createWriteStream('email.pdf'));
```

> All methods return Promises — use `async/await` (shown above) or `.then()/.catch()`.

---

## 🔤 TypeScript

This package ships with `index.d.ts` — no extra `@types` package needed.

```ts
import fs from 'fs';
import EmlParser, { EmailHeaders, HighlightOptions } from 'eml-parser';

const parser = new EmlParser(fs.createReadStream('./email.eml'));
const headers: EmailHeaders = await parser.getEmailHeaders();

const html: string = await parser.getEmailAsHtml({
  highlightKeywords: ['invoice'],
  includeSubject: false,
});
```

### Available Types

| Type | Description |
|------|-------------|
| `Address` | `{ name: string, address: string }` |
| `EmailHeaders` | Parsed `.eml` headers (subject, from, to, cc, date, messageId, inReplyTo) |
| `MessageHeaders` | Parsed `.msg` headers (subject, from, to, cc, date) |
| `HighlightOptions` | `{ highlightKeywords?: string[], highlightCaseSensitive?: boolean }` |
| `ParseEmlOptions` | `HighlightOptions & { ignoreEmbedded?: boolean }` |
| `ParseMsgOptions` | `HighlightOptions` |

---

## 📋 API Reference

### Constructor

```js
const parser = new EmlParser(readableStream);
```

| Param | Type | Description |
|-------|------|-------------|
| `readableStream` | `Readable` | A Node.js [readable stream](https://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options) pointing to an `.eml` or `.msg` file |

> **One parser per file.** Create a new `EmlParser` instance for each file you want to process.

---

### Shared Options

These options are accepted by multiple methods. They are documented here once and referenced below.

#### HighlightOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `highlightKeywords` | `string[]` | — | Keywords to wrap with `<mark>` tags in the email HTML |
| `highlightCaseSensitive` | `boolean` | `false` | When `true`, matches keywords case-sensitively |

See [Keyword Highlighting](#-keyword-highlighting) for details and examples.

#### Conversion Parameters

These apply to `convertEmailToStream`, `convertEmailToBuffer`, `convertMessageToStream`, and `convertMessageToBuffer`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `'pdf' \| 'jpeg' \| 'png'` | `'pdf'` | Output format |
| `orientation` | `'potrait' \| 'landscape'` | `'landscape'` | Page orientation |
| `format` | `'A3' \| 'A4' \| 'A5' \| 'Legal' \| 'Letter' \| 'Tabloid'` | — | Page size |
| `options` | `HighlightOptions` | — | Keyword highlighting options |

---

### .eml Methods

#### `parseEml(options?)`

Parse the full `.eml` file. Returns the complete parsed email object.

| Param | Type | Description |
|-------|------|-------------|
| `options.ignoreEmbedded` | `boolean` | When `true`, excludes embedded files from the attachments array |
| `options.highlightKeywords` | `string[]` | Keywords to highlight — see [HighlightOptions](#highlightoptions) |
| `options.highlightCaseSensitive` | `boolean` | Case-sensitive matching — see [HighlightOptions](#highlightoptions) |

**Returns:** `Promise<ParsedMail>` — the full parsed email with these key properties:

```ts
{
  subject: string;
  from: { value: Address[] };
  to: { value: Address[] };
  cc: { value: Address[] };
  date: Date;
  messageId: string;
  inReplyTo: string;
  html: string;           // HTML body (with highlights applied if requested)
  text: string;           // Plain text body
  textAsHtml: string;     // Plain text converted to HTML
  attachments: Attachment[];
  headers: Map;
  headerLines: object[];
  references: string;
}
```

```js
const result = await parser.parseEml({ ignoreEmbedded: true });
console.log(result.subject, result.html);
```

---

#### `getEmailHeaders()`

Extract a simplified headers object from the `.eml` file.

**Returns:** `Promise<EmailHeaders>`

```ts
{
  subject: string;
  from: Address[];     // [{ name: 'John', address: 'john@example.com' }]
  to: Address[];
  cc?: Address[];
  date: Date;
  inReplyTo?: string;
  messageId: string;
}
```

```js
const headers = await parser.getEmailHeaders();
console.log(headers.subject);
console.log(headers.from[0].name, headers.from[0].address);
```

---

#### `getEmailBodyHtml(options?)`

Get the email body as an HTML string — **without** headers (subject, from, to, etc.).

| Param | Type | Description |
|-------|------|-------------|
| `options` | `HighlightOptions` | Keyword highlighting — see [HighlightOptions](#highlightoptions) |

**Returns:** `Promise<string>`

```js
const bodyHtml = await parser.getEmailBodyHtml();
fs.writeFileSync('body.html', bodyHtml);
```

---

#### `getEmailAsHtml(options?)`

Get the **complete email** as a full HTML document (`<!DOCTYPE html>`) with an Outlook-style header section and the email body. See [HTML Output](#-html-output) for details on the rendered layout.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.includeSubject` | `boolean` | `true` | Set to `false` to hide the subject line |
| `options.highlightKeywords` | `string[]` | — | See [HighlightOptions](#highlightoptions) |
| `options.highlightCaseSensitive` | `boolean` | `false` | See [HighlightOptions](#highlightoptions) |

**Returns:** `Promise<string>` — a complete HTML5 document string

```js
const html = await parser.getEmailAsHtml({ includeSubject: false });
fs.writeFileSync('email.html', html);
```

---

#### `convertEmailToStream(type?, orientation?, format?, options?)`

Convert the email to a readable stream in PDF, PNG, or JPEG format. Pipe the result to a writable stream to save to a file.

See [Conversion Parameters](#conversion-parameters) for the parameter details.

**Returns:** `Promise<Readable>`

```js
const stream = await parser.convertEmailToStream('pdf', 'landscape', 'A4');
stream.pipe(fs.createWriteStream('email.pdf'));
```

---

#### `convertEmailToBuffer(type?, orientation?, format?, options?)`

Convert the email to a Buffer in PDF, PNG, or JPEG format.

See [Conversion Parameters](#conversion-parameters) for the parameter details.

**Returns:** `Promise<Buffer>`

```js
const buffer = await parser.convertEmailToBuffer('png');
fs.writeFileSync('email.png', buffer);
```

---

#### `getEmailAttachments(options?)`

Extract attachments from the `.eml` file.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.ignoreEmbedded` | `boolean` | `false` | When `true`, excludes embedded files (e.g. inline images) |

**Returns:** `Promise<Attachment[]>` — each attachment has `filename`, `content` (Buffer), `contentType`, etc.

```js
const attachments = await parser.getEmailAttachments({ ignoreEmbedded: true });
for (const att of attachments) {
  fs.writeFileSync(att.filename, att.content);
}
```

---

#### `getEmailEmbeddedFiles()`

Extract only embedded files (e.g. inline images) — excludes regular attachments.

**Returns:** `Promise<Attachment[]>`

```js
const embedded = await parser.getEmailEmbeddedFiles();
for (const file of embedded) {
  fs.writeFileSync(file.filename, file.content);
}
```

---

### .msg Methods

#### `parseMsg(options?)`

Parse the full `.msg` file. Returns the complete parsed message object.

| Param | Type | Description |
|-------|------|-------------|
| `options.highlightKeywords` | `string[]` | Keywords to highlight — see [HighlightOptions](#highlightoptions) |
| `options.highlightCaseSensitive` | `boolean` | Case-sensitive matching — see [HighlightOptions](#highlightoptions) |

**Returns:** `Promise<object>` — the parsed message with these key properties:

```ts
{
  subject: string;
  senderName: string;
  senderEmail: string;
  recipients: [{
    name: string;
    email: string;
    recipType: 'to' | 'cc';
  }];
  body: string;
  html: string;
  attachments: Attachment[];
  messageDeliveryTime: string;
  creationTime: string;
  headers: string;
  // ...and more (messageClass, internetCodepage, etc.)
}
```

```js
const parser = new EmlParser(fs.createReadStream('./email.msg'));
const result = await parser.parseMsg();
console.log(result.subject, result.senderName);
```

---

#### `getMessageHeaders()`

Extract a simplified headers object from the `.msg` file.

**Returns:** `Promise<MessageHeaders>`

```ts
{
  subject: string;
  from: Address[];     // [{ name: 'John', address: 'john@example.com' }]
  to: Address[];
  cc: Address[];
  date: string | Date;
}
```

```js
const headers = await parser.getMessageHeaders();
console.log(headers.subject, headers.from[0].name);
```

---

#### `getMessageBodyHtml(options?)`

Get the message body as an HTML string — **without** headers (subject, from, to, etc.).

| Param | Type | Description |
|-------|------|-------------|
| `options` | `HighlightOptions` | Keyword highlighting — see [HighlightOptions](#highlightoptions) |

**Returns:** `Promise<string>`

```js
const bodyHtml = await parser.getMessageBodyHtml();
fs.writeFileSync('body.html', bodyHtml);
```

---

#### `getMessageAsHtml(options?)`

Get the **complete message** as a full HTML document (`<!DOCTYPE html>`) with an Outlook-style header section and the message body. See [HTML Output](#-html-output) for details.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `options.includeSubject` | `boolean` | `true` | Set to `false` to hide the subject line |
| `options.highlightKeywords` | `string[]` | — | See [HighlightOptions](#highlightoptions) |
| `options.highlightCaseSensitive` | `boolean` | `false` | See [HighlightOptions](#highlightoptions) |

**Returns:** `Promise<string>`

```js
const parser = new EmlParser(fs.createReadStream('./email.msg'));
const html = await parser.getMessageAsHtml({ includeSubject: true });
fs.writeFileSync('message.html', html);
```

---

#### `convertMessageToStream(type?, orientation?, format?, options?)`

Convert the message to a readable stream in PDF, PNG, or JPEG format.

See [Conversion Parameters](#conversion-parameters) for the parameter details.

**Returns:** `Promise<Readable>`

```js
const parser = new EmlParser(fs.createReadStream('./email.msg'));
const stream = await parser.convertMessageToStream('pdf');
stream.pipe(fs.createWriteStream('message.pdf'));
```

---

#### `convertMessageToBuffer(type?, orientation?, format?, options?)`

Convert the message to a Buffer in PDF, PNG, or JPEG format.

See [Conversion Parameters](#conversion-parameters) for the parameter details.

**Returns:** `Promise<Buffer>`

```js
const parser = new EmlParser(fs.createReadStream('./email.msg'));
const buffer = await parser.convertMessageToBuffer('jpeg');
fs.writeFileSync('message.jpeg', buffer);
```

---

#### `getMessageAttachments()`

Extract attachments from the `.msg` file.

**Returns:** `Promise<Attachment[]>` — each attachment has `filename`, `content` (Buffer), `contentType`, etc.

```js
const parser = new EmlParser(fs.createReadStream('./email.msg'));
const attachments = await parser.getMessageAttachments();
for (const att of attachments) {
  fs.writeFileSync(att.filename, att.content);
}
```

---

## 🎨 HTML Output

`getEmailAsHtml()` and `getMessageAsHtml()` return a complete HTML5 document with an **Outlook-style header**:

```
┌─────────────────────────────────────────────────────┐
│  [J]  John Doe  <john@example.com>                  │
│  To: alice@...; bob@...; charlie@...  17 Mar 2026   │
│  Cc: dave@...; +4 more                              │
│─────────────────────────────────────────────────────│
│                                                     │
│  (email body)                                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Layout details:**
- **Circular avatar** with the sender's initial (color: teal)
- **From** name and email address on the first row
- **To** recipients and formatted date on the second row
- **Cc** recipients on the third row
- **Long recipient lists** (more than 3) are automatically truncated with a **"+N more"** toggle that expands on click — pure CSS, no JavaScript

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includeSubject` | `boolean` | `true` | Show or hide the `<h2>` subject heading above the header |

---

## 🔍 Keyword Highlighting

Any method that accepts `HighlightOptions` can highlight keywords in the email's HTML body by wrapping matches in `<mark>` tags.

```js
const html = await parser.getEmailAsHtml({
  highlightKeywords: ['invoice', 'payment due'],
  highlightCaseSensitive: false,  // default
});
// Matches are wrapped: <mark>invoice</mark>
```

- Regex special characters in keywords are automatically escaped — safe to pass user input
- When `highlightCaseSensitive` is `false` (default), matching is case-insensitive
- Highlighting is applied to `html` content first; falls back to `textAsHtml` for plain-text emails
- Works with `parseEml`, `parseMsg`, `getEmailBodyHtml`, `getMessageBodyHtml`, `getEmailAsHtml`, `getMessageAsHtml`, and all conversion methods

---

## 📄 License

[MIT](LICENSE) © [Ankit Prakash](https://www.linkedin.com/in/ankit1329)
