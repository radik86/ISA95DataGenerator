# Material Definition Property Implementation - Remaining Tasks

## ✅ Completed:
1. ✅ Added MaterialDefinitionProperty and MaterialDefinitionPropertyAssignment interfaces to masterDataDB.ts
2. ✅ Added database stores to IndexedDB schema (version 12)
3. ✅ Added state management in MasterDataManager
4. ✅ Added tabs for the two new tables
5. ✅ Added save/delete handlers
6. ✅ Added basic table views
7. ✅ Added import support to masterDataDB.ts

## ⏳ Remaining Tasks:

### 1. Add Edit/Create Dialogs in MasterDataManager.tsx

Add these dialogs before the closing `</Box>` in the MasterDataManager component (around line 6500):

```tsx
{/* Material Definition Property Dialog */}
<Dialog open={materialDefinitionPropertyDialog} onClose={() => setMaterialDefinitionPropertyDialog(false)} maxWidth="md" fullWidth>
  <DialogTitle>
    {editingMaterialDefinitionProperty ? 'Edit Material Definition Property' : 'Add Material Definition Property'}
  </DialogTitle>
  <DialogContent>
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="ID"
          defaultValue={editingMaterialDefinitionProperty?.id || ''}
          onChange={(e) => {
            if (editingMaterialDefinitionProperty) {
              setEditingMaterialDefinitionProperty({ ...editingMaterialDefinitionProperty, id: e.target.value });
            }
          }}
          disabled={!!editingMaterialDefinitionProperty}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Value"
          defaultValue={editingMaterialDefinitionProperty?.value || ''}
          onChange={(e) => {
            if (editingMaterialDefinitionProperty) {
              setEditingMaterialDefinitionProperty({ ...editingMaterialDefinitionProperty, value: e.target.value });
            }
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          defaultValue={editingMaterialDefinitionProperty?.description || ''}
          multiline
          rows={2}
          onChange={(e) => {
            if (editingMaterialDefinitionProperty) {
              setEditingMaterialDefinitionProperty({ ...editingMaterialDefinitionProperty, description: e.target.value });
            }
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Unit of Measure"
          defaultValue={editingMaterialDefinitionProperty?.valueUnitOfMeasure || ''}
          onChange={(e) => {
            if (editingMaterialDefinitionProperty) {
              setEditingMaterialDefinitionProperty({ ...editingMaterialDefinitionProperty, valueUnitOfMeasure: e.target.value });
            }
          }}
        />
      </Grid>
    </Grid>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setMaterialDefinitionPropertyDialog(false)}>Cancel</Button>
    <Button
      variant="contained"
      onClick={() => {
        const formData = editingMaterialDefinitionProperty || {
          id: (document.querySelector('[label="ID"]') as HTMLInputElement)?.value,
          value: (document.querySelector('[label="Value"]') as HTMLInputElement)?.value,
          description: (document.querySelector('[label="Description"]') as HTMLTextAreaElement)?.value,
          valueUnitOfMeasure: (document.querySelector('[label="Unit of Measure"]') as HTMLInputElement)?.value,
        };
        handleSaveMaterialDefinitionProperty(formData as MaterialDefinitionProperty);
      }}
    >
      Save
    </Button>
  </DialogActions>
</Dialog>

{/* Material Definition Property Assignment Dialog */}
<Dialog open={materialDefinitionPropertyAssignmentDialog} onClose={() => setMaterialDefinitionPropertyAssignmentDialog(false)} maxWidth="md" fullWidth>
  <DialogTitle>
    {editingMaterialDefinitionPropertyAssignment ? 'Edit Material Definition Property Assignment' : 'Add Material Definition Property Assignment'}
  </DialogTitle>
  <DialogContent>
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="ID"
          defaultValue={editingMaterialDefinitionPropertyAssignment?.id || ''}
          onChange={(e) => {
            if (editingMaterialDefinitionPropertyAssignment) {
              setEditingMaterialDefinitionPropertyAssignment({ ...editingMaterialDefinitionPropertyAssignment, id: e.target.value });
            }
          }}
          disabled={!!editingMaterialDefinitionPropertyAssignment}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Material Definition ID</InputLabel>
          <Select
            value={editingMaterialDefinitionPropertyAssignment?.materialDefinitionId || ''}
            label="Material Definition ID"
            onChange={(e) => {
              if (editingMaterialDefinitionPropertyAssignment) {
                setEditingMaterialDefinitionPropertyAssignment({ ...editingMaterialDefinitionPropertyAssignment, materialDefinitionId: e.target.value });
              }
            }}
          >
            {materials.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name} ({m.id})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Property</InputLabel>
          <Select
            value={editingMaterialDefinitionPropertyAssignment?.value || ''}
            label="Property"
            onChange={(e) => {
              const selectedProp = materialDefinitionProperties.find(p => p.id === e.target.value);
              if (editingMaterialDefinitionPropertyAssignment && selectedProp) {
                setEditingMaterialDefinitionPropertyAssignment({ 
                  ...editingMaterialDefinitionPropertyAssignment, 
                  value: selectedProp.value,
                  description: selectedProp.description,
                  valueUnitOfMeasure: selectedProp.valueUnitOfMeasure
                });
              }
            }}
          >
            {materialDefinitionProperties.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.id} - {p.description}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Value"
          value={editingMaterialDefinitionPropertyAssignment?.value || ''}
          disabled
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          value={editingMaterialDefinitionPropertyAssignment?.description || ''}
          disabled
          multiline
          rows={2}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Unit of Measure"
          value={editingMaterialDefinitionPropertyAssignment?.valueUnitOfMeasure || ''}
          disabled
        />
      </Grid>
    </Grid>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setMaterialDefinitionPropertyAssignmentDialog(false)}>Cancel</Button>
    <Button
      variant="contained"
      onClick={() => {
        if (editingMaterialDefinitionPropertyAssignment) {
          handleSaveMaterialDefinitionPropertyAssignment(editingMaterialDefinitionPropertyAssignment);
        }
      }}
    >
      Save
    </Button>
  </DialogActions>
</Dialog>
```

### 2. Add Template Loader Support

In the `handleLoadTemplates` function (around line 1200), add loading for the two new CSV files:

```typescript
// In the templateLoader.loadAllTemplates() call:
const templates = await templateLoader.loadAllTemplates(); // This should already load all CSVs

// Make sure templateLoader.ts includes:
materialDefinitionProperties: await this.parseCSV<MaterialDefinitionPropertyRecord>('/templates/masterdata/material_definition_property_template.csv', this.parseMaterialDefinitionProperty.bind(this)),
materialDefinitionPropertyAssignments: await this.parseCSV<MaterialDefinitionPropertyAssignmentRecord>('/templates/masterdata/material_definition_property_assignment_template.csv', this.parseMaterialDefinitionPropertyAssignment.bind(this)),
```

### 3. Add CSV Export Support

In the `handleExportAll` and `handleExportAllToFolder` functions, add export for the new tables:

```typescript
// Material Definition Properties
const mdpHeaders = 'id,Value,Description,ValueUnitOfMeasure';
const mdpRows = materialDefinitionProperties.map(mdp => 
  `${mdp.id},${mdp.value},${mdp.description},${mdp.valueUnitOfMeasure}`
).join('\\n');
const mdpCsv = `${mdpHeaders}\\n${mdpRows}`;

// Material Definition Property Assignments
const mdpaHeaders = 'id,MaterialDefinitionId,Value,Description,ValueUnitOfMeasure';
const mdpaRows = materialDefinitionPropertyAssignments.map(mdpa => 
  `${mdpa.id},${mdpa.materialDefinitionId},${mdpa.value},${mdpa.description},${mdpa.valueUnitOfMeasure}`
).join('\\n');
const mdpaCsv = `${mdpaHeaders}\\n${mdpaRows}`;
```

### 4. Add to Data Migration Sources (DataMigration.tsx)

In the `loadSourceData` function (around line 2835), add mapping:

```typescript
const masterStoreMap: { [key: string]: string } = {
  'material_classes': 'materialClasses',
  'materials': 'materials',
  'material_lots': 'materialLots',
  'material_sublots': 'materialSublots',
  'material_definition_properties': 'materialDefinitionProperties',
  'material_definition_property_assignments': 'materialDefinitionPropertyAssignments',
  // ... rest of mappings
};
```

In the tables array (around line 448), add:

```typescript
{
  name: 'material_definition_properties',
  rowCount: materialDefinitionProperties.length,
  columns: [
    { name: 'id', type: 'string', sample: materialDefinitionProperties[0]?.id },
    { name: 'value', type: 'string', sample: materialDefinitionProperties[0]?.value },
    { name: 'description', type: 'string', sample: materialDefinitionProperties[0]?.description },
    { name: 'valueUnitOfMeasure', type: 'string', sample: materialDefinitionProperties[0]?.valueUnitOfMeasure },
  ],
},
{
  name: 'material_definition_property_assignments',
  rowCount: materialDefinitionPropertyAssignments.length,
  columns: [
    { name: 'id', type: 'string', sample: materialDefinitionPropertyAssignments[0]?.id },
    { name: 'materialDefinitionId', type: 'string', sample: materialDefinitionPropertyAssignments[0]?.materialDefinitionId },
    { name: 'value', type: 'string', sample: materialDefinitionPropertyAssignments[0]?.value },
    { name: 'description', type: 'string', sample: materialDefinitionPropertyAssignments[0]?.description },
    { name: 'valueUnitOfMeasure', type: 'string', sample: materialDefinitionPropertyAssignments[0]?.valueUnitOfMeasure },
  ],
},
```

### 5. Add to Template Loader (templateLoader.ts)

Add parser functions for the two new types:

```typescript
private parseMaterialDefinitionProperty(row: any): MaterialDefinitionPropertyRecord {
  return {
    id: row.id || '',
    value: row.Value || '',
    description: row.Description || '',
    valueUnitOfMeasure: row.ValueUnitOfMeasure || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

private parseMaterialDefinitionPropertyAssignment(row: any): MaterialDefinitionPropertyAssignmentRecord {
  return {
    id: row.id || '',
    materialDefinitionId: row.MaterialDefinitionId || '',
    value: row.Value || '',
    description: row.Description || '',
    valueUnitOfMeasure: row.ValueUnitOfMeasure || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}
```

And in loadAllTemplates:

```typescript
materialDefinitionProperties: await this.parseCSV<MaterialDefinitionPropertyRecord>('/templates/masterdata/material_definition_property_template.csv', this.parseMaterialDefinitionProperty.bind(this)),
materialDefinitionPropertyAssignments: await this.parseCSV<MaterialDefinitionPropertyAssignmentRecord>('/templates/masterdata/material_definition_property_assignment_template.csv', this.parseMaterialDefinitionPropertyAssignment.bind(this)),
```

## Testing Checklist:
- [ ] Create new Material Definition Property
- [ ] Edit existing Material Definition Property
- [ ] Delete Material Definition Property
- [ ] Create new Material Definition Property Assignment with dropdown selectors
- [ ] Edit existing Material Definition Property Assignment
- [ ] Delete Material Definition Property Assignment
- [ ] Export data to CSV
- [ ] Import data from CSV
- [ ] Use in Data Migration tool
- [ ] Verify database schema upgrade works

## Files Modified:
1. ✅ frontend/src/services/masterDataDB.ts
2. ✅ frontend/src/components/MasterDataManager.tsx (partially)
3. ⏳ frontend/src/services/templateLoader.ts (needs parsers)
4. ⏳ frontend/src/components/DataMigration.tsx (needs source table definitions)
