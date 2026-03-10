using ISA95DataGenerator.Domain.Entities;
using ISA95DataGenerator.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ISA95DataGenerator.API.Controllers;

/// <summary>
/// Generic key-value data store controller — replaces browser IndexedDB.
/// Provides CRUD operations on named stores, each record stored as JSON.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class GenericDataController : ControllerBase
{
    private readonly MigrationDbContext _dbContext;
    private readonly ILogger<GenericDataController> _logger;

    public GenericDataController(MigrationDbContext dbContext, ILogger<GenericDataController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    // ─────────────────────── Single-record CRUD ───────────────────────

    /// <summary>
    /// Get all records from a store.
    /// </summary>
    [HttpGet("{storeName}")]
    public async Task<ActionResult<List<JsonElement>>> GetAll(string storeName)
    {
        var rows = await _dbContext.GenericDataStores
            .AsNoTracking()
            .Where(r => r.StoreName == storeName)
            .OrderBy(r => r.Id)
            .Select(r => r.DataJson)
            .ToListAsync();

        var result = new List<JsonElement>(rows.Count);
        foreach (var json in rows)
        {
            try { result.Add(JsonDocument.Parse(json).RootElement); }
            catch { /* skip malformed */ }
        }

        return Ok(result);
    }

    /// <summary>
    /// Get a paged slice of records from a store.
    /// </summary>
    [HttpGet("{storeName}/page")]
    public async Task<ActionResult> GetPage(string storeName, [FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        skip = Math.Max(0, skip);
        take = Math.Clamp(take, 1, 5000);

        var baseQuery = _dbContext.GenericDataStores
            .AsNoTracking()
            .Where(r => r.StoreName == storeName);

        var total = await baseQuery.CountAsync();

        var rows = await baseQuery
            .OrderBy(r => r.Id)
            .Skip(skip)
            .Take(take)
            .Select(r => r.DataJson)
            .ToListAsync();

        var items = new List<JsonElement>(rows.Count);
        foreach (var json in rows)
        {
            try { items.Add(JsonDocument.Parse(json).RootElement); }
            catch { /* skip malformed */ }
        }

        return Ok(new
        {
            total,
            skip,
            take,
            items,
        });
    }

    /// <summary>
    /// Get a keyset-paged slice of records from a store.
    /// Uses Id &gt; lastId instead of Skip/Take, which scales better for very large stores.
    /// </summary>
    [HttpGet("{storeName}/page-keyset")]
    public async Task<ActionResult> GetPageKeyset(string storeName, [FromQuery] long? lastId = null, [FromQuery] int take = 1000)
    {
        take = Math.Clamp(take, 1, 5000);

        var query = _dbContext.GenericDataStores
            .AsNoTracking()
            .Where(r => r.StoreName == storeName);

        if (lastId.HasValue)
            query = query.Where(r => r.Id > lastId.Value);

        // Fetch one extra row to determine whether there is another page.
        var rows = await query
            .OrderBy(r => r.Id)
            .Take(take + 1)
            .Select(r => new { r.Id, r.DataJson })
            .ToListAsync();

        var hasMore = rows.Count > take;
        if (hasMore)
            rows.RemoveAt(rows.Count - 1);

        var items = new List<JsonElement>(rows.Count);
        foreach (var row in rows)
        {
            try { items.Add(JsonDocument.Parse(row.DataJson).RootElement); }
            catch { /* skip malformed */ }
        }

        var nextLastId = rows.Count > 0 ? rows[^1].Id : lastId;

        return Ok(new
        {
            items,
            hasMore,
            nextLastId,
            take,
        });
    }

    /// <summary>
    /// Get a single record by its application-level ID.
    /// </summary>
    [HttpGet("{storeName}/{recordId}")]
    public async Task<ActionResult<JsonElement>> Get(string storeName, string recordId)
    {
        var row = await _dbContext.GenericDataStores
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.StoreName == storeName && r.RecordId == recordId);

        if (row == null)
            return NotFound();

        try
        {
            var el = JsonDocument.Parse(row.DataJson).RootElement;
            return Ok(el);
        }
        catch
        {
            return StatusCode(500, "Corrupt record JSON");
        }
    }

    /// <summary>
    /// Add a new record. Body is the raw JSON object (must have an "id" property).
    /// </summary>
    [HttpPost("{storeName}")]
    public async Task<ActionResult> Add(string storeName, [FromBody] JsonElement body)
    {
        var recordId = ExtractId(body);
        if (recordId == null)
            return BadRequest("Record must have an 'id' property");

        var exists = await _dbContext.GenericDataStores
            .AnyAsync(r => r.StoreName == storeName && r.RecordId == recordId);

        if (exists)
            return Conflict($"Record with id '{recordId}' already exists in store '{storeName}'");

        _dbContext.GenericDataStores.Add(new GenericDataStore
        {
            StoreName = storeName,
            RecordId = recordId,
            DataJson = body.GetRawText(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });

        await _dbContext.SaveChangesAsync();
        return Ok(new { id = recordId });
    }

    /// <summary>
    /// Add or update (upsert) a record.
    /// </summary>
    [HttpPut("{storeName}/{recordId}")]
    public async Task<ActionResult> Put(string storeName, string recordId, [FromBody] JsonElement body)
    {
        var existing = await _dbContext.GenericDataStores
            .FirstOrDefaultAsync(r => r.StoreName == storeName && r.RecordId == recordId);

        if (existing != null)
        {
            existing.DataJson = body.GetRawText();
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _dbContext.GenericDataStores.Add(new GenericDataStore
            {
                StoreName = storeName,
                RecordId = recordId,
                DataJson = body.GetRawText(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }

        await _dbContext.SaveChangesAsync();
        return Ok(new { id = recordId });
    }

    /// <summary>
    /// Delete a single record.
    /// </summary>
    [HttpDelete("{storeName}/{recordId}")]
    public async Task<ActionResult> Delete(string storeName, string recordId)
    {
        var row = await _dbContext.GenericDataStores
            .FirstOrDefaultAsync(r => r.StoreName == storeName && r.RecordId == recordId);

        if (row == null)
            return NotFound();

        _dbContext.GenericDataStores.Remove(row);
        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Clear all records in a store.
    /// </summary>
    [HttpDelete("{storeName}")]
    public async Task<ActionResult> Clear(string storeName)
    {
        var count = await _dbContext.GenericDataStores
            .Where(r => r.StoreName == storeName)
            .ExecuteDeleteAsync();

        _logger.LogInformation("Cleared {Count} records from store '{StoreName}'", count, storeName);
        return Ok(new { cleared = count });
    }

    // ─────────────────────── Bulk operations ───────────────────────

    /// <summary>
    /// Bulk add records to a single store.
    /// Body is a JSON array; each element must have an "id" property.
    /// Existing records with the same id are overwritten (upsert).
    /// </summary>
    [HttpPost("{storeName}/bulk")]
    [RequestSizeLimit(500_000_000)]
    public async Task<ActionResult> BulkAdd(string storeName, [FromBody] JsonElement body)
    {
        if (body.ValueKind != JsonValueKind.Array)
            return BadRequest("Body must be a JSON array");

        var now = DateTime.UtcNow;
        int added = 0, updated = 0;

        var incoming = new List<(string RecordId, string DataJson)>();
        var incomingIds = new HashSet<string>(StringComparer.Ordinal);

        foreach (var item in body.EnumerateArray())
        {
            var recordId = ExtractId(item);
            if (string.IsNullOrWhiteSpace(recordId)) continue;

            incoming.Add((recordId, item.GetRawText()));
            incomingIds.Add(recordId);
        }

        if (incoming.Count == 0)
            return Ok(new { added, updated });

        // Only load keys that are present in this batch, not the whole store.
        var existingMap = await _dbContext.GenericDataStores
            .Where(r => r.StoreName == storeName && incomingIds.Contains(r.RecordId))
            .ToDictionaryAsync(r => r.RecordId, r => r);

        var originalDetectChanges = _dbContext.ChangeTracker.AutoDetectChangesEnabled;
        _dbContext.ChangeTracker.AutoDetectChangesEnabled = false;
        try
        {
            foreach (var (recordId, dataJson) in incoming)
            {
                if (existingMap.TryGetValue(recordId, out var existing))
                {
                    existing.DataJson = dataJson;
                    existing.UpdatedAt = now;
                    updated++;
                }
                else
                {
                    var newRow = new GenericDataStore
                    {
                        StoreName = storeName,
                        RecordId = recordId,
                        DataJson = dataJson,
                        CreatedAt = now,
                        UpdatedAt = now,
                    };
                    _dbContext.GenericDataStores.Add(newRow);
                    existingMap[recordId] = newRow;
                    added++;
                }
            }

            await _dbContext.SaveChangesAsync();
        }
        finally
        {
            _dbContext.ChangeTracker.AutoDetectChangesEnabled = originalDetectChanges;
        }

        _logger.LogInformation("Bulk upsert to '{StoreName}': {Added} added, {Updated} updated", storeName, added, updated);
        return Ok(new { added, updated });
    }

    /// <summary>
    /// Clear a store then bulk-add records (atomic replace).
    /// </summary>
    [HttpPost("{storeName}/replace")]
    [RequestSizeLimit(500_000_000)]
    public async Task<ActionResult> Replace(string storeName, [FromBody] JsonElement body)
    {
        if (body.ValueKind != JsonValueKind.Array)
            return BadRequest("Body must be a JSON array");

        // Delete existing
        await _dbContext.GenericDataStores
            .Where(r => r.StoreName == storeName)
            .ExecuteDeleteAsync();

        var now = DateTime.UtcNow;
        int count = 0;

        foreach (var item in body.EnumerateArray())
        {
            var recordId = ExtractId(item);
            if (recordId == null) continue;

            _dbContext.GenericDataStores.Add(new GenericDataStore
            {
                StoreName = storeName,
                RecordId = recordId,
                DataJson = item.GetRawText(),
                CreatedAt = now,
                UpdatedAt = now,
            });
            count++;
        }

        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("Replaced store '{StoreName}' with {Count} records", storeName, count);
        return Ok(new { count });
    }

    /// <summary>
    /// Bulk upsert to multiple stores at once.
    /// Body: { "stores": { "storeName1": [...records], "storeName2": [...records] } }
    /// </summary>
    [HttpPost("bulk-multi")]
    [RequestSizeLimit(500_000_000)]
    public async Task<ActionResult> BulkMulti([FromBody] BulkMultiRequest request)
    {
        if (request.Stores == null || request.Stores.Count == 0)
            return BadRequest("No stores provided");

        var now = DateTime.UtcNow;
        var result = new Dictionary<string, int>();
        var originalDetectChanges = _dbContext.ChangeTracker.AutoDetectChangesEnabled;
        _dbContext.ChangeTracker.AutoDetectChangesEnabled = false;

        try
        {
            foreach (var (storeName, records) in request.Stores)
            {
                if (records.ValueKind != JsonValueKind.Array) continue;

                var incoming = new List<(string RecordId, string DataJson)>();
                var incomingIds = new HashSet<string>(StringComparer.Ordinal);

                foreach (var item in records.EnumerateArray())
                {
                    var recordId = ExtractId(item);
                    if (string.IsNullOrWhiteSpace(recordId)) continue;

                    incoming.Add((recordId, item.GetRawText()));
                    incomingIds.Add(recordId);
                }

                if (incoming.Count == 0)
                {
                    result[storeName] = 0;
                    continue;
                }

                var existingMap = await _dbContext.GenericDataStores
                    .Where(r => r.StoreName == storeName && incomingIds.Contains(r.RecordId))
                    .ToDictionaryAsync(r => r.RecordId, r => r);

                int count = 0;
                foreach (var (recordId, dataJson) in incoming)
                {
                    if (existingMap.TryGetValue(recordId, out var existing))
                    {
                        existing.DataJson = dataJson;
                        existing.UpdatedAt = now;
                    }
                    else
                    {
                        var newRow = new GenericDataStore
                        {
                            StoreName = storeName,
                            RecordId = recordId,
                            DataJson = dataJson,
                            CreatedAt = now,
                            UpdatedAt = now,
                        };
                        _dbContext.GenericDataStores.Add(newRow);
                        existingMap[recordId] = newRow;
                    }
                    count++;
                }

                result[storeName] = count;
            }

            await _dbContext.SaveChangesAsync();
        }
        finally
        {
            _dbContext.ChangeTracker.AutoDetectChangesEnabled = originalDetectChanges;
        }

        _logger.LogInformation("Bulk multi-store upsert: {Stores}", string.Join(", ", result.Select(kv => $"{kv.Key}={kv.Value}")));
        return Ok(result);
    }

    /// <summary>
    /// Clear multiple stores at once.
    /// </summary>
    [HttpDelete("clear-stores")]
    public async Task<ActionResult> ClearStores([FromBody] List<string> storeNames)
    {
        int total = 0;
        foreach (var storeName in storeNames)
        {
            var count = await _dbContext.GenericDataStores
                .Where(r => r.StoreName == storeName)
                .ExecuteDeleteAsync();
            total += count;
        }

        return Ok(new { cleared = total });
    }

    /// <summary>
    /// Get record counts for multiple (or all) stores.
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<Dictionary<string, int>>> Summary([FromQuery] string? storeNames = null)
    {
        IQueryable<GenericDataStore> query = _dbContext.GenericDataStores;
        if (!string.IsNullOrEmpty(storeNames))
        {
            var names = storeNames.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            query = query.Where(r => names.Contains(r.StoreName));
        }

        var result = await query
            .GroupBy(r => r.StoreName)
            .Select(g => new { Store = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Store, g => g.Count);

        return Ok(result);
    }

    // ─────────────────────── Helpers ───────────────────────

    private static string? ExtractId(JsonElement element)
    {
        if (element.TryGetProperty("id", out var idProp))
        {
            return idProp.ValueKind switch
            {
                JsonValueKind.String => idProp.GetString(),
                JsonValueKind.Number => idProp.GetRawText(),
                _ => idProp.GetRawText(),
            };
        }
        return null;
    }
}

public class BulkMultiRequest
{
    public Dictionary<string, JsonElement> Stores { get; set; } = new();
}
