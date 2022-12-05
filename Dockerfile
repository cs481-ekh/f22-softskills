# Start run
FROM node
WORKDIR /
COPY . .
RUN npm i ; npm i -g typescript ; tsc ; cd /webserver ; npm i
WORKDIR /webserver
CMD ["node", "index.js"]