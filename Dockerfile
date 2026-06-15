# ===== Стадия 1: сборка фронта =====
FROM node:20-alpine AS webbuild
WORKDIR /app

# Копируем манифесты (lock-файл попадёт, если есть)
COPY frontend/package*.json ./

# Если lock отсутствует — сгенерировать, затем чистая установка по lock:
RUN if [ ! -f package-lock.json ]; then \
      npm install --package-lock-only --no-audit --no-fund; \
    fi && \
    npm ci --no-audit --no-fund

# Дальше — остальной код фронта и сборка
COPY frontend/ ./
RUN npm run build  # результат: /app/dist

# ===== Стадия 2: бэкенд + статика =====
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# зависимости бэкенда
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# код бэкенда
COPY backend/ ./

# собранный фронт как статика для SPA
COPY --from=webbuild /app/dist /app/frontend_dist

EXPOSE 8000
CMD ["uvicorn","app:app","--host","0.0.0.0","--port","8000"]
