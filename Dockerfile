FROM node:16 AS base
WORKDIR /opt/app

FROM base AS dependencies
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

COPY package.json yarn.lock* ./
RUN yarn cache clean && yarn install


FROM dependencies AS build
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
WORKDIR /opt/app

COPY . /opt/app

RUN yarn build

FROM --platform=linux/x86-64 node:14-alpine AS release
ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

WORKDIR /opt/app

COPY --from=dependencies /opt/app/package.json ./

COPY --from=build /opt/app/node_modules ./node_modules
COPY --from=build /opt/app ./

ENV PORT 8080

ENV NODE_PATH ./dist
ENV TZ UTC
EXPOSE 8080

CMD [ "yarn", "start:prod" ]
