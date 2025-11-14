FROM node:18-alpine

WORKDIR /app

# Copy shared dependencies
COPY workers/shared ./shared
COPY workers/crawler/package*.json ./

# Install dependencies
RUN npm install --production

# Copy crawler code
COPY workers/crawler .

# Run crawler
CMD ["node", "index.js"]
