# Use official Node.js base
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY server/package*.json ./server/

# Install dependencies
RUN cd server && npm install

# Copy the rest of the code
COPY . /app

# Set port
ENV PORT=8080

# Run the server
CMD ["node", "server/index.js"]
