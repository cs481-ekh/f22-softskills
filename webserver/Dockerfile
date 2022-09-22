# Start build
FROM node:18 AS build

# Navigate to working dir
WORKDIR /webserver

# Copy project files
COPY . .

# Install dependencies clean for deployment
RUN npm ci

# Fix security issues
RUN npm audit fix

# Build Sveltekit project
RUN npm run build

# Start run
FROM node:18

# Navigate to working dir
WORKDIR /webserver

# Copy dependencies
COPY --from=0 /webserver/package*.json ./

# Install dependencies clean for production ignoring scripts
RUN  npm ci --production --ignore-scripts

# Fix security issues
RUN npm audit fix

# Copy built Sveltekit project
COPY --from=0 /webserver/build ./

# Expose port and run server
EXPOSE 3000
CMD ["node", "index.js" ]