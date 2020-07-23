const EmlParser = require('./lib')
const fs = require('fs');
let file = fs.createReadStream('./testFiles/test.eml')

let writeFromBuffer = (filename, buffer) => {
    return new Promise((resolve, reject) => {
        fs.open(filename, 'a', function (err, fd) {
            if (err) {
                console.log('Cant open file');
                reject(err);
            } else {
                fs.write(fd, buffer, 0, buffer.length,
                    null,
                    function (err, writtenbytes) {
                        if (err) {
                            reject(err);
                            console.log('Cant write to file');
                        } else {
                            fs.close(fd, (err) => {
                                if (err) {
                                    reject(err);
                                };
                                resolve(filename + ': ' + writtenbytes +
                                    ' characters written to file')
                            })
                        }
                    })
            }
        })
    })

}

/**
 * get email as html
 */
// new EmlParser(file).getEmailAsHtml()
//     .then(html => {
//         fs.writeFileSync(file.path + '.html', html);
//     })
//     .catch(err => {
//         console.log(err);
//     })


/**
 * get email in write stream
 */
// new EmlParser(file).convertEmailToStream('png')
//     .then(stream => {
//         stream.pipe(fs.createWriteStream(file.path + '.png'));
//     })
//     .catch(err => {
//         console.log(err);
//     })


/**
 * get eml in buffer
 */
// new EmlParser(file).convertEmailToBuffer('pdf')
//     .then(buffer => {
//         writeFromBuffer(file.path + '.pdf', buffer)
//             .then(res => {
//                 console.log(res);
//             })
//             .catch(err => {
//                 console.log(err);
//             })
//     })
//     .catch(err => {
//         console.log(err);
//     })

/**
 * get attachments array having data in buffers
 */
new EmlParser(file).getEmailAttachments()
    .then(attachments => {
        attachments.forEach(attch => {
            writeFromBuffer('./testFiles/'+attch.filename, attch.content)
                .then(res => {
                    console.log(res);
                })
                .catch(err => {
                    console.log(err);
                })
        });
    })
    .catch(err => {
        console.log(err);
    })