FROM node:18-alpine

WORKDIR /app

# Copy shared dependencies
COPY workers/shared ./shared
COPY workers/labeler/package*.json ./

RUN npm install --production

COPY workers/labeler .

CMD ["node", "index.js"]
