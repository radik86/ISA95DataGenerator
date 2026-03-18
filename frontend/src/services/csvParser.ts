// CSV Parser for Master Data Import

export interface ParsedCSVData {
  materialClasses?: any[];
  materials?: any[];
  materialLots?: any[];
  materialClassProperties?: any[];
  materialClassPropertiesAssignments?: any[];
  materialDefinitionProperties?: any[];
  materialDefinitionPropertyAssignments?: any[];
  equipmentClasses?: any[];
  equipment?: any[];
  equipmentProperties?: any[];
  equipmentPropertyAssignments?: any[];
  processSegments?: any[];
  segmentBOMs?: any[];
  maintenanceBOMs?: any[];
  equipmentUsages?: any[];
  plants?: any[];
  productionLines?: any[];
  lineEquipment?: any[];
  operationEventDefinitions?: any[];
  operationEventDefSegmentAssignments?: any[];
  operationEventDefinitionProperties?: any[];
  operationEventDefinitionPropertyAssignments?: any[];
  operationsEventClasses?: any[];
  operationsEventRecords?: any[];
  operationsEventEntries?: any[];
  hierarchyScopes?: any[];
  hierarchyScopesFlat?: any[];
  shifts?: any[];
  crews?: any[];
  shiftCrewAssignments?: any[];
  personClasses?: any[];
  personnelCapabilities?: any[];
  employees?: any[];
  equipmentClassProperties?: any[];
  equipmentClassPropertiesAssignments?: any[];
}

class CSVParser {
  parseCSV(csvText: string): any[] {
    // Normalize line endings - replace CRLF with LF
    const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.trim().split('\n');
    
    console.log('[CSV Parser] Total lines:', lines.length);
    
    if (lines.length < 2) {
      console.log('[CSV Parser] Not enough lines');
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/\r/g, ''));
    console.log('[CSV Parser] Headers:', headers);
    
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      console.log(`[CSV Parser] Line ${i} values:`, values, 'length:', values.length, 'headers length:', headers.length);
      
      if (values.length === headers.length) {
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = values[index];
        });
        if (i === 1) {
          console.log('[CSV Parser] First record:', record);
        }
        records.push(record);
      } else {
        console.log(`[CSV Parser] Skipping line ${i} - length mismatch: ${values.length} vs ${headers.length}`);
      }
    }

    console.log('[CSV Parser] Total records parsed:', records.length);
    return records;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  parseMaterialClasses(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.MaterialClassID,
      name: r.MaterialClassName,
      description: r.Description || '',
    }));
  }

  parseMaterials(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.MaterialID,
      name: r.MaterialName,
      classId: r.MaterialClassID,
      className: r.MaterialClass,
      defaultUoM: r.DefaultUoM,
      description: r.Description || '',
    }));
  }

  parseMaterialLots(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.MaterialLotID,
      materialId: r.MaterialID,
      lotQuantity: parseFloat(r.LotQuantity) || 0,
      lotUoM: r.LotUoM,
      receivedDateTime: r.ReceivedDateTime || undefined,
      producedDateTime: r.ProducedDateTime || undefined,
      supplierOrProducerId: r.SupplierOrProducerID || undefined,
      supplierOrProducerName: r.SupplierOrProducerName || undefined,
      producedByProcessSegmentId: r.ProducedByProcessSegmentID || undefined,
    }));
  }

  parseMaterialDefinitionProperties(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    console.log('Parsing material definition properties, raw records:', records.length);
    
    // Filter out empty rows (where id field is empty or whitespace-only)
    const validRecords = records.filter(r => {
      const id = r.id || r.Id || r.ID || '';
      return id.trim().length > 0;
    });
    console.log('Valid records after filtering empty rows:', validRecords.length);
    
    const parsed = validRecords.map((r, index) => {
      // Try all possible key variations
      const id = r.id || r.Id || r.ID;
      const value = r.Value || r.value;
      const description = r.Description || r.description || '';
      const valueUnitOfMeasure = r.ValueUnitOfMeasure || r.valueUnitOfMeasure || '';
      
      return {
        id,
        value,
        description,
        valueUnitOfMeasure,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
    });
    console.log('Parsed material definition properties:', parsed.length);
    return parsed;
  }

  parseMaterialClassProperties(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.MaterialClassPropertyId || r.id || '',
      propertyName: r.PropertyName || '',
      description: r.Description || '',
      valueDataType: r.ValueDataType || '',
      unit: r.Unit || '',
      minValue: r.MinValue || '',
      maxValue: r.MaxValue || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    })).filter(r => r.id.trim().length > 0);
  }

  parseMaterialClassPropertiesAssignments(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map((r, index) => {
      const materialClassPropertyId = r.MaterialClassPropertyId || '';
      const materialDefinitionPropertyId = r.MaterialDefinitionPropertyId || '';
      const generatedId = `${materialClassPropertyId}_${materialDefinitionPropertyId}`;
      return {
        id: generatedId || `MCPA-${index + 1}`,
        materialClassPropertyId,
        materialDefinitionPropertyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
    }).filter(r => r.materialClassPropertyId.trim().length > 0 && r.materialDefinitionPropertyId.trim().length > 0);
  }

  parseMaterialDefinitionPropertyAssignments(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    console.log('Parsing material definition property assignments, raw records:', records.length);
    
    // Filter out empty rows (where PK field is empty or whitespace-only)
    const validRecords = records.filter(r => {
      const pk = r.PK || r.pk || r.id || r.Id || r.ID || '';
      return pk.toString().trim().length > 0;
    });
    console.log('Valid records after filtering empty rows:', validRecords.length);
    
    const parsed = validRecords.map((r, index) => {
      // PK is the unique primary key for the record
      const pk = r.PK || r.pk || `${index + 1}`;
      // Id is the property identifier (can be duplicated across different material definitions)
      const id = r.Id || r.id || r.ID || pk;
      const propertyId = r.MaterialDefinitionPropertyId || r.materialDefinitionPropertyId || id;
      const materialDefinitionId = r.MaterialDefinitionId || r.materialDefinitionId;
      const value = r.Value || r.value;
      const description = r.Description || r.description || '';
      const valueUnitOfMeasure = r.ValueUnitOfMeasure || r.valueUnitOfMeasure || '';
      
      return {
        pk: pk.toString(),
        id: id.toString(),
        materialDefinitionPropertyId: propertyId,
        materialDefinitionId,
        value,
        description,
        valueUnitOfMeasure,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
    });
    console.log('Parsed material definition property assignments:', parsed.length);
    return parsed;
  }

  parseEquipmentClasses(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => {
      const id = r.EquipmentClassID || r['EquipmentClassID'] || '';
      if (!id) {
        console.error('Equipment class record missing ID:', r);
        throw new Error('Equipment class record missing EquipmentClassID');
      }
      return {
        id: id,
        name: r.EquipmentClassName || r['EquipmentClassName'] || '',
        description: r.Description || r['Description'] || '',
        parentId: r.EquipmentClassParentID || r['EquipmentClassParentID'] || '',
      };
    }).filter(record => record.id); // Filter out records with empty IDs
  }

  parseEquipment(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.EquipmentID,
      name: r.EquipmentName || r.EquipmentID,
      classId: r.EquipmentClassID,
      className: r.EquipmentClass,
      description: r.EquipmentDescription || '',
      parentEquipmentId: r.EquipmentParentId || '',
    }));
  }

  parseProcessSegments(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.ProcessSegmentID,
      productMaterialId: r.ProductMaterialID,
      name: r.ProcessSegmentName,
      sequence: parseInt(r.Sequence ?? r.Seq) || 0,
      durationHours: parseFloat(r.DurationHours ?? r.SegmentDurationHours) || 0,
    }));
  }

  parseSegmentBOMs(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.BOMLineID,
      processSegmentId: r.ProcessSegmentID,
      materialId: r.MaterialID,
      qtyPerUnit: parseFloat(r.MaterialQtyPerUnit) || 0,
      uom: r.MaterialUoM,
      materialUse: r.MaterialUse || 'CONSUME',
    }));
  }

  parseMaintenanceBOMs(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map((r, index) => ({
      id: r.MaintenanceBOMID || `MBOM-${index + 1}`,
      equipmentId: r.EquipmentID,
      processSegmentId: r.ProcessSegmentID,
      processSegmentSequence: parseInt(r.ProcessSegmentSequence) || 0,
      materialId: r.MaterialID,
      qtyPerUnit: parseFloat(r.QtyPerUnit) || 0,
      personQuantity: parseFloat(r.PersonQuantity) || 0,
      personQuantityUoM: (r.PersonQuantityUoM === 'FTE' ? 'FTE' : 'Person'),
      employeeId: r.EmployeeID || '',
      personClassId: r.PersonClassID || '',
      uom: r.UoM || 'EA',
      materialUse: r.MaterialUse || 'CONSUME',
    }));
  }

  parseEquipmentUsages(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.EquipmentUsageID,
      processSegmentId: r.ProcessSegmentID,
      equipmentId: r.EquipmentID,
      role: r.EquipmentRole,
      capacityPerRun: parseInt(r.CapacityPerRunEA) || 0,
    }));
  }

  parsePlants(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.PlantID,
      name: r.PlantName,
      location: r.Location || '',
      description: r.Description || '',
    }));
  }

  parseProductionLines(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.LineID,
      plantId: r.PlantID,
      name: r.LineName,
      description: r.Description || '',
    }));
  }

  parseLineEquipment(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.LineEquipmentID,
      productionLineId: r.LineID,
      equipmentId: r.EquipmentID,
      sequence: parseInt(r.Sequence) || 0,
      description: r.Role || '',
      plantId: r.PlantID || '',
    }));
  }

  parseEquipmentProperties(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    console.log('Parsing equipment properties, raw records:', records.length);
    console.log('First raw record:', records[0]);
    const parsed = records.map((r, index) => {
      // Keep minValue and maxValue as strings - backend expects string type
      const prop = {
        id: r.EquipmentPropertyID,
        name: r.PropertyName,
        description: r.Description || '',
        valueDataType: r.ValueDataType,
        unit: r.Unit || '',
        minValue: r.MinValue || undefined,
        maxValue: r.MaxValue || undefined,
      };
      if (!prop.id) {
        console.error(`Record ${index} missing id:`, r);
      }
      return prop;
    });
    console.log('Parsed equipment properties:', parsed);
    return parsed;
  }

  parseEquipmentPropertyAssignments(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.EquipmentPropertyAssignmentID,
      equipmentId: r.EquipmentID,
      processSegmentId: r.ProcessSegmentID,
      equipmentPropertyId: r.EquipmentPropertyID,
      samplingMode: r.SamplingMode,
      samplingIntervalSeconds: r.SamplingIntervalSeconds ? parseInt(r.SamplingIntervalSeconds) : undefined,
    }));
  }

  parseOperationEventDefinitions(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    console.log('[CSV Parser] Parsing operation event definitions, total records:', records.length);
    if (records.length > 0) {
      const first = records[0];
      console.log('[CSV Parser] First record ALL fields:', first);
      console.log('[CSV Parser] First record CausesDowntime:', {
        value: first.CausesDowntime,
        type: typeof first.CausesDowntime,
        length: first.CausesDowntime?.length,
        charCodes: first.CausesDowntime ? Array.from(first.CausesDowntime).map((c: string) => c.charCodeAt(0)) : [],
        equals_TRUE: first.CausesDowntime === 'TRUE',
        equals_True: first.CausesDowntime === 'True',
        equals_true: first.CausesDowntime === 'true',
        equals_FALSE: first.CausesDowntime === 'FALSE',
      });
      console.log('[CSV Parser] First record CausesScrap:', {
        value: first.CausesScrap,
        type: typeof first.CausesScrap,
        length: first.CausesScrap?.length,
        charCodes: first.CausesScrap ? Array.from(first.CausesScrap).map((c: string) => c.charCodeAt(0)) : [],
        equals_TRUE: first.CausesScrap === 'TRUE',
        equals_False: first.CausesScrap === 'FALSE',
      });
    }
    const parsed = records.map(r => {
      const causesDowntime = r.CausesDowntime === 'TRUE' || r.CausesDowntime === 'True' || r.CausesDowntime === 'true' || r.CausesDowntime === true;
      const causesScrap = r.CausesScrap === 'TRUE' || r.CausesScrap === 'True' || r.CausesScrap === 'true' || r.CausesScrap === true;
      return {
        id: r.OperationsEventDefinitionID,
        eventCategory: r.EventCategory,
        eventCode: r.EventCode,
        description: r.Description,
        causesDowntime,
        causesScrap,
        rootCauseType: r.RootCauseType,
        eventType: r.EventType || 'Alarm',
      };
    });
    console.log('[CSV Parser] First parsed record:', parsed[0]);
    console.log('[CSV Parser] Sample of events with causesScrap=true:', parsed.filter(p => p.causesScrap).slice(0, 3).map(p => p.eventCode));
    console.log('[CSV Parser] Sample of events with causesDowntime=true:', parsed.filter(p => p.causesDowntime).slice(0, 3).map(p => p.eventCode));
    return parsed;
  }

  parseOperationEventDefSegmentAssignments(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.OperationsEventDefSegAssignID,
      operationsEventDefinitionId: r.OperationsEventDefinitionID,
      processSegmentId: r.ProcessSegmentID,
      startOrEndEvent: r.StartOrEndEvent || 'Start',
      isMandatory: r.IsMandatory === 'TRUE' || r.IsMandatory === 'true' || r.IsMandatory === 'True',
      isPrimarySegment: r.IsPrimarySegment === 'TRUE' || r.IsPrimarySegment === 'true' || r.IsPrimarySegment === 'True',
      notes: r.Notes,
    }));
  }

  parseOperationEventDefinitionProperties(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.OperationsEventDefinitionPropertyId,
      possibleValues: r.PossibleValues,
      valueUnitOfMeasure: r.valueUnitOfMeasure,
    }));
  }

  parseOperationEventDefinitionPropertyAssignments(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: `${r.OperationsEventDefinitionID}-${r.OperationsEventDefinitionPropertyId}`,
      operationsEventDefinitionId: r.OperationsEventDefinitionID,
      operationsEventDefinitionPropertyId: r.OperationsEventDefinitionPropertyId,
      value: r.Value,
      valueUnitOfMeasure: r.valueUnitOfMeasure,
    }));
  }

  parseOperationsEventClasses(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      OperationsEventClassID: r.OperationsEventClassID,
      ClassName: r.ClassName,
      Description: r.Description,
    }));
  }

  parseOperationsEventRecords(csvText: string): any[] {
    console.log('[parseOperationsEventRecords] CSV text length:', csvText?.length);
    console.log('[parseOperationsEventRecords] First 200 chars:', csvText?.substring(0, 200));
    const records = this.parseCSV(csvText);
    console.log('[CSV Parser] Operations Event Records - Raw records:', records.length);
    if (records.length > 0) {
      console.log('[CSV Parser] Operations Event Records - Sample:', records[0]);
    }
    const mapped = records.map(r => ({
      id: r.OperationsEventRecordID,
      OperationsEventRecordID: r.OperationsEventRecordID,
      OperationsEventDefinitionID: r.OperationsEventDefinitionID,
      Severity: r.Severity,
      Status: r.Status,
      Comments: r.Comments,
    }));
    console.log('[parseOperationsEventRecords] Mapped records:', mapped.length);
    if (mapped.length > 0) {
      console.log('[parseOperationsEventRecords] First mapped record:', mapped[0]);
    }
    return mapped;
  }

  parseOperationsEventEntries(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    console.log('[CSV Parser] Operations Event Entries - Raw records:', records.length);
    if (records.length > 0) {
      console.log('[CSV Parser] Operations Event Entries - Sample:', records[0]);
    }
    return records.map(r => ({
      id: r.OperationsEventEntryID,
      OperationsEventEntryID: r.OperationsEventEntryID,
      OperationsEventRecordID: r.OperationsEventRecordID,
      EntryType: r.EntryType,
      Description: r.Description,
    }));
  }

  parseHierarchyScopes(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    console.log('[CSV Parser] Hierarchy Scopes - Sample record:', records[0]);
    return records.map(r => {
      const id = r.HierarchyScopeID || r.ID || r.id || r.hierarchyScopeID;
      if (!id) {
        console.error('[CSV Parser] Missing ID in hierarchy scope record:', r);
      }
      return {
        id: id,
        equipmentID: r.EquipmentID || r.equipmentID,
        equipmentLevel: r.EquipmentLevel || r.equipmentLevel,
      };
    });
  }

  parseHierarchyScopesFlat(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    console.log('[CSV Parser] Hierarchy Scopes Flat - Sample record:', records[0]);
    
    // Generate unique IDs for each record based on the combination of all levels
    return records.map((r, index) => {
      return {
        id: `HS-FLAT-${String(index + 1).padStart(4, '0')}`,
        Enterprise: r.Enterprise || '',
        Site: r.Site || '',
        Area: r.Area || '',
        'Work Center': r['Work Center'] || r.WorkCenter || '',
        'Work Unit': r['Work Unit'] || r.WorkUnit || '',
        'Process Cell': r['Process Cell'] || r.ProcessCell || '',
        Unit: r.Unit || '',
        'Production Line': r['Production Line'] || r.ProductionLine || '',
        'Production Unit': r['Production Unit'] || r.ProductionUnit || '',
        'Work Cell': r['Work Cell'] || r.WorkCell || '',
        'Storage Zone': r['Storage Zone'] || r.StorageZone || '',
        'Storage Unit': r['Storage Unit'] || r.StorageUnit || '',
      };
    });
  }

  parseEquipmentClassProperties(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.EquipmentClassPropertyId,
      equipmentClassId: r.EquipmentClassId,
      propertyName: r.PropertyName,
      description: r.Description || '',
      valueDataType: r.ValueDataType || '',
      unit: r.Unit || '',
      minValue: r.MinValue || '',
      maxValue: r.MaxValue || '',
    }));
  }

  parseEquipmentClassPropertiesAssignments(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: `${r.EquipmentClassPropertyId || ''}_${r.EquipmentPropertyId || ''}`,
      equipmentClassPropertyId: r.EquipmentClassPropertyId,
      equipmentPropertyId: r.EquipmentPropertyId,
    }));
  }

  async parseAllFromFiles(files: {
    materialClasses?: File;
    materials?: File;
    equipmentClasses?: File;
    equipment?: File;
    processSegments?: File;
    segmentBOMs?: File;
    equipmentUsages?: File;
  }): Promise<ParsedCSVData> {
    const result: ParsedCSVData = {};

    if (files.materialClasses) {
      const text = await this.readFile(files.materialClasses);
      result.materialClasses = this.parseMaterialClasses(text);
    }

    if (files.materials) {
      const text = await this.readFile(files.materials);
      result.materials = this.parseMaterials(text);
    }

    if (files.equipmentClasses) {
      const text = await this.readFile(files.equipmentClasses);
      result.equipmentClasses = this.parseEquipmentClasses(text);
    }

    if (files.equipment) {
      const text = await this.readFile(files.equipment);
      result.equipment = this.parseEquipment(text);
    }

    if (files.processSegments) {
      const text = await this.readFile(files.processSegments);
      result.processSegments = this.parseProcessSegments(text);
    }

    if (files.segmentBOMs) {
      const text = await this.readFile(files.segmentBOMs);
      result.segmentBOMs = this.parseSegmentBOMs(text);
    }

    if (files.equipmentUsages) {
      const text = await this.readFile(files.equipmentUsages);
      result.equipmentUsages = this.parseEquipmentUsages(text);
    }

    return result;
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // Export to CSV
  exportToCSV(data: any[], headers: string[]): string {
    const rows = [headers.join(',')];
    
    data.forEach(record => {
      const values = headers.map(header => {
        const value = record[header] || '';
        // Escape values with commas or quotes
        if (value.toString().includes(',') || value.toString().includes('"')) {
          return `"${value.toString().replace(/"/g, '""')}"`;
        }
        return value;
      });
      rows.push(values.join(','));
    });

    return rows.join('\n');
  }

  parseShifts(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.ShiftID,
      shiftNumber: parseInt(r.ShiftNumber) || 1,
      shiftName: r.ShiftName || '',
      startTime: r.StartTime || '',
      endTime: r.EndTime || '',
      description: r.Description || '',
    }));
  }

  parseCrews(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.CrewID,
      crewName: r.CrewName || '',
      peopleCount: parseInt(r.PeopleCount) || 0,
      skills: r.Skills || '',
      description: r.Description || '',
    }));
  }

  parseShiftCrewAssignments(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.AssignmentID,
      shiftId: r.ShiftID || '',
      crewId: r.CrewID || '',
      effectiveDate: r.EffectiveDate || '',
      expiryDate: r.ExpiryDate || '',
    }));
  }

  parsePersonClasses(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.PersonClassID || '',
      name: r.PersonClassName || '',
      description: r.Description || '',
    }));
  }

  parsePersonnelCapabilities(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.PersonnelCapabilityID || '',
      capabilityName: r.CapabilityName || '',
      description: r.Description || '',
    }));
  }

  parseEmployees(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.EmployeeID || '',
      employeeName: r.EmployeeName || '',
      personClassId: r.PersonClassID || '',
      personnelCapabilityId: r.PersonnelCapabilityID || '',
      email: r.Email || '',
      phoneNumber: r.PhoneNumber || '',
      description: r.Description || '',
    }));
  }
}

export const csvParser = new CSVParser();
