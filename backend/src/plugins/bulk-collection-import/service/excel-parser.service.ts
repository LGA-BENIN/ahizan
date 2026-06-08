import * as XLSX from 'xlsx';
import { ParsedExcelData, CollectionRow, FacetRow, FacetValueRow, ImportError } from '../types/import-types';

export class ExcelParserService {
  /**
   * Parse Excel file and extract collections, facets, and facet values
   */
  parseExcelFile(buffer: Buffer): { data: ParsedExcelData; errors: ImportError[] } {
    const errors: ImportError[] = [];
    const data: ParsedExcelData = {
      collections: [],
      facets: [],
      facetValues: [],
    };


    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Parse Collections sheet
      if (workbook.Sheets['Collections']) {
        const collections = this.parseSheet<CollectionRow>(workbook.Sheets['Collections'], 'Collections');
        data.collections = collections.data;
        errors.push(...collections.errors);
      } else {
        errors.push({
          row: 0,
          sheet: 'Collections',
          field: 'sheet',
          message: 'Collections sheet not found',
        });
      }

      // Parse Facets sheet
      if (workbook.Sheets['Facets']) {
        const facets = this.parseSheet<FacetRow>(workbook.Sheets['Facets'], 'Facets');
        data.facets = facets.data;
        console.log('[ExcelParserService] Parsed facets:', data.facets.map(f => ({ code: f.code, name: f.name })));
        errors.push(...facets.errors);
      } else {
        errors.push({
          row: 0,
          sheet: 'Facets',
          field: 'sheet',
          message: 'Facets sheet not found',
        });
      }

      // Parse Facet Values sheet
      if (workbook.Sheets['Facet Values']) {
        const facetValues = this.parseSheet<FacetValueRow>(workbook.Sheets['Facet Values'], 'Facet Values');
        data.facetValues = facetValues.data;
        errors.push(...facetValues.errors);
      } else {
        errors.push({
          row: 0,
          sheet: 'Facet Values',
          field: 'sheet',
          message: 'Facet Values sheet not found',
        });
      }

    } catch (error: any) {
      errors.push({
        row: 0,
        sheet: 'File',
        field: 'parsing',
        message: `Failed to parse Excel file: ${error.message}`,
      });
    }

    return { data, errors };
  }

  /**
   * Parse a single sheet and convert rows to typed objects
   */
  private parseSheet<T>(worksheet: XLSX.WorkSheet, sheetName: string): { data: T[]; errors: ImportError[] } {
    const errors: ImportError[] = [];
    const data: T[] = [];

    try {
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

      if (sheetName === 'Facet Values') {
        console.log('[ExcelParserService] Facet Values raw data (first 5 rows):', JSON.stringify(jsonData.slice(0, 5), null, 2));
      }

      jsonData.forEach((row, index) => {
        const rowNum = index + 2; // Excel rows are 1-indexed, header is row 1

        // Skip empty rows
        if (Object.values(row).every(val => !val || val === '')) {
          return;
        }

        // Convert row to camelCase keys
        const camelCaseRow = this.convertToCamelCase(row);
        data.push(camelCaseRow as T);
      });
    } catch (error: any) {
      errors.push({
        row: 0,
        sheet: sheetName,
        field: 'parsing',
        message: `Failed to parse sheet: ${error.message}`,
      });
    }

    return { data, errors };
  }

  /**
   * Convert snake_case keys to camelCase
   */
  private convertToCamelCase(obj: any): any {
    const newObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        newObj[camelCaseKey] = obj[key];
      }
    }
    return newObj;
  }
}
