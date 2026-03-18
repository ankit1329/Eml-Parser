import { Readable } from 'stream';
import { ParsedMail } from 'mailparser';

export interface Address {
  name: string;
  address: string;
}

export interface EmailHeaders {
  subject: string;
  from: Address[];
  to: Address[];
  cc?: Address[];
  date: Date;
  inReplyTo?: string;
  messageId: string;
}

export interface MessageHeaders {
  subject: string;
  from: Address[];
  to: Address[];
  cc: Address[];
  date: string | Date;
}

export interface HighlightOptions {
  highlightKeywords?: string[];
  highlightCaseSensitive?: boolean;
}

export interface ParseEmlOptions extends HighlightOptions {
  ignoreEmbedded?: boolean;
}

export interface ParseMsgOptions extends HighlightOptions {}

export type EmailAttachment = any;
export type MessageAttachment = any;

export class EmlParser {
  constructor(fileReadStream: Readable);

  parseEml(options?: ParseEmlOptions): Promise<ParsedMail>;

  parseMsg(options?: ParseMsgOptions): Promise<any>;

  getEmailHeaders(): Promise<EmailHeaders>;

  getMessageHeaders(): Promise<MessageHeaders>;

  getEmailBodyHtml(options?: HighlightOptions): Promise<string>;

  getMessageBodyHtml(options?: HighlightOptions): Promise<string>;

  getEmailAsHtml(options?: HighlightOptions & { includeSubject?: boolean }): Promise<string>;

  getMessageAsHtml(options?: HighlightOptions & { includeSubject?: boolean }): Promise<string>;

  convertEmailToStream(
    type?: 'pdf' | 'jpeg' | 'png',
    orientation?: 'potrait' | 'landscape',
    format?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid',
    outerOptions?: HighlightOptions
  ): Promise<Readable>;

  convertMessageToStream(
    type?: 'pdf' | 'jpeg' | 'png',
    orientation?: 'potrait' | 'landscape',
    format?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid',
    outerOptions?: HighlightOptions
  ): Promise<Readable>;

  convertEmailToBuffer(
    type?: 'pdf' | 'jpeg' | 'png',
    orientation?: 'potrait' | 'landscape',
    format?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid',
    outerOptions?: HighlightOptions
  ): Promise<Buffer>;

  convertMessageToBuffer(
    type?: 'pdf' | 'jpeg' | 'png',
    orientation?: 'potrait' | 'landscape',
    format?: 'A3' | 'A4' | 'A5' | 'Legal' | 'Letter' | 'Tabloid',
    outerOptions?: HighlightOptions
  ): Promise<Buffer>;

  getEmailAttachments(options?: { ignoreEmbedded?: boolean }): Promise<EmailAttachment[]>;

  getMessageAttachments(): Promise<MessageAttachment[]>;

  getEmailEmbeddedFiles(): Promise<EmailAttachment[]>;
}

export = EmlParser;

