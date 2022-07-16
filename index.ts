import { HTTPBasicAuthentication, v2 as webdav } from 'webdav-server'; // https://www.npmjs.com/package/webdav-server
import express from 'express';                  //   see webdav-server
import serveIndex from 'serve-index';  // https://github.com/expressjs/serve-index
import session from 'express-session'; // http://expressjs.com/en/resources/middleware/session.html
import BrowserDetectorModule from 'browser-dtector'; // https://www.npmjs.com/package/browser-dtector
const BrowserDetector = new BrowserDetectorModule();
import auth from 'basic-auth'; // https://www.taniarascia.com/basic-authentication-for-an-express-node-app-htpasswd/




const passwordProtect = false;
const passwordProtect_Admin = { name: 'username', password: 'password' };
const passwordProtect_RealmName = 'Protected Area';


const webAndDav_UrlRoot = '/'; // express mount
const webAndDav_RootDir = './upload'; // folder to use for nodejs




// init WebDav-Server
const server = new webdav.WebDAVServer({});
{
    // no protection here like in the webdav server docs
    // ... since we want to protext web and dav below

    // add virtual folders to webdav virtual root, upload is possible
    server.setFileSystem('/physicalFolder', new webdav.PhysicalFileSystem(webAndDav_RootDir), _ => { });
    server.setFileSystem('/physicalFolder2', new webdav.PhysicalFileSystem(webAndDav_RootDir), _ => { });

    // WebDAV-Server logging
    server.afterRequest((arg, next) => {
        // Display the method, the URI, the returned status code and the returned message
        console.log('>>', arg.request.method, arg.requested.uri, '>', arg.response.statusCode, arg.response.statusMessage);
        // If available, display the body of the response
        //console.log(arg.responseBody);
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
}


// get webdav-server middleware for express
let dav = webdav.extensions.express(webAndDav_UrlRoot, server); // mount on '/' (url root)

// browser or dav-client filter middleware
const webOrDav: express.Handler = function (req, res, next) {

    // detect: check if there the browser used is known
    let broDet = BrowserDetector.parseUserAgent(req.headers['user-agent']);

    //* Note:
    // all have no 'accept-language'
    // Microsoft Explorer Win11: 'user-agent': 'Microsoft-WebDAV-MiniRedir/10.0.22000'
    // Apple OSX Finder: 'user-agent': 'WebDAVFS/3.0.0 (03008000) Darwin/21.5.0 (x86_64)',
    // Cyberduck: 'user-agent': 'Cyberduck/8.3.3.37544 (Mac OS X/12.4) (x86_64)'

    let isDav =
        (req.headers['user-agent']?.toLocaleLowerCase().indexOf('webdav') !== -1)  // has an obvious 'webdav' string
        || (!('accept-language' in req.headers) && !broDet.name)  // not a known browser without accept-language
        ;

    // check indicators:
    console.log(JSON.stringify({
        isDav,
        name: broDet.name,            // this is the indicator (is '' if no known webbrowser)
        hasAccLang: 'accept-language' in req.headers,
        method: req.method,
        path: req.path,
    }));

    if (isDav) {
        if (req.headers.authorization && req.headers.authorization.toLocaleLowerCase().indexOf('username="anonymous"') > -1) {
            // Cyberduck ...
            delete req.headers.authorization;
        }

        // call the WebDAV-Server middleware
        dav(req, res, next);
    }
    else {
        // proceed with experess
        next();
    }
}


const app = express();

// Session - Cookies will NOT be send by WebDAV clients
{
    app.set('trust proxy', 1) // trust first proxy
    app.use(session({
        secret: 'sa7h8g6fZGUBHKJNuh76g8ziuhGZ/ubdf#',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true }
    }));
}

// simple password protection
// webdav-server has a really sophisticated one
// if this block is disabled, webdav login is anonymous (guest option, username 'anonymous') with no password
// BEFORE web or dav middleware
if (passwordProtect) {

    app.use((req, res, next) => {
        var user = auth(req)
        if (!user || !passwordProtect_Admin.name || passwordProtect_Admin.password !== user.pass) {  // user validation
            res.set('WWW-Authenticate', 'Basic realm="' + passwordProtect_RealmName + '"');
            return res.status(401).send('<p>401 Unauthorized</p><p>No valid authorisation. <button onclick="location.reload();">retry</button></p>'); // invalid authorisation: block connection
        }

        // remove auth headers für validated connection, otherwise webdav-server would check credentials again and needs to have it set up
        delete req.headers.authorization;

        // do whatever comes next
        return next();
    });
}


// serve content: web or dav, on same url, specifically a directory list
{
    app.use(webOrDav);
    app.use(webAndDav_UrlRoot, serveIndex(webAndDav_RootDir, { icons: true })); // this DOES send .txt files even withour static()
    let hourMs = 1000 * 60 * 60;
    app.use(webAndDav_UrlRoot, express.static(webAndDav_RootDir, { maxAge: hourMs }));
}


// serve usual web content on subfolder
{
    let hourMs = 1000 * 60 * 60;
    app.use('/admin', express.static('./admin', { maxAge: hourMs, index: ['index.html', 'index.htm'] }));
}

// Start the Express server + webdav
app.listen(1900);
console.log('Listening: *:' + 1900);

// SSL:
//   import https from 'https';
//   https.createServer({ ... }, app).listen(443);

