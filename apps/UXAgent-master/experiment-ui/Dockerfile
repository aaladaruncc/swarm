FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

EXPOSE 5173

# Run Vite dev server (for development)
# For production, use: npm run build && npx serve -s dist
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
