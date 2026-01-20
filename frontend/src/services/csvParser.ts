// CSV Parser for Master Data Import

export interface ParsedCSVData {
  materialClasses?: any[];
  materials?: any[];
  materialLots?: any[];
  equipmentClasses?: any[];
  equipment?: any[];
  equipmentProperties?: any[];
  equipmentPropertyAssignments?: any[];
  processSegments?: any[];
  segmentBOMs?: any[];
  equipmentUsages?: any[];
  plants?: any[];
  productionLines?: any[];
  lineEquipment?: any[];
  operationEventDefinitions?: any[];
  hierarchyScopes?: any[];
  hierarchyScopesFlat?: any[];
  shifts?: any[];
  crews?: any[];
  shiftCrewAssignments?: any[];
}

class CSVParser {
  parseCSV(csvText: string): any[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = values[index];
        });
        records.push(record);
      }
    }

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

  parseEquipmentClasses(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.EquipmentClassID,
      name: r.EquipmentClassName,
      description: r.Description || '',
    }));
  }

  parseEquipment(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.EquipmentID,
      name: r.EquipmentName || r.EquipmentID,
      classId: r.EquipmentClassID,
      className: r.EquipmentClass,
      description: r.EquipmentDescription || '',
    }));
  }

  parseProcessSegments(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.ProcessSegmentID,
      productMaterialId: r.ProductMaterialID,
      name: r.ProcessSegmentName,
      sequence: parseInt(r.Seq) || 0,
      durationHours: parseFloat(r.SegmentDurationHours) || 0,
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
      const prop = {
        id: r.EquipmentPropertyID,
        name: r.PropertyName,
        description: r.Description || '',
        valueDataType: r.ValueDataType,
        unit: r.Unit || '',
        minValue: r.MinValue ? parseFloat(r.MinValue) : undefined,
        maxValue: r.MaxValue ? parseFloat(r.MaxValue) : undefined,
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
    return records.map(r => ({
      id: r.OperationsEventDefinitionID,
      eventCategory: r.EventCategory,
      eventCode: r.EventCode,
      description: r.Description,
      causesDowntime: r.CausesDowntime === 'True' || r.CausesDowntime === 'true',
      causesScrap: r.CausesScrap === 'True' || r.CausesScrap === 'true',
      rootCauseType: r.RootCauseType,
    }));
  }

  parseOperationEventDefSegmentAssignments(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.OperationsEventDefSegAssignID,
      operationsEventDefinitionId: r.OperationsEventDefinitionID,
      processSegmentId: r.ProcessSegmentID,
      isPrimarySegment: r.IsPrimarySegment === 'True' || r.IsPrimarySegment === 'true',
      notes: r.Notes,
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
}

export const csvParser = new CSVParser();
