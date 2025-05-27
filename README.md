# Warranty Watcher

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/mhaowork/warranty-watcher)

A warranty information management system that bridges the gap between IT management platforms and manufacturer warranty databases. This system democratizes warranty lookups, making it accessible and transparent for IT professionals and managed service providers (MSPs).

Demo: https://demo.warrantywatcher.com/


## Features

- **Multi-Platform Integration:** Connect to various IT management platforms to retrieve device information
- **Manufacturer API Integration:** Query multiple manufacturer warranty APIs to determine warranty status
- **Local Storage:** All configuration is stored in the browser's local storage for privacy
- **CSV Import:** Import device information via CSV file
- **Reporting:** 🚧 Generate and export warranty status reports🚧 (Work-in-progress)

## Supported Platforms

- **PSA Tools**
  - ⏳ None yet (future support planned)

- **RMM Platforms**
  - ✅ Datto RMM
  - ✅ N-able N-central

- **Other**
  - ✅ CSV Files (for standalone reporting)

## Supported Manufacturers

- ✅ Dell
- ✅ HP
- ✅ Lenovo
- ⏳ Microsoft (planned)
- ⏳ Apple (planned)


## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- Docker (optional, for containerized deployment)

### Installation


#### Deployment
1. Run with Docker directly
   ```
   docker run -p 3000:3000 mhaowork/warrantywatcher:latest
   ```

   Tip: swap `-p` with `-d -p` to run it in the background

2. Access the application at [http://localhost:3000](http://localhost:3000). That's it!

3. Alternatively, if you want to build from source:
   ```
   git clone https://github.com/mhaowork/warranty-watcher.git
   cd warranty-watcher
   docker-compose up -d
   ```

#### Local Development (Ignore this unless you want to change the code Or don't want to use Docker)

1. Clone the repository
   ```
   git clone https://github.com/mhaowork/warranty-watcher.git
   cd warranty-watcher
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Run the development server
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Configure manufacturer API credentials (Dell, HP, etc.)
   - For Dell API setup, see [Dell Warranty API Guide](docs/dell.md) to get your API key
   - For HP & Lenovo API setup, see [this API Guide](docs/hp-lenovo.md) to get an API key

2. Configure platform credentials (Datto RMM, N-Central etc)
   - Datto RMM: See the [official guide](https://rmm.datto.com/help/en/Content/2SETUP/APIv2.htm) to activate the API and get your key
   - N-central RMM: Follow [this doc](https://developer.n-able.com/n-central/docs/create-an-api-only-user) to create an API-only user and get your JSON Web Token aka API key.

3. Sync devices from your platform or upload a CSV file. 
4. View and export warranty information. You can choose to write the warranty info back to the source platform (RMM / PSA)


## Detailed Documentation

https://deepwiki.com/mhaowork/warranty-watcher