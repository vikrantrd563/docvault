using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using Azure.Messaging.EventGrid;
using Azure;
using DocVault.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Cosmos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.DataContracts;
using System.Diagnostics;

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
        private readonly IConfiguration _config;
        private readonly TelemetryClient _telemetry;

        public DocumentsController(
            BlobServiceClient blob,
            CosmosClient cosmos,
            IConfiguration config,
            ILogger<DocumentsController> logger,
            TelemetryClient telemetry)
        {
            _blobClient = blob;
            _cosmosClient = cosmos;
            _config = config;
            _logger = logger;
            _telemetry = telemetry;
        }

        private string? GetUserId()
        {
            return User.FindFirst("oid")?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value;
        }

        // ── UPLOAD ────────────────────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            var sw = Stopwatch.StartNew();

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
                    _logger.LogInformation("Published DocumentUploaded event for {Id}", doc.Id);
                }
                else
                {
                    _logger.LogWarning("Event Grid configuration missing.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish event");
            }

            sw.Stop();
            _telemetry.TrackMetric("DocumentUploadDurationMs", sw.ElapsedMilliseconds);
            _telemetry.TrackEvent("DocumentUploaded",
                new Dictionary<string, string>
                {
                    { "fileName",    doc.FileName },
                    { "contentType", doc.ContentType },
                    { "sizeBytes",   doc.SizeBytes.ToString() },
                    { "userId",      doc.UserId }
                });

            return Ok(doc);
        }

        // ── LIST ──────────────────────────────────────────────────────────────
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

        // ── SEARCH ────────────────────────────────────────────────────────────
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

        // ── DELETE ────────────────────────────────────────────────────────────
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token.");

            var ctr = _cosmosClient.GetDatabase("docvault").GetContainer("documents");

            // Fetch the document first to get the blobName and verify ownership
            DocumentMetadata doc;
            try
            {
                var response = await ctr.ReadItemAsync<DocumentMetadata>(id, new PartitionKey(userId));
                doc = response.Resource;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return NotFound($"Document {id} not found.");
            }

            // Verify this document belongs to the requesting user
            if (doc.UserId != userId)
                return Forbid();

            // Delete blob from Azure Storage
            try
            {
                var blobCtr = _blobClient.GetBlobContainerClient("uploads");
                await blobCtr.GetBlobClient(doc.BlobName).DeleteIfExistsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete blob {BlobName} for document {Id}", doc.BlobName, id);
                // Still proceed to delete the Cosmos record even if blob delete fails
            }

            // Delete record from Cosmos DB
            await ctr.DeleteItemAsync<DocumentMetadata>(id, new PartitionKey(userId));

            _telemetry.TrackEvent("DocumentDeleted",
                new Dictionary<string, string>
                {
                    { "documentId", id },
                    { "fileName",   doc.FileName },
                    { "userId",     userId }
                });

            _logger.LogInformation("Deleted document {Id} ({FileName}) for user {UserId}", id, doc.FileName, userId);

            return NoContent(); // 204
        }

        // ── HEALTH ────────────────────────────────────────────────────────────
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