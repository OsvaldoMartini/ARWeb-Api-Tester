using System.Text.Json;
using Microsoft.AspNetCore.Http.Json;

var builder = WebApplication.CreateBuilder(args);

var port = int.TryParse(Environment.GetEnvironmentVariable("SIDECAR_PORT"), out var parsedPort)
  ? parsedPort
  : 8787;

builder.WebHost.UseUrls($"http://127.0.0.1:{port}");
builder.Services.Configure<JsonOptions>(options =>
{
  options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
  options.SerializerOptions.PropertyNameCaseInsensitive = true;
});
builder.Services.AddSingleton<ArapiBackend>();
builder.Services.AddCors(options =>
{
  options.AddDefaultPolicy(policy => policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
});

var app = builder.Build();
app.UseCors();

var backend = app.Services.GetRequiredService<ArapiBackend>();
backend.Initialize();

app.MapGet("/health", backend.Health);
app.MapGet("/catalog/endpoints", backend.CatalogEndpoints);
app.MapPost("/import", async (ImportFolderRequest request) => await backend.ImportAsync(request.FolderPath ?? string.Empty));
app.MapPost("/import/upload", async (UploadImportRequest request) => await backend.ImportUploadAsync(request));
app.MapGet("/taxonomy", backend.Taxonomy);
app.MapGet("/agents", backend.Agents);
app.MapGet("/agents/capabilities", backend.AgentCapabilities);
app.MapPost("/agents/ask", (AskAgentRequest request) => backend.AskAgent(request));
app.MapPost("/app-assistant/chat", (AppAssistantChatRequest request) => backend.AppAssistantChat(request));
app.MapGet("/settings/ai-providers", backend.GetAiProviders);
app.MapPost("/settings/ai-providers", (AiProviderSettingRequest request) => backend.SaveAiProvider(request));
app.MapPost("/settings/ai-providers/set-default", (DefaultSelectionRequest request) => backend.SetDefaultAiProvider(request));
app.MapPost("/settings/ai-providers/test", (TestAiProviderRequest request) => backend.TestAiProvider(request));
app.MapGet("/catalog/endpoints/{endpointId}/category", (string endpointId) => Results.BadRequest(new { error = "use PUT" }));
app.MapPut("/catalog/endpoints/{endpointId}/category", (string endpointId, SetEndpointCategoryRequest request) => backend.SetEndpointCategory(endpointId, request));
app.MapGet("/environments", backend.ListEnvironments);
app.MapPost("/environments", (CreateEnvironmentRequest request) => backend.CreateEnvironment(request));
app.MapPut("/environments/{id}", (string id, UpdateEnvironmentRequest request) => backend.UpdateEnvironment(id, request));
app.MapDelete("/environments/{id}", (string id) => backend.DeleteEnvironment(id));
app.MapGet("/botjobs", backend.ListBotJobs);
app.MapPost("/botjobs", (CreateBotJobRequest request) => backend.CreateBotJob(request));
app.MapGet("/botjobs/{id}", (string id) => backend.GetBotJob(id));
app.MapPut("/botjobs/{id}", (string id, BotJobDetailRequest request) => backend.SaveBotJob(id, request));
app.MapDelete("/botjobs/{id}", (string id) => backend.DeleteBotJob(id));
app.MapGet("/botjobs/{id}/export/bash", (string id, HttpRequest request) =>
{
  var environmentId = request.Query.TryGetValue("environmentId", out var values) ? values.ToString() : null;
  return backend.ExportBotJobBash(id, environmentId);
});
app.MapPost("/botjobs/{id}/execute", (string id, ExecuteBotJobRequest request) => backend.ExecuteBotJob(id, request));
app.MapGet("/executions", (HttpRequest request) =>
{
  var botJobId = request.Query.TryGetValue("botJobId", out var values) ? values.ToString() : null;
  return backend.ListExecutions(botJobId);
});
app.MapGet("/executions/{runId}/steps", (string runId) => backend.GetExecutionSteps(runId));
app.MapGet("/executions/{runId}/report.html", (string runId) => backend.GetExecutionReportHtml(runId));
app.MapGet("/executions/{runId}/report.csv", (string runId) => backend.GetExecutionReportCsv(runId));
app.MapGet("/catalog/export/postman", (HttpRequest request) =>
{
  var baseUrl = request.Query.TryGetValue("baseUrl", out var values) ? values.ToString() : "http://localhost";
  return backend.CatalogExportPostman(baseUrl);
});
app.MapGet("/catalog/export/bash", (HttpRequest request) =>
{
  var baseUrl = request.Query.TryGetValue("baseUrl", out var values) ? values.ToString() : "http://localhost";
  return backend.CatalogExportBash(baseUrl);
});
app.MapGet("/mock/status", backend.MockStatus);
app.MapPost("/mock/start", backend.MockStart);
app.MapPost("/mock/stop", backend.MockStop);
app.MapGet("/mock/log", backend.MockLog);
app.MapPost("/mock/log/clear", backend.MockClearLog);
app.MapGet("/separation/progress", backend.SeparationProgress);

app.Run();

public sealed class ImportFolderRequest
{
  public string? FolderPath { get; set; }
}
