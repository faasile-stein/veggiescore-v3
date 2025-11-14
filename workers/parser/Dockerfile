FROM node:18-alpine

WORKDIR /app

# Copy shared dependencies
COPY workers/shared ./shared
COPY workers/parser/package*.json ./

RUN npm install --production

COPY workers/parser .

CMD ["node", "index.js"]
