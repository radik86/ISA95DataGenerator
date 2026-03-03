# 🚀 Quick Start Guide - ISA-95 Test Data Generator

## ⚡ 3-Step Setup

### 1️⃣ Start Backend
```powershell
cd ISA95DataGenerator.API
dotnet run
```
✅ Backend running at: **http://localhost:5000**
✅ Swagger UI: **http://localhost:5000/swagger**

### 2️⃣ Start Frontend (in new terminal)
```powershell
cd frontend
npm run dev
```
✅ Frontend running at: **http://localhost:5173**

### 3️⃣ Open Browser
Navigate to: **http://localhost:5173**

---

## 📖 Quick Tutorial (5 minutes)

### Step 1: Browse Entities
1. Click **"Entity Browser"** in sidebar
2. Select **"Equipment"** from entity list
3. See the relationship graph
4. Click **ℹ️ icon** on any node to view properties

### Step 2: Create Primary Key Rule
1. Click **"PK Rules"** in sidebar
2. Select **"Equipment"** from dropdown
3. Select PK field: **"id"**
4. Enter format template: `EQ-{Seq:0000}`
5. Check **"Use Sequence"**
6. Set starting sequence: **1**, padding: **4**
7. Preview shows: `EQ-0001`
8. Click **"Apply Rule"**

### Step 3: Create Field Rule
1. Click **"Field Rules"** in sidebar
2. Select entity: **"Equipment"**
3. Select field: **"equipmentLevel"**
4. Choose rule type: **"Examples"**
5. Add example values:
   - `site`
   - `area`
   - `workCenter`
   - `unit`
6. Click **"Apply Field Rule"**

### Step 4: Generate Test Data
1. Click **"Generate Data"** in sidebar
2. Select root entity: **"Equipment"**
3. Select related entities: **"Equipment Property"**
4. Set instance count: **10**
5. Set seed: **42** (for reproducible results)
6. Click **"Generate Data"**
7. View results in **JSON**, **Table**, or **Mapping** tabs
8. Click **"Download ZIP"** to get all files

---

## 🎯 What You Just Created

✅ **10 Equipment instances** with deterministic IDs (`EQ-0001`, `EQ-0002`, ...)
✅ **equipmentLevel** values randomly picked from your examples
✅ **Related Equipment Property** instances with referential integrity
✅ **Mapping file** showing all relationships
✅ **ZIP download** ready for testing

---

## 🔑 Key Features

### Entity Browser
- 🔍 Search through 150+ ISA-95 entities
- 📊 Interactive graph visualization
- 📋 Detailed property tables with constraints
- 🔗 Relationship explorer

### PK Rule Builder
- 🔑 Single or composite keys
- 🎯 Format templates with placeholders
- 🔢 Auto-incrementing sequences
- 👀 Live preview
- 📦 Bulk apply to all entities

### Field Rule Editor
- 📏 **Range**: Min/max numeric values
- 📝 **Examples**: Pick from list
- 🔤 **Pattern**: Regex generation
- 📌 **Static**: Fixed value
- ➕ **Sequence**: Auto-increment

### Data Generation
- 🌳 Recursive relationship traversal
- 🎲 Deterministic with seed
- 🔗 Referential integrity
- 🚫 Cycle prevention
- 📦 ZIP download with mapping

---

## 🛠 Troubleshooting

### Backend Not Starting
```powershell
# Check .NET SDK
dotnet --version  # Should be 9.0+

# Rebuild solution
dotnet build ISA95DataGenerator.sln
```

### Frontend Not Starting
```powershell
# Reinstall dependencies
cd frontend
rm -r node_modules
npm install
```

### CORS Errors
Backend CORS is configured for:
- `http://localhost:3000`
- `http://localhost:5173`

If using different port, update `Program.cs`:
```csharp
policy.WithOrigins("http://localhost:YOUR_PORT")
```

### Graph Not Rendering
1. Check browser console for errors
2. Ensure entity has relationships
3. Try different entity (e.g., "Equipment")
4. Clear browser cache

### No Data Generated
1. Check backend is running (http://localhost:5000/swagger)
2. Define at least one PK rule
3. Check browser network tab for errors
4. Verify ISA-95 JSON files exist in `InbuiltEntitiesDTDL/`

---

## 📚 Next Steps

1. **Explore More Entities**
   - Try: Material, Personnel, Equipment Property, Work Order

2. **Create Complex Rules**
   - Composite primary keys
   - Range rules for numeric fields
   - Pattern rules for formatted strings

3. **Generate Larger Datasets**
   - Increase instance count to 100+
   - Include more related entities
   - Experiment with different seeds

4. **Export Your Data**
   - Download ZIP with all generated JSON
   - Use mapping file for integration
   - Import into your test environment

5. **Run Mappings in Microsoft Fabric (PySpark)**
   - Use notebook: `templates/fabric/ISA95_Fabric_Migration.ipynb`
   - Use runner script: `templates/fabric/isa95_pyspark_migration.py`
   - Follow setup guide: `templates/fabric/FABRIC_PYSPARK_MIGRATION.md`
   - Input is the same exported mapping JSON from Data Migration UI

---

## 🎓 Advanced Tips

### Deterministic Generation
Same seed + same rules = same data every time
```
Seed: 42 → Equipment IDs: EQ-0001, EQ-0002, EQ-0003...
```

### Composite Keys
Format template: `{field1}-{field2}-{Seq:0000}`
Example: `SITE-AREA-0001`

### Relationship Depth
- Depth 1: Only direct relationships
- Depth 2: Relationships of relationships
- Depth 3+: Deeper traversal (watch for cycles!)

### Field Rules Priority
1. Field Rules (if defined)
2. Primary Key Rules (for PK fields)
3. Default generators (random values)

---

## 📞 Support

- **Documentation**: See `COMPLETE_SOLUTION.md`
- **API Docs**: http://localhost:5000/swagger
- **Backend Details**: `BACKEND_COMPLETE.md`
- **Frontend Details**: `frontend/FRONTEND_README.md`
- **Test Script**: `test-api.ps1`

---

## ✅ Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Can browse entities in UI
- [ ] Can create PK rules
- [ ] Can create field rules
- [ ] Can generate data
- [ ] Can download ZIP
- [ ] All tabs working (JSON/Table/Mapping)

---

**Ready to go! 🎉**

Open **http://localhost:5173** and start exploring!
