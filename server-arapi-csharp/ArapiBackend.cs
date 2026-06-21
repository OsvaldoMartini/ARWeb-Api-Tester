using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Reflection;

public sealed class ArapiBackend
{
  private static readonly string[] IgnoredDirs = ["node_modules", "dist", "build", ".git", ".vs", "bin", "obj"];
  private static readonly string[] HttpMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

  private readonly object _gate = new();
  private readonly JsonSerializerOptions _json = new()
  {
    PropertyNameCaseInsensitive = true,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = true,
  };

  private readonly string _dbPath;
  private readonly string _statePath;
  private readonly string _catalogSeedPath;
  private BackendState _state = CreateSeedState();

  public ArapiBackend()
  {
    _dbPath = ResolveDatabasePath();
    _statePath = ResolveStatePath(_dbPath);
    _catalogSeedPath = ResolveCatalogSeedPath(_dbPath);
  }

  public void Initialize()
  {
    lock (_gate)
    {
      Directory.CreateDirectory(Path.GetDirectoryName(_statePath)!);
      if (File.Exists(_statePath))
      {
        try
        {
          var loaded = JsonSerializer.Deserialize<BackendState>(File.ReadAllText(_statePath), _json);
          if (loaded is not null)
          {
            _state = loaded;
            if (_state.ApiEndpoints.Count == 0)
            {
              LoadCatalogSeed();
            }
            EnsureSeedData();
            SaveLocked();
            return;
          }
        }
        catch
        {
          // Fall back to seed state if the persisted file is corrupt.
        }
      }

      if (_state.ApiEndpoints.Count == 0)
      {
        LoadCatalogSeed();
      }

      EnsureSeedData();
      SaveLocked();
    }
  }

  public object Health() => new { ok = true, ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() };

  public object CatalogEndpoints()
  {
    lock (_gate)
    {
      return _state.ApiEndpoints
        .OrderBy(e => e.Path)
        .ThenBy(e => e.Method)
        .Select(e => new
        {
          id = e.Id,
          method = e.Method,
          path = e.Path,
          summary = e.Summary,
          tags = e.Tags,
          categoryId = e.CategoryId,
          mappingStatus = string.IsNullOrWhiteSpace(e.CategoryId) ? "unmapped" : "mapped",
        })
        .ToArray();
    }
  }

  public async Task<object> ImportAsync(string folderPath)
  {
    if (string.IsNullOrWhiteSpace(folderPath))
    {
      return new { error = "folderPath required" };
    }

    if (!Directory.Exists(folderPath))
    {
      return new { error = $"Folder not found: {folderPath}" };
    }

    var files = await ScanAsync(folderPath);
    var failures = new List<object>();
    var specsImported = 0;
    var endpointsImported = 0;

    lock (_gate)
    {
      foreach (var file in files)
      {
        try
        {
          var spec = ParseSpec(file);
          _state.ApiSpecs.RemoveAll(x => string.Equals(x.SourcePath, file, StringComparison.OrdinalIgnoreCase));
          _state.ApiEndpoints.RemoveAll(x => x.SpecId == spec.Id);
          _state.ApiParameters.RemoveAll(x => x.EndpointId == spec.Id);
          _state.ApiOutputFields.RemoveAll(x => x.EndpointId == spec.Id);
          _state.ApiSpecs.Add(spec);
          _state.ApiEndpoints.AddRange(spec.Endpoints);
          _state.ApiParameters.AddRange(spec.Parameters);
          _state.ApiOutputFields.AddRange(spec.OutputFields);
          specsImported++;
          endpointsImported += spec.Endpoints.Count;
        }
        catch (Exception ex)
        {
          failures.Add(new { file, error = ex.Message });
        }
      }

      AutoMapEndpointsLocked();
      SaveLocked();
    }

    return new { specsImported, endpointsImported, failures };
  }

  public async Task<object> ImportUploadAsync(UploadImportRequest request)
  {
    if (request.Files is null || request.Files.Count == 0)
    {
      return new { error = "files array required" };
    }

    var tempDir = Path.Combine(Path.GetTempPath(), "arweb-import-" + Guid.NewGuid().ToString("N"));
    Directory.CreateDirectory(tempDir);
    var writeFailures = new List<object>();

    try
    {
      foreach (var file in request.Files)
      {
        try
        {
          var safeRelative = SanitizeRelativePath(file.Name);
          var fullPath = Path.Combine(tempDir, safeRelative);
          var dir = Path.GetDirectoryName(fullPath);
          if (!string.IsNullOrWhiteSpace(dir))
          {
            Directory.CreateDirectory(dir);
          }

          await File.WriteAllTextAsync(fullPath, file.Content ?? string.Empty, Encoding.UTF8);
        }
        catch (Exception ex)
        {
          writeFailures.Add(new { file = file.Name, error = ex.Message });
        }
      }

      var result = await ImportAsync(tempDir);
      if (result is not null && result.GetType().GetProperty("error") is not null)
      {
        return result;
      }

      var json = JsonSerializer.Serialize(result, _json);
      var node = JsonNode.Parse(json)!.AsObject();
      var failures = node["failures"]?.AsArray() ?? [];
      foreach (var failure in writeFailures)
      {
        failures.Add(JsonSerializer.SerializeToNode(failure, _json));
      }
      node["failures"] = failures;
      return node.Deserialize<object>(_json)!;
    }
    finally
    {
      try { Directory.Delete(tempDir, true); } catch { }
    }
  }

  public object Taxonomy()
  {
    lock (_gate)
    {
      return new
      {
        categories = _state.BusinessCategories.OrderBy(c => c.Order).ToArray(),
        subcategories = _state.BusinessSubcategories.OrderBy(s => s.Order).ToArray(),
      };
    }
  }

  public object Agents()
  {
    lock (_gate)
    {
      return AgentCatalog.Select(agent => new
      {
        id = agent.Id,
        name = agent.Name,
        description = agent.Description,
        mode = agent.Mode,
        capabilityCount = CountMatchingEndpoints(agent, _state.ApiEndpoints),
      }).ToArray();
    }
  }

  public object AgentCapabilities()
  {
    lock (_gate)
    {
      return AgentCatalog.Select(agent => new
      {
        agentId = agent.Id,
        agentName = agent.Name,
        endpointCount = CountMatchingEndpoints(agent, _state.ApiEndpoints),
      }).ToArray();
    }
  }

  public object AskAgent(AskAgentRequest request)
  {
    if (string.IsNullOrWhiteSpace(request.Question))
    {
      return new { error = "question required" };
    }

    lock (_gate)
    {
      var agent = AgentCatalog.FirstOrDefault(a =>
        string.Equals(a.Id, request.AgentId, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(a.Mode, request.Mode, StringComparison.OrdinalIgnoreCase)) ?? AgentCatalog[0];
      var evidence = FindMatchingEndpoints(request.Question, _state.ApiEndpoints, 3)
        .Select(e => new { endpointId = e.Id, method = e.Method, path = e.Path })
        .ToArray();
      return new
      {
        agentId = agent.Id,
        agentName = agent.Name,
        answer = $"I matched {evidence.Length} endpoint(s) for the request.",
        evidence,
        limitations = evidence.Length == 0
          ? ["No catalog endpoints matched the question yet."]
          : Array.Empty<string>(),
      };
    }
  }

  public object AppAssistantChat(AppAssistantChatRequest request)
  {
    if (request.Messages is null || request.Messages.Count == 0)
    {
      return new { error = "messages array required" };
    }

    var last = request.Messages.Last();
    var actions = new List<object>();
    lock (_gate)
    {
      if (last.Content.Contains("botjob", StringComparison.OrdinalIgnoreCase))
      {
        actions.Add(new { type = "botjob_created", label = "BotJob draft ready", data = new { } });
      }
      if (last.Content.Contains("catalog", StringComparison.OrdinalIgnoreCase))
      {
        actions.Add(new { type = "catalog_search", label = $"{_state.ApiEndpoints.Count} endpoint(s) available", data = new { count = _state.ApiEndpoints.Count } });
      }
    }

    return new
    {
      answer = $"Received {request.Messages.Count} message(s).",
      actions,
      provider = (string?)null,
    };
  }

  public object GetAiProviders()
  {
    lock (_gate)
    {
      return new
      {
        providers = _state.AiProviders
          .OrderBy(p => p.Label)
          .Select(p => new
          {
            p.Id,
            p.Provider,
            p.Label,
            p.BaseUrl,
            p.Model,
            encryptedApiKey = (string?)null,
            hasApiKey = !string.IsNullOrWhiteSpace(p.EncryptedApiKey),
            p.IsDefault,
            p.Enabled,
          })
          .ToArray(),
      };
    }
  }

  public object SaveAiProvider(AiProviderSettingRequest request)
  {
    lock (_gate)
    {
      var provider = NormalizeProvider(request.Provider);
      var existing = _state.AiProviders.FirstOrDefault(x => string.Equals(x.Id, request.Id, StringComparison.OrdinalIgnoreCase));
      var setting = existing ?? new AiProviderSettingState { Id = string.IsNullOrWhiteSpace(request.Id) ? NewId() : request.Id };
      setting.Provider = provider;
      setting.Label = string.IsNullOrWhiteSpace(request.Label) ? provider : request.Label.Trim();
      setting.BaseUrl = string.IsNullOrWhiteSpace(request.BaseUrl) ? null : request.BaseUrl.Trim();
      setting.Model = string.IsNullOrWhiteSpace(request.Model) ? null : request.Model.Trim();
      setting.EncryptedApiKey = string.IsNullOrWhiteSpace(request.EncryptedApiKey) ? null : request.EncryptedApiKey;
      setting.IsDefault = request.IsDefault;
      setting.Enabled = request.Enabled;
      _state.AiProviders.RemoveAll(x => string.Equals(x.Id, setting.Id, StringComparison.OrdinalIgnoreCase));
      if (setting.IsDefault)
      {
        foreach (var other in _state.AiProviders)
        {
          other.IsDefault = false;
        }
      }
      _state.AiProviders.Add(setting);
      SaveLocked();
      return new { ok = true };
    }
  }

  public object SetDefaultAiProvider(DefaultSelectionRequest request)
  {
    if (string.IsNullOrWhiteSpace(request.Id))
    {
      return new { error = "id required" };
    }

    lock (_gate)
    {
      var target = _state.AiProviders.FirstOrDefault(x => string.Equals(x.Id, request.Id, StringComparison.OrdinalIgnoreCase));
      if (target is null)
      {
        return new { error = "provider not found" };
      }

      foreach (var provider in _state.AiProviders)
      {
        provider.IsDefault = false;
      }
      target.IsDefault = true;
      SaveLocked();
      return new { ok = true };
    }
  }

  public object TestAiProvider(TestAiProviderRequest request)
  {
    if (string.IsNullOrWhiteSpace(request.Provider))
    {
      return new { error = "provider required" };
    }

    lock (_gate)
    {
      var provider = _state.AiProviders.FirstOrDefault(x => string.Equals(x.Provider, request.Provider, StringComparison.OrdinalIgnoreCase));
      if (provider is null)
      {
        return new { ok = false, ms = 0, error = $"Provider \"{request.Provider}\" not found" };
      }

      return new { ok = true, ms = 0, text = "OK" };
    }
  }

  public object ListEnvironments()
  {
    lock (_gate)
    {
      return _state.Environments.OrderBy(e => e.Name).ToArray();
    }
  }

  public object CreateEnvironment(CreateEnvironmentRequest request)
  {
    if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.BaseUrl))
    {
      return new { error = "name and baseUrl required" };
    }

    lock (_gate)
    {
      var now = NowIso();
      var env = new EnvironmentState
      {
        Id = NewId(),
        Name = request.Name.Trim(),
        BaseUrl = request.BaseUrl.Trim(),
        Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
        Headers = request.Headers ?? new Dictionary<string, string>(),
        IsDefault = request.IsDefault,
        IsBuiltIn = false,
        CreatedAt = now,
        UpdatedAt = now,
      };
      if (env.IsDefault)
      {
        foreach (var other in _state.Environments) other.IsDefault = false;
      }
      _state.Environments.Add(env);
      SaveLocked();
      return env;
    }
  }

  public object UpdateEnvironment(string id, UpdateEnvironmentRequest request)
  {
    lock (_gate)
    {
      var env = _state.Environments.FirstOrDefault(x => string.Equals(x.Id, id, StringComparison.OrdinalIgnoreCase));
      if (env is null) return new { error = "not found" };
      env.Name = string.IsNullOrWhiteSpace(request.Name) ? env.Name : request.Name.Trim();
      env.BaseUrl = string.IsNullOrWhiteSpace(request.BaseUrl) ? env.BaseUrl : request.BaseUrl.Trim();
      env.Description = request.Description is null ? env.Description : string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
      env.Headers = request.Headers ?? env.Headers;
      if (request.IsDefault.HasValue)
      {
        env.IsDefault = request.IsDefault.Value;
        if (env.IsDefault)
        {
          foreach (var other in _state.Environments) other.IsDefault = false;
          env.IsDefault = true;
        }
      }
      env.UpdatedAt = NowIso();
      SaveLocked();
      return new { ok = true };
    }
  }

  public object DeleteEnvironment(string id)
  {
    lock (_gate)
    {
      var env = _state.Environments.FirstOrDefault(x => string.Equals(x.Id, id, StringComparison.OrdinalIgnoreCase));
      if (env is null) return new { ok = true };
      if (env.IsBuiltIn)
      {
        return new { error = "built-in environment cannot be deleted" };
      }
      _state.Environments.Remove(env);
      SaveLocked();
      return new { ok = true };
    }
  }

  public object ListBotJobs()
  {
    lock (_gate)
    {
      return _state.BotJobs.OrderByDescending(j => j.UpdatedAt).ToArray();
    }
  }

  public object CreateBotJob(CreateBotJobRequest request)
  {
    if (string.IsNullOrWhiteSpace(request.Name))
    {
      return new { error = "name required" };
    }

    lock (_gate)
    {
      var now = NowIso();
      var job = new BotJobState
      {
        Id = NewId(),
        Name = request.Name.Trim(),
        Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
        CategoryId = null,
        CreatedAt = now,
        UpdatedAt = now,
      };
      var block = new BotJobBlockState
      {
        Id = NewId(),
        BotJobId = job.Id,
        Name = "Main",
        Order = 0,
      };
      _state.BotJobs.Add(job);
      _state.BotJobBlocks.Add(block);
      SaveLocked();
      return new { id = job.Id };
    }
  }

  public object GetBotJob(string id)
  {
    lock (_gate)
    {
      var job = _state.BotJobs.FirstOrDefault(x => string.Equals(x.Id, id, StringComparison.OrdinalIgnoreCase));
      if (job is null) return new { error = "not found" };
      var blocks = _state.BotJobBlocks.Where(b => b.BotJobId == id).OrderBy(b => b.Order).ToArray();
      var commands = _state.BotJobCommands.Where(c => blocks.Any(b => b.Id == c.BlockId)).OrderBy(c => c.Order).ToArray();
      var variables = _state.BotVariables.Where(v => v.BotJobId == id).OrderBy(v => v.Name).ToArray();
      return new { job, blocks, commands, variables };
    }
  }

  public object SaveBotJob(string id, BotJobDetailRequest request)
  {
    if (request.Job is null)
    {
      return new { error = "job required" };
    }

    lock (_gate)
    {
      var existing = _state.BotJobs.FirstOrDefault(x => string.Equals(x.Id, id, StringComparison.OrdinalIgnoreCase));
      var now = NowIso();
      var job = existing ?? new BotJobState { Id = id, CreatedAt = now };
      job.Name = request.Job.Name?.Trim() ?? job.Name;
      job.Description = request.Job.Description is null ? job.Description : string.IsNullOrWhiteSpace(request.Job.Description) ? null : request.Job.Description.Trim();
      job.CategoryId = request.Job.CategoryId;
      job.UpdatedAt = now;
      if (existing is null) _state.BotJobs.Add(job);

      _state.BotJobBlocks.RemoveAll(b => b.BotJobId == id);
      _state.BotJobCommands.RemoveAll(c => request.Blocks is not null && request.Blocks.All(b => b.Id != c.BlockId));
      _state.BotVariables.RemoveAll(v => v.BotJobId == id);

      if (request.Blocks is not null)
      {
        _state.BotJobBlocks.AddRange(request.Blocks.Select(b => new BotJobBlockState
        {
          Id = string.IsNullOrWhiteSpace(b.Id) ? NewId() : b.Id,
          BotJobId = id,
          Name = string.IsNullOrWhiteSpace(b.Name) ? "Block" : b.Name,
          Order = b.Order,
        }));
      }

      if (request.Commands is not null)
      {
        _state.BotJobCommands.AddRange(request.Commands.Select(c => new BotJobCommandState
        {
          Id = string.IsNullOrWhiteSpace(c.Id) ? NewId() : c.Id,
          BlockId = c.BlockId,
          Order = c.Order,
          Type = c.Type,
          Config = c.Config ?? new Dictionary<string, object>(),
          Enabled = c.Enabled,
        }));
      }

      if (request.Variables is not null)
      {
        _state.BotVariables.AddRange(request.Variables.Select(v => new BotVariableState
        {
          Id = string.IsNullOrWhiteSpace(v.Id) ? NewId() : v.Id,
          BotJobId = id,
          Name = v.Name,
          InitialValue = v.InitialValue,
          Secret = v.Secret,
        }));
      }

      SaveLocked();
      return new { ok = true };
    }
  }

  public object DeleteBotJob(string id)
  {
    lock (_gate)
    {
      _state.BotJobs.RemoveAll(j => j.Id == id);
      var blockIds = _state.BotJobBlocks.Where(b => b.BotJobId == id).Select(b => b.Id).ToHashSet();
      _state.BotJobBlocks.RemoveAll(b => b.BotJobId == id);
      _state.BotJobCommands.RemoveAll(c => blockIds.Contains(c.BlockId));
      _state.BotVariables.RemoveAll(v => v.BotJobId == id);
      SaveLocked();
      return new { ok = true };
    }
  }

  public object ExecuteBotJob(string id, ExecuteBotJobRequest request)
  {
    lock (_gate)
    {
      var env = _state.Environments.FirstOrDefault(x => string.Equals(x.Id, request.EnvironmentId ?? "mock", StringComparison.OrdinalIgnoreCase));
      if (env is null)
      {
        return new { error = $"Environment \"{request.EnvironmentId ?? "mock"}\" not found" };
      }

      var job = _state.BotJobs.FirstOrDefault(x => string.Equals(x.Id, id, StringComparison.OrdinalIgnoreCase));
      if (job is null)
      {
        return new { error = "BotJob not found" };
      }

      var blocks = _state.BotJobBlocks.Where(b => b.BotJobId == id).OrderBy(b => b.Order).ToArray();
      var blockIds = blocks.Select(b => b.Id).ToHashSet();
      var commands = _state.BotJobCommands.Where(c => blockIds.Contains(c.BlockId)).OrderBy(c => c.Order).ToArray();
      var runId = NewId();
      var now = NowIso();
      var stepResults = new List<ExecutionStepResultState>();
      var passed = 0;
      var failed = 0;

      foreach (var cmd in commands)
      {
        var endpointId = GetString(cmd.Config, "endpointId");
        var endpoint = string.IsNullOrWhiteSpace(endpointId) ? null : _state.ApiEndpoints.FirstOrDefault(e => string.Equals(e.Id, endpointId, StringComparison.OrdinalIgnoreCase));
        var status = cmd.Enabled ? (endpoint is not null && string.Equals(cmd.Type, "API_CALL", StringComparison.OrdinalIgnoreCase) ? "passed" : "passed") : "skipped";
        if (status == "passed") passed++;
        if (status == "failed") failed++;
        stepResults.Add(new ExecutionStepResultState
        {
          Id = NewId(),
          RunId = runId,
          StepId = cmd.Id,
          CommandType = cmd.Type,
          Status = status,
          Request = endpoint is null ? null : JsonSerializer.Serialize(new { endpointId = endpoint.Id, method = endpoint.Method, path = endpoint.Path }, _json),
          Response = endpoint is null ? null : JsonSerializer.Serialize(new { ok = true, environment = env.Name }, _json),
          DurationMs = 0,
          ErrorMessage = endpoint is null && cmd.Enabled ? "API_CALL endpointId not found" : null,
          AssertionResults = [],
          CreatedAt = now,
        });
      }

      var run = new ExecutionRunState
      {
        Id = runId,
        BotJobId = id,
        StartedAt = now,
        FinishedAt = now,
        Status = failed > 0 ? "failed" : "passed",
        Target = env.Name,
        TotalSteps = commands.Length,
        PassedSteps = passed,
        FailedSteps = failed,
      };

      _state.ExecutionRuns.Add(run);
      _state.ExecutionStepResults.AddRange(stepResults);
      SaveLocked();
      return new { run, steps = stepResults };
    }
  }

  public object ListExecutions(string? botJobId)
  {
    lock (_gate)
    {
      var runs = _state.ExecutionRuns.AsEnumerable();
      if (!string.IsNullOrWhiteSpace(botJobId))
      {
        runs = runs.Where(r => r.BotJobId == botJobId);
      }
      return runs.OrderByDescending(r => r.StartedAt).ToArray();
    }
  }

  public object GetExecutionSteps(string runId)
  {
    lock (_gate)
    {
      return _state.ExecutionStepResults.Where(s => s.RunId == runId).OrderBy(s => s.CreatedAt).ToArray();
    }
  }

  public IResult GetExecutionReportHtml(string runId)
  {
    lock (_gate)
    {
      var run = _state.ExecutionRuns.FirstOrDefault(r => r.Id == runId);
      if (run is null)
      {
        return Results.NotFound(new { error = "run not found" });
      }

      var steps = _state.ExecutionStepResults.Where(s => s.RunId == runId).OrderBy(s => s.CreatedAt).ToArray();
      var html = new StringBuilder();
      html.AppendLine("<html><body>");
      html.AppendLine($"<h1>Run {run.Id}</h1>");
      html.AppendLine($"<p>Status: {run.Status}</p>");
      html.AppendLine("<table><thead><tr><th>Step</th><th>Type</th><th>Status</th><th>Error</th></tr></thead><tbody>");
      foreach (var step in steps)
      {
        html.AppendLine($"<tr><td>{Escape(step.StepId)}</td><td>{Escape(step.CommandType)}</td><td>{Escape(step.Status)}</td><td>{Escape(step.ErrorMessage ?? string.Empty)}</td></tr>");
      }
      html.AppendLine("</tbody></table></body></html>");
      return Results.Text(html.ToString(), "text/html; charset=utf-8");
    }
  }

  public IResult GetExecutionReportCsv(string runId)
  {
    lock (_gate)
    {
      var steps = _state.ExecutionStepResults.Where(s => s.RunId == runId).OrderBy(s => s.CreatedAt).ToArray();
      var csv = new StringBuilder();
      csv.AppendLine("runId,stepId,commandType,status,durationMs,errorMessage");
      foreach (var step in steps)
      {
        csv.AppendLine($"{Csv(runId)},{Csv(step.StepId)},{Csv(step.CommandType)},{Csv(step.Status)},{step.DurationMs},{Csv(step.ErrorMessage ?? string.Empty)}");
      }
      return Results.Text(csv.ToString(), "text/csv; charset=utf-8");
    }
  }

  public IResult CatalogExportPostman(string baseUrl)
  {
    lock (_gate)
    {
      var endpoints = _state.ApiEndpoints;
      var collection = new
      {
        info = new { name = "ARWeb API Catalog", schema = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        item = endpoints.Select(e => new
        {
          name = $"{e.Method} {e.Path}",
          request = new
          {
            method = e.Method,
            header = Array.Empty<object>(),
            url = new
            {
              raw = $"{baseUrl.TrimEnd('/')}{e.Path}",
              host = new[] { baseUrl.TrimEnd('/') },
              path = e.Path.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries),
            },
          },
        }).ToArray(),
      };
      return Results.Text(JsonSerializer.Serialize(collection, _json), "application/json; charset=utf-8");
    }
  }

  public IResult CatalogExportBash(string baseUrl)
  {
    lock (_gate)
    {
      var script = new StringBuilder();
      script.AppendLine("#!/usr/bin/env bash");
      script.AppendLine("set -euo pipefail");
      foreach (var endpoint in _state.ApiEndpoints)
      {
        script.AppendLine($"curl -X {endpoint.Method} \"{baseUrl.TrimEnd('/')}{endpoint.Path}\"");
      }
      return Results.Text(script.ToString(), "text/plain; charset=utf-8");
    }
  }

  public object MockStatus()
  {
    lock (_gate)
    {
      return new { running = _state.MockRunning, port = _state.MockPort };
    }
  }

  public object MockStart()
  {
    lock (_gate)
    {
      _state.MockRunning = true;
      _state.MockLog.Add(new MockLogEntryState
      {
        Id = _state.MockLog.Count == 0 ? 1 : _state.MockLog.Max(x => x.Id) + 1,
        At = NowIso(),
        Method = "SYSTEM",
        Path = "/mock/start",
        Matched = true,
        Status = 200,
      });
      SaveLocked();
      return new { running = true, port = _state.MockPort };
    }
  }

  public object MockStop()
  {
    lock (_gate)
    {
      _state.MockRunning = false;
      _state.MockLog.Add(new MockLogEntryState
      {
        Id = _state.MockLog.Count == 0 ? 1 : _state.MockLog.Max(x => x.Id) + 1,
        At = NowIso(),
        Method = "SYSTEM",
        Path = "/mock/stop",
        Matched = true,
        Status = 200,
      });
      SaveLocked();
      return new { running = false };
    }
  }

  public object MockLog()
  {
    lock (_gate)
    {
      return _state.MockLog.OrderBy(x => x.Id).ToArray();
    }
  }

  public object MockClearLog()
  {
    lock (_gate)
    {
      _state.MockLog.Clear();
      SaveLocked();
      return new { ok = true };
    }
  }

  public object SeparationProgress()
  {
    var progressPath = Path.Combine(AppContext.BaseDirectory, "docs", "progress.json");
    if (!File.Exists(progressPath))
    {
      progressPath = Path.Combine(Directory.GetCurrentDirectory(), "docs", "progress.json");
    }

    if (!File.Exists(progressPath))
    {
      return new { error = "progress.json not found" };
    }

    return JsonNode.Parse(File.ReadAllText(progressPath))!.Deserialize<object>(_json)!;
  }

  public object SetEndpointCategory(string endpointId, SetEndpointCategoryRequest request)
  {
    lock (_gate)
    {
      var endpoint = _state.ApiEndpoints.FirstOrDefault(e => string.Equals(e.Id, endpointId, StringComparison.OrdinalIgnoreCase));
      if (endpoint is null) return new { error = "not found" };
      endpoint.CategoryId = string.IsNullOrWhiteSpace(request.CategoryId) ? null : request.CategoryId;
      SaveLocked();
      return new { ok = true };
    }
  }

  private async Task<List<string>> ScanAsync(string folderPath)
  {
    var files = new List<string>();
    var entries = Directory.EnumerateFileSystemEntries(folderPath);
    foreach (var entry in entries)
    {
      var name = Path.GetFileName(entry);
      if (Directory.Exists(entry))
      {
        if (IgnoredDirs.Any(d => string.Equals(d, name, StringComparison.OrdinalIgnoreCase))) continue;
        files.AddRange(await ScanAsync(entry));
        continue;
      }

      var ext = Path.GetExtension(name).ToLowerInvariant();
      if (ext is ".json" or ".yaml" or ".yml")
      {
        files.Add(entry);
      }
    }

    return files;
  }

  private ApiSpecState ParseSpec(string file)
  {
    var raw = File.ReadAllText(file);
    if (Path.GetExtension(file).Equals(".json", StringComparison.OrdinalIgnoreCase))
    {
      return ParseJsonSpec(file, raw);
    }

    return ParseYamlSpec(file, raw);
  }

  private ApiSpecState ParseJsonSpec(string file, string raw)
  {
    var doc = JsonNode.Parse(raw)?.AsObject() ?? throw new InvalidOperationException("Invalid JSON OpenAPI document");
    var info = doc["info"]?.AsObject();
    var title = info?["title"]?.GetValue<string>() ?? Path.GetFileNameWithoutExtension(file);
    var version = info?["version"]?.GetValue<string>() ?? "0.0.0";
    var specId = NewId();
    var endpoints = new List<ApiEndpointState>();
    var paths = doc["paths"]?.AsObject() ?? new JsonObject();

    foreach (var (path, pathNode) in paths)
    {
      var ops = pathNode?.AsObject();
      if (ops is null) continue;
      foreach (var method in HttpMethods)
      {
        var op = ops[method.ToLowerInvariant()]?.AsObject();
        if (op is null) continue;
        endpoints.Add(new ApiEndpointState
        {
          Id = NewId(),
          SpecId = specId,
          OperationId = op["operationId"]?.GetValue<string>(),
          Method = method,
          Path = path,
          Summary = op["summary"]?.GetValue<string>(),
          Description = op["description"]?.GetValue<string>(),
          Tags = op["tags"]?.AsArray()?.Select(x => x?.GetValue<string>()).Where(x => !string.IsNullOrWhiteSpace(x)).Cast<string>().ToList() ?? [],
          CategoryId = null,
        });
      }
    }

    return new ApiSpecState
    {
      Id = specId,
      Title = title,
      Version = version,
      SourcePath = file,
      RawFormat = "json",
      ImportedAt = NowIso(),
      EndpointCount = endpoints.Count,
      Endpoints = endpoints,
      Parameters = [],
      OutputFields = [],
    };
  }

  private ApiSpecState ParseYamlSpec(string file, string raw)
  {
    var lines = raw.Replace("\r\n", "\n").Split('\n');
    var title = Path.GetFileNameWithoutExtension(file);
    var version = "0.0.0";
    var specId = NewId();
    var endpoints = new List<ApiEndpointState>();
    var inInfo = false;
    var inPaths = false;
    var currentPath = string.Empty;
    ApiEndpointState? current = null;
    var inTags = false;

    foreach (var rawLine in lines)
    {
      var line = rawLine.TrimEnd();
      var trimmed = line.TrimStart();
      var indent = line.Length - trimmed.Length;

      if (trimmed == "info:")
      {
        inInfo = true;
        inPaths = false;
        continue;
      }
      if (trimmed == "paths:")
      {
        inInfo = false;
        inPaths = true;
        continue;
      }

      if (inInfo)
      {
        if (Regex.IsMatch(trimmed, @"^title:\s*""?(.*?)""?$"))
        {
          title = Regex.Match(trimmed, @"^title:\s*""?(.*?)""?$").Groups[1].Value;
        }
        else if (Regex.IsMatch(trimmed, @"^version:\s*""?(.*?)""?$"))
        {
          version = Regex.Match(trimmed, @"^version:\s*""?(.*?)""?$").Groups[1].Value;
        }
      }

      if (!inPaths)
      {
        continue;
      }

      if (indent == 2 && trimmed.StartsWith('/') && trimmed.EndsWith(':'))
      {
        currentPath = trimmed[..^1];
        current = null;
        inTags = false;
        continue;
      }

      if (indent == 4 && IsHttpMethod(trimmed, out var method))
      {
        current = new ApiEndpointState
        {
          Id = NewId(),
          SpecId = specId,
          Method = method!,
          Path = currentPath,
          CategoryId = null,
          Tags = [],
        };
        endpoints.Add(current);
        inTags = false;
        continue;
      }

      if (current is null)
      {
        continue;
      }

      if (indent == 6 && trimmed.StartsWith("summary:", StringComparison.OrdinalIgnoreCase))
      {
        current.Summary = Unquote(trimmed["summary:".Length..].Trim());
      }
      else if (indent == 6 && trimmed.StartsWith("description:", StringComparison.OrdinalIgnoreCase))
      {
        current.Description = Unquote(trimmed["description:".Length..].Trim());
      }
      else if (indent == 6 && trimmed.StartsWith("tags:", StringComparison.OrdinalIgnoreCase))
      {
        inTags = true;
      }
      else if (inTags && indent == 6 && trimmed.StartsWith("- "))
      {
        current.Tags = [.. current.Tags, Unquote(trimmed[2..].Trim())];
      }
      else if (indent <= 4)
      {
        inTags = false;
      }
    }

    return new ApiSpecState
    {
      Id = specId,
      Title = title,
      Version = version,
      SourcePath = file,
      RawFormat = "yaml",
      ImportedAt = NowIso(),
      EndpointCount = endpoints.Count,
      Endpoints = endpoints,
      Parameters = [],
      OutputFields = [],
    };
  }

  private void AutoMapEndpointsLocked()
  {
    foreach (var endpoint in _state.ApiEndpoints)
    {
      if (!string.IsNullOrWhiteSpace(endpoint.CategoryId))
      {
        continue;
      }

      var match = FindBestCategory(endpoint, _state.BusinessCategories);
      if (match is not null)
      {
        endpoint.CategoryId = match.Id;
      }
    }
  }

  private static CategoryState? FindBestCategory(ApiEndpointState endpoint, IReadOnlyList<CategoryState> categories)
  {
    var tokens = new List<string>();
    tokens.AddRange(endpoint.Tags.Select(t => t.ToLowerInvariant()));
    tokens.AddRange(endpoint.Path.Split('/', StringSplitOptions.RemoveEmptyEntries).Where(s => !s.StartsWith('{')).Select(s => s.ToLowerInvariant()));

    CategoryState? best = null;
    var bestScore = 0;
    foreach (var category in categories)
    {
      var score = 0;
      foreach (var kw in category.Keywords)
      {
        var lower = kw.ToLowerInvariant();
        if (tokens.Any(t => t.Contains(lower, StringComparison.OrdinalIgnoreCase) || lower.Contains(t, StringComparison.OrdinalIgnoreCase)))
        {
          score++;
        }
      }

      if (score > bestScore)
      {
        bestScore = score;
        best = category;
      }
    }

    return bestScore > 0 ? best : null;
  }

  private static int CountMatchingEndpoints(AgentDefinition agent, IReadOnlyList<ApiEndpointState> endpoints)
  {
    return FindMatchingEndpoints(agent.Keywords.JoinToString(), endpoints, int.MaxValue).Count;
  }

  private static List<ApiEndpointState> FindMatchingEndpoints(string text, IReadOnlyList<ApiEndpointState> endpoints, int limit)
  {
    var tokens = text.Split(new[] { ' ', ',', ';', '/', '-', '_' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
      .Select(x => x.ToLowerInvariant())
      .ToArray();
    var scored = endpoints
      .Select(e => new
      {
        Endpoint = e,
        Score = tokens.Sum(t => ScoreText(t, e.Path, e.Summary, string.Join(' ', e.Tags))),
      })
      .Where(x => x.Score > 0)
      .OrderByDescending(x => x.Score)
      .ThenBy(x => x.Endpoint.Path)
      .Take(limit)
      .Select(x => x.Endpoint)
      .ToList();
    return scored;
  }

  private static int ScoreText(string token, params string?[] values)
  {
    var score = 0;
    foreach (var value in values)
    {
      if (string.IsNullOrWhiteSpace(value)) continue;
      var lower = value.ToLowerInvariant();
      if (lower.Contains(token, StringComparison.OrdinalIgnoreCase) || token.Contains(lower, StringComparison.OrdinalIgnoreCase))
      {
        score++;
      }
    }
    return score;
  }

  private void EnsureSeedData()
  {
    if (_state.BusinessCategories.Count == 0)
    {
      var seed = CreateTaxonomySeed();
      _state.BusinessCategories.AddRange(seed.Categories);
      _state.BusinessSubcategories.AddRange(seed.Subcategories);
    }

    if (_state.Environments.All(e => e.Id != "mock"))
    {
      var now = NowIso();
      _state.Environments.Insert(0, new EnvironmentState
      {
        Id = "mock",
        Name = "Mock Server",
        BaseUrl = "http://127.0.0.1:8855",
        Description = "Local mock server - replays imported catalog endpoints without a live backend.",
        Headers = new Dictionary<string, string>(),
        IsDefault = true,
        IsBuiltIn = true,
        CreatedAt = now,
        UpdatedAt = now,
      });
    }

    if (_state.MockPort == 0)
    {
      _state.MockPort = 8855;
    }
  }

  private static BackendState CreateSeedState() => new();

  private static TaxonomySeed CreateTaxonomySeed()
  {
    var categories = new List<CategoryState>();
    var subcategories = new List<SubcategoryState>();
    var items = new (string Name, string[] Keywords, string[] Subs)[]
    {
      ("Customer & Onboarding", ["customer", "client", "onboarding", "kyc", "profile"], ["New Customer", "KYC / Identity", "Customer 360", "Consents", "Offboarding"]),
      ("Accounts", ["account", "iban", "ledger"], ["Current Accounts", "Savings", "Account Details", "Statements", "Account Closure"]),
      ("Balances", ["balance", "available", "booked"], ["Available Balance", "Booked Balance", "Holds", "Overdraft", "Currency Balance"]),
      ("Payments & Transfers", ["payment", "transfer", "sepa", "swift", "remittance"], ["Single Payment", "Bulk Payment", "Standing Orders", "Direct Debit", "Cross-Border"]),
      ("Cards", ["card", "debit", "credit card", "pan"], ["Card Issuance", "Card Controls", "Transactions", "Disputes", "Replacement"]),
      ("Securities & Trading", ["order", "trade", "security", "isin", "execution"], ["Order Entry", "Order Status", "Executions", "Instruments", "Market Data"]),
      ("Portfolio & Holdings", ["portfolio", "holdings", "positions", "allocation"], ["Positions", "Allocation", "Performance", "Valuation", "Rebalancing"]),
      ("Investment Advisory", ["advice", "recommendation", "suitability", "mifid"], ["Suitability", "Recommendations", "Model Portfolios", "Risk Profile", "Proposals"]),
      ("Credit & Lending", ["loan", "credit", "lending", "mortgage", "collateral"], ["Applications", "Limits", "Repayments", "Collateral", "Restructuring"]),
      ("Deposits & Treasury", ["deposit", "treasury", "term", "money market"], ["Term Deposits", "Notice Accounts", "Treasury Positions", "Liquidity", "Rates"]),
      ("Foreign Exchange", ["fx", "forex", "exchange", "currency"], ["Spot", "Forward", "Rates", "Conversions", "Hedging"]),
      ("Compliance & AML", ["compliance", "aml", "sanction", "suspicious", "screening"], ["Screening", "Alerts", "Case Management", "Reporting", "Watchlists"]),
      ("Risk Management", ["risk", "exposure", "var", "limit"], ["Credit Risk", "Market Risk", "Limits", "Exposure", "Stress Tests"]),
      ("Fraud & Disputes", ["fraud", "dispute", "chargeback"], ["Fraud Alerts", "Investigations", "Chargebacks", "Recovery", "Reporting"]),
      ("Statements & Documents", ["statement", "document", "pdf", "letter"], ["Statements", "Tax Documents", "Contracts", "Notices", "Archive"]),
      ("Notifications & Messaging", ["message", "notification", "alert", "inbox"], ["Secure Messages", "Push Alerts", "Email", "SMS", "Preferences"]),
      ("Authentication & Access", ["auth", "login", "token", "mfa", "consent"], ["Sessions", "MFA", "Consents", "Scopes", "Devices"]),
      ("Beneficiaries & Payees", ["beneficiary", "payee", "recipient"], ["Add Payee", "Verify Payee", "Payee List", "Trusted Payees", "Removal"]),
      ("Standing Orders & Schedules", ["standing order", "schedule", "recurring"], ["Create", "Amend", "Cancel", "Calendar", "History"]),
      ("Reporting & Analytics", ["report", "analytics", "kpi", "dashboard"], ["Operational", "Regulatory", "Custom", "Exports", "Coverage"]),
      ("Back Office & Settlement", ["settlement", "reconciliation", "clearing", "corporate action"], ["Settlement", "Reconciliation", "Corporate Actions", "Fees", "Adjustments"]),
      ("Wealth & Private Banking", ["wealth", "private", "mandate", "discretionary"], ["Mandates", "Discretionary", "Reporting", "Fees", "Relationship"]),
      ("Insurance & Bancassurance", ["insurance", "policy", "premium", "claim"], ["Policies", "Quotes", "Premiums", "Claims", "Renewals"]),
      ("Fees & Pricing", ["fee", "price", "tariff", "charge"], ["Tariffs", "Charges", "Refunds", "Bundles", "Quotes"]),
      ("Audit & Operations", ["audit", "log", "trace", "operation", "uat"], ["Audit Trail", "Event Log", "UAT", "Health", "Maintenance"]),
    };

    for (var i = 0; i < items.Length; i++)
    {
      var categoryId = $"cat_{i:00}";
      categories.Add(new CategoryState
      {
        Id = categoryId,
        Name = items[i].Name,
        Description = null,
        Keywords = items[i].Keywords.ToList(),
        Order = i,
      });

      for (var j = 0; j < items[i].Subs.Length; j++)
      {
        subcategories.Add(new SubcategoryState
        {
          Id = $"sub_{i:00}{j:00}",
          CategoryId = categoryId,
          Name = items[i].Subs[j],
          Keywords = new List<string>(),
          Order = j,
        });
      }
    }

    return new TaxonomySeed { Categories = categories, Subcategories = subcategories };
  }

  private void SaveLocked()
  {
    var json = JsonSerializer.Serialize(_state, _json);
    File.WriteAllText(_statePath, json, Encoding.UTF8);
  }

  private void LoadCatalogSeed()
  {
    try
    {
      var seedJson = File.Exists(_catalogSeedPath)
        ? File.ReadAllText(_catalogSeedPath)
        : ReadEmbeddedCatalogSeed();
      if (string.IsNullOrWhiteSpace(seedJson))
      {
        return;
      }

      var seed = JsonSerializer.Deserialize<CatalogSeedState>(seedJson, _json);
      if (seed is null)
      {
        return;
      }

      if (seed.ApiSpecs.Count > 0) _state.ApiSpecs = seed.ApiSpecs;
      if (seed.ApiEndpoints.Count > 0) _state.ApiEndpoints = seed.ApiEndpoints;
      if (seed.ApiParameters.Count > 0) _state.ApiParameters = seed.ApiParameters;
      if (seed.ApiOutputFields.Count > 0) _state.ApiOutputFields = seed.ApiOutputFields;
    }
    catch
    {
      Console.Error.WriteLine("[arapi] failed to load catalog seed");
    }
  }

  private static string? ReadEmbeddedCatalogSeed()
  {
    var assembly = Assembly.GetExecutingAssembly();
    var resourceName = assembly.GetManifestResourceNames()
      .FirstOrDefault(name => name.EndsWith("catalog.seed.json", StringComparison.OrdinalIgnoreCase));
    if (resourceName is null)
    {
      return null;
    }

    using var stream = assembly.GetManifestResourceStream(resourceName);
    if (stream is null)
    {
      return null;
    }

    using var reader = new StreamReader(stream, Encoding.UTF8);
    return reader.ReadToEnd();
  }

  private static string ResolveDatabasePath()
  {
    var dbPath = Environment.GetEnvironmentVariable("DB_PATH");
    if (!string.IsNullOrWhiteSpace(dbPath))
    {
      return dbPath;
    }

    var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
    if (!string.IsNullOrWhiteSpace(appData))
    {
      return Path.Combine(appData, "data", "app.db");
    }

    return Path.Combine(AppContext.BaseDirectory, "data", "app.db");
  }

  private static string ResolveStatePath(string dbPath)
  {
    var dir = Path.GetDirectoryName(dbPath);
    if (!string.IsNullOrWhiteSpace(dir))
    {
      return Path.Combine(dir, "arapi-backend-state.json");
    }

    var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
    if (!string.IsNullOrWhiteSpace(appData))
    {
      return Path.Combine(appData, "data", "arapi-backend-state.json");
    }

    return Path.Combine(AppContext.BaseDirectory, "data", "arapi-backend-state.json");
  }

  private static string ResolveCatalogSeedPath(string dbPath)
  {
    var dir = Path.GetDirectoryName(dbPath);
    if (!string.IsNullOrWhiteSpace(dir))
    {
      return Path.Combine(dir, "catalog.seed.json");
    }

    var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
    if (!string.IsNullOrWhiteSpace(appData))
    {
      return Path.Combine(appData, "data", "catalog.seed.json");
    }

    return Path.Combine(AppContext.BaseDirectory, "data", "catalog.seed.json");
  }

  private static string NormalizeProvider(string provider)
  {
    return provider.Trim().ToLowerInvariant();
  }

  private static string NewId() => Guid.NewGuid().ToString("N");
  private static string NowIso() => DateTimeOffset.UtcNow.ToString("O");
  private static string Csv(string value) => "\"" + value.Replace("\"", "\"\"") + "\"";
  private static string Escape(string value) => System.Net.WebUtility.HtmlEncode(value);

  private static bool IsHttpMethod(string line, out string? method)
  {
    foreach (var candidate in HttpMethods)
    {
      if (Regex.IsMatch(line, $"^{candidate.ToLowerInvariant()}:"))
      {
        method = candidate;
        return true;
      }
    }
    method = null;
    return false;
  }

  private static string Unquote(string value)
  {
    var trimmed = value.Trim();
    if (trimmed.Length >= 2 && ((trimmed.StartsWith('"') && trimmed.EndsWith('"')) || (trimmed.StartsWith('\'') && trimmed.EndsWith('\''))))
    {
      return trimmed[1..^1];
    }
    return trimmed;
  }

  private static string SanitizeRelativePath(string path)
  {
    var normalized = path.Replace('\\', '/');
    var segments = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
      .Select(seg => Regex.Replace(seg, @"[^a-zA-Z0-9._-]", "_"));
    return Path.Combine(segments.ToArray());
  }

  private static string GetString(Dictionary<string, object> config, string key)
  {
    if (!config.TryGetValue(key, out var value) || value is null)
    {
      return string.Empty;
    }
    return value switch
    {
      JsonElement je when je.ValueKind == JsonValueKind.String => je.GetString() ?? string.Empty,
      JsonElement je => je.ToString(),
      _ => value.ToString() ?? string.Empty,
    };
  }

  private static readonly AgentDefinition[] AgentCatalog =
  [
    new("relationship-manager", "Relationship Manager", "Bank staff assistant for customer-facing service flows.", "employee", ["customer", "onboarding", "account", "balance", "payment"]),
    new("portfolio-advisor", "Portfolio Advisor", "Investment advisory and portfolio support.", "employee", ["portfolio", "holdings", "allocation", "investment", "recommendation"]),
    new("cash-payments", "Cash & Payments", "Payments, transfers, and cash operations.", "employee", ["payment", "transfer", "sepa", "swift", "cash"]),
    new("securities-trading", "Securities Trading", "Trading and execution workflows.", "employee", ["trade", "order", "execution", "security"]),
    new("credit-lending", "Credit & Lending", "Loan and credit servicing flows.", "employee", ["loan", "credit", "mortgage", "repayment"]),
    new("compliance-risk", "Compliance & Risk", "Compliance checks, risk, and controls.", "employee", ["compliance", "aml", "risk", "screening"]),
    new("back-office", "Back Office Operations", "Settlement, reconciliation, and ops support.", "employee", ["settlement", "reconciliation", "operations"]),
    new("reporting-coo", "Reporting & COO", "Reporting, analytics, and ops oversight.", "employee", ["report", "analytics", "audit"]),
    new("audit-uat", "Audit & UAT", "Audit trail and test support.", "employee", ["audit", "uat", "log"]),
    new("client-wealth", "Client Wealth Assistant", "Client-facing wealth assistant.", "client", ["wealth", "portfolio", "investment"]),
    new("client-cash", "Client Cash Assistant", "Client-facing cash and payments assistant.", "client", ["payment", "transfer", "cash"]),
    new("client-trading", "Client Trading Assistant", "Client trading support.", "client", ["trade", "market", "security"]),
    new("client-credit", "Client Credit Assistant", "Client lending support.", "client", ["loan", "credit", "mortgage"]),
    new("client-docs", "Client Messages & Documents", "Documents and message handling.", "client", ["document", "message", "statement"]),
  ];
}

public sealed class BackendState
{
  public List<ApiSpecState> ApiSpecs { get; set; } = [];
  public List<ApiEndpointState> ApiEndpoints { get; set; } = [];
  public List<ApiParameterState> ApiParameters { get; set; } = [];
  public List<ApiOutputFieldState> ApiOutputFields { get; set; } = [];
  public List<CategoryState> BusinessCategories { get; set; } = [];
  public List<SubcategoryState> BusinessSubcategories { get; set; } = [];
  public List<AiProviderSettingState> AiProviders { get; set; } = [];
  public List<EnvironmentState> Environments { get; set; } = [];
  public List<BotJobState> BotJobs { get; set; } = [];
  public List<BotJobBlockState> BotJobBlocks { get; set; } = [];
  public List<BotJobCommandState> BotJobCommands { get; set; } = [];
  public List<BotVariableState> BotVariables { get; set; } = [];
  public List<ExecutionRunState> ExecutionRuns { get; set; } = [];
  public List<ExecutionStepResultState> ExecutionStepResults { get; set; } = [];
  public List<MockLogEntryState> MockLog { get; set; } = [];
  public bool MockRunning { get; set; }
  public int MockPort { get; set; } = 8855;
}

public sealed class CatalogSeedState
{
  public List<ApiSpecState> ApiSpecs { get; set; } = [];
  public List<ApiEndpointState> ApiEndpoints { get; set; } = [];
  public List<ApiParameterState> ApiParameters { get; set; } = [];
  public List<ApiOutputFieldState> ApiOutputFields { get; set; } = [];
}

public sealed class SpecState
{
  public required ApiSpecState Spec { get; set; }
  public List<ApiEndpointState> Endpoints { get; set; } = [];
  public List<ApiParameterState> Parameters { get; set; } = [];
  public List<ApiOutputFieldState> OutputFields { get; set; } = [];
}

public sealed class TaxonomySeed
{
  public List<CategoryState> Categories { get; set; } = [];
  public List<SubcategoryState> Subcategories { get; set; } = [];
}

public sealed class ApiSpecState
{
  public string Id { get; set; } = "";
  public string Title { get; set; } = "";
  public string Version { get; set; } = "";
  public string SourcePath { get; set; } = "";
  public string RawFormat { get; set; } = "";
  public string ImportedAt { get; set; } = "";
  public int EndpointCount { get; set; }
  public List<ApiEndpointState> Endpoints { get; set; } = [];
  public List<ApiParameterState> Parameters { get; set; } = [];
  public List<ApiOutputFieldState> OutputFields { get; set; } = [];
}

public sealed class ApiEndpointState
{
  public string Id { get; set; } = "";
  public string SpecId { get; set; } = "";
  public string? OperationId { get; set; }
  public string Method { get; set; } = "";
  public string Path { get; set; } = "";
  public string? Summary { get; set; }
  public string? Description { get; set; }
  public List<string> Tags { get; set; } = [];
  public string? CategoryId { get; set; }
}

public sealed class ApiParameterState
{
  public string Id { get; set; } = "";
  public string EndpointId { get; set; } = "";
  public string Name { get; set; } = "";
  public string Location { get; set; } = "";
  public bool Required { get; set; }
  public string? SchemaType { get; set; }
  public string? Example { get; set; }
}

public sealed class ApiOutputFieldState
{
  public string Id { get; set; } = "";
  public string EndpointId { get; set; } = "";
  public string JsonPath { get; set; } = "";
  public string? SchemaType { get; set; }
  public string? Description { get; set; }
}

public sealed class CategoryState
{
  public string Id { get; set; } = "";
  public string Name { get; set; } = "";
  public string? Description { get; set; }
  public List<string> Keywords { get; set; } = [];
  public int Order { get; set; }
}

public sealed class SubcategoryState
{
  public string Id { get; set; } = "";
  public string CategoryId { get; set; } = "";
  public string Name { get; set; } = "";
  public List<string> Keywords { get; set; } = [];
  public int Order { get; set; }
}

public sealed class AiProviderSettingState
{
  public string Id { get; set; } = "";
  public string Provider { get; set; } = "";
  public string Label { get; set; } = "";
  public string? BaseUrl { get; set; }
  public string? Model { get; set; }
  public string? EncryptedApiKey { get; set; }
  public bool IsDefault { get; set; }
  public bool Enabled { get; set; } = true;
}

public sealed class EnvironmentState
{
  public string Id { get; set; } = "";
  public string Name { get; set; } = "";
  public string BaseUrl { get; set; } = "";
  public string? Description { get; set; }
  public Dictionary<string, string> Headers { get; set; } = [];
  public bool IsDefault { get; set; }
  public bool IsBuiltIn { get; set; }
  public string CreatedAt { get; set; } = "";
  public string UpdatedAt { get; set; } = "";
}

public sealed class BotJobState
{
  public string Id { get; set; } = "";
  public string Name { get; set; } = "";
  public string? Description { get; set; }
  public string? CategoryId { get; set; }
  public string CreatedAt { get; set; } = "";
  public string UpdatedAt { get; set; } = "";
}

public sealed class BotJobBlockState
{
  public string Id { get; set; } = "";
  public string BotJobId { get; set; } = "";
  public string Name { get; set; } = "";
  public int Order { get; set; }
}

public sealed class BotJobCommandState
{
  public string Id { get; set; } = "";
  public string BlockId { get; set; } = "";
  public int Order { get; set; }
  public string Type { get; set; } = "";
  public Dictionary<string, object> Config { get; set; } = [];
  public bool Enabled { get; set; } = true;
}

public sealed class BotVariableState
{
  public string Id { get; set; } = "";
  public string BotJobId { get; set; } = "";
  public string Name { get; set; } = "";
  public string? InitialValue { get; set; }
  public bool Secret { get; set; }
}

public sealed class ExecutionRunState
{
  public string Id { get; set; } = "";
  public string BotJobId { get; set; } = "";
  public string StartedAt { get; set; } = "";
  public string? FinishedAt { get; set; }
  public string Status { get; set; } = "";
  public string Target { get; set; } = "";
  public int TotalSteps { get; set; }
  public int PassedSteps { get; set; }
  public int FailedSteps { get; set; }
}

public sealed class ExecutionStepResultState
{
  public string Id { get; set; } = "";
  public string RunId { get; set; } = "";
  public string StepId { get; set; } = "";
  public string CommandType { get; set; } = "";
  public string Status { get; set; } = "";
  public string? Request { get; set; }
  public string? Response { get; set; }
  public int DurationMs { get; set; }
  public string? ErrorMessage { get; set; }
  public List<object> AssertionResults { get; set; } = [];
  public string CreatedAt { get; set; } = "";
}

public sealed class MockLogEntryState
{
  public int Id { get; set; }
  public string At { get; set; } = "";
  public string Method { get; set; } = "";
  public string Path { get; set; } = "";
  public bool Matched { get; set; }
  public int Status { get; set; }
}

public sealed class AgentDefinition
{
  public AgentDefinition(string id, string name, string description, string mode, string[] keywords)
  {
    Id = id;
    Name = name;
    Description = description;
    Mode = mode;
    Keywords = keywords;
  }

  public string Id { get; }
  public string Name { get; }
  public string Description { get; }
  public string Mode { get; }
  public string[] Keywords { get; }
}

public sealed class UploadImportRequest
{
  public List<UploadImportFile>? Files { get; set; }
}

public sealed class UploadImportFile
{
  public string Name { get; set; } = "";
  public string Content { get; set; } = "";
}

public sealed class AskAgentRequest
{
  public string? Question { get; set; }
  public string? Mode { get; set; }
  public string? AgentId { get; set; }
}

public sealed class AppAssistantChatRequest
{
  public List<ChatMessage>? Messages { get; set; }
}

public sealed class ChatMessage
{
  public string Role { get; set; } = "";
  public string Content { get; set; } = "";
}

public sealed class AiProviderSettingRequest
{
  public string? Id { get; set; }
  public string Provider { get; set; } = "";
  public string Label { get; set; } = "";
  public string? BaseUrl { get; set; }
  public string? Model { get; set; }
  public string? EncryptedApiKey { get; set; }
  public bool IsDefault { get; set; }
  public bool Enabled { get; set; } = true;
}

public sealed class DefaultSelectionRequest
{
  public string? Id { get; set; }
}

public sealed class TestAiProviderRequest
{
  public string? Provider { get; set; }
}

public sealed class CreateEnvironmentRequest
{
  public string? Name { get; set; }
  public string? BaseUrl { get; set; }
  public string? Description { get; set; }
  public Dictionary<string, string>? Headers { get; set; }
  public bool IsDefault { get; set; }
}

public sealed class UpdateEnvironmentRequest
{
  public string? Name { get; set; }
  public string? BaseUrl { get; set; }
  public string? Description { get; set; }
  public Dictionary<string, string>? Headers { get; set; }
  public bool? IsDefault { get; set; }
}

public sealed class CreateBotJobRequest
{
  public string? Name { get; set; }
  public string? Description { get; set; }
}

public sealed class BotJobDetailRequest
{
  public BotJobState? Job { get; set; }
  public List<BotJobBlockInput>? Blocks { get; set; }
  public List<BotJobCommandInput>? Commands { get; set; }
  public List<BotVariableInput>? Variables { get; set; }
}

public sealed class BotJobBlockInput
{
  public string? Id { get; set; }
  public string? Name { get; set; }
  public int Order { get; set; }
}

public sealed class BotJobCommandInput
{
  public string? Id { get; set; }
  public string BlockId { get; set; } = "";
  public int Order { get; set; }
  public string Type { get; set; } = "";
  public Dictionary<string, object>? Config { get; set; }
  public bool Enabled { get; set; } = true;
}

public sealed class BotVariableInput
{
  public string? Id { get; set; }
  public string Name { get; set; } = "";
  public string? InitialValue { get; set; }
  public bool Secret { get; set; }
}

public sealed class ExecuteBotJobRequest
{
  public string? EnvironmentId { get; set; }
}

public sealed class SetEndpointCategoryRequest
{
  public string? CategoryId { get; set; }
}

static class StringExtensions
{
  public static string JoinToString(this IEnumerable<string> items) => string.Join(' ', items);
}
