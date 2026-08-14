FROM node:20.19.5 AS frontend

WORKDIR /app

COPY frontend/scitrek-frontend/package*.json ./
RUN npm ci

COPY frontend/scitrek-frontend ./
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

COPY nginx/conf.d/default.conf /etc/nginx/templates/default.conf.template
COPY nginx/snippets/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --chmod=0755 nginx/docker-entrypoint.d/10-bootstrap-certificate.sh /docker-entrypoint.d/10-bootstrap-certificate.sh
COPY --chmod=0755 nginx/docker-entrypoint.d/30-watch-certificate.sh /docker-entrypoint.d/30-watch-certificate.sh
COPY --from=frontend /app/dist /usr/share/nginx/html

ENV NGINX_ENVSUBST_FILTER="TLS_DOMAIN|TLS_WWW_DOMAIN"

EXPOSE 80 443
