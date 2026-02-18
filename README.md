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

- Secure file upload system  
- Azure storage integration  
- Metadata persistence  
- Angular + .NET integration  
- CI/CD pipeline configured  

---



## Day 1 Conclusion

DocVault demonstrates a real-world full-stack cloud application integrating:

- Modern frontend (Angular)
- Scalable backend (.NET 8)
- Secure Azure storage services
- Professional DevOps workflow

This completes Day 1 of the AZ-204 Capstone Project.

#  DocVault – Day 2 (Security, Identity & Secret Management)

> AZ-204 Capstone Project – Day 2  
> Focus: Authentication, Authorization & Secure Azure Integration

---

##  Day 2 Objective

Enhance DocVault with enterprise-level security by implementing:

- Microsoft Entra ID Authentication
- JWT Token Validation
- User-based Data Isolation
- Azure Key Vault Integration
- Managed Identity (Zero Credential Architecture)
- Secure Search Functionality

---

##  Team Contributions – Day 2

###  Akshay – Backend Security & Identity

Completed:

- Implemented Microsoft Entra ID authentication
- Configured JWT Bearer token validation
- Secured API using `[Authorize]`
- Extracted user identity using `oid` claim
- Implemented user-based data isolation
- Added Search endpoint with Cosmos DB filtering
- Integrated Azure Key Vault
- Implemented Managed Identity authentication
- Removed local development secrets
- Verified CI pipeline success

---

###  Vaibhav – Azure Configuration & Identity Setup

Completed:

- Created Azure App Registration
- Configured API scope:

  ```
  api://cdeae5d3-39ef-4f39-adb4-0dcfcf038a0f/Documents.Read
  ```

- Configured Tenant ID
- Assigned Key Vault access roles
- Created and stored secrets in Azure Key Vault
- Verified role assignments for team members

---

###  Vikrant – Frontend Preparation

Prepared:

- Angular configuration for secure API calls
- Frontend readiness for Entra ID login integration
- API service updates for token-based communication


---

##  Security Features Implemented

### 1 Microsoft Entra ID Authentication

- JWT Bearer authentication enabled
- Token validation using `Microsoft.Identity.Web`
- API secured with `[Authorize]`
- Public health endpoint allowed using `[AllowAnonymous]`

User identity extraction:

```csharp
var userId = User.FindFirst("oid")?.Value;
```

---

### 2 User-Based Document Isolation

Each document is stored with:

```
UserId = JWT oid
```

Cosmos DB partition key:

```
/userId
```

Users can only:

- View their own documents
- Search within their own documents
- Upload under their own identity

---

### 3 Azure Key Vault Integration

Secrets removed from local configuration.

Stored securely in:

```
Azure Key Vault: docvault-kv1234
```

Secrets used:

- StorageConnectionString
- CosmosConnectionString

Program.cs configuration:

```csharp
builder.Configuration.AddAzureKeyVault(
    new Uri(keyVaultUrl),
    new DefaultAzureCredential());
```

---

### 4 Managed Identity (Zero Credential Architecture)

#### Local Development

```
az login --tenant aba96f5c-fedf-45cc-8df8-8a5c26557f1f
```

`DefaultAzureCredential` uses Azure CLI authentication.

#### Production

Azure App Service uses:

```
System Assigned Managed Identity
```

No secrets stored in:

- Code
- Config files
- Environment variables
- GitHub repository

---

##  New Feature – Secure Search Endpoint

Endpoint:

```
GET /api/documents/search?query=test
```

Cosmos DB query:

```sql
SELECT * FROM c 
WHERE c.userId = @userId 
AND CONTAINS(c.fileName, @query)
```

Features:

- Secure (JWT required)
- User-isolated
- Cosmos DB optimized filtering
- CI verified

---

##  Updated API Endpoints (Day 2)

Public:

```
GET /api/health
```

Secure:

```
POST /api/documents
GET /api/documents
GET /api/documents/search
```

---

##  Local Development (Day 2)

1 Login to Azure:

```
az login --tenant aba96f5c-fedf-45cc-8df8-8a5c26557f1f
```

2 Run API:

```
cd api/DocVault.Api
dotnet run
```

Swagger:

```
http://localhost:5251/swagger
```

---

##  Day 2 Goals Achieved

- Microsoft Entra ID authentication  
- JWT validation  
- User-based isolation  
- Azure Key Vault integration  
- Managed Identity implementation  
- Zero credential backend  
- Secure search functionality  
- CI/CD pipeline passing  

---

##  Day 2 Conclusion

Day 2 successfully upgraded DocVault from a basic cloud application to a secure, enterprise-ready Azure solution.

Security, identity management, and secret protection are now implemented according to AZ-204 certification standards.

