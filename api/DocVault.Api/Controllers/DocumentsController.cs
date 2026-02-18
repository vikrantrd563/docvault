using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using DocVault.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;
using Microsoft.AspNetCore.Authorization;

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

        public DocumentsController(
            BlobServiceClient blob,
            CosmosClient cosmos,
            ILogger<DocumentsController> logger)
        {
            _blobClient = blob;
            _cosmosClient = cosmos;
            _logger = logger;
        }

        // 📤 Upload
        [HttpPost]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file provided.");

            var userId = User.FindFirst("oid")?.Value
                ?? throw new Exception("User ID not found in token");

            var blobName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";

            var container = _blobClient.GetBlobContainerClient("uploads");
            await container.UploadBlobAsync(blobName, file.OpenReadStream());

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

        // 📄 List All Documents
        [HttpGet]
        public async Task<IActionResult> List()
        {
            var userId = User.FindFirst("oid")?.Value
                ?? throw new Exception("User ID not found in token");

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

        // 🔍 Search Documents by File Name
        [HttpGet("search")]
        public async Task<IActionResult> Search(string query)
        {
            var userId = User.FindFirst("oid")?.Value
                ?? throw new Exception("User ID not found in token");

            var container = _cosmosClient
                .GetDatabase("docvault")
                .GetContainer("documents");

            var sqlQuery = new QueryDefinition(
                "SELECT * FROM c WHERE c.userId = @userId AND CONTAINS(c.fileName, @query)")
                .WithParameter("@userId", userId)
                .WithParameter("@query", query);

            var iterator = container.GetItemQueryIterator<DocumentMetadata>(sqlQuery);

            var results = new List<DocumentMetadata>();

            while (iterator.HasMoreResults)
            {
                var response = await iterator.ReadNextAsync();
                results.AddRange(response);
            }

            return Ok(results);
        }

        // ❤️ Health
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
