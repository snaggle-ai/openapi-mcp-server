# Generated by https://smithery.ai. See: https://smithery.ai/docs/config#dockerfile
# Use an official Node.js image as a base for the build stage
FROM node:23 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package manager lock file and package.json files
COPY pnpm-lock.yaml package.json ./

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy the rest of the project files
COPY . .

# Build the project
RUN pnpm build

# Use a smaller Node.js image for the runtime environment
FROM node:23-slim

# Set the working directory inside the container
WORKDIR /app

# Copy built files and dependencies from the builder stage
COPY --from=builder /app ./

# Install only production dependencies
RUN pnpm install --prod

# Set the command to run the server
ENTRYPOINT ["npx", "openapi-mcp-server"]

# To run the server, you will need to provide the path to the OpenAPI JSON file as an argument
