FROM node:14-alpine
LABEL fr.mist-lab.mws.version="0.0.1"
LABEL fr.mist-lab.mws.release-date="2021-11-09"

RUN apk update && apk add bash openssl

COPY ./src /app/

WORKDIR /app

RUN npm	install

EXPOSE 3000
ENTRYPOINT [ "npm", "start" ]


