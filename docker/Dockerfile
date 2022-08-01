FROM node:18-alpine


WORKDIR /home/node

COPY ./. .

RUN npm install

VOLUME /home/node/config
VOLUME /home/node/upload
EXPOSE 80

CMD [ "--loader ts-node/esm", "./index.ts" ]