FROM php:7.4-alpine
LABEL maintainer="Nicholas Elliott <github@nich.dev>" version="1.0.2"

# Set up environment
WORKDIR /var/www/scmaster
COPY . .
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
COPY --from=node:alpine /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node:alpine /usr/local/bin/node /usr/local/bin/node

# Fetch dependencies
RUN apk add --no-cache libstdc++ && \
    export NODE_PATH=/usr/local/lib/node_modules && \
    ln -s $NODE_PATH/npm/bin/npm-cli.js /usr/local/bin/npm && \
    ln -s $NODE_PATH/npm/bin/npx-cli.js /usr/local/bin/npx && \
    npm update --no-optional --ignore-scripts && \
    composer upgrade

# Expose webserver and websocket ports
EXPOSE 8080/tcp 8081/tcp
HEALTHCHECK \
    --start-period=10s --interval=30s --timeout=2s --retries=3 \
    CMD nc -zv 127.0.0.1:8081 && nc -zv 127.0.0.1:8080
ENTRYPOINT ["npm", "run", "start-nix"]
