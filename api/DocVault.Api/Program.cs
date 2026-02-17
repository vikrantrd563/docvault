using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Azure.Storage.Blobs;
using Microsoft.Azure.Cosmos;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular",
        policy =>
        {
            policy.WithOrigins("http://localhost:4200", "https://localhost:4200")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// (Optional but recommended if using Swagger)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


/*builder.Services.AddSingleton(x =>
{
    var connectionString = builder.Configuration.GetConnectionString("AzureBlobStorage");
    return new BlobServiceClient(connectionString);
});*/

builder.Services.AddSingleton(x =>
{
    var connectionString =
        builder.Configuration["StorageConnectionString"];

    return new BlobServiceClient(connectionString);
});


builder.Services.AddSingleton(x =>
{
    var cosmosConnectionString =
        builder.Configuration["CosmosConnectionString"];

    return new CosmosClient(cosmosConnectionString);
});
var app = builder.Build();

// Enable Swagger in Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


app.UseCors("AllowAngular");

//app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();