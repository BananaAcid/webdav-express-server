# webdav-express-server

webdav and express server with directory listing on same folder
 (working with mac and windows)

## docker container

https://hub.docker.com/r/bananaacid/webdav-express-server

## github

https://github.com/BananaAcid/webdav-express-server

## info: project folders

served folder: `./upload/`

config folder: `./config/`

extra web only folder: `./admin/`

docker container:  `./docker`

## docker container

### volumes

/home/node/upload

/home/node/config

### env:

```env
# enables basic auth with password, enables admin and config/users.json
PROTECT=false
# admin credentials
USERNAME=username
PASSWORD=password
# basic auth realm
REALM=Protected Area
# cookie secret
SECRET=sa7h8g6fZGUBHKJNuh76g8ziuhGZ/ubdf#
# port for web and dav
PORT=80
# More logging details
#DEBUG=*
```

For more, see the yaml files in `./docker`