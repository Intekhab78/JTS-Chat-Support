FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci --workspace=backend --include-workspace-root=false || npm install --prefix backend --omit=dev
COPY backend ./backend

FROM node:20-alpine AS runner
WORKDIR /app/backend
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/backend ./
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]
