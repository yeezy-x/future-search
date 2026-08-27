FROM node:22-bookworm-slim

ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /home/futuresearch

COPY ui/package.json ui/package-lock.json ./
RUN npm ci

COPY ui ./

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
