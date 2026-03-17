/**
 * @typedef {Object} HighlightOptions
 * @property {string[]} [highlightKeywords] Keywords to highlight in HTML/textAsHtml.
 * @property {boolean} [highlightCaseSensitive] When true, performs a case-sensitive match.
 */

/**
 * @typedef {Object} ParseEmlOptions
 * @property {boolean} [ignoreEmbedded] When true, embedded files are removed from attachments.
 * @property {string[]} [highlightKeywords]
 * @property {boolean} [highlightCaseSensitive]
 */

/**
 * @typedef {Object} ParseMsgOptions
 * @property {string[]} [highlightKeywords]
 * @property {boolean} [highlightCaseSensitive]
 */

const simpleParser = require('mailparser').simpleParser;
const pdf = require('html-pdf');
const MsgReader = require('@kenjiuno/msgreader').default;
const decompressRTF = require('@kenjiuno/decompressrtf').decompressRTF;
const iconv = require('iconv-lite');
const rtfParser = require('rtf-stream-parser');

const isStringsArray = (arr) => Array.isArray(arr) && arr.every((i) => typeof i === 'string');

/**
 * Escape a string so it can be used safely inside a RegExp.
 *
 * @param {string} value
 * @returns {string}
 */
const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Apply keyword highlighting in-place to a parsed email-like object that
 * exposes `html` and/or `textAsHtml` properties.
 *
 * @param {{ html?: string, textAsHtml?: string }} emailLike
 * @param {HighlightOptions | undefined} options
 */
const highlightHtmlInPlace = (emailLike, options) => {
  if (!options || !options.highlightKeywords || !isStringsArray(options.highlightKeywords)) {
    return;
  }

  const flags = options.highlightCaseSensitive ? 'g' : 'gi';

  options.highlightKeywords.forEach((keyword) => {
    if (!keyword) return;
    const safePattern = escapeRegExp(keyword);
    const re = new RegExp(safePattern, flags);

    if (emailLike.html) {
      emailLike.html = emailLike.html.replace(re, (str) => `<mark>${str}</mark>`);
    } else if (emailLike.textAsHtml) {
      emailLike.textAsHtml = emailLike.textAsHtml.replace(re, (str) => `<mark>${str}</mark>`);
    }
  });
};

/**
 * Collect all data from a readable stream into a single Buffer.
 *
 * @param {import('stream').Readable} stream
 * @returns {Promise<Buffer>}
 */
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });

/**
 * Format a Date as "17 Mar 2026, 09:59 PM".
 *
 * @param {Date|string} date
 * @returns {string}
 */
const formatHeaderDate = (date) => {
  const d = new Date(date);
  const day = d.getDate();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

/**
 * Generate an inline circular avatar with the first letter of the given name.
 *
 * @param {string} name
 * @returns {string} HTML string for the avatar element.
 */
const getInitialAvatar = (name) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  return `<div style="width:36px;height:36px;border-radius:50%;background-color:#00897B;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:16px;flex-shrink:0;">${initial}</div>`;
};

/**
 * EmlParser wraps a readable stream for `.eml` or `.msg` content and exposes
 * a set of convenience methods to parse, inspect and convert the message.
 *
 * @constructor
 * @param {import('stream').Readable} fileReadStream Node.js readable stream pointing to an .eml or .msg file.
 */
module.exports = EmlParser = function (fileReadStream) {
    this.parsedEmail = undefined;

    /**
     * Parse the underlying `.eml` stream using `mailparser` and cache the result.
     *
     * @param {ParseEmlOptions} [options]
     * @returns {Promise<import('mailparser').ParsedMail>}
     */
    this.parseEml = (options) => {
        return new Promise((resolve, reject) => {
            if (this.parsedEmail) {
                resolve(this.parsedEmail);
            } else {
                simpleParser(fileReadStream, {})
                    .then(result => {
                        if (options && options.ignoreEmbedded) {
                            result.attachments = result.attachments.filter(att => att.contentDisposition === 'attachment');
                        }
                        highlightHtmlInPlace(result, options);
                        this.parsedEmail = result;
                        resolve(this.parsedEmail);
                    })
                    .catch(err => {
                        reject(err);
                    });
            }
        })
    }

    /**
     * Parse the underlying `.msg` stream using `@kenjiuno/msgreader` and cache the result.
     *
     * @param {ParseMsgOptions} [options]
     * @returns {Promise<unknown>} Parsed message object as returned by msgreader.
     */
    this.parseMsg = async (options) => {
        let buffer = await streamToBuffer(fileReadStream)
        let emailData = new MsgReader(buffer)
        this.parsedEmail = emailData.getFileData();
        if (this.parsedEmail.compressedRtf) {
            let outputArray = decompressRTF(this.parsedEmail.compressedRtf);
            let decompressedRtf = Buffer.from(outputArray).toString("ascii");
            this.parsedEmail.html = rtfParser.deEncapsulateSync(decompressedRtf, { decode: iconv.decode }).text;
        } else if (this.parsedEmail.bodyHtml) {
            this.parsedEmail.html = this.parsedEmail.bodyHtml;
        } else if (this.parsedEmail.body) {
            this.parsedEmail.html = `<pre>${this.parsedEmail.body}</pre>`;
        } else if (this.parsedEmail.html && this.parsedEmail.html instanceof Uint8Array) {
            // decode Uint8Array html to string
            this.parsedEmail.html = Buffer.from(this.parsedEmail.html).toString('utf8');
        } else if (this.parsedEmail.html && typeof this.parsedEmail.html === 'string') {
            // already a string, use as is
            // nothing to do
        } else {
            this.parsedEmail.html = '';
        }

        if (this.parsedEmail.attachments && Array.isArray(this.parsedEmail.attachments)) {
            this.parsedEmail.attachments = this.parsedEmail.attachments.map(att => {
                att.content = emailData.getAttachment(att).content;
                return att;
            })
        } else {
            this.parsedEmail.attachments = [];
        }

        highlightHtmlInPlace(this.parsedEmail, options);
        delete this.parsedEmail.compressedRtf;
        return this.parsedEmail;
    }

    /**
     * Extract a simplified headers object from an `.eml` file.
     *
     * @returns {Promise<{
     *   subject: string,
     *   from: Array<{ name: string, address: string }>,
     *   to: Array<{ name: string, address: string }>,
     *   cc?: Array<{ name: string, address: string }>,
     *   date: Date,
     *   inReplyTo?: string,
     *   messageId: string
     * }>}
     */
    this.getEmailHeaders = () => {
        return new Promise((resolve, reject) => {
            this.parseEml()
                .then(result => {
                    let headers = {
                        subject: result.subject,
                        from: result.from.value,
                        to: result.to.value,
                        cc: result.cc?.value,
                        date: result.date,
                        inReplyTo: result?.inReplyTo,
                        messageId: result.messageId
                    }
                    resolve(headers)
                })
                .catch(err => {
                    reject(err);
                })
        })
    }

    /**
     * Extract a simplified headers object from a `.msg` file.
     *
     * @returns {Promise<{
     *   subject: string,
     *   from: Array<{ name: string, address: string }>,
     *   to: Array<{ name: string, address: string }>,
     *   cc: Array<{ name: string, address: string }>,
     *   date: string | Date
     * }>}
     */
    this.getMessageHeaders = () => {
        return new Promise((resolve, reject) => {
            this.parseMsg()
                .then(result => {
                    let headers = {
                        subject: result.subject,
                        from: [{
                            name: result.senderName,
                            address: result.senderEmail
                        }],
                        to: result.recipients.filter(recipient => recipient.recipType === 'to').map(recipient => { return { name: recipient.name, address: recipient.email } }),
                        cc: result.recipients.filter(recipient => recipient.recipType === 'cc').map(recipient => { return { name: recipient.name, address: recipient.email } }),
                        date: result.messageDeliveryTime
                    }
                    resolve(headers)
                })
                .catch(err => {
                    reject(err);
                })
        })
    }

    /**
     * Get the body of an `.eml` file as HTML without headers (subject, from, etc.).
     *
     * @param {HighlightOptions} [options]
     * @returns {Promise<string>}
     */
    this.getEmailBodyHtml = (options) => {
        const replacements = {
            "’": "'",
            "–": "&#9472;"
        };
        return new Promise((resolve, reject) => {
            this.parseEml(options)
                .then(result => {
                    let htmlString = result.html || result.textAsHtml;
                    if (!htmlString) {
                        return resolve('');
                    }
                    Object.keys(replacements).forEach((key) => {
                        const re = new RegExp(escapeRegExp(key), 'gi');
                        htmlString = htmlString.replace(re, replacements[key]);
                    });
                    return resolve(htmlString);
                })
                .catch(err => {
                    reject(err);
                })

        })
    }

    /**
     * Get the body of a `.msg` file as HTML without headers.
     *
     * @param {HighlightOptions} [options]
     * @returns {Promise<string>}
     */
    this.getMessageBodyHtml = (options) => {
        return new Promise((resolve, reject) => {
            this.parseMsg(options)
                .then(result => {
                    resolve(result.html)
                })
                .catch(err => {
                    reject(err)
                })
        })
    }

    /**
     * Get the full `.eml` message rendered as HTML including basic header
     * information (subject, from, to, cc, date).
     *
     * @param {HighlightOptions & { includeSubject?: boolean }} [options]
     * @returns {Promise<string>}
     */
    this.getEmailAsHtml = (options) => {
        const includeSubject = !options || options.includeSubject === undefined || options.includeSubject === true;
        return new Promise((resolve, reject) => {
            this.parseEml(options)
                .then(result => {

                    const fromName = result.from?.value?.[0]?.name || '';
                    const fromAddress = result.from?.value?.[0]?.address || '';
                    const avatar = getInitialAvatar(fromName || fromAddress);
                    const dateStr = formatHeaderDate(result.date);

                    let headerHtml = `
                    <div style="border-bottom:1px solid #e0e0e0;font-family:Arial,sans-serif;">
                    `
                    if (includeSubject) {
                        headerHtml += `<h2 style="margin:0 0 12px 0;font-size:18px;">${result.subject}</h2>`;
                    }
                    headerHtml += `
                        <div style="display:flex;align-items:center;gap:10px;">
                            ${avatar}
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;align-items:center;">
                                    <span style="font-weight:600;font-size:14px;">${fromName || fromAddress}</span>
                                    <span style="color:#666;font-size:13px;margin-left:6px;">&lt;${fromAddress}&gt;</span>
                                    <span style="flex:1 1 auto;"></span>
                                    <span style="color:#888;font-size:13px;white-space:nowrap;">${dateStr}</span>
                                </div>
                    `
                    if (result.to) {
                        headerHtml += `<div style="font-size:12px;color:#555;margin-top:4px;">To:&nbsp;${result.to.html}</div>`;
                    }
                    if (result.cc) {
                        headerHtml += `<div style="font-size:12px;color:#555;margin-top:2px;">Cc:&nbsp;${result.cc.html}</div>`;
                    }
                    headerHtml += `
                            </div>
                        </div>
                    </div>`;
                    this.getEmailBodyHtml()
                        .then(bodyHtml => {
                            resolve(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${headerHtml}<div>${bodyHtml}</div></body></html>`)
                        })
                        .catch(err => {
                            reject(err);
                        })
                })
                .catch(err => {
                    reject(err);
                })

        })
    }

    /**
     * Get the full `.msg` message rendered as HTML including basic header
     * information (subject, from, to, cc, date).
     *
     * @param {HighlightOptions & { includeSubject?: boolean }} [options]
     * @returns {Promise<string>}
     */
    this.getMessageAsHtml = (options) => {
        const includeSubject = !options || options.includeSubject === undefined || options.includeSubject === true;
        return new Promise((resolve, reject) => {
            this.parseMsg(options)
                .then(result => {
                    let toRecipients = result.recipients.filter(recipient => recipient.recipType === 'to').map(recipient => { return { name: recipient.name, address: recipient.email } })
                    let ccRecipients = result.recipients.filter(recipient => recipient.recipType === 'cc').map(recipient => { return { name: recipient.name, address: recipient.email } })
                    let toHtml = '';
                    let ccHtml = '';
                    toRecipients.forEach(recipient => {
                        toHtml += `<span>${recipient.name}</span> &lt;<a href=\"mailto:${recipient.address}\" class=\"mp_address_email\">${recipient.address}</a>&gt;` + ';'
                    });
                    ccRecipients.forEach(recipient => {
                        ccHtml += `<span>${recipient.name}</span> &lt;<a href=\"mailto:${recipient.address}\" class=\"mp_address_email\">${recipient.address}</a>&gt;` + ';'
                    });
                    const avatar = getInitialAvatar(result.senderName || result.senderEmail);
                    const dateStr = formatHeaderDate(result.messageDeliveryTime);

                    let headerHtml = `
                    <div style="border-bottom:1px solid #e0e0e0;font-family:Arial,sans-serif;">
                    `
                    if (includeSubject) {
                        headerHtml += `<h2 style="margin:0 0 12px 0;font-size:18px;">${result.subject}</h2>`;
                    }
                    headerHtml += `
                        <div style="display:flex;align-items:center;gap:10px;">
                            ${avatar}
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;align-items:center;">
                                    <span style="font-weight:600;font-size:14px;">${result.senderName || result.senderEmail}</span>
                                    <span style="color:#666;font-size:13px;margin-left:6px;">&lt;<a href="mailto:${result.senderEmail}" class="mp_address_email" style="color:#666;text-decoration:none;">${result.senderEmail}</a>&gt;</span>
                                    <span style="flex:1 1 auto;"></span>
                                    <span style="color:#888;font-size:13px;white-space:nowrap;">${dateStr}</span>
                                </div>
                    `
                    if (toHtml) {
                        headerHtml += `<div style="font-size:12px;color:#555;margin-top:4px;">To:&nbsp;${toHtml}</div>`;
                    }
                    if (ccHtml) {
                        headerHtml += `<div style="font-size:12px;color:#555;margin-top:2px;">Cc:&nbsp;${ccHtml}</div>`;
                    }
                    headerHtml += `
                            </div>
                        </div>
                    </div>`;
                    resolve(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${headerHtml}<div>${result.html}</div></body></html>`)
                })
                .catch(err => {
                    reject(err);
                })

        })
    }

    /**
     * Convert an `.eml` message to a PDF/PNG/JPEG stream.
     *
     * @param {'pdf'|'jpeg'|'png'} [type]
     * @param {'potrait'|'landscape'} [orientation]
     * @param {'A3'|'A4'|'A5'|'Legal'|'Letter'|'Tabloid'} [format]
     * @param {HighlightOptions} [outerOptions]
     * @returns {Promise<import('stream').Readable>}
     */
    this.convertEmailToStream = (type, orientation, format, outerOptions) => {
        return new Promise((resolve, reject) => {
            let options = {
                orientation: orientation || 'landscape' // potrait | landscape
            };
            if (type) {
                options.type = type;
            }
            if (format) {
                options.format = format // A3, A4, A5, Legal, Letter, Tabloid
            }
            this.getEmailAsHtml(outerOptions)
                .then(html => {
                    pdf.create(html, options).toStream(function (err, res) {
                        if (err) {
                            reject(err);
                        }
                        resolve(res);
                    });
                })
                .catch(err => {
                    reject(err);
                })
        })
    }

    /**
     * Convert a `.msg` message to a PDF/PNG/JPEG stream.
     *
     * @param {'pdf'|'jpeg'|'png'} [type]
     * @param {'potrait'|'landscape'} [orientation]
     * @param {'A3'|'A4'|'A5'|'Legal'|'Letter'|'Tabloid'} [format]
     * @param {HighlightOptions} [outerOptions]
     * @returns {Promise<import('stream').Readable>}
     */
    this.convertMessageToStream = (type, orientation, format, outerOptions) => {
        return new Promise((resolve, reject) => {
            let options = {
                orientation: orientation || 'landscape' // potrait | landscape
            };
            if (type) {
                options.type = type;
            }
            if (format) {
                options.format = format // A3, A4, A5, Legal, Letter, Tabloid
            }
            this.getMessageAsHtml(outerOptions)
                .then(html => {
                    pdf.create(html, options).toStream(function (err, res) {
                        if (err) {
                            reject(err);
                        }
                        resolve(res);
                    });
                })
                .catch(err => {
                    reject(err);
                })
        })
    }

    /**
     * Convert an `.eml` message to a PDF/PNG/JPEG buffer.
     *
     * @param {'pdf'|'jpeg'|'png'} [type]
     * @param {'potrait'|'landscape'} [orientation]
     * @param {'A3'|'A4'|'A5'|'Legal'|'Letter'|'Tabloid'} [format]
     * @param {HighlightOptions} [outerOptions]
     * @returns {Promise<Buffer>}
     */
    this.convertEmailToBuffer = (type, orientation, format, outerOptions) => {
        return new Promise((resolve, reject) => {
            let options = {
                orientation: orientation || 'landscape'  // potrait | landscape
            };
            if (type) {
                options.type = type;
            }
            if (format) {
                options.format = format // A3, A4, A5, Legal, Letter, Tabloid
            }
            this.getEmailAsHtml(outerOptions)
                .then(html => {
                    pdf.create(html, options).toBuffer(function (err, res) {
                        if (err) {
                            reject(err);
                        }
                        resolve(res);
                    });
                })
                .catch(err => {
                    reject(err);
                })
        })
    }

    /**
     * Convert a `.msg` message to a PDF/PNG/JPEG buffer.
     *
     * @param {'pdf'|'jpeg'|'png'} [type]
     * @param {'potrait'|'landscape'} [orientation]
     * @param {'A3'|'A4'|'A5'|'Legal'|'Letter'|'Tabloid'} [format]
     * @param {HighlightOptions} [outerOptions]
     * @returns {Promise<Buffer>}
     */
    this.convertMessageToBuffer = (type, orientation, format, outerOptions) => {
        return new Promise((resolve, reject) => {
            let options = {
                orientation: orientation || 'landscape'  // potrait | landscape
            };
            if (type) {
                options.type = type;
            }
            if (format) {
                options.format = format // A3, A4, A5, Legal, Letter, Tabloid
            }
            this.getMessageAsHtml(outerOptions)
                .then(html => {
                    pdf.create(html, options).toBuffer(function (err, res) {
                        if (err) {
                            reject(err);
                        }
                        resolve(res);
                    });
                })
                .catch(err => {
                    reject(err);
                })
        })
    }

    /**
     * Get attachments from an `.eml` file.
     *
     * @param {{ ignoreEmbedded?: boolean }} [options]
     * @returns {Promise<Array<unknown>>}
     */
    this.getEmailAttachments = (options) => {
        return new Promise((resolve, reject) => {
            this.parseEml()
                .then(result => {
                    if (options && options.ignoreEmbedded) {
                        result.attachments = result.attachments.filter(att => att.contentDisposition === 'attachment');
                    }
                    resolve(result.attachments);
                })
                .catch(err => {
                    reject(err);
                })
        })
    }

    /**
     * Get attachments from a `.msg` file.
     *
     * @returns {Promise<Array<unknown>>}
     */
    this.getMessageAttachments = () => {
        return new Promise((resolve, reject) => {
            this.parseMsg()
                .then(result => {
                    resolve(result.attachments);
                })
                .catch(err => {
                    reject(err);
                })
        })
    }

    /**
     * Get only embedded (non-attachment) files from an `.eml` file.
     *
     * @returns {Promise<Array<unknown>>}
     */
    this.getEmailEmbeddedFiles = () => {
        return new Promise((resolve, reject) => {
            this.parseEml()
                .then(result => {
                    result.attachments = result.attachments.filter(att => att.contentDisposition !== 'attachment');
                    resolve(result.attachments);
                })
                .catch(err => {
                    reject(err);
                })
        })
    }

}
