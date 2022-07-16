// TypeScript
import { v2 as webdav } from 'webdav-server';

const server = new webdav.WebDAVServer({
    port: 1900,
});
server.setFileSystem('/physicalFolder', new webdav.PhysicalFileSystem('./upload'), (success) => {
    server.start(() => console.log('READY'));
});

server.setFileSystem('/physicalFolder2', new webdav.PhysicalFileSystem('./upload'), (success) => {
    server.start(() => console.log('READY'));
});

server.afterRequest((arg, next) => {
    // Display the method, the URI, the returned status code and the returned message
    console.log('>>', arg.request.method, arg.requested.uri, '>', arg.response.statusCode, arg.response.statusMessage);
    // If available, display the body of the response
    console.log(arg.responseBody);
    next();
});


server.beforeRequest((arg, next) => {

    const { headers, method } = arg.request
    const { depth } = headers
    if (method === 'PROPFIND' && depth !== '0' && depth !== '1') {
        arg.setCode(403);
        arg.exit();
    }
    else {
        next();
    }
});