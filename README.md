#  DocVault – Secure Document Management Platform

> AZ-204 Capstone Project  
> Built using .NET 8, Angular 17, and Microsoft Azure

---

##  Project Overview

DocVault is a cloud-based secure document management system that allows users to:

- Upload files
- Store documents securely in Azure Blob Storage
- Store metadata in Azure Cosmos DB
- View uploaded documents in a modern Angular UI
- Download files using secure SAS URLs

This project demonstrates real-world Azure integration aligned with the AZ-204 certification objectives.

---

##  Team Members & Roles

###  Akshay – Backend 
- Built .NET 8 Web API
- Implemented file upload endpoint
- Integrated Azure Blob Storage
- Integrated Azure Cosmos DB
- Configured CORS
- Enabled Swagger (OpenAPI)

###  Vaibhav – Azure & DevOps 
- Created Azure Resource Group
- Created Storage Account and Blob Containers
- Created Cosmos DB and SQL container
- Configured Azure App Service
- Implemented GitHub Actions CI/CD
- Configured branch protection rules

###  Vikrant – Frontend 
- Developed Angular 17 application
- Built Upload UI (Drag & Drop)
- Built Document List UI
- Connected Angular to .NET API
- Implemented API service layer

---

##  Architecture

Angular Frontend (Port 4200)  
⬇  
.NET 8 Web API (Port 5251)  
⬇  
Azure Blob Storage (File Storage)  
⬇  
Azure Cosmos DB (Metadata Storage)

---

##  Features Implemented (Day 1)

###  Backend
- Controller-based .NET 8 Web API
- Upload document endpoint
- List documents endpoint
- Health check endpoint
- Secure SAS download URLs
- Dependency Injection setup
- CORS configuration

###  Azure Integration
- Blob container: `uploads`
- Cosmos DB database: `docvault`
- Container: `documents`
- Partition key: `/userId`

###  Frontend
- Drag-and-drop upload
- Angular Material UI
- Document list with file size formatting
- Refresh functionality

###  DevOps
- GitHub repository setup
- Branch protection rules
- Feature branch workflow
- CI/CD using GitHub Actions

---

##  Technologies Used

- .NET 8 Web API
- Angular 17
- Azure Blob Storage
- Azure Cosmos DB (SQL API)
- GitHub Actions
- Swagger (OpenAPI)

---

##  API Endpoints

###  Health Check
GET /api/health

###  Upload Document
POST /api/documents

###  List Documents
GET /api/documents

---

##  Local Development Setup

### 1 Clone Repository
git clone <repository-url>  
cd docvault

---

### 2 Backend Setup

Navigate to backend:

cd api/DocVault.Api

Create local configuration file (DO NOT COMMIT):

appsettings.Development.json

Add:

{
  "StorageConnectionString": "STORAGE_CONNECTION_STRING",
  "CosmosConnectionString": "COSMOS_CONNECTION_STRING"
}

Run backend:

dotnet run

Backend runs at:
http://localhost:5251

Swagger available at:
http://localhost:5251/swagger

---

### 3 Frontend Setup

Navigate to frontend:

cd frontend/docvault-frontend

Update API URL in:
src/environments/environment.ts

apiUrl: 'http://localhost:5251/api'

Run frontend:

ng serve

Frontend runs at:
http://localhost:4200

---

##  Security Notes

- Connection strings are stored in `appsettings.Development.json`
- Sensitive files are excluded using `.gitignore`
- No secrets are committed to GitHub
- Feature branch workflow enforced

---

##  Git Workflow

feature/* → dev → main

Rules:
- Never commit directly to main
- Always create feature branches
- Use Pull Requests before merging

---

##  Testing Flow

1. Start backend
2. Start frontend
3. Open http://localhost:4200
4. Upload file
5. Verify:
   - File appears in list
   - File stored in Azure Blob Storage
   - Metadata stored in Cosmos DB

---

##  Day 1 Goal Achieved

✔ Secure file upload system  
✔ Azure storage integration  
✔ Metadata persistence  
✔ Angular + .NET integration  
✔ CI/CD pipeline configured  

---



## Day 1 Conclusion

DocVault demonstrates a real-world full-stack cloud application integrating:

- Modern frontend (Angular)
- Scalable backend (.NET 8)
- Secure Azure storage services
- Professional DevOps workflow

This completes Day 1 of the AZ-204 Capstone Project.
