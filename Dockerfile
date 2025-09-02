FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Set as environment variable for the build process
ARG NEXT_PUBLIC_DEPLOYMENT_MODE=self-hosted
ENV NEXT_PUBLIC_DEPLOYMENT_MODE=${NEXT_PUBLIC_DEPLOYMENT_MODE}

# Set as environment variable for the build process for SaaS mode only
ARG NEXT_PUBLIC_SUPABASE_URL=
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}

# Set as environment variable for the build process for SaaS mode only
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Set as environment variable for the build process for SaaS mode only
ARG NEXT_PUBLIC_APP_URL=
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Copy static files for standalone build
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application with standalone server
CMD ["node", ".next/standalone/server.js"] 