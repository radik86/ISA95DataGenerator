using ISA95DataGenerator.Application.Interfaces;
using ISA95DataGenerator.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173", "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Get metadata path from configuration
var metadataPath = builder.Configuration.GetValue<string>("MetadataPath") 
    ?? Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "InbuiltEntitiesDTDL");

// Register services with dependency injection
builder.Services.AddSingleton<IMetadataLoaderService>(sp => 
    new MetadataLoaderService(
        sp.GetRequiredService<ILogger<MetadataLoaderService>>(), 
        metadataPath));

builder.Services.AddSingleton<IGraphTraversalService, GraphTraversalService>();
builder.Services.AddSingleton<IPrimaryKeyRuleService, PrimaryKeyRuleService>();
builder.Services.AddSingleton<IFieldRuleService, FieldRuleService>();
builder.Services.AddSingleton<IScenarioService, ScenarioService>();
builder.Services.AddScoped<ITestDataGeneratorService, TestDataGeneratorService>();
builder.Services.AddScoped<IMappingFileService, MappingFileService>();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

// Load metadata on startup
var metadataLoader = app.Services.GetRequiredService<IMetadataLoaderService>();
await metadataLoader.LoadAllEntitiesAsync();

app.Run();
