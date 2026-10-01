# Algorithm Studio — single-container production image.
#
# Stage 1 builds the frontend (Vite); stage 2 runs FastAPI, which serves both
# the API and the built SPA. Python submissions run out of the box; g++ is
# installed so C++ submissions work too (Java omitted to keep the image small —
# add a JDK layer if you need it).
#
#   docker build -t algorithm-studio .
#   docker run -p 8000:8000 -e JWT_SECRET=$(openssl rand -hex 32) algorithm-studio

# ---------------------------------------------------------------- frontend
FROM node:22-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------- backend
FROM python:3.12-slim
WORKDIR /srv

# g++ for C++ submissions (delete this line if Python-only is fine).
RUN apt-get update && apt-get install -y --no-install-recommends g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend /build/dist ./static

ENV APP_ENV=production \
    STATIC_DIR=/srv/static \
    DATABASE_URL=sqlite:////data/app.db

# SQLite lives on a volume so users/submissions survive restarts.
# Volume is configured at the platform level (docker-compose / fly.toml / render.yaml).
RUN mkdir -p /data

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
