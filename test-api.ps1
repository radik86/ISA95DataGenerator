# ISA-95 Test Data Generator - API Test Script
# Run this after starting the API with: dotnet run

$baseUrl = "http://localhost:5000/api"

Write-Host "🧪 Testing ISA-95 Test Data Generator API" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Get all entities
Write-Host "📋 Test 1: Getting all entities..." -ForegroundColor Yellow
try {
    $entities = Invoke-RestMethod -Uri "$baseUrl/entities" -Method Get
    Write-Host "✅ SUCCESS: Found $($entities.Count) entities" -ForegroundColor Green
    Write-Host "   First 5 entities: $($entities[0..4].name -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get Equipment structure
Write-Host "🏗 Test 2: Getting Equipment structure..." -ForegroundColor Yellow
try {
    $equipment = Invoke-RestMethod -Uri "$baseUrl/entities/Equipment/structure" -Method Get
    Write-Host "✅ SUCCESS: Equipment has $($equipment.Attributes.Count) attributes and $($equipment.Relationships.Count) relationships" -ForegroundColor Green
    Write-Host "   Relationships: $($equipment.Relationships[0..2].name -join ', ')..." -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Create Primary Key Rule
Write-Host "🔑 Test 3: Creating primary key rule for Equipment..." -ForegroundColor Yellow
try {
    $pkRule = @{
        entityName = "Equipment"
        formatTemplate = "EQ-{Seq:0000}"
        useSequence = $true
        startingSequence = 1
        sequencePadding = 4
        fieldNames = @("id")
    } | ConvertTo-Json

    $result = Invoke-RestMethod -Uri "$baseUrl/rules/primary-key" -Method Post -Body $pkRule -ContentType "application/json"
    Write-Host "✅ SUCCESS: Primary key rule created" -ForegroundColor Green
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Create Field Rule
Write-Host "📝 Test 4: Creating field rule for Equipment.equipmentLevel..." -ForegroundColor Yellow
try {
    $fieldRule = @{
        entityName = "Equipment"
        fieldName = "equipmentLevel"
        ruleType = "Examples"
        parameters = @{
            values = @("site", "area", "workCenter", "unit", "processCell")
        }
    } | ConvertTo-Json -Depth 3

    $result = Invoke-RestMethod -Uri "$baseUrl/rules/field" -Method Post -Body $fieldRule -ContentType "application/json"
    Write-Host "✅ SUCCESS: Field rule created" -ForegroundColor Green
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Generate Test Data
Write-Host "🎲 Test 5: Generating test data..." -ForegroundColor Yellow
try {
    $dataRequest = @{
        rootEntityName = "Equipment"
        includedRelatedEntities = @("Equipment Property")
        instanceCount = 5
        seed = 42
        maxDepth = 2
        primaryKeyRules = @(
            @{
                entityName = "Equipment"
                formatTemplate = "EQ-{Seq:0000}"
                useSequence = $true
                startingSequence = 1
                sequencePadding = 4
                fieldNames = @("id")
            }
        )
        fieldRules = @(
            @{
                entityName = "Equipment"
                fieldName = "equipmentLevel"
                ruleType = "Examples"
                parameters = @{
                    values = @("site", "area", "workCenter")
                }
            }
        )
    } | ConvertTo-Json -Depth 5

    $response = Invoke-RestMethod -Uri "$baseUrl/datageneration/generate-data" -Method Post -Body $dataRequest -ContentType "application/json"
    Write-Host "✅ SUCCESS: Generated $($response.totalInstancesGenerated) total instances" -ForegroundColor Green
    Write-Host "   Entities generated:" -ForegroundColor Gray
    foreach ($entity in $response.generatedData.PSObject.Properties) {
        Write-Host "   - $($entity.Name): $($entity.Value.Count) instances" -ForegroundColor Gray
    }
    Write-Host "   Mapping entries: $($response.mappingFile.mappings.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Get entity graph
Write-Host "🕸 Test 6: Getting Equipment relationship graph..." -ForegroundColor Yellow
try {
    $graph = Invoke-RestMethod -Uri "$baseUrl/entities/Equipment/graph?maxDepth=2" -Method Get
    Write-Host "✅ SUCCESS: Graph contains $($graph.PSObject.Properties.Count) entities" -ForegroundColor Green
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ API Testing Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Swagger UI: http://localhost:5000/swagger" -ForegroundColor Cyan
Write-Host "📖 API Docs: See BACKEND_COMPLETE.md" -ForegroundColor Cyan
