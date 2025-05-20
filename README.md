# Warranty Watcher

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/mhaowork/warranty-watcher)

A warranty information management system that bridges the gap between IT management platforms and manufacturer warranty databases. This system democratizes warranty lookups, making it accessible and transparent for IT professionals and managed service providers (MSPs).

A demo with mock data:
![Demo Screenshot](public/demo.png)


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

- ✅ Dell (work in progress)
- ✅ HP (work in progress)
- ⏳ Lenovo (planned)
- ⏳ Microsoft (planned)
- ⏳ Apple (planned)


## Getting Started

### Prerequisites

- Node.js 18.0.0 or later

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/warranty-watcher.git
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
   - For HP API setup, see [HP Warranty API Guide](docs/hp.md) to get an API key

2. Configure platform credentials (Datto RMM, N-Central etc)
3. Sync devices from your platform or upload a CSV file. 
4. View and export warranty information. You can choose to write the warranty info back to the source platform (RMM / PSA)


## Detailed Documentation

https://deepwiki.com/mhaowork/warranty-watcher