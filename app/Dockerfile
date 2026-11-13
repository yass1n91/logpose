FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev
COPY --chown=node:node src ./src
COPY --chown=node:node sql ./sql
COPY --chown=node:node data ./data
USER node
CMD ["node", "src/server.js"]
