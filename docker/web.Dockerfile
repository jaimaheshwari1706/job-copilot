FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN npm install --workspace=@job-copilot/web --include-workspace-root
RUN npm run build -w @job-copilot/web

FROM node:22-slim AS runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /repo/apps/web/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
