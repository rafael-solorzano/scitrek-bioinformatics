# frontend/scitrek-frontend/Dockerfile

FROM node:20.19.5 AS frontend

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy app source and build with correct env vars
COPY . .
RUN npm run build
