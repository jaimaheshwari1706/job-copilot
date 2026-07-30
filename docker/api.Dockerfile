FROM node:22-slim
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm install --workspace=@job-copilot/api --include-workspace-root
WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "start"]
