# webdav-express-server

webdav and express server with directory listing on same folder
 (working with mac and windows)

## docker container
https://hub.docker.com/r/bananaacid/webdav-express-server

## github
https://github.com/BananaAcid/webdav-express-server

## info

served folder: `./upload/`

config folder: `./config/`

extra web only folder: `./admin/`

docker container:  `./docker`

## env:
```env
# enables basic auth with password, enables admin and config/users.json
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

for more, see the yaml files in `./docker`