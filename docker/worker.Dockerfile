FROM node:22-slim
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN npm install --workspace=@job-copilot/worker --include-workspace-root
WORKDIR /repo/apps/worker
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
