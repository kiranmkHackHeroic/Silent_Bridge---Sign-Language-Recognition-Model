# Silent Bridge — Deployment Guide

This document describes how to deploy **Silent Bridge** across different environments, from instant cloud hosting to local kiosk servers.

---

## 1. Instant Cloud Access (Already Active in AI Studio)

Your applet is already running live in the cloud. You have access to:
- **Shared App URL**: `https://ais-pre-d57rgdqc6o5aai2prrpu74-257357622873.asia-east1.run.app`
- **Development App URL**: `https://ais-dev-d57rgdqc6o5aai2prrpu74-257357622873.asia-east1.run.app`

To share with evaluators or users directly from Google AI Studio:
1. Click the **Share** or **Publish** button at the top-right of your AI Studio screen.
2. Select visibility (Public or Restricted).
3. Copy the URL. Anyone opening the link will be able to use the live recognition webcam, 3D avatar, and download all report/PPT deliverables without any local installation.

---

## 2. Docker & Google Cloud Run Deployment

Silent Bridge includes a self-contained `Dockerfile` ready for any container platform (Google Cloud Run, AWS App Runner, Azure Container Apps, or Docker Hub).

### Build & Run Locally with Docker:
```bash
# 1. Build the container image
docker build -t silent-bridge .

# 2. Run the container on port 3000
docker run -p 3000:3000 -e PORT=3000 silent-bridge
```
Open `http://localhost:3000` in your browser.

### Deploy Directly to Google Cloud Run:
```bash
# 1. Build and push image to Google Artifact Registry / Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/silent-bridge

# 2. Deploy to Cloud Run
gcloud run deploy silent-bridge \
  --image gcr.io/YOUR_PROJECT_ID/silent-bridge \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 2Gi \
  --cpu 2
```

---

## 3. Free Web Hosting (Render / Railway)

Silent Bridge can be deployed as a Web Service on **Render** (free tier available):

1. Push your repository to **GitHub** or **GitLab**.
2. Go to [Render.com](https://render.com) and click **New + > Web Service**.
3. Connect your repository.
4. Configure the service settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV` = `production`
5. Click **Create Web Service**. Render will build the Vite bundle, launch `server.ts`, and provide an automatic `https://your-app.onrender.com` SSL domain.

---

## 4. On-Premise / Campus Kiosk Deployment (Ubuntu / Debian Server)

For deploying inside a college laboratory, hospital counter, or public service desk on Ubuntu:

```bash
# 1. Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 2. Clone repository & install dependencies
git clone <YOUR_REPO_URL> silent-bridge
cd silent-bridge
npm install

# 3. Build the production client
npm run build

# 4. Install PM2 process manager
sudo npm install -g pm2

# 5. Start with PM2
PORT=3000 NODE_ENV=production pm2 start "npm start" --name "silent-bridge"
pm2 save
pm2 startup
```

### Configure Nginx Reverse Proxy with SSL (HTTPS required for Webcam):
Web browsers require **HTTPS** (or `localhost`) to grant webcam access.

```nginx
server {
    server_name signbridge.bmsce.ac.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Obtain free SSL using Certbot:
```bash
sudo certbot --nginx -d signbridge.bmsce.ac.in
```

---

## 5. Verification Checklist

After deployment, verify the following endpoints:
- `GET /` — Loads the Silent Bridge SPA.
- `GET /api/model/status` — Returns model class count (`144`) and version.
- `WS /ws/recognition` — WebSocket connects for real-time recognition.
- `GET /report/CSBS_BE_Project_Report_Kannada_SignBridge.pdf` — Downloads the 78-page B.E. report.
- `GET /report/SILENT_BRIDGE_Presentation_10Slides.pptx` — Downloads the 10-slide presentation deck.
