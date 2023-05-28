ARG NODE_IMAGE=node:19-alpine
FROM $NODE_IMAGE

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . .
RUN npm install
