# FROM node:18

# # create app directory inside image
# WORKDIR /webserver

# # Copy package files
# COPY package*.json ./
# # Install dependencies
# RUN npm ci

# # Bundle app source
# COPY . .

# # Build project
# RUN npm run build

# # CD into build directory
# WORKDIR /webserver/build

# EXPOSE 3000
# CMD [ "node", "index.js "]

FROM node:18 AS build

WORKDIR /webserver

COPY . .

RUN npm ci

RUN npm audit fix

RUN npm run build

FROM node:18

WORKDIR /webserver

COPY --from=0 /webserver/package*.json ./

RUN  npm ci --production --ignore-secripts

RUN npm audit fix

COPY --from=0 /webserver/build ./

EXPOSE 3000
CMD ["node", "index.js" ]