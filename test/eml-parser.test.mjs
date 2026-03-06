import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import EmlParser from '../index.js';

const simpleEml = [
  'From: "Foo Bar" <foo@example.com>',
  'To: "Baz Qux" <baz@example.com>',
  'Subject: Test email',
  'Date: Fri, 01 Jan 2021 00:00:00 +0000',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Hello world',
].join('\r\n');

const createStream = (content) => {
  return Readable.from([content]);
};

test('parses basic headers from EML', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const headers = await parser.getEmailHeaders();

  assert.equal(headers.subject, 'Test email');
  assert.equal(headers.from[0].address, 'foo@example.com');
  assert.equal(headers.to[0].address, 'baz@example.com');
});

test('returns body html from EML', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const bodyHtml = await parser.getEmailBodyHtml();

  assert.ok(bodyHtml.toLowerCase().includes('hello world'));
});

test('highlights keywords in body', async () => {
  const parser = new EmlParser(createStream(simpleEml));
  const bodyHtml = await parser.getEmailBodyHtml({
    highlightKeywords: ['world'],
  });

  assert.ok(bodyHtml.includes('<mark>world</mark>'));
});

