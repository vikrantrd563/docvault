using Newtonsoft.Json;

namespace DocVault.Api.Models
{
    public class DocumentMetadata
    {
        [JsonProperty("id")]
        public string Id { get; set; } = string.Empty;

        [JsonProperty("userId")]
        public string UserId { get; set; } = string.Empty;

        [JsonProperty("fileName")]
        public string FileName { get; set; } = string.Empty;

        [JsonProperty("blobName")]
        public string BlobName { get; set; } = string.Empty;

        [JsonProperty("contentType")]
        public string ContentType { get; set; } = string.Empty;

        [JsonProperty("sizeBytes")]
        public long SizeBytes { get; set; }

        [JsonProperty("uploadedAt")]
        public DateTime UploadedAt { get; set; }

        [JsonProperty("excerpt")]
        public string? Excerpt { get; set; }

        [JsonProperty("downloadUrl")]
        public string? DownloadUrl { get; set; }
    }
}
