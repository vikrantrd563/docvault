using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using DocVault.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;

namespace DocVault.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly BlobServiceClient _blobClient;
        private readonly CosmosClient _cosmosClient;
        private readonly ILogger<DocumentsController> _logger;

        public DocumentsController(
            BlobServiceClient blob,
            CosmosClient cosmos,
            ILogger<DocumentsController> logger)
        {
            _blobClient = blob;
            _cosmosClient = cosmos;
            _logger = logger;
        }

        // POST /api/documents — Upload file
        [HttpPost]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file provided.");

            var userId = "test-user-001";
            var blobName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";

            // Upload to Blob Storage
            var container = _blobClient.GetBlobContainerClient("uploads");
            await container.UploadBlobAsync(blobName, file.OpenReadStream());

            // Save metadata to Cosmos DB
            var ctr = _cosmosClient
                .GetDatabase("docvault")
                .GetContainer("documents");

            var doc = new DocumentMetadata
            {
                Id = Guid.NewGuid().ToString(),
                UserId = userId,
                FileName = file.FileName,
                BlobName = blobName,
                ContentType = file.ContentType ?? "application/octet-stream",
                SizeBytes = file.Length,
                UploadedAt = DateTime.UtcNow
            };

            await ctr.CreateItemAsync(doc, new PartitionKey(userId));

            return Ok(doc);
        }

        // GET /api/documents — List documents
        [HttpGet]
        public async Task<IActionResult> List()
        {
            var userId = "test-user-001";

            var ctr = _cosmosClient
                .GetDatabase("docvault")
                .GetContainer("documents");

            var query = new QueryDefinition(
                "SELECT * FROM c WHERE c.userId = @uid")
                .WithParameter("@uid", userId);

            var docs = new List<DocumentMetadata>();
            var feed = ctr.GetItemQueryIterator<DocumentMetadata>(query);

            while (feed.HasMoreResults)
                docs.AddRange(await feed.ReadNextAsync());

            // Generate SAS download URL
            var blobCtr = _blobClient.GetBlobContainerClient("uploads");

            foreach (var doc in docs)
            {
                doc.DownloadUrl = blobCtr
                    .GetBlobClient(doc.BlobName)
                    .GenerateSasUri(
                        BlobSasPermissions.Read,
                        DateTimeOffset.UtcNow.AddHours(1))
                    .ToString();
            }

            return Ok(docs);
        }

        // Health check
        [HttpGet("/api/health")]
        public IActionResult Health()
        {
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow
            });
        }
    }
}
