# Bulk Collection & Facet Import Template

## Excel File Structure

Your Excel file must have 3 sheets with the following structure:

### Sheet 1: Collections

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| name | Collection name (French) | Yes | Vêtements |
| name_en | Collection name (English) | No | Clothing |
| slug | URL-friendly slug | Yes | vetements |
| parent_slug | Parent collection slug | No | (leave empty for root collections) |
| description | Collection description (French) | No | Tous les vêtements |
| description_en | Collection description (English) | No | All clothing |
| featured_asset_url | URL for featured image | No | https://example.com/image.jpg |
| position | Display order | No | 1 |
| allowed_facet_ids | Comma-separated facet IDs | No | 1,2,3 |

**Example Data:**
```
name,name_en,slug,parent_slug,description,description_en,featured_asset_url,position,allowed_facet_ids
Vêtements,Clothing,vetements,,Tous les vêtements,All clothing,,1,1,2
Hommes,Men,hommes,vetements,Vêtements pour hommes,Men's clothing,,2,1
Femmes,Women,femmes,vetements,Vêtements pour femmes,Women's clothing,,3,1,2
```

### Sheet 2: Facets

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| code | Unique facet code | Yes | color |
| name | Facet name (French) | Yes | Couleur |
| name_en | Facet name (English) | No | Color |
| is_private | Whether facet is private | No | false |

**Example Data:**
```
code,name,name_en,is_private
color,Couleur,Color,false
size,Taille,Size,false
brand,Marque,Brand,false
```

### Sheet 3: Facet Values

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| facet_code | Parent facet code | Yes | color |
| code | Unique value code | Yes | red |
| name | Value name (French) | Yes | Rouge |
| name_en | Value name (English) | No | Red |

**Example Data:**
```
facet_code,code,name,name_en
color,red,Rouge,Red
color,blue,Bleu,Blue
color,green,Vert,Green
size,small,Petit,Small
size,medium,Moyen,Medium
size,large,Grand,Large
```

## Important Notes

1. **No Database Migrations**: This plugin uses Vendure's existing APIs and only updates the `customFields` column. No schema changes are made.

2. **Collection-Facet Mapping**: After import, the plugin automatically updates the `allowedFacetIds` in each collection's `customFields` based on the `allowed_facet_ids` column in the Collections sheet.

3. **Parent-Child Relationships**: Collections are created first without parents, then parent relationships are set in a second pass. This ensures all collections exist before linking them.

4. **Existing Data**: The plugin skips collections and facets that already exist (by slug/code). It only creates new ones.

5. **Facet IDs**: The `allowed_facet_ids` column expects numeric facet IDs. After importing facets, you'll need to check their IDs in the admin panel and update your Excel file accordingly.

6. **French/English Support**: All entities support both French (required) and English (optional) translations.

## Import Process

1. Prepare your Excel file with the 3 sheets
2. Use the `validateImportFile` mutation to check for errors
3. Use the `importCollectionsAndFacets` mutation to import
4. The plugin will:
   - Parse and validate the Excel file
   - Create facets and facet values
   - Create collections with translations
   - Set parent-child relationships
   - Update `allowedFacetIds` in collection customFields
   - Return a summary of what was created

## GraphQL API

### Validate File
```graphql
mutation {
  validateImportFile(file: Upload!) {
    success
    message
    errors {
      row
      sheet
      field
      message
    }
  }
}
```

### Import Data
```graphql
mutation {
  importCollectionsAndFacets(file: Upload!) {
    success
    message
    collectionsCreated
    facetsCreated
    facetValuesCreated
    errors {
      row
      sheet
      field
      message
    }
  }
}
```

## Seller Integration

After import, sellers can:
1. Select collections when adding products
2. The system automatically applies the collection's allowed facets to the product
3. Sellers see the facets via the `collectionAllowedFacets` shop API query
4. Products are automatically tagged with the correct facet values based on collection selection
