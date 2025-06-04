# Warranty Watcher

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/mhaowork/warranty-watcher)

A warranty information management system that bridges the gap between IT management platforms and manufacturer warranty databases. This system democratizes warranty lookups, making it accessible and transparent for IT professionals and managed service providers (MSPs).

Demo: https://demo.warrantywatcher.com/

View Example Report: [Example Report](public/warranty-watcher-example-report-2025-06-03.pdf)


## Features

- **Multi-Platform Integration:** Connect to various IT management platforms to retrieve device information
- **Manufacturer API Integration:** Query multiple manufacturer warranty APIs to determine warranty status
- **Local Database:** Device information is stored in a local SQLite database for persistence and performance
- **Local API Credential Storage:** Configuration is stored in each user's browser local storage for privacy.
- **CSV Import:** Import device information via CSV file
- **Reporting:** Generate and export warranty status reports

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

- **For Production:** Docker
- **For Development:** Node.js 18.0.0 or later

### Production Deployment

#### Option 1: Docker Hub Image (Recommended)
```bash
docker run -p 3000:3000 -v ./data:/app/data -e DB_PATH=/app/data/warranty.db mhaowork/warrantywatcher:latest
```
Note: your device database will be saved in the `data` folder under your current directory

Access the application at [http://localhost:3000](http://localhost:3000).

#### Option 2: Build from Source
```bash
git clone https://github.com/mhaowork/warranty-watcher.git
cd warranty-watcher
docker-compose up -d
```

### Development Setup (Ignore this unless you want to change the code Or don't want to use Docker)

1. Clone the repository
   ```bash
   git clone https://github.com/mhaowork/warranty-watcher.git
   cd warranty-watcher
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Run the development server
   ```bash
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
