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
      id: r.id,
      name: r.name,
      location: r.location || '',
      description: r.description || '',
    }));
  }

  parseProductionLines(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.id,
      plantId: r.plantId,
      name: r.name,
      description: r.description || '',
    }));
  }

  parseLineEquipment(csvText: string): any[] {
    const records = this.parseCSV(csvText);
    return records.map(r => ({
      id: r.id,
      productionLineId: r.productionLineId,
      equipmentId: r.equipmentId,
      sequence: parseInt(r.sequence) || 0,
      description: r.description || '',
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
}

export const csvParser = new CSVParser();
