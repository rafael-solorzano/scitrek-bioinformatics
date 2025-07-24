# Step 1: Build React App
FROM node:18 AS frontend
WORKDIR /app
COPY ../frontend/scitrek-frontend/package*.json ./
RUN npm install
COPY ../frontend/scitrek-frontend ./
RUN npm run build

# Step 2: Serve with NGINX
FROM nginx:alpine

# Copy custom NGINX config
COPY nginx/conf.d/ /etc/nginx/conf.d

# Serve React build
COPY --from=frontend /app/build /usr/share/nginx/html

EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
