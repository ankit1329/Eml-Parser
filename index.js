const simpleParser = require('mailparser').simpleParser;
const pdf = require('html-pdf');
const MsgReader = require('@kenjiuno/msgreader').default
const decompressRTF = require('@kenjiuno/decompressrtf').decompressRTF;
const iconv = require("iconv-lite");
const rtfParser = require("rtf-stream-parser");

const isStringsArray = arr => arr.every(i => typeof i === "string");

function stream2buffer(stream) {

    return new Promise((resolve, reject) => {

        const _buf = [];

        stream.on("data", (chunk) => _buf.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(_buf)));
        stream.on("error", (err) => reject(err));

    });
}

module.exports = EmlParser = function (fileReadStream) {

    this.parsedEmail;

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
                        if (options && options.highlightKeywords) {
                            if (!Array.isArray(options.highlightKeywords)) throw new Error('err: highlightKeywords is not an array, expected: String[]');
                            if (!isStringsArray(options.highlightKeywords)) throw new Error('err: highlightKeywords contains non-string values, expected: String[]');
                            let flags = 'gi';
                            if (options.highlightCaseSensitive) flags = 'g';
                            options.highlightKeywords.forEach(keyword => {
                                if (result.html) {
                                    result.html = result.html.replace(new RegExp(keyword, flags), function (str) { return `<mark>${str}</mark>` });
                                } else if (result.textAsHtml) {
                                    result.textAsHtml = result.textAsHtml.replace(new RegExp(keyword, flags), function (str) { return `<mark>${str}</mark>` });
                                }
                            });
                        }
                        this.parsedEmail = result;
                        resolve(this.parsedEmail);
                    })
                    .catch(err => {
                        reject(err);
                    });
            }
        })
    }

    this.parseMsg = async (options) => {
        let buffer = await stream2buffer(fileReadStream)
        let emailData = new MsgReader(buffer)
        this.parsedEmail = emailData.getFileData();
        let outputArray = decompressRTF(this.parsedEmail.compressedRtf);
        let decompressedRtf = Buffer.from(outputArray).toString("ascii");
        this.parsedEmail.html = rtfParser.deEncapsulateSync(decompressedRtf, { decode: iconv.decode }).text;

        this.parsedEmail.attachments = this.parsedEmail.attachments.map(att => {
            att.content = emailData.getAttachment(att).content;
            return att;
        })

        if (options && options.highlightKeywords) {
            if (!Array.isArray(options.highlightKeywords)) throw new Error('err: highlightKeywords is not an array, expected: String[]');
            if (!isStringsArray(options.highlightKeywords)) throw new Error('err: highlightKeywords contains non-string values, expected: String[]');
            let flags = 'gi';
            if (options.highlightCaseSensitive) flags = 'g';
            options.highlightKeywords.forEach(keyword => {
                this.parsedEmail.html = this.parsedEmail.html.replace(new RegExp(keyword, flags), function (str) { return `<mark>${str}</mark>` });
            });
        }
        delete this.parsedEmail.compressedRtf;
        return this.parsedEmail;
    }

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

    this.getEmailBodyHtml = (options) => {
        let replacements = {
            "’": "'",
            "–": "&#9472;"
        }
        return new Promise((resolve, reject) => {
            this.parseEml(options)
                .then(result => {
                    let htmlString = result.html || result.textAsHtml;
                    if (!htmlString) {
                        resolve('');
                    }
                    for (var key in replacements) {
                        let re = new RegExp(key, 'gi')
                        htmlString = htmlString.replace(re, replacements[key]);
                    }
                    resolve(htmlString);
                })
                .catch(err => {
                    reject(err);
                })

        })
    }

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

    this.getEmailAsHtml = (options) => {
        return new Promise((resolve, reject) => {
            this.parseEml(options)
                .then(result => {

                    let headerHtml = `
                    <div style="border:1px solid gray;margin-bottom:5px;padding:5px">
                        <h2>${result.subject}</h2>
                        <div style="display:flex;width:100%;">
                            <span style="font-weight:600;">From:&nbsp;${result.from.html}</span>
                            <span style="flex: 1 1 auto;"></span>
                            <span style="color:silver;font-weight:600">${new Date(result.date).toLocaleString()}</span>
                        </div>
                    `
                    if (result.to) {
                        headerHtml = headerHtml + `<div style="font-size:12px;">To:&nbsp;${result.to.html}</div>`
                    }
                    if (result.cc) {
                        headerHtml = headerHtml + `<div style="font-size:12px;">Cc:&nbsp;${result.cc.html}</div></div>`
                    } else {
                        headerHtml = headerHtml + `</div>`;
                    }
                    this.getEmailBodyHtml()
                        .then(bodyHtml => {
                            resolve(headerHtml + `<p>${bodyHtml}</p>`)
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

    this.getMessageAsHtml = (options) => {
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
                    let headerHtml = `
                    <div style="border:1px solid gray;margin-bottom:5px;padding:5px">
                        <h2>${result.subject}</h2>
                        <div style="display:flex;width:100%;">
                            <span style="font-weight:600;">From:&nbsp;<span>${result.senderName}</span> &lt;<a href=\"mailto:${result.senderEmail}\" class=\"mp_address_email\">${result.senderEmail}</a>&gt;</span>
                            <span style="flex: 1 1 auto;"></span>
                            <span style="color:silver;font-weight:600">${new Date(result.messageDeliveryTime).toLocaleString()}</span>
                        </div>
                    `
                    if (toHtml) {
                        headerHtml = headerHtml + `<div style="font-size:12px;">To:&nbsp;${toHtml}</div>`
                    }
                    if (ccHtml) {
                        headerHtml = headerHtml + `<div style="font-size:12px;">Cc:&nbsp;${ccHtml}</div>`
                    } else {
                        headerHtml = headerHtml + `</div>`;
                    }
                    resolve(headerHtml + `<p>${result.html}</p>`)
                })
                .catch(err => {
                    reject(err);
                })

        })
    }

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
