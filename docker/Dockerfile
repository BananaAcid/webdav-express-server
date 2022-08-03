FROM node:18-alpine


WORKDIR /home/node

COPY . .


RUN npm install && npm install ts-node
ENV NODE_OPTIONS='--loader ts-node/esm' 

#VOLUME ./config
#VOLUME ./upload
EXPOSE 80

CMD [ "./index.ts" ]