# **Warranty Information Management System - Project Brief**

## **Project Vision**

Create a web-based warranty information management system that bridges the gap between IT management platforms and manufacturer warranty databases. This system will democratize warranty lookups, making it accessible and transparent for IT professionals and managed service providers (MSPs).

## **Business Problem**

Currently, warranty information management is fragmented, inefficient, and sometimes exploited by third parties charging premium fees for basic lookups. Our solution will:

1. Eliminate manual warranty lookups across multiple manufacturer websites
2. Centralize warranty information within existing IT management tools
3. Provide clear visibility into warranty status across device fleets
4. Generate comprehensive reports for planning and budgeting

## **Core Capabilities**

The system will offer these key capabilities:

1. **Multi-Platform Integration**: Connect to various IT management platforms to retrieve device information
2. **Manufacturer API Integration**: Query multiple manufacturer warranty APIs to determine warranty status
3. **Automatic Synchronization**: Update warranty information in source systems automatically
4. **Report Generation**: Create HTML and CSV reports of warranty status across the device fleet (Do not implement until later; But keep it in mind while designing the architecture)
5. **Flexible Configuration**: Support various parameters to customize behavior

## **Supported Platforms**

### **PSA Tools**

- Autotask
- ConnectWise Manage

### **Documentation Tools**

- None for now. (Do not implement until later; But keep it in mind while designing the architecture)

### **RMM Platforms**

- Datto RMM
- NinjaOne (Do not implement until later; But keep it in mind while designing the architecture)

### **Other**

- CSV Files (for standalone reporting)

## **Supported Manufacturers**

- Dell (requires API key)
- HP
- Microsoft (Surface devices) (Do not implement until later; But keep it in mind while designing the architecture)
- Lenovo (Do not implement until later; But keep it in mind while designing the architecture)
- Toshiba (Do not implement until later; But keep it in mind while designing the architecture)
- Apple (Do not implement until later; But keep it in mind while designing the architecture)

## **System Architecture**

The system will follow a modular architecture with these components:

1. **Core Engine**: Orchestrates the warranty retrieval and update process
2. **Platform Connectors**: Interface with each supported IT management platform
3. **Manufacturer API Clients**: Determine and query the appropriate warranty API
4. **Reporting Engine**: Generate standardized reports across platforms (Do not implement until later; But keep it in mind while designing the architecture)

## **User Experience**

Users will be able to:

1. Configure connections to their IT management platforms
2. Set up manufacturer API credentials where required
3. Run warranty updates on demand or schedule them
4. Choose whether to update source systems or just generate reports
5. Exclude specific manufacturers if needed
6. Generate client-specific warranty reports in HTML and CSV formats

## **Implementation Phases**

1. **Phase 1**: Core engine and initial manufacturer platform support (Dell&HP + DattoRMM) 
2. **Phase 2**: Additional platform integrations (Autotask, ConnectWise Manage)
3. **Phase 3**: Expanded manufacturer support and reporting enhancements
4. **Phase 4**: Advanced features (scheduling, custom fields, API improvements)