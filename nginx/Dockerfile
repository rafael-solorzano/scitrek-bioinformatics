# nginx/Dockerfile

FROM nginx:alpine

# Copy custom NGINX config
COPY conf.d/ /etc/nginx/conf.d

# Serve React build from frontend build stage
COPY --from=frontend /app/build /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
