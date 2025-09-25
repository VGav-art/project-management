FROM node:20.18.0

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8082

CMD [ "npm", "start" ]
