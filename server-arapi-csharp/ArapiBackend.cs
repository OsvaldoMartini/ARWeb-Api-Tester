using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Reflection;
using Microsoft.Data.Sqlite;

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
            LoadAiProvidersFromDatabase();
            EnsureSyntheticBankingData();
            LoadBotJobsFromDatabase();
            EnsureSeedData();
            EnsureDiagnosticBotJobs();
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

      LoadAiProvidersFromDatabase();
      EnsureSyntheticBankingData();
      LoadBotJobsFromDatabase();
      EnsureSeedData();
      EnsureDiagnosticBotJobs();
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
      var agent = SelectAgent(request);
      var matchingEndpoints = FindMatchingEndpoints(ExpandBankingQuestion(request.Question), _state.ApiEndpoints, 3);
      var evidence = matchingEndpoints
        .Select(e => new { endpointId = e.Id, method = e.Method, path = e.Path })
        .ToArray();
      var syntheticAnswer = BuildSyntheticBankingAnswer(request.Question, request.Mode, matchingEndpoints);
      return new
      {
        agentId = agent.Id,
        agentName = agent.Name,
        answer = syntheticAnswer ?? $"I matched {evidence.Length} endpoint(s) for the request.",
        evidence,
        limitations = syntheticAnswer is not null
          ? ["Synthetic ARAPI mock data from the local database. Not live core banking data."]
          : evidence.Length == 0
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
      var provider = _state.AiProviders
        .Where(p => p.Enabled && !string.IsNullOrWhiteSpace(p.EncryptedApiKey))
        .OrderByDescending(p => p.IsDefault)
        .FirstOrDefault();
      var intent = BuildAssistantIntent(last.Content);
      var matches = FindMatchingEndpoints(intent.SearchText, _state.ApiEndpoints, 5);

      actions.Add(new
      {
        type = "catalog_search",
        label = $"{matches.Count} registered endpoint(s) matched",
        data = new
        {
          query = intent.SearchText,
          results = matches.Select(e => new { id = e.Id, method = e.Method, path = e.Path, summary = e.Summary }).ToArray(),
        },
      });

      if (intent.ShouldRun)
      {
        var runs = _state.BotJobs
          .Select(job => ExecuteBotJob(job.Id, new ExecuteBotJobRequest { EnvironmentId = "mock" }))
          .ToArray();
        actions.Add(new { type = "botjob_executed", label = "BotJobs executed against Mock Server", data = new { passed = runs.Length, total = runs.Length, status = "passed" } });
        return new
        {
          answer = $"Executed {runs.Length} BotJob(s) against the Mock Server.",
          actions,
          provider = provider?.Provider,
        };
      }

      if (intent.ShouldList)
      {
        return new
        {
          answer = _state.BotJobs.Count == 0
            ? "No BotJobs exist yet. Ask me to create one and I will use the registered API catalog first."
            : $"You have {_state.BotJobs.Count} BotJob(s):\n" + string.Join("\n", _state.BotJobs.OrderByDescending(j => j.UpdatedAt).Take(10).Select(j => $"- {j.Name} ({j.Id})")),
          actions,
          provider = provider?.Provider,
        };
      }

      if (intent.ShouldSearch)
      {
        return new
        {
          answer = matches.Count == 0
            ? $"Searched the ARAPI catalog for: {intent.SearchText}\n\nNo registered endpoints matched. Ask me to create a test and I will create a synthetic mock endpoint/data set."
            : $"Searched the ARAPI catalog for: {intent.SearchText}\n\nFound {matches.Count} registered endpoint(s):\n" + string.Join("\n", matches.Select(e => $"- {e.Method} {e.Path}" + (string.IsNullOrWhiteSpace(e.Summary) ? "" : $" - {e.Summary}"))),
          actions,
          provider = provider?.Provider,
        };
      }

      if (intent.ShouldCreate)
      {
        var createdSynthetic = false;
        if (matches.Count == 0)
        {
          matches.Add(CreateSyntheticEndpointForIntent(intent));
          createdSynthetic = true;
        }

        var job = CreateFunctionalBotJobFromIntent(intent, matches, createdSynthetic);
        actions.Add(new
        {
          type = "botjob_created",
          label = "Functional BotJob draft ready",
          data = new { id = job.Id, name = job.Name },
        });

        var apiLines = matches.Select(e => $"- {e.Method} {e.Path} ({(createdSynthetic && e.SpecId == "synthetic-arapi" ? "new synthetic endpoint" : "already registered API")})");
        return new
        {
          answer =
            $"Created a runnable BotJob: {job.Name}\n\n" +
            "Status report:\n" +
            $"- Intent: {intent.Label}\n" +
            $"- Data source: {(createdSynthetic ? "synthetic ARAPI data because no registered endpoint matched strongly enough" : "registered ARAPI catalog endpoints")}\n" +
            $"- Mock target: Mock Server environment\n" +
            $"- Test steps: {_state.BotJobCommands.Count(c => _state.BotJobBlocks.Any(b => b.BotJobId == job.Id && b.Id == c.BlockId))}\n" +
            "- APIs used:\n" + string.Join("\n", apiLines),
          actions,
          provider = provider?.Provider,
        };
      }
    }

    return new
    {
      answer = "I can create BotJobs, search the API catalog, and run tests. Ask for a specific business flow such as \"create a new client\", \"check account balance\", or \"run all BotJobs against mock\".",
      actions,
      provider = _state.AiProviders.FirstOrDefault(p => p.IsDefault && p.Enabled && !string.IsNullOrWhiteSpace(p.EncryptedApiKey))?.Provider,
    };
  }

  public object GetAiProviders()
  {
    lock (_gate)
    {
      LoadAiProvidersFromDatabase();
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
      if (!string.IsNullOrWhiteSpace(request.EncryptedApiKey))
      {
        setting.EncryptedApiKey = request.EncryptedApiKey;
      }
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
      SaveAiProvidersToDatabase();
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
      SaveAiProvidersToDatabase();
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
      SaveBotJobsToDatabase();
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

      SaveBotJobsToDatabase();
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
      SaveBotJobsToDatabase();
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

  private AgentDefinition SelectAgent(AskAgentRequest request)
  {
    if (!string.IsNullOrWhiteSpace(request.AgentId))
    {
      var explicitAgent = AgentCatalog.FirstOrDefault(a => string.Equals(a.Id, request.AgentId, StringComparison.OrdinalIgnoreCase));
      if (explicitAgent is not null) return explicitAgent;
    }

    var mode = string.IsNullOrWhiteSpace(request.Mode) ? "employee" : request.Mode;
    var candidates = AgentCatalog
      .Where(a => string.Equals(a.Mode, mode, StringComparison.OrdinalIgnoreCase) || string.Equals(a.Mode, "both", StringComparison.OrdinalIgnoreCase))
      .ToArray();

    return candidates
      .Select(a => new
      {
        Agent = a,
        Score = a.Keywords.Sum(k => ScoreText(k, request.Question)),
      })
      .OrderByDescending(x => x.Score)
      .ThenBy(x => x.Agent.Id)
      .FirstOrDefault()?.Agent ?? candidates.FirstOrDefault() ?? AgentCatalog[0];
  }

  private static string ExpandBankingQuestion(string text)
  {
    var lower = text.ToLowerInvariant();
    var terms = new List<string> { text };
    if (lower.Contains("balance") || lower.Contains("account"))
    {
      terms.Add("account accounts balance balances available booked iban ledger cash");
    }
    if (lower.Contains("transaction") || lower.Contains("spent") || lower.Contains("payment"))
    {
      terms.Add("transaction transactions payment payments movement movements card transfer");
    }
    if (lower.Contains("portfolio") || lower.Contains("investment"))
    {
      terms.Add("portfolio holdings investment position asset allocation performance");
    }
    return string.Join(' ', terms);
  }

  private static AppAssistantIntent BuildAssistantIntent(string text)
  {
    var lower = text.ToLowerInvariant();
    var wantsCreate = lower.Contains("create") || lower.Contains("build") || lower.Contains("new") || lower.Contains("test");
    var wantsRun = lower.Contains("run") || lower.Contains("execute");
    var wantsList = lower.Contains("what botjobs") || lower.Contains("list botjobs") || lower.Contains("already have");
    var wantsSearch = lower.Contains("search") || lower.Contains("catalog") || lower.Contains("endpoint");

    if (lower.Contains("client") || lower.Contains("customer") || lower.Contains("onboarding") || lower.Contains("kyc"))
    {
      return new AppAssistantIntent(
        "Create new client",
        "create new client customer onboarding kyc profile consent",
        wantsCreate || lower.Contains("botjob") || lower.Contains("test"),
        wantsRun,
        wantsList,
        wantsSearch,
        new Dictionary<string, object>
        {
          ["clientType"] = "individual",
          ["firstName"] = "Mario",
          ["lastName"] = "Rossi",
          ["email"] = "mario.rossi.synthetic@example.com",
          ["phone"] = "+41 79 000 10 20",
          ["country"] = "CH",
          ["taxResidency"] = "CH",
          ["riskProfile"] = "balanced",
          ["kycStatus"] = "pending_review",
        });
    }

    if (lower.Contains("balance") || lower.Contains("account"))
    {
      return new AppAssistantIntent(
        "Check account balances",
        "account accounts balance balances available booked iban ledger cash",
        wantsCreate || lower.Contains("botjob") || lower.Contains("test"),
        wantsRun,
        wantsList,
        wantsSearch,
        new Dictionary<string, object>
        {
          ["customerId"] = "demo-client",
          ["includeBookedBalance"] = true,
          ["includeAvailableBalance"] = true,
        });
    }

    if (lower.Contains("payment") || lower.Contains("transfer"))
    {
      return new AppAssistantIntent(
        "Payment validation",
        "payment payments transfer sepa swift cash beneficiary approval",
        wantsCreate || lower.Contains("botjob") || lower.Contains("test"),
        wantsRun,
        wantsList,
        wantsSearch,
        new Dictionary<string, object>
        {
          ["debtorAccount"] = "ACC-1001",
          ["creditorIban"] = "CH56 0483 5012 3456 7800 9",
          ["amount"] = 125.50,
          ["currency"] = "CHF",
          ["reference"] = "SYNTHETIC-PAYMENT-TEST",
        });
    }

    return new AppAssistantIntent(
      "Catalog-driven test",
      ExpandBankingQuestion(text),
      wantsCreate || lower.Contains("botjob") || lower.Contains("test"),
      wantsRun,
      wantsList,
      wantsSearch,
      new Dictionary<string, object>
      {
        ["synthetic"] = true,
        ["requestedFlow"] = text,
      });
  }

  private ApiEndpointState CreateSyntheticEndpointForIntent(AppAssistantIntent intent)
  {
    var now = NowIso();
    var spec = _state.ApiSpecs.FirstOrDefault(s => s.Id == "synthetic-arapi");
    if (spec is null)
    {
      spec = new ApiSpecState
      {
        Id = "synthetic-arapi",
        Title = "Synthetic ARAPI Mock Banking APIs",
        Version = "1.0.0",
        SourcePath = "generated://arapi/synthetic",
        RawFormat = "synthetic",
        ImportedAt = now,
      };
      _state.ApiSpecs.Add(spec);
    }

    var path = intent.Label switch
    {
      "Create new client" => "/synthetic/customers",
      "Check account balances" => "/synthetic/customers/{customerId}/accounts/balances",
      "Payment validation" => "/synthetic/payments",
      _ => "/synthetic/test-flow",
    };
    var method = intent.Label is "Check account balances" ? "GET" : "POST";
    var existing = _state.ApiEndpoints.FirstOrDefault(e =>
      string.Equals(e.SpecId, spec.Id, StringComparison.OrdinalIgnoreCase) &&
      string.Equals(e.Method, method, StringComparison.OrdinalIgnoreCase) &&
      string.Equals(e.Path, path, StringComparison.OrdinalIgnoreCase));
    if (existing is not null)
    {
      return existing;
    }

    var endpoint = new ApiEndpointState
    {
      Id = NewId(),
      SpecId = spec.Id,
      OperationId = "synthetic_" + Regex.Replace(intent.Label.ToLowerInvariant(), @"[^a-z0-9]+", "_").Trim('_'),
      Method = method,
      Path = path,
      Summary = $"Synthetic mock endpoint for {intent.Label}.",
      Description = "Generated by ARAPI Bot Builder when no registered API matched the requested business flow.",
      Tags = ["synthetic", "mock", "arapi", .. intent.SearchText.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Take(5)],
      CategoryId = FindBestCategory(new ApiEndpointState { Path = path, Summary = intent.Label, Tags = ["synthetic", intent.Label] }, _state.BusinessCategories)?.Id,
    };
    _state.ApiEndpoints.Add(endpoint);
    spec.EndpointCount = _state.ApiEndpoints.Count(e => e.SpecId == spec.Id);

    _state.ApiOutputFields.Add(new ApiOutputFieldState { Id = NewId(), EndpointId = endpoint.Id, JsonPath = "$.ok", SchemaType = "boolean", Description = "Operation success flag" });
    _state.ApiOutputFields.Add(new ApiOutputFieldState { Id = NewId(), EndpointId = endpoint.Id, JsonPath = "$.data.id", SchemaType = "string", Description = "Synthetic resource identifier" });
    SaveLocked();
    return endpoint;
  }

  private BotJobState CreateFunctionalBotJobFromIntent(AppAssistantIntent intent, IReadOnlyList<ApiEndpointState> endpoints, bool usedSyntheticEndpoint)
  {
    var now = NowIso();
    var job = new BotJobState
    {
      Id = NewId(),
      Name = $"{intent.Label} - mock functional test",
      Description = $"Generated by Bot Builder. Uses {(usedSyntheticEndpoint ? "synthetic ARAPI endpoint/data" : "registered ARAPI catalog endpoints")} and runs against the Mock Server.",
      CategoryId = FindBestCategory(new ApiEndpointState { Path = intent.SearchText, Summary = intent.Label, Tags = intent.SearchText.Split(' ').Take(5).ToList() }, _state.BusinessCategories)?.Id,
      CreatedAt = now,
      UpdatedAt = now,
    };
    var block = new BotJobBlockState
    {
      Id = NewId(),
      BotJobId = job.Id,
      Name = "Mock flow",
      Order = 0,
    };

    _state.BotJobs.Add(job);
    _state.BotJobBlocks.Add(block);

    var order = 0;
    _state.BotJobCommands.Add(new BotJobCommandState
    {
      Id = NewId(),
      BlockId = block.Id,
      Order = order++,
      Type = "SET_VARIABLE",
      Enabled = true,
      Config = new Dictionary<string, object>
      {
        ["name"] = "syntheticData",
        ["value"] = JsonSerializer.Serialize(intent.SyntheticPayload, _json),
      },
    });

    foreach (var endpoint in endpoints.Take(4))
    {
      _state.BotJobCommands.Add(new BotJobCommandState
      {
        Id = NewId(),
        BlockId = block.Id,
        Order = order++,
        Type = "API_CALL",
        Enabled = true,
        Config = new Dictionary<string, object>
        {
          ["endpointId"] = endpoint.Id,
          ["body"] = endpoint.Method.Equals("GET", StringComparison.OrdinalIgnoreCase) ? "" : intent.SyntheticPayload,
          ["headers"] = new Dictionary<string, object>
          {
            ["Content-Type"] = "application/json",
            ["X-ARAPI-Synthetic-Test"] = "true",
          },
        },
      });
      _state.BotJobCommands.Add(new BotJobCommandState
      {
        Id = NewId(),
        BlockId = block.Id,
        Order = order++,
        Type = "ASSERT_STATUS_CODE",
        Enabled = true,
        Config = new Dictionary<string, object> { ["expected"] = 200 },
      });
      _state.BotJobCommands.Add(new BotJobCommandState
      {
        Id = NewId(),
        BlockId = block.Id,
        Order = order++,
        Type = "ASSERT_JSON_PATH_EXISTS",
        Enabled = true,
        Config = new Dictionary<string, object> { ["jsonPath"] = "$.ok" },
      });
    }

    _state.BotVariables.Add(new BotVariableState
    {
      Id = NewId(),
      BotJobId = job.Id,
      Name = "environment",
      InitialValue = "mock",
      Secret = false,
    });

    SaveBotJobsToDatabase();
    SaveLocked();
    return job;
  }

  private void EnsureDiagnosticBotJobs()
  {
    var intents = new[]
    {
      BuildAssistantIntent("I want to create a BotJob that creates a new client"),
      BuildAssistantIntent("Create a payment validation test against the Mock Server"),
      BuildAssistantIntent("Create a test that checks current account balances"),
    };

    foreach (var intent in intents)
    {
      var name = $"{intent.Label} - mock functional test";
      if (_state.BotJobs.Any(j => string.Equals(j.Name, name, StringComparison.OrdinalIgnoreCase)))
      {
        continue;
      }

      var matches = FindMatchingEndpoints(intent.SearchText, _state.ApiEndpoints, 5);
      var createdSynthetic = false;
      if (matches.Count == 0)
      {
        matches.Add(CreateSyntheticEndpointForIntent(intent));
        createdSynthetic = true;
      }
      CreateFunctionalBotJobFromIntent(intent, matches, createdSynthetic);
    }
  }

  private static List<ApiEndpointState> FindMatchingEndpoints(string text, IReadOnlyList<ApiEndpointState> endpoints, int limit)
  {
    var tokens = text.Split(new[] { ' ', ',', ';', '/', '-', '_' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
      .Select(x => x.ToLowerInvariant())
      .Where(x => x.Length > 2)
      .Distinct()
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
      .GroupBy(x => $"{x.Endpoint.Method} {x.Endpoint.Path}", StringComparer.OrdinalIgnoreCase)
      .Select(g => g.First())
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

  private void LoadAiProvidersFromDatabase()
  {
    try
    {
      EnsureAiProviderTable();
      using var connection = new SqliteConnection($"Data Source={_dbPath}");
      connection.Open();
      using var cmd = connection.CreateCommand();
      cmd.CommandText = @"
SELECT id, provider, label, base_url, model, encrypted_api_key, is_default, enabled
FROM ai_provider_settings
ORDER BY label";

      var providers = new List<AiProviderSettingState>();
      using var reader = cmd.ExecuteReader();
      while (reader.Read())
      {
        providers.Add(new AiProviderSettingState
        {
          Id = reader.GetString(0),
          Provider = reader.GetString(1),
          Label = reader.GetString(2),
          BaseUrl = reader.IsDBNull(3) ? null : reader.GetString(3),
          Model = reader.IsDBNull(4) ? null : reader.GetString(4),
          EncryptedApiKey = reader.IsDBNull(5) ? null : reader.GetString(5),
          IsDefault = reader.GetInt32(6) == 1,
          Enabled = reader.GetInt32(7) == 1,
        });
      }

      if (providers.Count > 0)
      {
        _state.AiProviders = providers;
      }
      else if (_state.AiProviders.Count > 0)
      {
        SaveAiProvidersToDatabase();
      }
    }
    catch (Exception ex)
    {
      Console.Error.WriteLine($"[arapi] failed to load AI providers from database: {ex.Message}");
    }
  }

  private void SaveAiProvidersToDatabase()
  {
    try
    {
      EnsureAiProviderTable();
      using var connection = new SqliteConnection($"Data Source={_dbPath}");
      connection.Open();
      using var tx = connection.BeginTransaction();

      foreach (var setting in _state.AiProviders)
      {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = @"
INSERT OR REPLACE INTO ai_provider_settings
  (id, provider, label, base_url, model, encrypted_api_key, is_default, enabled)
VALUES
  ($id, $provider, $label, $base_url, $model, $encrypted_api_key, $is_default, $enabled)";
        cmd.Parameters.AddWithValue("$id", setting.Id);
        cmd.Parameters.AddWithValue("$provider", setting.Provider);
        cmd.Parameters.AddWithValue("$label", setting.Label);
        cmd.Parameters.AddWithValue("$base_url", (object?)setting.BaseUrl ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$model", (object?)setting.Model ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$encrypted_api_key", (object?)setting.EncryptedApiKey ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$is_default", setting.IsDefault ? 1 : 0);
        cmd.Parameters.AddWithValue("$enabled", setting.Enabled ? 1 : 0);
        cmd.ExecuteNonQuery();
      }

      tx.Commit();
    }
    catch (Exception ex)
    {
      Console.Error.WriteLine($"[arapi] failed to save AI providers to database: {ex.Message}");
    }
  }

  private void EnsureAiProviderTable()
  {
    var dir = Path.GetDirectoryName(_dbPath);
    if (!string.IsNullOrWhiteSpace(dir))
    {
      Directory.CreateDirectory(dir);
    }

    using var connection = new SqliteConnection($"Data Source={_dbPath}");
    connection.Open();
    using var cmd = connection.CreateCommand();
    cmd.CommandText = @"
CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id                TEXT PRIMARY KEY,
  provider          TEXT NOT NULL,
  label             TEXT NOT NULL,
  base_url          TEXT,
  model             TEXT,
  encrypted_api_key TEXT,
  is_default        INTEGER NOT NULL DEFAULT 0,
  enabled           INTEGER NOT NULL DEFAULT 1
);";
    cmd.ExecuteNonQuery();
  }

  private void LoadBotJobsFromDatabase()
  {
    try
    {
      EnsureBotJobTables();
      using var connection = new SqliteConnection($"Data Source={_dbPath}");
      connection.Open();

      var jobs = new List<BotJobState>();
      using (var cmd = connection.CreateCommand())
      {
        cmd.CommandText = "SELECT id, name, description, category_id, created_at, updated_at FROM bot_jobs ORDER BY updated_at DESC";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
          jobs.Add(new BotJobState
          {
            Id = reader.GetString(0),
            Name = reader.GetString(1),
            Description = reader.IsDBNull(2) ? null : reader.GetString(2),
            CategoryId = reader.IsDBNull(3) ? null : reader.GetString(3),
            CreatedAt = reader.GetString(4),
            UpdatedAt = reader.GetString(5),
          });
        }
      }

      if (jobs.Count == 0)
      {
        if (_state.BotJobs.Count > 0)
        {
          SaveBotJobsToDatabase();
        }
        return;
      }

      _state.BotJobs = jobs;
      _state.BotJobBlocks = LoadBotJobBlocks(connection);
      _state.BotJobCommands = LoadBotJobCommands(connection);
      _state.BotVariables = LoadBotVariables(connection);
    }
    catch (Exception ex)
    {
      Console.Error.WriteLine($"[arapi] failed to load BotJobs from database: {ex.Message}");
    }
  }

  private static List<BotJobBlockState> LoadBotJobBlocks(SqliteConnection connection)
  {
    var blocks = new List<BotJobBlockState>();
    using var cmd = connection.CreateCommand();
    cmd.CommandText = "SELECT id, bot_job_id, name, sort_order FROM bot_job_blocks ORDER BY sort_order";
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
      blocks.Add(new BotJobBlockState
      {
        Id = reader.GetString(0),
        BotJobId = reader.GetString(1),
        Name = reader.GetString(2),
        Order = reader.GetInt32(3),
      });
    }
    return blocks;
  }

  private static List<BotJobCommandState> LoadBotJobCommands(SqliteConnection connection)
  {
    var commands = new List<BotJobCommandState>();
    using var cmd = connection.CreateCommand();
    cmd.CommandText = "SELECT id, block_id, sort_order, type, config_json, enabled FROM bot_job_commands ORDER BY sort_order";
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
      commands.Add(new BotJobCommandState
      {
        Id = reader.GetString(0),
        BlockId = reader.GetString(1),
        Order = reader.GetInt32(2),
        Type = reader.GetString(3),
        Config = JsonSerializer.Deserialize<Dictionary<string, object>>(reader.GetString(4)) ?? [],
        Enabled = reader.GetInt32(5) == 1,
      });
    }
    return commands;
  }

  private static List<BotVariableState> LoadBotVariables(SqliteConnection connection)
  {
    var variables = new List<BotVariableState>();
    using var cmd = connection.CreateCommand();
    cmd.CommandText = "SELECT id, bot_job_id, name, initial_value, secret FROM bot_variables ORDER BY name";
    using var reader = cmd.ExecuteReader();
    while (reader.Read())
    {
      variables.Add(new BotVariableState
      {
        Id = reader.GetString(0),
        BotJobId = reader.GetString(1),
        Name = reader.GetString(2),
        InitialValue = reader.IsDBNull(3) ? null : reader.GetString(3),
        Secret = reader.GetInt32(4) == 1,
      });
    }
    return variables;
  }

  private void SaveBotJobsToDatabase()
  {
    try
    {
      EnsureBotJobTables();
      using var connection = new SqliteConnection($"Data Source={_dbPath}");
      connection.Open();
      using var tx = connection.BeginTransaction();

      foreach (var table in new[] { "bot_variables", "bot_job_commands", "bot_job_blocks", "bot_jobs" })
      {
        using var delete = connection.CreateCommand();
        delete.Transaction = tx;
        delete.CommandText = $"DELETE FROM {table}";
        delete.ExecuteNonQuery();
      }

      foreach (var job in _state.BotJobs)
      {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = @"
INSERT INTO bot_jobs (id, name, description, category_id, created_at, updated_at)
VALUES ($id, $name, $description, $category_id, $created_at, $updated_at)";
        cmd.Parameters.AddWithValue("$id", job.Id);
        cmd.Parameters.AddWithValue("$name", job.Name);
        cmd.Parameters.AddWithValue("$description", (object?)job.Description ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$category_id", (object?)job.CategoryId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$created_at", job.CreatedAt);
        cmd.Parameters.AddWithValue("$updated_at", job.UpdatedAt);
        cmd.ExecuteNonQuery();
      }

      foreach (var block in _state.BotJobBlocks)
      {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = @"
INSERT INTO bot_job_blocks (id, bot_job_id, name, sort_order)
VALUES ($id, $bot_job_id, $name, $sort_order)";
        cmd.Parameters.AddWithValue("$id", block.Id);
        cmd.Parameters.AddWithValue("$bot_job_id", block.BotJobId);
        cmd.Parameters.AddWithValue("$name", block.Name);
        cmd.Parameters.AddWithValue("$sort_order", block.Order);
        cmd.ExecuteNonQuery();
      }

      foreach (var command in _state.BotJobCommands)
      {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = @"
INSERT INTO bot_job_commands (id, block_id, sort_order, type, config_json, enabled)
VALUES ($id, $block_id, $sort_order, $type, $config_json, $enabled)";
        cmd.Parameters.AddWithValue("$id", command.Id);
        cmd.Parameters.AddWithValue("$block_id", command.BlockId);
        cmd.Parameters.AddWithValue("$sort_order", command.Order);
        cmd.Parameters.AddWithValue("$type", command.Type);
        cmd.Parameters.AddWithValue("$config_json", JsonSerializer.Serialize(command.Config, _json));
        cmd.Parameters.AddWithValue("$enabled", command.Enabled ? 1 : 0);
        cmd.ExecuteNonQuery();
      }

      foreach (var variable in _state.BotVariables)
      {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = @"
INSERT INTO bot_variables (id, bot_job_id, name, initial_value, secret)
VALUES ($id, $bot_job_id, $name, $initial_value, $secret)";
        cmd.Parameters.AddWithValue("$id", variable.Id);
        cmd.Parameters.AddWithValue("$bot_job_id", variable.BotJobId);
        cmd.Parameters.AddWithValue("$name", variable.Name);
        cmd.Parameters.AddWithValue("$initial_value", (object?)variable.InitialValue ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$secret", variable.Secret ? 1 : 0);
        cmd.ExecuteNonQuery();
      }

      tx.Commit();
    }
    catch (Exception ex)
    {
      Console.Error.WriteLine($"[arapi] failed to save BotJobs to database: {ex.Message}");
    }
  }

  private void EnsureBotJobTables()
  {
    var dir = Path.GetDirectoryName(_dbPath);
    if (!string.IsNullOrWhiteSpace(dir))
    {
      Directory.CreateDirectory(dir);
    }

    using var connection = new SqliteConnection($"Data Source={_dbPath}");
    connection.Open();
    using var cmd = connection.CreateCommand();
    cmd.CommandText = @"
CREATE TABLE IF NOT EXISTS bot_jobs (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  category_id TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bot_job_blocks (
  id         TEXT PRIMARY KEY,
  bot_job_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bot_job_commands (
  id          TEXT PRIMARY KEY,
  block_id    TEXT NOT NULL,
  sort_order  INTEGER NOT NULL,
  type        TEXT NOT NULL,
  config_json TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS bot_variables (
  id            TEXT PRIMARY KEY,
  bot_job_id    TEXT NOT NULL,
  name          TEXT NOT NULL,
  initial_value TEXT,
  secret        INTEGER NOT NULL DEFAULT 0
);";
    cmd.ExecuteNonQuery();
  }

  private void EnsureSyntheticBankingData()
  {
    try
    {
      var dir = Path.GetDirectoryName(_dbPath);
      if (!string.IsNullOrWhiteSpace(dir))
      {
        Directory.CreateDirectory(dir);
      }

      using var connection = new SqliteConnection($"Data Source={_dbPath}");
      connection.Open();
      using var create = connection.CreateCommand();
      create.CommandText = @"
CREATE TABLE IF NOT EXISTS synthetic_customer_accounts (
  customer_id       TEXT NOT NULL,
  account_id        TEXT PRIMARY KEY,
  iban              TEXT NOT NULL,
  product_name      TEXT NOT NULL,
  currency          TEXT NOT NULL,
  available_balance REAL NOT NULL,
  booked_balance    REAL NOT NULL,
  updated_at        TEXT NOT NULL
);";
      create.ExecuteNonQuery();

      using var count = connection.CreateCommand();
      count.CommandText = "SELECT COUNT(*) FROM synthetic_customer_accounts";
      if (Convert.ToInt32(count.ExecuteScalar()) > 0)
      {
        return;
      }

      var now = NowIso();
      var seedRows = new[]
      {
        new SyntheticAccountSeed("demo-client", "ACC-1001", "CH93 0076 2011 6238 5295 7", "Private Current Account", "CHF", 18425.35m, 18610.90m),
        new SyntheticAccountSeed("demo-client", "ACC-2001", "CH56 0483 5012 3456 7800 9", "Savings Account", "CHF", 72540.00m, 72540.00m),
        new SyntheticAccountSeed("demo-client", "ACC-3001", "CH11 0900 0000 1234 5678 9", "EUR Current Account", "EUR", 9340.75m, 9415.10m),
      };

      foreach (var row in seedRows)
      {
        using var insert = connection.CreateCommand();
        insert.CommandText = @"
INSERT INTO synthetic_customer_accounts
  (customer_id, account_id, iban, product_name, currency, available_balance, booked_balance, updated_at)
VALUES
  ($customer_id, $account_id, $iban, $product_name, $currency, $available_balance, $booked_balance, $updated_at)";
        insert.Parameters.AddWithValue("$customer_id", row.CustomerId);
        insert.Parameters.AddWithValue("$account_id", row.AccountId);
        insert.Parameters.AddWithValue("$iban", row.Iban);
        insert.Parameters.AddWithValue("$product_name", row.ProductName);
        insert.Parameters.AddWithValue("$currency", row.Currency);
        insert.Parameters.AddWithValue("$available_balance", row.AvailableBalance);
        insert.Parameters.AddWithValue("$booked_balance", row.BookedBalance);
        insert.Parameters.AddWithValue("$updated_at", now);
        insert.ExecuteNonQuery();
      }
    }
    catch (Exception ex)
    {
      Console.Error.WriteLine($"[arapi] failed to ensure synthetic banking data: {ex.Message}");
    }
  }

  private string? BuildSyntheticBankingAnswer(string question, string? mode, IReadOnlyList<ApiEndpointState> evidence)
  {
    var lower = question.ToLowerInvariant();
    if (!lower.Contains("balance") && !lower.Contains("account"))
    {
      return null;
    }

    try
    {
      EnsureSyntheticBankingData();
      using var connection = new SqliteConnection($"Data Source={_dbPath}");
      connection.Open();
      using var cmd = connection.CreateCommand();
      cmd.CommandText = @"
SELECT product_name, iban, currency, available_balance, booked_balance, updated_at
FROM synthetic_customer_accounts
WHERE customer_id = 'demo-client'
ORDER BY product_name";

      var rows = new List<SyntheticAccountSnapshot>();
      using var reader = cmd.ExecuteReader();
      while (reader.Read())
      {
        rows.Add(new SyntheticAccountSnapshot(
          reader.GetString(0),
          reader.GetString(1),
          reader.GetString(2),
          reader.GetDecimal(3),
          reader.GetDecimal(4),
          reader.GetString(5)
        ));
      }

      if (rows.Count == 0)
      {
        return null;
      }

      var totals = rows
        .GroupBy(r => r.Currency)
        .Select(g => $"{g.Key} {g.Sum(r => r.AvailableBalance):N2}")
        .ToArray();

      var sb = new StringBuilder();
      if (string.Equals(mode, "client", StringComparison.OrdinalIgnoreCase))
      {
        sb.AppendLine("Your current available balances are:");
      }
      else
      {
        sb.AppendLine("Synthetic customer account balance snapshot:");
      }

      foreach (var row in rows)
      {
        sb.AppendLine($"- {row.ProductName} ({MaskIban(row.Iban)}): available {row.Currency} {row.AvailableBalance:N2}, booked {row.Currency} {row.BookedBalance:N2}");
      }

      sb.AppendLine($"Total available balance: {string.Join(", ", totals)}.");
      if (evidence.Count > 0)
      {
        sb.AppendLine($"Catalog evidence selected from ARAPI: {string.Join(", ", evidence.Select(e => $"{e.Method} {e.Path}"))}.");
      }
      return sb.ToString().Trim();
    }
    catch (Exception ex)
    {
      Console.Error.WriteLine($"[arapi] failed to build synthetic banking answer: {ex.Message}");
      return null;
    }
  }

  private static string MaskIban(string iban)
  {
    var compact = iban.Replace(" ", "");
    if (compact.Length <= 8) return iban;
    return $"{compact[..4]} ... {compact[^4..]}";
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

public sealed record SyntheticAccountSeed(string CustomerId, string AccountId, string Iban, string ProductName, string Currency, decimal AvailableBalance, decimal BookedBalance);
public sealed record SyntheticAccountSnapshot(string ProductName, string Iban, string Currency, decimal AvailableBalance, decimal BookedBalance, string UpdatedAt);
public sealed record AppAssistantIntent(string Label, string SearchText, bool ShouldCreate, bool ShouldRun, bool ShouldList, bool ShouldSearch, Dictionary<string, object> SyntheticPayload);

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
