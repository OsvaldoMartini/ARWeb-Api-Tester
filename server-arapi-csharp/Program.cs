using Microsoft.AspNetCore.Http.Json;

var builder = WebApplication.CreateBuilder(args);

var port = int.TryParse(Environment.GetEnvironmentVariable("SIDECAR_PORT"), out var parsedPort)
  ? parsedPort
  : 8787;

builder.WebHost.UseUrls($"http://127.0.0.1:{port}");
builder.Services.Configure<JsonOptions>(options =>
{
  options.SerializerOptions.PropertyNamingPolicy = null;
});

builder.Services.AddSingleton(new AppState());
builder.Services.AddCors(options =>
{
  options.AddDefaultPolicy(policy =>
  {
    policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin();
  });
});

var app = builder.Build();
app.UseCors();

var state = app.Services.GetRequiredService<AppState>();
state.InitializeDatabase();

app.MapGet("/health", () => Results.Ok(new { ok = true, ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }));

app.MapGet("/catalog/endpoints", () => Results.Ok(Array.Empty<object>()));

app.MapPost("/import", () => Results.Ok(new { ok = true, imported = 0, failures = Array.Empty<object>() }));

app.MapPost("/import/upload", () => Results.Ok(new { ok = true, imported = 0, failures = Array.Empty<object>() }));

app.MapGet("/taxonomy", () => Results.Ok(new { categories = Array.Empty<object>(), subcategories = Array.Empty<object>() }));

app.MapGet("/agents", () => Results.Ok(Array.Empty<object>()));

app.MapGet("/agents/capabilities", () => Results.Ok(Array.Empty<object>()));

app.MapPost("/agents/ask", () => Results.Ok(new { error = "Not implemented yet" }));

app.MapPost("/app-assistant/chat", () => Results.Ok(new { error = "Not implemented yet" }));

app.MapGet("/settings/ai-providers", () => Results.Ok(new { providers = Array.Empty<object>() }));

app.MapPost("/settings/ai-providers", () => Results.Ok(new { ok = true }));

app.MapPost("/settings/ai-providers/set-default", () => Results.Ok(new { ok = true }));

app.MapPost("/settings/ai-providers/test", () => Results.Ok(new { ok = true, ms = 0, text = "Not implemented yet" }));

app.MapGet("/environments", () => Results.Ok(Array.Empty<object>()));

app.MapPost("/environments", () => Results.Ok(new { ok = true, id = (string?)null }));

app.MapPut("/environments/{id}", (string id) => Results.Ok(new { ok = true, id }));

app.MapDelete("/environments/{id}", (string id) => Results.Ok(new { ok = true, id }));

app.MapGet("/botjobs", () => Results.Ok(Array.Empty<object>()));

app.MapPost("/botjobs", () => Results.Ok(new { ok = true, id = (string?)null }));

app.MapGet("/botjobs/{id}", (string id) => Results.Ok(new { id, job = (object?)null, blocks = Array.Empty<object>(), commands = Array.Empty<object>(), variables = Array.Empty<object>() }));

app.MapPut("/botjobs/{id}", (string id) => Results.Ok(new { ok = true, id }));

app.MapDelete("/botjobs/{id}", (string id) => Results.Ok(new { ok = true, id }));

app.MapPost("/botjobs/{id}/execute", (string id) => Results.Ok(new { ok = false, error = "Not implemented yet", id }));

app.MapGet("/executions", () => Results.Ok(Array.Empty<object>()));

app.MapGet("/executions/{runId}/steps", (string runId) => Results.Ok(Array.Empty<object>()));

app.MapGet("/executions/{runId}/report.html", (string runId) => Results.Text($"<html><body>Run {runId} not implemented yet</body></html>", "text/html"));

app.MapGet("/executions/{runId}/report.csv", (string runId) => Results.Text($"runId,status\n{runId},not_implemented\n", "text/csv"));

app.MapGet("/catalog/export/postman", () => Results.Text("{}", "application/json"));

app.MapGet("/catalog/export/bash", () => Results.Text("#!/usr/bin/env bash\n", "text/plain"));

app.MapGet("/mock/status", () => Results.Ok(new { running = false, port = 8855 }));

app.MapPost("/mock/start", () => Results.Ok(new { running = false, port = 8855 }));

app.MapPost("/mock/stop", () => Results.Ok(new { running = false }));

app.MapGet("/mock/log", () => Results.Ok(Array.Empty<object>()));

app.MapPost("/mock/log/clear", () => Results.Ok(new { ok = true }));

app.MapGet("/separation/progress", () =>
{
  var progressPath = Path.Combine(AppContext.BaseDirectory, "docs", "progress.json");
  if (!File.Exists(progressPath))
  {
    progressPath = Path.Combine(Directory.GetCurrentDirectory(), "docs", "progress.json");
  }

  if (!File.Exists(progressPath))
  {
    return Results.Ok(new { error = "progress.json not found" });
  }

  var json = File.ReadAllText(progressPath);
  return Results.Text(json, "application/json");
});

app.Run();

sealed class AppState
{
  private bool _initialized;

  public void InitializeDatabase()
  {
    if (_initialized) return;

    var dbPath = ResolveDatabasePath();
    var dir = Path.GetDirectoryName(dbPath);
    if (!string.IsNullOrWhiteSpace(dir))
    {
      Directory.CreateDirectory(dir);
    }

    _initialized = true;
  }

  private static string ResolveDatabasePath()
  {
    var explicitPath = Environment.GetEnvironmentVariable("DB_PATH");
    if (!string.IsNullOrWhiteSpace(explicitPath))
    {
      return explicitPath;
    }

    var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
    if (!string.IsNullOrWhiteSpace(appData))
    {
      return Path.Combine(appData, "ARWebShared", "arweb.db");
    }

    return Path.Combine(AppContext.BaseDirectory, "data", "app.db");
  }
}
