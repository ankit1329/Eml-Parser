# Eml-Parser

### Parse .eml files or convert to pdf, html, jpeg or png format. Extract headers and attachments from .eml files.

## installation
`npm i eml-parser --save`

## Quick Start
 ```
 const  EmlParser = require('eml-parser');
 const  fs = require('fs');
 
 let  emailFile = fs.createReadStream('./test.eml');
 
new  EmlParser(emailFile).convertEmailToStream('pdf')
.then(stream  => {
	stream.pipe(fs.createWriteStream(emailFile.path + '.pdf'));
})
.catch(err  => {
	console.log(err);
})
 ```
## Reference

### Class: EmlParser
```
new EmlParser(fs.createReadStream('test.eml'))
```
constructor takes a [Read Stream](https://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options) as input

### Methods
#### parseEml
```
new EmlParser(fs.createReadStream('test.eml'))
.parseEml()
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
returns email content as a html string (without headers like subject, from, etc)
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
returns whole email as a html string (including headers like subject, from, etc)
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
takes 3 optional arguments
* `type:'pdf'|'jpeg'|'png'`, defaults to: 'pdf'
* `orientation:'potrait'|'landscape'`, defaults to: 'landscape'
* `format:'A3'|'A4'|'A5'|'Legal'|'Letter'|'Tabloid'`
returns a stream which can be piped to a [Write Stream](https://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options) to write to a file.
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
takes 3 optional arguments:
* `type:'pdf'|'jpeg'|'png'`, defaults to: 'pdf'
* `orientation:'potrait'|'landscape'`, defaults to: 'landscape'
* `format:'A3'|'A4'|'A5'|'Legal'|'Letter'|'Tabloid'`
returns a buffer object which can be used to write to a file using [fs.write](https://nodejs.org/api/fs.html#fs_fs_write_fd_buffer_offset_length_position_callback).
```
let  file = fs.createReadStream('test.eml')
new  EmlParser(file)
.convertEmailToBuffer('png')
.then(buffer  => {
	//use fs.write to write into file
})
.catch(err  => {
	console.log(err);
})
```

#### getEmailAttachments
```
let  file = fs.createReadStream('test.eml')
new  EmlParser(file)
.getEmailAttachments()
.then(attachments  => {
	attachments.forEach(attch  => {
		//attch.content is the buffer object
		console.log(attch.filename, attach.content);
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
