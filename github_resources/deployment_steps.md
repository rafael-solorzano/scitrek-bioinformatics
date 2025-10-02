* when creating the AWS EC2 isntance, I selected the AMI Linux 2 because it natively supports Docker. 



------

# ✅ SciTrek Website Deployment with HTTPS (EC2 + Docker + Certbot)

This document summarizes the **steps taken to deploy the SciTrek website** on a new EC2 instance with Docker, serve it over HTTP initially, obtain HTTPS certificates using Certbot, and then configure NGINX to serve the site securely.

---

## 🛠️ Initial Deployment Steps

1. **Clone Repo & SSH into EC2**:

   ```bash
   git clone <your-repo-url>
   cd scitrek-bioinformatics
   ```

2. **Set up `.env` and data volumes (if needed)**

3. **Ensure NGINX default config is set for HTTP only** (e.g. `nginx/conf.d/default.conf`):

   ```nginx
   server {
       listen 80;
       server_name sci-trek.org www.sci-trek.org;

       location /.well-known/acme-challenge/ {
           root /var/www/certbot;
       }

       location /api/ {
           proxy_pass http://web:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /static/ {
           alias /usr/share/nginx/html/static/;
           try_files $uri =404;
       }

       location / {
           root /usr/share/nginx/html;
           index index.html;
           try_files $uri /index.html;
       }
   }
   ```

4. **Build and start containers**:

   ```bash
   docker-compose up -d --build
   ```

5. **Verify website is accessible via HTTP**:

   ```bash
   curl http://sci-trek.org
   ```

---

## 🔐 Obtaining HTTPS Certificate

1. **Ensure NGINX is running and serving HTTP** (specifically the ACME challenge route):

   ```bash
   echo "ok" > certbot/www/.well-known/acme-challenge/test
   curl http://sci-trek.org/.well-known/acme-challenge/test  # should return "ok"
   ```

2. **Run Certbot**:

   ```bash
   docker-compose run --rm --entrypoint "" certbot \
     certbot certonly --webroot --webroot-path=/var/www/certbot \
     -d sci-trek.org -d www.sci-trek.org \
     --agree-tos --email your@email.com --no-eff-email -v
   ```

3. **Confirm certificate exists** in `certbot-etc` volume:

   ```bash
   docker exec -it <nginx-container-name> ls /etc/letsencrypt/live/sci-trek.org/
   ```

---

## ✅ Update NGINX to Use HTTPS

Replace `default.conf` with:

```nginx
server {
    listen 80;
    server_name sci-trek.org www.sci-trek.org;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name sci-trek.org www.sci-trek.org;

    ssl_certificate /etc/letsencrypt/live/sci-trek.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sci-trek.org/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /api/ {
        proxy_pass http://web:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /usr/share/nginx/html/static/;
        try_files $uri =404;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri /index.html;
    }
}
```

Then restart NGINX:

```bash
docker-compose restart nginx
```

---

## 🔁 Redeployment on New EC2 Instance

1. Pull repo and `.env`
2. Ensure `default.conf` is in HTTP-only mode (see above)
3. Run:

   ```bash
   docker-compose up -d --build
   ```
4. Run Certbot (as before)
5. Swap NGINX config to HTTPS mode
6. Restart NGINX:

   ```bash
   docker-compose restart nginx
   ```

---

## 📌 Common Issues

* Port 80/443 must be open on EC2
* Domain DNS must point to EC2 instance (use `dig sci-trek.org` to check)
* NGINX must serve `.well-known/acme-challenge` for Certbot to validate
* Use `--entrypoint ""` in the Certbot run command to avoid infinite loop trap

---

## ✅ Done

Your website should now be accessible securely via:

```
https://sci-trek.org
```


