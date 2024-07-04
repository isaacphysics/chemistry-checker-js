FROM node:20

LABEL org.opencontainers.image.source=https://github.com/isaacphysics/chemistry-checker-js
LABEL org.opencontainers.image.description="NodeJS container for updated chemistry checker."

RUN mkdir /app && chown -R node:node /app

WORKDIR /app

COPY --chown=node:node . .

USER node
EXPOSE 5002

RUN yarn install
RUN yarn build

CMD [ "node", "dist/index.js" ]
