using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Azure.Storage.Blobs;
using Microsoft.Azure.Cosmos;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        var storageConn = Environment.GetEnvironmentVariable("StorageConnectionString");
        services.AddSingleton(new BlobServiceClient(storageConn));

        var cosmosConn = Environment.GetEnvironmentVariable("CosmosConnectionString");
        services.AddSingleton(new CosmosClient(cosmosConn));
    })
    .Build();

host.Run();