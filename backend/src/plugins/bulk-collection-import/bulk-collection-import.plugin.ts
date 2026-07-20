import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { BulkImportResolver } from './api/bulk-import.resolver';
import { adminApiExtensions } from './api/api-extensions';
import { ExcelParserService } from './service/excel-parser.service';
import { ImportValidatorService } from './service/import-validator.service';
import { CollectionImportService } from './service/collection-import.service';
import { FacetImportService } from './service/facet-import.service';
import { ExportService } from './service/export.service';

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [
    ExcelParserService,
    ImportValidatorService,
    CollectionImportService,
    FacetImportService,
    ExportService,
    BulkImportResolver,
  ],
  adminApiExtensions: {
    schema: adminApiExtensions,
    resolvers: [BulkImportResolver],
  },
  dashboard: './dashboard',
  compatibility: '^3.0.0',
})
export class BulkCollectionImportPlugin {
  constructor() {
    console.log('[BulkCollectionImportPlugin] Initialized');
  }
}
