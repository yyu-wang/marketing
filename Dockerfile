# ============================================================================
# CopyWise Web 多阶段构建
# 构建：docker build -t copywise-web .
# ============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_BASE=/api
ARG VITE_APP_TITLE="CopyWise 智能营销文案助手"
ENV VITE_API_BASE=$VITE_API_BASE \
    VITE_APP_TITLE=$VITE_APP_TITLE

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ----------- runtime: nginx -----------
FROM nginx:alpine AS runner
RUN apk add --no-cache wget

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
