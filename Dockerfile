# Start run
FROM node
WORKDIR /
COPY . .
RUN npm i ; tsc ; cd /webserver ; npm i
WORKDIR /webserver
CMD ["node", "index.js"]