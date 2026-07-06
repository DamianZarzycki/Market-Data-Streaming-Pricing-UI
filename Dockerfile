FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

# Run the Vite dev server so the proxy resolves Docker service names and
# the browser talks to the backend through relative /api paths.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
