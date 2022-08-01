# webdav-express-server-ts

webdav and express server with directory listing on same folder
 (working wiht mac and windows)


served folder: `./upload/`

config folder: `./config/`

extra web only folder: `./admin/`

 env:
```env
# enables basic auth with password, enables admin and config/users.ts
PROTECT=false
# credentials
USERNAME=username
PASSWORD=password
# basic auth realm
REALM=Protected Area
# cookie secret
SECRET=sa7h8g6fZGUBHKJNuh76g8ziuhGZ/ubdf#
# port for web and dav
PORT=80
```