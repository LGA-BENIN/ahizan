# Bulk Collection & Facet Import Template

## Excel File Structure

Your Excel file must have 3 sheets with the following structure:

### Sheet 1: Collections

| Column | Description | Required | Example |
|--------|-------------|----------|---------|
| name | Collection name (French) | Yes | Vêtements |
| name_en | Collection name (English) | No | Clothing |
| slug | URL-friendly slug | Yes | vetements |
| parent_slug | Parent collection slug. Leave empty to attach under the store root. | No | vetements |
| description | Collection description (French) | No | Tous les vêtements |
| description_en | Collection description (English) | No | All clothing |
| featured_asset_url | URL for featured image | No | https://example.com/image.jpg |
| position | Display order among siblings | No | 1 |
| allowed_facet_codes | Comma-separated facet codes (seller facet picker) | No | brand,color |
| facet_value_codes | Comma-separated facet **value** codes used to auto-populate the collection with matching product variants (builds a facet-value-filter) | No | red,blue |
| variant_ids | Comma-separated product variant IDs to include explicitly (builds a variant-id-filter) | No | 2,6,12 |
| inherit_filters | `true`/`false` - inherit parent collection filters (default `true`) | No | true |
| is_private | `true`/`false` - whether the collection is hidden (default `false`) | No | false |

**Example Data:**
```
name,name_en,slug,parent_slug,description,description_en,featured_asset_url,position,allowed_facet_codes,facet_value_codes,variant_ids,inherit_filters,is_private
Vêtements,Clothing,vetements,,Tous les vêtements,All clothing,,1,"color,brand",,,true,false
Hommes,Men,hommes,vetements,Vêtements pour hommes,Men's clothing,,2,brand,homme,,true,false
Femmes,Women,femmes,vetements,Vêtements pour femmes,Women's clothing,,3,"color,brand",,"7,9,14",true,false
```

> **Populating collections with products:** A collection only shows products when it has a filter.
> Use `facet_value_codes` (recommended - products tagged with those facet values are matched automatically)
> and/or `variant_ids` (explicit list). Without either, the collection will be created but remain empty.

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

2. **Collection-Facet Mapping**: After import, the plugin automatically updates the `allowedFacetIds` in each collection's `customFields` based on the `allowed_facet_codes` column in the Collections sheet.

3. **Parent-Child Relationships**: Collections are created first, then parent relationships are applied in a second pass using Vendure's `move()` API (a plain `update({parentId})` is silently ignored by Vendure). Any collection without a valid `parent_slug` is explicitly attached under the store root, so no collection is ever left orphaned.

4. **Channel Assignment**: Every created or updated collection is assigned to the current channel, so it is always visible in the admin dashboard and storefront.

5. **Existing Data**: The plugin updates collections, facets and facet values that already exist (matched by slug/code) and creates the rest.

6. **Facet Codes**: The `allowed_facet_codes` column expects human-readable facet codes (like `brand` or `color`), which are completely environment-independent. There is no need to query or update database IDs.

7. **French/English Support**: All entities support both French (required) and English (optional) translations.

## Import Process

1. Prepare your Excel file with the 3 sheets
2. Use the `validateImportFile` mutation to check for errors
3. Use the `importCollectionsAndFacets` mutation to import
4. The plugin will:
   - Parse and validate the Excel file
   - Create facets and facet values
   - Create collections with translations
   - Set parent-child relationships
   - Update `allowedFacetIds` in collection customFields based on `allowed_facet_codes`
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
