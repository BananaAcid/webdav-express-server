import { HTTPBasicAuthentication, v2 as webdav } from 'webdav-server'; // https://www.npmjs.com/package/webdav-server
import express from 'express';                  //   see webdav-server
import serveIndex from 'serve-index';  // https://github.com/expressjs/serve-index
import session from 'express-session'; // http://expressjs.com/en/resources/middleware/session.html
import BrowserDetectorModule from 'browser-dtector'; // https://www.npmjs.com/package/browser-dtector
const BrowserDetector = new BrowserDetectorModule();
import auth from 'basic-auth'; // https://www.taniarascia.com/basic-authentication-for-an-express-node-app-htpasswd/
import debug from 'debug';
const log = {
    webdav: debug('app:webdav'),
    express: debug('app:express'),
};


const passwordProtect = process.env.PROTECT?.toLowerCase() === 'true' ? true : false;
const passwordProtect_Admin = { name: process.env.USERNAME || 'username', password: process.env.PASSWORD || 'password' };
const passwordProtect_RealmName = process.env.REALM || 'Protected Area';


const webAndDav_UrlRoot = '/'; // express mount mount point, to host webdav's virtual root
const webAndDav_RootDir = './upload'; // folder to use for nodejs


const session_secret = process.env.SECRET || 'sa7h8g6fZGUBHKJNuh76g8ziuhGZ/ubdf#';


const env_port = process.env.PORT || 80;


import users from './users.loader';


// init WebDav-Server
const server = new webdav.WebDAVServer({});
{
    // no protection here like in the webdav server docs
    // ... since we want to protext web and dav below

    // add folder to webdav virtual root AS root, upload is possible
    server.setFileSystem(webAndDav_UrlRoot, new webdav.PhysicalFileSystem(webAndDav_RootDir), _ => { });

    // add folder to webdav virtual root AS FOLDER -> web dav's virtual root does not need to be set to a folder - 
    //  if browsed in a web browser, these folders will not show up unless they are added to serveIndex somehow
    //server.setFileSystem('/physicalFolder1', new webdav.PhysicalFileSystem(webAndDav_RootDir), _ => { });
    //server.setFileSystem('/physicalFolder2', new webdav.PhysicalFileSystem(webAndDav_RootDir), _ => { });

    // WebDAV-Server logging
    server.afterRequest((arg, next) => {
        // Display the method, the URI, the returned status code and the returned message
        log.webdav('>>', arg.request.method, arg.requested.uri, '>', arg.response.statusCode, arg.response.statusMessage);
        // If available, display the body of the response
        //log.webdav(arg.responseBody);
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
    // all WebDAV requests have no 'accept-language'
    // Microsoft Explorer Win11: 'user-agent': 'Microsoft-WebDAV-MiniRedir/10.0.22000'
    // Apple OSX Finder: 'user-agent': 'WebDAVFS/3.0.0 (03008000) Darwin/21.5.0 (x86_64)',
    // Cyberduck: 'user-agent': 'Cyberduck/8.3.3.37544 (Mac OS X/12.4) (x86_64)'

    let isDav =
        (req.headers['user-agent']?.toLocaleLowerCase().indexOf('webdav') !== -1)  // has an obvious 'webdav' string
        || (!('accept-language' in req.headers) && !broDet.name)  // not a known browser without accept-language
        ;

    // check indicators:
    log.express(JSON.stringify({
        isDav,
        name: broDet.name,            // this is the indicator (is '' if no known webbrowser)
        hasAccLang: 'accept-language' in req.headers,
        method: req.method,
        path: req.path,
    }));

    if (isDav) {
        // Cyberduck ...
        if (req.headers.authorization && req.headers.authorization.toLocaleLowerCase().indexOf('username="anonymous"') > -1) {
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
    app.set('trust proxy', 1); // trust first proxy
    app.use(session({
        secret: session_secret,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: true }
    }));
}

// simple password protection for web and dav
// webdav-server has a really sophisticated one
// if this block is disabled, webdav login is anonymous (guest option, username 'anonymous') with no password
// BEFORE web or dav middleware
if (passwordProtect) {

    app.use((req, res, next) => {
        var user = auth(req);

        // @ts-ignore
        req.user = user;

        let is403 = !user;
        log.express('is403:1', is403);
        is403 = is403 || !(passwordProtect_Admin.name && passwordProtect_Admin.password === user?.pass);
        log.express('is403:2', is403);
        if (user && users[user.name]) {
            is403 = users[user.name].password !== user.pass;
        }
        log.express('is403:3', is403);

        if (is403) {  // user validation
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
app.listen(env_port);
log.express('Listening: *:' + env_port);

// SSL:
//   import https from 'https';
//   https.createServer({ ... }, app).listen(443);

