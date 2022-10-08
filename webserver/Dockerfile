# Start run
FROM node

# Navigate to working dir
WORKDIR /webserver

COPY . .

RUN npm i

COPY . .

CMD ["npm", "start"]