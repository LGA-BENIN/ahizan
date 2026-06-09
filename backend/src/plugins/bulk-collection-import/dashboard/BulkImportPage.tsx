import React, { useState } from 'react';

const EXPORT_QUERY = `
  query ExportCollectionsAndFacets {
    exportCollectionsAndFacets
  }
`;

const IMPORT_MUTATION = `
  mutation ImportCollectionsAndFacets($fileBase64: String!, $fileName: String!) {
    importCollectionsAndFacets(fileBase64: $fileBase64, fileName: $fileName) {
      success
      message
      collectionsCreated
      collectionsUpdated
      facetsCreated
      facetsUpdated
      facetValuesCreated
      facetValuesUpdated
      errors {
        row
        sheet
        field
        message
      }
    }
  }
`;

async function fetchGraphQL(query: string, variables?: any) {
  const res = await fetch('/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

export const BulkImportPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const data = await fetchGraphQL(EXPORT_QUERY);
      if (data.exportCollectionsAndFacets) {
        const base64 = data.exportCollectionsAndFacets;
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'collections-facets-export.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'Export successful!' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Export failed: ${error.message}` });
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file to import' });
      return;
    }

    setImportLoading(true);
    try {
      // Convert file to base64
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g., "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const data = await fetchGraphQL(IMPORT_MUTATION, { fileBase64, fileName: file.name });
      setImportResult(data.importCollectionsAndFacets);
      if (data.importCollectionsAndFacets.success) {
        setMessage({ type: 'success', text: data.importCollectionsAndFacets.message });
        setFile(null);
      } else {
        setMessage({ type: 'error', text: data.importCollectionsAndFacets.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Import failed: ${error.message}` });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Import/Export en masse
      </h1>
      <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        Importez ou exportez des collections et des facettes via un fichier Excel.
      </p>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 24,
            borderRadius: 8,
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
          }}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: message.type === 'success' ? '#166534' : '#991b1b',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Export Section */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '20px',
          marginBottom: 24,
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1e293b' }}>
          Exporter les données existantes
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Téléchargez toutes les collections et facettes sous forme de fichier Excel. Vous pouvez modifier ce fichier et le réimporter.
        </p>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            color: '#fff',
            background: exportLoading ? '#9ca3af' : '#3b82f6',
            border: 'none',
            borderRadius: 8,
            cursor: exportLoading ? 'wait' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {exportLoading ? 'Exportation...' : 'Exporter vers Excel'}
        </button>
      </div>

      {/* Import Section */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '20px',
          marginBottom: 24,
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1e293b' }}>
          Importer des données
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Téléchargez un fichier Excel pour importer ou mettre à jour des collections et facettes. Les éléments existants seront mis à jour au lieu d'être ignorés.
        </p>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) {
              setFile(selectedFile);
            }
          }}
          style={{
            marginBottom: 16,
            padding: '10px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        {file && (
          <div style={{ marginBottom: 16, fontSize: 13, color: '#1e293b' }}>
            <strong>Fichier sélectionné:</strong> {file.name}
          </div>
        )}
        <button
          onClick={handleImport}
          disabled={!file || importLoading}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            color: '#fff',
            background: !file || importLoading ? '#9ca3af' : '#3b82f6',
            border: 'none',
            borderRadius: 8,
            cursor: !file || importLoading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {importLoading ? 'Importation...' : 'Importer depuis Excel'}
        </button>
      </div>

      {/* Import Result */}
      {importResult && (
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '20px',
            marginBottom: 24,
            background: importResult.success ? '#f0fdf4' : '#fef2f2',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1e293b' }}>
            Résultat de l'import
          </h3>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            <strong>Collections créées:</strong> {importResult.collectionsCreated}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            <strong>Collections mises à jour:</strong> {importResult.collectionsUpdated}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            <strong>Facettes créées:</strong> {importResult.facetsCreated}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            <strong>Facettes mises à jour:</strong> {importResult.facetsUpdated}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            <strong>Valeurs de facette créées:</strong> {importResult.facetValuesCreated}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            <strong>Valeurs de facette mises à jour:</strong> {importResult.facetValuesUpdated}
          </div>
          {importResult.errors && importResult.errors.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#dc2626' }}>
                Erreurs:
              </h4>
              <ul style={{ fontSize: 12, color: '#dc2626', paddingLeft: 20 }}>
                {importResult.errors.map((error: any, index: number) => (
                  <li key={index}>
                    {error.sheet} - Ligne {error.row}: {error.field} - {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '20px',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1e293b' }}>
          Instructions
        </h3>
        <ul style={{ fontSize: 13, color: '#6b7280', paddingLeft: 20, lineHeight: 1.6 }}>
          <li>Le fichier Excel doit avoir 3 feuilles: Collections, Facets, Facet Values</li>
          <li>Feuille Collections: name, name_en, slug, parent_slug, description, description_en, position, allowed_facet_ids, facet_value_codes, variant_ids, inherit_filters, is_private</li>
          <li>Pour remplir une collection de produits: renseignez facet_value_codes (codes de valeurs de facette) et/ou variant_ids (IDs de variantes)</li>
          <li>Feuille Facets: code, name, name_en, is_private</li>
          <li>Feuille Facet Values: facet_code, code, name, name_en</li>
          <li>Les collections/facettes existantes seront mises à jour selon le slug/code</li>
          <li>Aucune migration de base de données requise - utilise les API Vendure existantes</li>
        </ul>
      </div>
    </div>
  );
};
