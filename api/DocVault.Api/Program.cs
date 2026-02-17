using Azure.Storage.Blobs;
using Microsoft.Azure.Cosmos;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register Azure Blob Storage client
builder.Services.AddSingleton(_ =>
    new BlobServiceClient(
        builder.Configuration["StorageConnectionString"]
    )
);

// Register Cosmos DB client
builder.Services.AddSingleton(_ =>
    new CosmosClient(
        builder.Configuration["CosmosConnectionString"]
    )
);

// Configure CORS for Angular frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Enable Swagger (only in development)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAngular");

app.UseAuthorization();

// IMPORTANT: Enable Controllers
app.MapControllers();

app.Run();
