using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using Azure.Messaging.EventGrid;   // ✅ NEW
using Azure;                       // ✅ NEW
using DocVault.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;  // ✅ NEW

namespace DocVault.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DocumentsController : ControllerBase
    {
        private readonly BlobServiceClient _blobClient;
        private readonly CosmosClient _cosmosClient;
        private readonly ILogger<DocumentsController> _logger;
        private readonly IConfiguration _config;   // ✅ NEW

        public DocumentsController(
            BlobServiceClient blob,
            CosmosClient cosmos,
            IConfiguration config,              // ✅ NEW
            ILogger<DocumentsController> logger)
        {
            _blobClient = blob;
            _cosmosClient = cosmos;
            _config = config;                   // ✅ IMPORTANT
            _logger = logger;
        }

        private string? GetUserId()
        {
            return User.FindFirst("oid")?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value;
        }

        // POST /api/documents
        [HttpPost]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file provided.");

            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token.");

            var blobName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";

            var container = _blobClient.GetBlobContainerClient("uploads");
            await container.UploadBlobAsync(blobName, file.OpenReadStream());

            var ctr = _cosmosClient.GetDatabase("docvault").GetContainer("documents");

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

            // ============================================
            // ✅ EVENT GRID PUBLISHING (NEW BLOCK)
            // ============================================
            try
            {
                var egEndpoint = _config["EventGridEndpoint"];
                var egKey = _config["EventGridKey"];

                if (!string.IsNullOrEmpty(egEndpoint) && !string.IsNullOrEmpty(egKey))
                {
                    var client = new EventGridPublisherClient(
                        new Uri(egEndpoint),
                        new AzureKeyCredential(egKey));

                    var evt = new EventGridEvent(
                        subject: $"documents/{doc.Id}",
                        eventType: "DocVault.DocumentUploaded",
                        dataVersion: "1.0",
                        data: new
                        {
                            documentId = doc.Id,
                            userId = doc.UserId,
                            fileName = doc.FileName,
                            blobName = doc.BlobName,
                            contentType = doc.ContentType,
                            sizeBytes = doc.SizeBytes
                        });

                    await client.SendEventAsync(evt);

                    _logger.LogInformation(
                        "Published DocumentUploaded event for {Id}",
                        doc.Id);
                }
                else
                {
                    _logger.LogWarning("Event Grid configuration missing.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish event");
                // DO NOT fail upload if event fails
            }

            return Ok(doc);
        }

        // GET /api/documents
        [HttpGet]
        public async Task<IActionResult> List()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token.");

            var ctr = _cosmosClient.GetDatabase("docvault").GetContainer("documents");

            var query = new QueryDefinition(
                "SELECT * FROM c WHERE c.userId = @uid")
                .WithParameter("@uid", userId);

            var docs = new List<DocumentMetadata>();
            var feed = ctr.GetItemQueryIterator<DocumentMetadata>(query);

            while (feed.HasMoreResults)
                docs.AddRange(await feed.ReadNextAsync());

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

        // GET /api/documents/search?q=term
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery(Name = "q")] string q)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token.");

            if (string.IsNullOrWhiteSpace(q))
                return Ok(new List<DocumentMetadata>());

            var container = _cosmosClient.GetDatabase("docvault").GetContainer("documents");

            var sqlQuery = new QueryDefinition(
                "SELECT * FROM c WHERE c.userId = @userId AND CONTAINS(LOWER(c.fileName), LOWER(@q))")
                .WithParameter("@userId", userId)
                .WithParameter("@q", q);

            var iterator = container.GetItemQueryIterator<DocumentMetadata>(sqlQuery);
            var results = new List<DocumentMetadata>();

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                results.AddRange(response);
            }

            var blobCtr = _blobClient.GetBlobContainerClient("uploads");
            foreach (var doc in results)
            {
                doc.DownloadUrl = blobCtr
                    .GetBlobClient(doc.BlobName)
                    .GenerateSasUri(
                        BlobSasPermissions.Read,
                        DateTimeOffset.UtcNow.AddHours(1))
                    .ToString();
            }

            return Ok(results);
        }

        // GET /api/health
        [AllowAnonymous]
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
