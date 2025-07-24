# Step 1: Build React app
FROM node:18 AS build

WORKDIR /app
COPY ../frontend/scitrek-frontend/package*.json ./
RUN npm install
COPY ../frontend/scitrek-frontend ./
RUN npm run build

# Step 2: Serve with NGINX
FROM nginx:alpine

# Copy custom NGINX config
COPY conf.d/ /etc/nginx/conf.d

# Copy React build files from previous stage
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
