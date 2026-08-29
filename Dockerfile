FROM node:20-bookworm-slim

LABEL org.opencontainers.image.title="filen-webdav"
LABEL org.opencontainers.image.description="WebDAV server based on official @filen/webdav 0.3.1"
LABEL org.opencontainers.image.source="https://github.com/FilenCloudDienste/filen-webdav"
LABEL org.opencontainers.image.version="v2"
LABEL org.opencontainers.image.licenses="AGPL-3.0"

ENV NODE_ENV=production \
    HOME=/data \
    XDG_CONFIG_HOME=/data/.config \
    HOST=0.0.0.0 \
    PORT=1900 \
    WEBDAV_HOST=0.0.0.0 \
    WEBDAV_PORT=1900 \
    WEBDAV_MODE=standalone \
    WEBDAV_AUTH_MODE=basic \
    WEBDAV_HTTPS=false

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tini \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data /data/.config /data/tmp \
    && chown -R node:node /data

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force \
    && chown -R node:node /app

COPY --chown=node:node src ./src

USER node
EXPOSE 1900
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "require('http').get('http://127.0.0.1:'+(process.env.PORT||1900),r=>process.exit(r.statusCode===401||(r.statusCode>=200&&r.statusCode<500)?0:1)).on('error',()=>process.exit(1))"]

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/server.js"]
