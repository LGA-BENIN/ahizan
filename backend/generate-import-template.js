const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Create a new workbook
const workbook = XLSX.utils.book_new();

// Sheet 1: Collections
const collectionsData = [
  {
    name: 'Vêtements',
    name_en: 'Clothing',
    slug: 'vetements',
    parent_slug: '',
    description: 'Tous les vêtements',
    description_en: 'All clothing',
    featured_asset_url: '',
    position: 1,
    allowed_facet_ids: ''
  },
  {
    name: 'Électronique',
    name_en: 'Electronics',
    slug: 'electronique',
    parent_slug: '',
    description: 'Tous les produits électroniques',
    description_en: 'All electronic products',
    featured_asset_url: '',
    position: 2,
    allowed_facet_ids: ''
  },
  {
    name: 'Hommes',
    name_en: 'Men',
    slug: 'hommes',
    parent_slug: 'vetements',
    description: 'Vêtements pour hommes',
    description_en: 'Men\'s clothing',
    featured_asset_url: '',
    position: 1,
    allowed_facet_ids: ''
  },
  {
    name: 'Femmes',
    name_en: 'Women',
    slug: 'femmes',
    parent_slug: 'vetements',
    description: 'Vêtements pour femmes',
    description_en: 'Women\'s clothing',
    featured_asset_url: '',
    position: 2,
    allowed_facet_ids: ''
  }
];

const collectionsSheet = XLSX.utils.json_to_sheet(collectionsData);
XLSX.utils.book_append_sheet(workbook, collectionsSheet, 'Collections');

// Sheet 2: Facets
const facetsData = [
  {
    code: 'color',
    name: 'Couleur',
    name_en: 'Color',
    is_private: 'false'
  },
  {
    code: 'size',
    name: 'Taille',
    name_en: 'Size',
    is_private: 'false'
  },
  {
    code: 'brand',
    name: 'Marque',
    name_en: 'Brand',
    is_private: 'false'
  },
  {
    code: 'material',
    name: 'Matériau',
    name_en: 'Material',
    is_private: 'false'
  }
];

const facetsSheet = XLSX.utils.json_to_sheet(facetsData);
XLSX.utils.book_append_sheet(workbook, facetsSheet, 'Facets');

// Sheet 3: Facet Values
const facetValuesData = [
  {
    facet_code: 'color',
    code: 'red',
    name: 'Rouge',
    name_en: 'Red'
  },
  {
    facet_code: 'color',
    code: 'blue',
    name: 'Bleu',
    name_en: 'Blue'
  },
  {
    facet_code: 'color',
    code: 'green',
    name: 'Vert',
    name_en: 'Green'
  },
  {
    facet_code: 'color',
    code: 'black',
    name: 'Noir',
    name_en: 'Black'
  },
  {
    facet_code: 'color',
    code: 'white',
    name: 'Blanc',
    name_en: 'White'
  },
  {
    facet_code: 'size',
    code: 'xs',
    name: 'XS',
    name_en: 'XS'
  },
  {
    facet_code: 'size',
    code: 's',
    name: 'S',
    name_en: 'S'
  },
  {
    facet_code: 'size',
    code: 'm',
    name: 'M',
    name_en: 'M'
  },
  {
    facet_code: 'size',
    code: 'l',
    name: 'L',
    name_en: 'L'
  },
  {
    facet_code: 'size',
    code: 'xl',
    name: 'XL',
    name_en: 'XL'
  },
  {
    facet_code: 'brand',
    code: 'nike',
    name: 'Nike',
    name_en: 'Nike'
  },
  {
    facet_code: 'brand',
    code: 'adidas',
    name: 'Adidas',
    name_en: 'Adidas'
  },
  {
    facet_code: 'brand',
    code: 'puma',
    name: 'Puma',
    name_en: 'Puma'
  },
  {
    facet_code: 'material',
    code: 'cotton',
    name: 'Coton',
    name_en: 'Cotton'
  },
  {
    facet_code: 'material',
    code: 'polyester',
    name: 'Polyester',
    name_en: 'Polyester'
  }
];

const facetValuesSheet = XLSX.utils.json_to_sheet(facetValuesData);
XLSX.utils.book_append_sheet(workbook, facetValuesSheet, 'Facet Values');

// Write the file
const outputPath = path.join(__dirname, 'bulk-import-template.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`Template file created: ${outputPath}`);
console.log('');
console.log('This template contains:');
console.log('- 4 collections (with parent-child relationships)');
console.log('- 4 facets');
console.log('- 15 facet values');
console.log('');
console.log('You can edit this file and use it for bulk import via the GraphQL API.');
