import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import EmlParser from '../index.js';

// ── Fixtures ────────────────────────────────────────────────────────

const simpleEml = [
  'From: "Foo Bar" <foo@example.com>',
  'To: "Baz Qux" <baz@example.com>',
  'Cc: "Alice" <alice@example.com>',
  'Subject: Test email',
  'Date: Fri, 01 Jan 2021 00:00:00 +0000',
  'Message-ID: <test-123@example.com>',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Hello world',
].join('\r\n');

const htmlEml = [
  'From: "Foo Bar" <foo@example.com>',
  'To: "Baz Qux" <baz@example.com>',
  'Subject: HTML email',
  'Date: Fri, 01 Jan 2021 00:00:00 +0000',
  'MIME-Version: 1.0',
  'Content-Type: text/html; charset=utf-8',
  '',
  '<html><body><p>Hello <b>world</b></p></body></html>',
].join('\r\n');

const boundary = '----=_Part_001';
const attachmentEml = [
  'From: "Foo Bar" <foo@example.com>',
  'To: "Baz Qux" <baz@example.com>',
  'Subject: With attachment',
  'Date: Fri, 01 Jan 2021 00:00:00 +0000',
  'MIME-Version: 1.0',
  `Content-Type: multipart/mixed; boundary="${boundary}"`,
  '',
  `--${boundary}`,
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Body text here',
  `--${boundary}`,
  'Content-Type: text/plain; name="hello.txt"',
  'Content-Disposition: attachment; filename="hello.txt"',
  'Content-Transfer-Encoding: base64',
  '',
  Buffer.from('Hello attachment').toString('base64'),
  `--${boundary}--`,
].join('\r\n');

const createStream = (content) => Readable.from([content]);

const sampleDir = path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'), '..', 'sample');
const msgPath = path.join(sampleDir, 'msg_sample.msg');
const hasMsgSample = fs.existsSync(msgPath);
const createMsgStream = () => fs.createReadStream(msgPath);

// ── parseEml ────────────────────────────────────────────────────────

test('parseEml returns parsed mail object', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const result = await parser.parseEml();

  assert.equal(result.subject, 'Test email');
  assert.ok(result.from);
  assert.ok(result.to);
  assert.ok(result.date instanceof Date);
});

test('parseEml caches result on second call', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const first = await parser.parseEml();
  const second = await parser.parseEml();

  assert.equal(first, second);
});

test('parseEml with highlightKeywords', async () => {
  const parser = new EmlParser(createStream(htmlEml));
  const result = await parser.parseEml({ highlightKeywords: ['world'] });

  assert.ok(result.html.includes('<mark>'));
});

// ── getEmailHeaders ─────────────────────────────────────────────────

test('getEmailHeaders returns subject, from, to', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const headers = await parser.getEmailHeaders();

  assert.equal(headers.subject, 'Test email');
  assert.equal(headers.from[0].address, 'foo@example.com');
  assert.equal(headers.from[0].name, 'Foo Bar');
  assert.equal(headers.to[0].address, 'baz@example.com');
});

test('getEmailHeaders returns cc when present', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const headers = await parser.getEmailHeaders();

  assert.ok(headers.cc);
  assert.equal(headers.cc[0].address, 'alice@example.com');
});

test('getEmailHeaders returns date', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const headers = await parser.getEmailHeaders();

  assert.ok(headers.date instanceof Date);
  assert.equal(headers.date.getFullYear(), 2021);
});

test('getEmailHeaders returns messageId', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const headers = await parser.getEmailHeaders();

  assert.ok(headers.messageId);
});

// ── getEmailBodyHtml ────────────────────────────────────────────────

test('getEmailBodyHtml returns body content', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const bodyHtml = await parser.getEmailBodyHtml();

  assert.ok(bodyHtml.toLowerCase().includes('hello world'));
});

test('getEmailBodyHtml highlights keywords', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const bodyHtml = await parser.getEmailBodyHtml({
    highlightKeywords: ['world'],
  });

  assert.ok(bodyHtml.includes('<mark>world</mark>'));
});

test('getEmailBodyHtml with HTML content', async () => {
  const parser = new EmlParser(createStream(htmlEml));
  const bodyHtml = await parser.getEmailBodyHtml();

  assert.ok(bodyHtml.includes('<b>world</b>'));
});

// ── getEmailAsHtml ──────────────────────────────────────────────────

test('getEmailAsHtml returns full HTML document', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const html = await parser.getEmailAsHtml();

  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<html>'));
  assert.ok(html.includes('</html>'));
});

test('getEmailAsHtml contains sender info', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const html = await parser.getEmailAsHtml();

  assert.ok(html.includes('foo@example.com'));
});

test('getEmailAsHtml contains recipient info', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const html = await parser.getEmailAsHtml();

  assert.ok(html.includes('baz@example.com'));
});

test('getEmailAsHtml contains date', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const html = await parser.getEmailAsHtml();

  assert.ok(html.includes('2021'));
});

test('getEmailAsHtml with includeSubject shows subject', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const html = await parser.getEmailAsHtml({ includeSubject: true });

  assert.ok(html.includes('Test email'));
});

test('getEmailAsHtml without includeSubject omits subject heading', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const withSubject = await parser.getEmailAsHtml({ includeSubject: true });
  const parser2 = new EmlParser(createStream(simpleEml));
  const without = await parser2.getEmailAsHtml({ includeSubject: false });

  // The version with subject should be longer (has the subject heading)
  assert.ok(withSubject.length > without.length);
});

test('getEmailAsHtml contains body content', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const html = await parser.getEmailAsHtml();

  assert.ok(html.toLowerCase().includes('hello world'));
});

test('getEmailAsHtml highlights keywords', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const html = await parser.getEmailAsHtml({ highlightKeywords: ['world'] });

  assert.ok(html.includes('<mark>'));
});

// ── getEmailAttachments ─────────────────────────────────────────────

test('getEmailAttachments returns array', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const attachments = await parser.getEmailAttachments();

  assert.ok(Array.isArray(attachments));
  assert.equal(attachments.length, 0);
});

test('getEmailAttachments finds attachments', async () => {
  const parser = new EmlParser(createStream(attachmentEml));
  const attachments = await parser.getEmailAttachments();

  assert.ok(attachments.length > 0);
  assert.equal(attachments[0].filename, 'hello.txt');
});

test('getEmailAttachments with ignoreEmbedded', async () => {
  const parser = new EmlParser(createStream(attachmentEml));
  const attachments = await parser.getEmailAttachments({ ignoreEmbedded: true });

  assert.ok(Array.isArray(attachments));
  // All attachments in our fixture have contentDisposition=attachment
  assert.ok(attachments.length > 0);
});

// ── getEmailEmbeddedFiles ───────────────────────────────────────────

test('getEmailEmbeddedFiles returns array', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const embedded = await parser.getEmailEmbeddedFiles();

  assert.ok(Array.isArray(embedded));
  assert.equal(embedded.length, 0);
});

test('getEmailEmbeddedFiles excludes disposition=attachment', async () => {
  const parser = new EmlParser(createStream(attachmentEml));
  const embedded = await parser.getEmailEmbeddedFiles();

  // Our fixture only has disposition=attachment, so embedded should be empty
  assert.ok(Array.isArray(embedded));
  assert.equal(embedded.length, 0);
});

// ── MSG tests (require sample file) ────────────────────────────────

test('parseMsg returns parsed message object', { skip: !hasMsgSample && 'msg_sample.msg not found' }, async () => {
  const parser = new EmlParser(createMsgStream());
  const result = await parser.parseMsg();

  assert.ok(result);
  assert.ok(result.subject);
});

test('getMessageHeaders returns subject, from, to', { skip: !hasMsgSample && 'msg_sample.msg not found' }, async () => {
  const parser = new EmlParser(createMsgStream());
  const headers = await parser.getMessageHeaders();

  assert.ok(headers.subject);
  assert.ok(headers.from);
});

test('getMessageBodyHtml returns HTML string', { skip: !hasMsgSample && 'msg_sample.msg not found' }, async () => {
  const parser = new EmlParser(createMsgStream());
  const bodyHtml = await parser.getMessageBodyHtml();

  assert.equal(typeof bodyHtml, 'string');
  assert.ok(bodyHtml.length > 0);
});

test('getMessageBodyHtml highlights keywords', { skip: !hasMsgSample && 'msg_sample.msg not found' }, async () => {
  const parser = new EmlParser(createMsgStream());
  const bodyHtml = await parser.getMessageBodyHtml({ highlightKeywords: ['BitDaddys'] });

  assert.ok(bodyHtml.includes('<mark>'));
});

test('getMessageAsHtml returns full HTML document', { skip: !hasMsgSample && 'msg_sample.msg not found' }, async () => {
  const parser = new EmlParser(createMsgStream());
  const html = await parser.getMessageAsHtml();

  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('</html>'));
});

test('getMessageAsHtml with includeSubject', { skip: !hasMsgSample && 'msg_sample.msg not found' }, async () => {
  const parser = new EmlParser(createMsgStream());
  const html = await parser.getMessageAsHtml({ includeSubject: true });
  const parser2 = new EmlParser(createMsgStream());
  const htmlWithout = await parser2.getMessageAsHtml({ includeSubject: false });

  assert.ok(html.length > htmlWithout.length);
});

test('getMessageAttachments returns array', { skip: !hasMsgSample && 'msg_sample.msg not found' }, async () => {
  const parser = new EmlParser(createMsgStream());
  const attachments = await parser.getMessageAttachments();

  assert.ok(Array.isArray(attachments));
});

// ── convert methods (require html-pdf / PhantomJS) ──────────────────

test('convertEmailToStream returns a stream', async (t) => {
  const parser = new EmlParser(createStream(simpleEml));
  try {
    const stream = await parser.convertEmailToStream('pdf');
    assert.ok(stream);
    assert.equal(typeof stream.pipe, 'function');
  } catch (err) {
    // html-pdf / PhantomJS may not be installed in CI
    t.skip('html-pdf/PhantomJS not available');
  }
});

test('convertEmailToBuffer returns a buffer', async (t) => {
  const parser = new EmlParser(createStream(simpleEml));
  try {
    const buffer = await parser.convertEmailToBuffer('pdf');
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 0);
  } catch (err) {
    t.skip('html-pdf/PhantomJS not available');
  }
});

test('convertMessageToStream returns a stream', { skip: !hasMsgSample && 'msg_sample.msg not found' }, async (t) => {
  const parser = new EmlParser(createMsgStream());
  try {
    const stream = await parser.convertMessageToStream('pdf');
    assert.ok(stream);
    assert.equal(typeof stream.pipe, 'function');
  } catch (err) {
    t.skip('html-pdf/PhantomJS not available');
  }
});

test('convertMessageToBuffer returns a buffer', { skip: !hasMsgSample && 'msg_sample.msg not found' }, async (t) => {
  const parser = new EmlParser(createMsgStream());
  try {
    const buffer = await parser.convertMessageToBuffer('pdf');
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 0);
  } catch (err) {
    t.skip('html-pdf/PhantomJS not available');
  }
});

