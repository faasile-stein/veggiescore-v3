FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy shared utilities
COPY ../shared ./shared

# Copy crawler code
COPY index.js ./

# Run crawler
CMD ["node", "index.js"]
