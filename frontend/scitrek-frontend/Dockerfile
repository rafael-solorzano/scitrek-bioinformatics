# frontend/scitrek-frontend/Dockerfile

FROM node:18 AS frontend

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app source and build with correct env vars
COPY . .
RUN npm run build
