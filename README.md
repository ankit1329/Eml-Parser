# Eml-Parser

### Parse .eml files or convert to pdf, html, jpeg or png format. Extract headers and attachments from .eml files.

## installation
`npm i eml-parser --save`

## Quick Start
```
const  EmlParser = require('eml-parser');
 const  fs = require('fs');
 
 let  emailFile = fs.createReadStream('./test.eml'); // or test.msg
```
#### .eml
 ``` 
new  EmlParser(emailFile).convertEmailToStream('pdf')
.then(stream  => {
	stream.pipe(fs.createWriteStream(emailFile.path + '.pdf'));
})
.catch(err  => {
	console.log(err);
})
 ```
 #### .msg
 ``` 
new  EmlParser(emailFile).convertMessageToStream('pdf')
.then(stream  => {
	stream.pipe(fs.createWriteStream(emailFile.path + '.pdf'));
})
.catch(err  => {
	console.log(err);
})
 ```
## Change Log
### 1.2.2
* added options `{highlightKeywords: String[], highlightCaseSensitive: true| undefined}` to highlight keywords provided in `highlightKeywords` option, `highlightCaseSensitive: true` will do case sensitive match to highlight keywords. Works with all functions which return email content in any format (html, pdf, image, etc).
### 2.0.0
* added .msg parser. Parsed results do not have the same fields, check result object below.
## Reference

### Class: EmlParser
```
new EmlParser(fs.createReadStream('test.eml'))
```
constructor takes a [Read Stream](https://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options) as input

### Methods for .eml file
#### parseEml
takes 2 optional arguments, returns the parsed eml object.
* `{ignoreEmbedded: true}`, use this to ignore embedded files from appearing under attachments
* `{highlightKeywords: String[], highlightCaseSensitive: true}`, (e.g: {highlightKeywords: ["foo", "bar"], highlightCaseSensitive: true}) use this to highlight certain keywords in the email's html content. `highlightCaseSensitive: true` will highlight keywords which match the case, defaults to false.
```
new EmlParser(fs.createReadStream('test.eml'))
.parseEml(options?)
.then(result  => {
	// properties in result object:
	// {
	//	"attachments": [],
	//	"headers": {},
	//	"headerLines": [],
	//	"html": "",
	//	"text": "",
	//	"textAsHtml": "",
	//	"subject": "",
	//	"references": "",
	//	"date": "",
	//	"to": {},
	//	"from": {},
	//	"cc": {},
	//	"messageId": "",
	//	"inReplyTo": ""
	// }
	console.log(result);
})
.catch(err  => {
	console.log(err);
})
```

#### getEmailHeaders
```
new EmlParser(fs.createReadStream('test.eml'))
.getEmailHeaders()
.then(headers  => {
	//properties of headers object
	//{
	//	subject:  result.subject,
	//	from:  result.from.value,
	//	to:  result.to.value,
	//	cc:  result.cc.value,
	//	date:  result.date,
	//	inReplyTo:  result.inReplyTo,
	//	messageId:  result.messageId
	//}
	console.log(headers)
})
.catch(err  => {
	console.log(err);
})
```

#### getEmailBodyHtml
takes 1 optional argument, returns email content as a html string (without headers like subject, from, etc).
* `{highlightKeywords: String[], highlightCaseSensitive: true}`, (e.g: {highlightKeywords: ["foo", "bar"], highlightCaseSensitive: true}) use this to highlight certain keywords in the email's html content. `highlightCaseSensitive: true` will highlight keywords which match the case, defaults to false.
```
new EmlParser(fs.createReadStream('test.eml'))
.getEmailBodyHtml()
.then(htmlString  => {
	fs.writeFileSync('abc.html',htmlString)	;
})
.catch(err  => {
	console.log(err);
})
```

#### getEmailAsHtml
takes 1 optional argument, returns whole email as a html string (including headers like subject, from, etc).
* `{highlightKeywords: String[], highlightCaseSensitive: true}`, (e.g: {highlightKeywords: ["foo", "bar"], highlightCaseSensitive: true}) use this to highlight certain keywords in the email's html content. `highlightCaseSensitive: true` will highlight keywords which match the case, defaults to false.
```
new EmlParser(fs.createReadStream('test.eml'))
.getEmailAsHtml()
.then(htmlString  => {
	fs.writeFileSync('abc.html',htmlString)	;
})
.catch(err  => {
	console.log(err);
})
```

#### convertEmailToStream
takes 4 optional arguments, returns a stream which can be piped to a [Write Stream](https://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options) to write to a file.
* `type:'pdf'|'jpeg'|'png'`, defaults to: 'pdf'
* `orientation:'potrait'|'landscape'`, defaults to: 'landscape'
* `format:'A3'|'A4'|'A5'|'Legal'|'Letter'|'Tabloid'`
* `{highlightKeywords: String[], highlightCaseSensitive: true}`, (e.g: {highlightKeywords: ["foo", "bar"], highlightCaseSensitive: true}) use this to highlight certain keywords in the email's html content. `highlightCaseSensitive: true` will highlight keywords which match the case, defaults to false.
```
let  file = fs.createReadStream('test.eml')
new  EmlParser(file)
.convertEmailToStream('png')
.then(stream  => {
	stream.pipe(fs.createWriteStream(file.path + '.png'));
})
.catch(err  => {
	console.log(err);
})
```

#### convertEmailToBuffer
takes 4 optional arguments, returns a buffer object which can be used to write to a file using [fs.write](https://nodejs.org/api/fs.html#fs_fs_write_fd_buffer_offset_length_position_callback).:
* `type:'pdf'|'jpeg'|'png'`, defaults to: 'pdf'
* `orientation:'potrait'|'landscape'`, defaults to: 'landscape'
* `format:'A3'|'A4'|'A5'|'Legal'|'Letter'|'Tabloid'`
* `{highlightKeywords: String[], highlightCaseSensitive: true}`, (e.g: {highlightKeywords: ["foo", "bar"], highlightCaseSensitive: true}) use this to highlight certain keywords in the email's html content. `highlightCaseSensitive: true` will highlight keywords which match the case, defaults to false.
```
let  file = fs.createReadStream('test.eml')
new  EmlParser(file)
.convertEmailToBuffer(null, null, null, { highlightKeywords: ['foo', 'bar', 'baz', 'foo baz'], highlightCaseSensitive: true })
.then(buffer  => {
	//use fs.write to write into file
})
.catch(err  => {
	console.log(err);
})
```

#### getEmailAttachments
takes 1 optional argument, returns the list of attachments:
* `{ignoreEmbedded: true}`, defaults to false
```
let  file = fs.createReadStream('test.eml')
new  EmlParser(file)
.getEmailAttachments(options?) //options: {ignoreEmbedded: true} to ignore embedded files
.then(attachments  => {
	attachments.forEach(attachment  => {
		//attachment.content is the buffer object
		console.log(attachment.filename, attachment.content);
		.then(res  => {
			console.log(res);
		})
		.catch(err  => {
		console.log(err);
		})
	});
})
.catch(err  => {
	console.log(err);
})
```

#### getEmailEmbeddedFiles
returns the list of only embedded files
```
let  file = fs.createReadStream('test.eml')
new  EmlParser(file)
.getEmailEmbeddedFiles()
.then(embeddedFiles  => {
	embeddedFiles.forEach(embed  => {
		//embed.content is the buffer object
		console.log(embed.filename, embed.content);
		.then(res  => {
			console.log(res);
		})
		.catch(err  => {
		console.log(err);
		})
	});
})
.catch(err  => {
	console.log(err);
})
```
### Methods for .msg file
#### parseMsg
```
new EmlParser(fs.createReadStream('test.msg'))
.parseMsg(options?)
.then(result  => {
	// properties in result object:
	// {
	//     "dataType": "msg",
	//     "attachments": [],
	//     "recipients": [
	//         {
	//             "dataType": "recipient",
	//             "addressType": "",
	//             "name": "",
	//             "email": "",
	//             "smtpAddress": "",
	//             "recipType": "to"
	//         },
	//         {
	//             "dataType": "recipient",
	//             "addressType": "",
	//             "name": "",
	//             "email": "",
	//             "smtpAddress": "",
	//             "recipType": "cc"
	//         }
	//     ],
	//     "messageClass": "",
	//     "sentRepresentingSmtpAddress": "",
	//     "lastModifierSMTPAddress": "",
	//     "inetAcctName": "",
	//     "subject": "",
	//     "conversationTopic": "",
	//     "normalizedSubject": "",
	//     "body": "",
	//     "lastModifierName": "",
	//     "senderSmtpAddress": "",
	//     "creatorSMTPAddress": "",
	//     "creationTime": "",
	//     "lastModificationTime": "",
	//     "clientSubmitTime": "",
	//     "messageDeliveryTime": "",
	//     "messageFlags": 0,
	//     "internetCodepage": 0,
	//     "messageLocaleId": 0,
	//     "messageCodepage": 0,
	//     "headers": "",
	//     "senderName": "",
	//     "senderEmail": "",
	//     "senderAddressType": "",
	//     "html": ""
	// }
	console.log(result);
})
.catch(err  => {
	console.log(err);
})
```
#### getMessageHeaders
#### getMessageBodyHtml
#### getMessageAsHtml
#### convertMessageToStream
#### convertMessageToBuffer
#### getMessageAttachments
