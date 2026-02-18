using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Azure.Storage.Blobs;
using Microsoft.Azure.Cosmos;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

public class BlobTriggerFunction
{
    private readonly ILogger<BlobTriggerFunction> _logger;
    private readonly BlobServiceClient _blobClient;
    private readonly CosmosClient _cosmosClient;

    public BlobTriggerFunction(
        ILogger<BlobTriggerFunction> logger,
        BlobServiceClient blobClient,
        CosmosClient cosmosClient)
    {
        _logger = logger;
        _blobClient = blobClient;
        _cosmosClient = cosmosClient;
    }

    [Function(nameof(ProcessDocument))]
    public async Task ProcessDocument(
        [BlobTrigger("uploads/{name}", Connection = "StorageConnectionString")]
        Stream blobStream,
        string name)
    {
        _logger.LogInformation("Processing blob: {Name}", name);

        if (name.EndsWith(".jpg") || name.EndsWith(".png") || name.EndsWith(".jpeg"))
        {
            try
            {
                using var image = await Image.LoadAsync(blobStream);
                image.Mutate(x => x.Resize(200, 200));
                using var thumbStream = new MemoryStream();
                await image.SaveAsJpegAsync(thumbStream);
                thumbStream.Position = 0;

                var thumbContainer = _blobClient.GetBlobContainerClient("thumbnails");
                var thumbName = $"thumb_{name}";
                await thumbContainer.UploadBlobAsync(thumbName, thumbStream);
                _logger.LogInformation("Thumbnail created: {Name}", thumbName);

                await UpdateDocumentMetadata(name, thumbName, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create thumbnail for {Name}", name);
            }
        }

        await UpdateDocumentMetadata(name, null, "Text extraction placeholder");
    }

    private async Task UpdateDocumentMetadata(
        string blobName, string? thumbName, string? excerpt)
    {
        var container = _cosmosClient.GetDatabase("docvault").GetContainer("documents");
        var query = new QueryDefinition("SELECT * FROM c WHERE c.blobName = @name")
            .WithParameter("@name", blobName);

        var feed = container.GetItemQueryIterator<dynamic>(query);
        if (feed.HasMoreResults)
        {
            var results = await feed.ReadNextAsync();
            var doc = results.FirstOrDefault();
            if (doc != null)
            {
                if (thumbName != null) doc.thumbnailBlobName = thumbName;
                if (excerpt != null) doc.excerpt = excerpt;
                await container.ReplaceItemAsync(doc, (string)doc.id,
                    new PartitionKey((string)doc.userId));
            }
        }
    }
}