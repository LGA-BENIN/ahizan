#!/bin/bash
set -e

echo "Logging in..."
SUPERADMIN_USERNAME=$(grep SUPERADMIN_USERNAME /srv/ahizan/.env | cut -d= -f2 || echo superadmin)
SUPERADMIN_PASSWORD=$(grep SUPERADMIN_PASSWORD /srv/ahizan/.env | cut -d= -f2 || echo superadmin)

LOGIN_PAYLOAD=$(cat <<EOF
{"query":"mutation { login(username: \"$SUPERADMIN_USERNAME\", password: \"$SUPERADMIN_PASSWORD\") { ... on CurrentUser { id } } }"}
EOF
)

curl -s -c /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "$LOGIN_PAYLOAD" > /dev/null

echo "Deleting existing products..."
PRODUCTS_JSON=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d '{"query":"query { products(options: { take: 1000 }) { items { id } } }"')

PRODUCT_IDS=$(echo $PRODUCTS_JSON | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

if [ ! -z "$PRODUCT_IDS" ]; then
    IDS_ARRAY="["
    for id in $PRODUCT_IDS; do
        IDS_ARRAY="$IDS_ARRAY\"$id\","
    done
    IDS_ARRAY="${IDS_ARRAY%,}]"
    
    DEL_PAYLOAD=$(cat <<EOF
{"query":"mutation DeleteProducts(\$ids: [ID!]!) { deleteProducts(ids: \$ids) { ... on DeletionResponse { result } } }", "variables": { "ids": $IDS_ARRAY }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "$DEL_PAYLOAD" > /dev/null
    echo "Deleted existing products."
else
    echo "No existing products found."
fi

echo "Fetching collections..."
COLLECTIONS_JSON=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d '{"query":"query { collections(options: { topLevelOnly: true }) { items { id name } } }"')

AUTO_COL_ID=$(echo $COLLECTIONS_JSON | grep -o '"id":"[0-9]*","name":"Automobile' | cut -d'"' -f4 || echo 37)
BEAUTE_COL_ID=$(echo $COLLECTIONS_JSON | grep -o '"id":"[0-9]*","name":"Beauté' | cut -d'"' -f4 || echo 28)
MAISON_COL_ID=$(echo $COLLECTIONS_JSON | grep -o '"id":"[0-9]*","name":"Maison' | cut -d'"' -f4 || echo 23)
TECH_COL_ID=$(echo $COLLECTIONS_JSON | grep -o '"id":"[0-9]*","name":"Téléphones' | cut -d'"' -f4 || echo 18)
MODE_COL_ID=$(echo $COLLECTIONS_JSON | grep -o '"id":"[0-9]*","name":"Mode' | cut -d'"' -f4 || echo 12)
KIDS_COL_ID=$(echo $COLLECTIONS_JSON | grep -o '"id":"[0-9]*","name":"Bébés' | cut -d'"' -f4 || echo 33)

echo "Starting import of 100 products..."

echo "Processing 1/100: Essence Mascara Lash Princess"
curl -s -o /tmp/img_0.jpg "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_0.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Essence Mascara Lash Princess", "slug": "prod-1-0", "description": "The Essence Mascara Lash Princess is a popular mascara known for its volumizing and lengthening effects. Achieve dramatic lashes with this long-lasting and cruelty-free formula." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Essence Mascara Lash Princess" } ], "sku": "BEA-ESS-ESS-001", "price": 5994, "stockOnHand": 99 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$BEAUTE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_0.jpg

echo "Processing 2/100: Eyeshadow Palette with Mirror"
curl -s -o /tmp/img_1.jpg "https://cdn.dummyjson.com/product-images/beauty/eyeshadow-palette-with-mirror/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_1.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Eyeshadow Palette with Mirror", "slug": "prod-2-1", "description": "The Eyeshadow Palette with Mirror offers a versatile range of eyeshadow shades for creating stunning eye looks. With a built-in mirror, its convenient for on-the-go makeup application." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Eyeshadow Palette with Mirror" } ], "sku": "BEA-GLA-EYE-002", "price": 11994, "stockOnHand": 34 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$BEAUTE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_1.jpg

echo "Processing 3/100: Powder Canister"
curl -s -o /tmp/img_2.jpg "https://cdn.dummyjson.com/product-images/beauty/powder-canister/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_2.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Powder Canister", "slug": "prod-3-2", "description": "The Powder Canister is a finely milled setting powder designed to set makeup and control shine. With a lightweight and translucent formula, it provides a smooth and matte finish." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Powder Canister" } ], "sku": "BEA-VEL-POW-003", "price": 8994, "stockOnHand": 89 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$BEAUTE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_2.jpg

echo "Processing 4/100: Red Lipstick"
curl -s -o /tmp/img_3.jpg "https://cdn.dummyjson.com/product-images/beauty/red-lipstick/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_3.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Red Lipstick", "slug": "prod-4-3", "description": "The Red Lipstick is a classic and bold choice for adding a pop of color to your lips. With a creamy and pigmented formula, it provides a vibrant and long-lasting finish." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Red Lipstick" } ], "sku": "BEA-CHI-LIP-004", "price": 7794, "stockOnHand": 91 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$BEAUTE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_3.jpg

echo "Processing 5/100: Red Nail Polish"
curl -s -o /tmp/img_4.jpg "https://cdn.dummyjson.com/product-images/beauty/red-nail-polish/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_4.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Red Nail Polish", "slug": "prod-5-4", "description": "The Red Nail Polish offers a rich and glossy red hue for vibrant and polished nails. With a quick-drying formula, it provides a salon-quality finish at home." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Red Nail Polish" } ], "sku": "BEA-NAI-NAI-005", "price": 5394, "stockOnHand": 79 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$BEAUTE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_4.jpg

echo "Processing 6/100: Calvin Klein CK One"
curl -s -o /tmp/img_5.jpg "https://cdn.dummyjson.com/product-images/fragrances/calvin-klein-ck-one/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_5.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Calvin Klein CK One", "slug": "prod-6-5", "description": "CK One by Calvin Klein is a classic unisex fragrance, known for its fresh and clean scent. Its a versatile fragrance suitable for everyday wear." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Calvin Klein CK One" } ], "sku": "FRA-CAL-CAL-006", "price": 29994, "stockOnHand": 29 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$BEAUTE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_5.jpg

echo "Processing 7/100: Chanel Coco Noir Eau De"
curl -s -o /tmp/img_6.jpg "https://cdn.dummyjson.com/product-images/fragrances/chanel-coco-noir-eau-de/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_6.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Chanel Coco Noir Eau De", "slug": "prod-7-6", "description": "Coco Noir by Chanel is an elegant and mysterious fragrance, featuring notes of grapefruit, rose, and sandalwood. Perfect for evening occasions." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Chanel Coco Noir Eau De" } ], "sku": "FRA-CHA-CHA-007", "price": 77994, "stockOnHand": 58 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$BEAUTE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_6.jpg

echo "Processing 8/100: Dior Jadore"
curl -s -o /tmp/img_7.jpg "https://cdn.dummyjson.com/product-images/fragrances/dior-j'adore/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_7.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Dior Jadore", "slug": "prod-8-7", "description": "Jadore by Dior is a luxurious and floral fragrance, known for its blend of ylang-ylang, rose, and jasmine. It embodies femininity and sophistication." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Dior Jadore" } ], "sku": "FRA-DIO-DIO-008", "price": 53994, "stockOnHand": 98 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$BEAUTE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_7.jpg

echo "Processing 9/100: Dolce Shine Eau de"
curl -s -o /tmp/img_8.jpg "https://cdn.dummyjson.com/product-images/fragrances/dolce-shine-eau-de/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_8.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Dolce Shine Eau de", "slug": "prod-9-8", "description": "Dolce Shine by Dolce & Gabbana is a vibrant and fruity fragrance, featuring notes of mango, jasmine, and blonde woods. Its a joyful and youthful scent." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Dolce Shine Eau de" } ], "sku": "FRA-DOL-DOL-009", "price": 41994, "stockOnHand": 4 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$BEAUTE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_8.jpg

echo "Processing 10/100: Gucci Bloom Eau de"
curl -s -o /tmp/img_9.jpg "https://cdn.dummyjson.com/product-images/fragrances/gucci-bloom-eau-de/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_9.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Gucci Bloom Eau de", "slug": "prod-10-9", "description": "Gucci Bloom by Gucci is a floral and captivating fragrance, with notes of tuberose, jasmine, and Rangoon creeper. Its a modern and romantic scent." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Gucci Bloom Eau de" } ], "sku": "FRA-GUC-GUC-010", "price": 47994, "stockOnHand": 91 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$BEAUTE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_9.jpg

echo "Processing 11/100: Annibale Colombo Bed"
curl -s -o /tmp/img_10.jpg "https://cdn.dummyjson.com/product-images/furniture/annibale-colombo-bed/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_10.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Annibale Colombo Bed", "slug": "prod-11-10", "description": "The Annibale Colombo Bed is a luxurious and elegant bed frame, crafted with high-quality materials for a comfortable and stylish bedroom." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Annibale Colombo Bed" } ], "sku": "FUR-ANN-ANN-011", "price": 1139994, "stockOnHand": 88 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_10.jpg

echo "Processing 12/100: Annibale Colombo Sofa"
curl -s -o /tmp/img_11.jpg "https://cdn.dummyjson.com/product-images/furniture/annibale-colombo-sofa/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_11.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Annibale Colombo Sofa", "slug": "prod-12-11", "description": "The Annibale Colombo Sofa is a sophisticated and comfortable seating option, featuring exquisite design and premium upholstery for your living room." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Annibale Colombo Sofa" } ], "sku": "FUR-ANN-ANN-012", "price": 1499994, "stockOnHand": 60 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_11.jpg

echo "Processing 13/100: Bedside Table African Cherry"
curl -s -o /tmp/img_12.jpg "https://cdn.dummyjson.com/product-images/furniture/bedside-table-african-cherry/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_12.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Bedside Table African Cherry", "slug": "prod-13-12", "description": "The Bedside Table in African Cherry is a stylish and functional addition to your bedroom, providing convenient storage space and a touch of elegance." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Bedside Table African Cherry" } ], "sku": "FUR-FUR-BED-013", "price": 179994, "stockOnHand": 64 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_12.jpg

echo "Processing 14/100: Knoll Saarinen Executive Conference Chair"
curl -s -o /tmp/img_13.jpg "https://cdn.dummyjson.com/product-images/furniture/knoll-saarinen-executive-conference-chair/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_13.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Knoll Saarinen Executive Conference Chair", "slug": "prod-14-13", "description": "The Knoll Saarinen Executive Conference Chair is a modern and ergonomic chair, perfect for your office or conference room with its timeless design." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Knoll Saarinen Executive Conference Chair" } ], "sku": "FUR-KNO-KNO-014", "price": 299994, "stockOnHand": 26 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_13.jpg

echo "Processing 15/100: Wooden Bathroom Sink With Mirror"
curl -s -o /tmp/img_14.jpg "https://cdn.dummyjson.com/product-images/furniture/wooden-bathroom-sink-with-mirror/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_14.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Wooden Bathroom Sink With Mirror", "slug": "prod-15-14", "description": "The Wooden Bathroom Sink with Mirror is a unique and stylish addition to your bathroom, featuring a wooden sink countertop and a matching mirror." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Wooden Bathroom Sink With Mirror" } ], "sku": "FUR-BAT-WOO-015", "price": 479994, "stockOnHand": 7 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_14.jpg

echo "Processing 16/100: Apple"
curl -s -o /tmp/img_15.jpg "https://cdn.dummyjson.com/product-images/groceries/apple/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_15.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Apple", "slug": "prod-16-15", "description": "Fresh and crisp apples, perfect for snacking or incorporating into various recipes." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Apple" } ], "sku": "GRO-BRD-APP-016", "price": 1194, "stockOnHand": 8 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_15.jpg

echo "Processing 17/100: Beef Steak"
curl -s -o /tmp/img_16.jpg "https://cdn.dummyjson.com/product-images/groceries/beef-steak/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_16.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Beef Steak", "slug": "prod-17-16", "description": "High-quality beef steak, great for grilling or cooking to your preferred level of doneness." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Beef Steak" } ], "sku": "GRO-BRD-BEE-017", "price": 7794, "stockOnHand": 86 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_16.jpg

echo "Processing 18/100: Cat Food"
curl -s -o /tmp/img_17.jpg "https://cdn.dummyjson.com/product-images/groceries/cat-food/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_17.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Cat Food", "slug": "prod-18-17", "description": "Nutritious cat food formulated to meet the dietary needs of your feline friend." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Cat Food" } ], "sku": "GRO-BRD-FOO-018", "price": 5394, "stockOnHand": 46 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_17.jpg

echo "Processing 19/100: Chicken Meat"
curl -s -o /tmp/img_18.jpg "https://cdn.dummyjson.com/product-images/groceries/chicken-meat/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_18.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Chicken Meat", "slug": "prod-19-18", "description": "Fresh and tender chicken meat, suitable for various culinary preparations." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Chicken Meat" } ], "sku": "GRO-BRD-CHI-019", "price": 5994, "stockOnHand": 97 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_18.jpg

echo "Processing 20/100: Cooking Oil"
curl -s -o /tmp/img_19.jpg "https://cdn.dummyjson.com/product-images/groceries/cooking-oil/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_19.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Cooking Oil", "slug": "prod-20-19", "description": "Versatile cooking oil suitable for frying, sautéing, and various culinary applications." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Cooking Oil" } ], "sku": "GRO-BRD-COO-020", "price": 2994, "stockOnHand": 10 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_19.jpg

echo "Processing 21/100: Cucumber"
curl -s -o /tmp/img_20.jpg "https://cdn.dummyjson.com/product-images/groceries/cucumber/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_20.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Cucumber", "slug": "prod-21-20", "description": "Crisp and hydrating cucumbers, ideal for salads, snacks, or as a refreshing side." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Cucumber" } ], "sku": "GRO-BRD-CUC-021", "price": 894, "stockOnHand": 84 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_20.jpg

echo "Processing 22/100: Dog Food"
curl -s -o /tmp/img_21.jpg "https://cdn.dummyjson.com/product-images/groceries/dog-food/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_21.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Dog Food", "slug": "prod-22-21", "description": "Specially formulated dog food designed to provide essential nutrients for your canine companion." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Dog Food" } ], "sku": "GRO-BRD-FOO-022", "price": 6594, "stockOnHand": 71 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_21.jpg

echo "Processing 23/100: Eggs"
curl -s -o /tmp/img_22.jpg "https://cdn.dummyjson.com/product-images/groceries/eggs/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_22.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Eggs", "slug": "prod-23-22", "description": "Fresh eggs, a versatile ingredient for baking, cooking, or breakfast." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Eggs" } ], "sku": "GRO-BRD-EGG-023", "price": 1794, "stockOnHand": 9 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_22.jpg

echo "Processing 24/100: Fish Steak"
curl -s -o /tmp/img_23.jpg "https://cdn.dummyjson.com/product-images/groceries/fish-steak/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_23.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Fish Steak", "slug": "prod-24-23", "description": "Quality fish steak, suitable for grilling, baking, or pan-searing." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Fish Steak" } ], "sku": "GRO-BRD-FIS-024", "price": 8994, "stockOnHand": 74 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_23.jpg

echo "Processing 25/100: Green Bell Pepper"
curl -s -o /tmp/img_24.jpg "https://cdn.dummyjson.com/product-images/groceries/green-bell-pepper/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_24.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Green Bell Pepper", "slug": "prod-25-24", "description": "Fresh and vibrant green bell pepper, perfect for adding color and flavor to your dishes." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Green Bell Pepper" } ], "sku": "GRO-BRD-GRE-025", "price": 774, "stockOnHand": 33 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_24.jpg

echo "Processing 26/100: Green Chili Pepper"
curl -s -o /tmp/img_25.jpg "https://cdn.dummyjson.com/product-images/groceries/green-chili-pepper/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_25.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Green Chili Pepper", "slug": "prod-26-25", "description": "Spicy green chili pepper, ideal for adding heat to your favorite recipes." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Green Chili Pepper" } ], "sku": "GRO-BRD-GRE-026", "price": 594, "stockOnHand": 3 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_25.jpg

echo "Processing 27/100: Honey Jar"
curl -s -o /tmp/img_26.jpg "https://cdn.dummyjson.com/product-images/groceries/honey-jar/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_26.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Honey Jar", "slug": "prod-27-26", "description": "Pure and natural honey in a convenient jar, perfect for sweetening beverages or drizzling over food." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Honey Jar" } ], "sku": "GRO-BRD-HON-027", "price": 4194, "stockOnHand": 34 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_26.jpg

echo "Processing 28/100: Ice Cream"
curl -s -o /tmp/img_27.jpg "https://cdn.dummyjson.com/product-images/groceries/ice-cream/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_27.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Ice Cream", "slug": "prod-28-27", "description": "Creamy and delicious ice cream, available in various flavors for a delightful treat." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Ice Cream" } ], "sku": "GRO-BRD-CRE-028", "price": 3294, "stockOnHand": 27 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_27.jpg

echo "Processing 29/100: Juice"
curl -s -o /tmp/img_28.jpg "https://cdn.dummyjson.com/product-images/groceries/juice/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_28.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Juice", "slug": "prod-29-28", "description": "Refreshing fruit juice, packed with vitamins and great for staying hydrated." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Juice" } ], "sku": "GRO-BRD-JUI-029", "price": 2394, "stockOnHand": 50 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_28.jpg

echo "Processing 30/100: Kiwi"
curl -s -o /tmp/img_29.jpg "https://cdn.dummyjson.com/product-images/groceries/kiwi/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_29.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Kiwi", "slug": "prod-30-29", "description": "Nutrient-rich kiwi, perfect for snacking or adding a tropical twist to your dishes." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Kiwi" } ], "sku": "GRO-BRD-KIW-030", "price": 1494, "stockOnHand": 99 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_29.jpg

echo "Processing 31/100: Lemon"
curl -s -o /tmp/img_30.jpg "https://cdn.dummyjson.com/product-images/groceries/lemon/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_30.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Lemon", "slug": "prod-31-30", "description": "Zesty and tangy lemons, versatile for cooking, baking, or making refreshing beverages." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Lemon" } ], "sku": "GRO-BRD-LEM-031", "price": 474, "stockOnHand": 31 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_30.jpg

echo "Processing 32/100: Milk"
curl -s -o /tmp/img_31.jpg "https://cdn.dummyjson.com/product-images/groceries/milk/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_31.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Milk", "slug": "prod-32-31", "description": "Fresh and nutritious milk, a staple for various recipes and daily consumption." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Milk" } ], "sku": "GRO-BRD-MIL-032", "price": 2094, "stockOnHand": 27 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_31.jpg

echo "Processing 33/100: Mulberry"
curl -s -o /tmp/img_32.jpg "https://cdn.dummyjson.com/product-images/groceries/mulberry/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_32.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Mulberry", "slug": "prod-33-32", "description": "Sweet and juicy mulberries, perfect for snacking or adding to desserts and cereals." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Mulberry" } ], "sku": "GRO-BRD-MUL-033", "price": 2994, "stockOnHand": 99 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_32.jpg

echo "Processing 34/100: Nescafe Coffee"
curl -s -o /tmp/img_33.jpg "https://cdn.dummyjson.com/product-images/groceries/nescafe-coffee/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_33.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Nescafe Coffee", "slug": "prod-34-33", "description": "Quality coffee from Nescafe, available in various blends for a rich and satisfying cup." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Nescafe Coffee" } ], "sku": "GRO-BRD-NES-034", "price": 4794, "stockOnHand": 57 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_33.jpg

echo "Processing 35/100: Potatoes"
curl -s -o /tmp/img_34.jpg "https://cdn.dummyjson.com/product-images/groceries/potatoes/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_34.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Potatoes", "slug": "prod-35-34", "description": "Versatile and starchy potatoes, great for roasting, mashing, or as a side dish." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Potatoes" } ], "sku": "GRO-BRD-POT-035", "price": 1374, "stockOnHand": 13 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_34.jpg

echo "Processing 36/100: Protein Powder"
curl -s -o /tmp/img_35.jpg "https://cdn.dummyjson.com/product-images/groceries/protein-powder/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_35.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Protein Powder", "slug": "prod-36-35", "description": "Nutrient-packed protein powder, ideal for supplementing your diet with essential proteins." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Protein Powder" } ], "sku": "GRO-BRD-PRO-036", "price": 11994, "stockOnHand": 80 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_35.jpg

echo "Processing 37/100: Red Onions"
curl -s -o /tmp/img_36.jpg "https://cdn.dummyjson.com/product-images/groceries/red-onions/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_36.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Red Onions", "slug": "prod-37-36", "description": "Flavorful and aromatic red onions, perfect for adding depth to your savory dishes." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Red Onions" } ], "sku": "GRO-BRD-ONI-037", "price": 1194, "stockOnHand": 82 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_36.jpg

echo "Processing 38/100: Rice"
curl -s -o /tmp/img_37.jpg "https://cdn.dummyjson.com/product-images/groceries/rice/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_37.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Rice", "slug": "prod-38-37", "description": "High-quality rice, a staple for various cuisines and a versatile base for many dishes." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Rice" } ], "sku": "GRO-BRD-RIC-038", "price": 3594, "stockOnHand": 59 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_37.jpg

echo "Processing 39/100: Soft Drinks"
curl -s -o /tmp/img_38.jpg "https://cdn.dummyjson.com/product-images/groceries/soft-drinks/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_38.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Soft Drinks", "slug": "prod-39-38", "description": "Assorted soft drinks in various flavors, perfect for refreshing beverages." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Soft Drinks" } ], "sku": "GRO-BRD-SOF-039", "price": 1194, "stockOnHand": 53 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_38.jpg

echo "Processing 40/100: Strawberry"
curl -s -o /tmp/img_39.jpg "https://cdn.dummyjson.com/product-images/groceries/strawberry/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_39.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Strawberry", "slug": "prod-40-39", "description": "Sweet and succulent strawberries, great for snacking, desserts, or blending into smoothies." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Strawberry" } ], "sku": "GRO-BRD-STR-040", "price": 2394, "stockOnHand": 46 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_39.jpg

echo "Processing 41/100: Tissue Paper Box"
curl -s -o /tmp/img_40.jpg "https://cdn.dummyjson.com/product-images/groceries/tissue-paper-box/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_40.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Tissue Paper Box", "slug": "prod-41-40", "description": "Convenient tissue paper box for everyday use, providing soft and absorbent tissues." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Tissue Paper Box" } ], "sku": "GRO-BRD-TIS-041", "price": 1494, "stockOnHand": 86 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_40.jpg

echo "Processing 42/100: Water"
curl -s -o /tmp/img_41.jpg "https://cdn.dummyjson.com/product-images/groceries/water/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_41.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Water", "slug": "prod-42-41", "description": "Pure and refreshing bottled water, essential for staying hydrated throughout the day." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Water" } ], "sku": "GRO-BRD-WAT-042", "price": 594, "stockOnHand": 53 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_41.jpg

echo "Processing 43/100: Decoration Swing"
curl -s -o /tmp/img_42.jpg "https://cdn.dummyjson.com/product-images/home-decoration/decoration-swing/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_42.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Decoration Swing", "slug": "prod-43-42", "description": "The Decoration Swing is a charming addition to your home decor. Crafted with intricate details, it adds a touch of elegance and whimsy to any room." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Decoration Swing" } ], "sku": "HOM-BRD-DEC-043", "price": 35994, "stockOnHand": 47 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_42.jpg

echo "Processing 44/100: Family Tree Photo Frame"
curl -s -o /tmp/img_43.jpg "https://cdn.dummyjson.com/product-images/home-decoration/family-tree-photo-frame/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_43.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Family Tree Photo Frame", "slug": "prod-44-43", "description": "The Family Tree Photo Frame is a sentimental and stylish way to display your cherished family memories. With multiple photo slots, it tells the story of your loved ones." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Family Tree Photo Frame" } ], "sku": "HOM-BRD-FAM-044", "price": 17994, "stockOnHand": 77 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_43.jpg

echo "Processing 45/100: House Showpiece Plant"
curl -s -o /tmp/img_44.jpg "https://cdn.dummyjson.com/product-images/home-decoration/house-showpiece-plant/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_44.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "House Showpiece Plant", "slug": "prod-45-44", "description": "The House Showpiece Plant is an artificial plant that brings a touch of nature to your home without the need for maintenance. It adds greenery and style to any space." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "House Showpiece Plant" } ], "sku": "HOM-BRD-HOU-045", "price": 23994, "stockOnHand": 28 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_44.jpg

echo "Processing 46/100: Plant Pot"
curl -s -o /tmp/img_45.jpg "https://cdn.dummyjson.com/product-images/home-decoration/plant-pot/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_45.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Plant Pot", "slug": "prod-46-45", "description": "The Plant Pot is a stylish container for your favorite plants. With a sleek design, it complements your indoor or outdoor garden, adding a modern touch to your plant display." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Plant Pot" } ], "sku": "HOM-BRD-PLA-046", "price": 8994, "stockOnHand": 59 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_45.jpg

echo "Processing 47/100: Table Lamp"
curl -s -o /tmp/img_46.jpg "https://cdn.dummyjson.com/product-images/home-decoration/table-lamp/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_46.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Table Lamp", "slug": "prod-47-46", "description": "The Table Lamp is a functional and decorative lighting solution for your living space. With a modern design, it provides both ambient and task lighting, enhancing the atmosphere." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Table Lamp" } ], "sku": "HOM-BRD-TAB-047", "price": 29994, "stockOnHand": 9 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_46.jpg

echo "Processing 48/100: Bamboo Spatula"
curl -s -o /tmp/img_47.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/bamboo-spatula/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_47.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Bamboo Spatula", "slug": "prod-48-47", "description": "The Bamboo Spatula is a versatile kitchen tool made from eco-friendly bamboo. Ideal for flipping, stirring, and serving various dishes." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Bamboo Spatula" } ], "sku": "KIT-BRD-BAM-048", "price": 4794, "stockOnHand": 37 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_47.jpg

echo "Processing 49/100: Black Aluminium Cup"
curl -s -o /tmp/img_48.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/black-aluminium-cup/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_48.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Black Aluminium Cup", "slug": "prod-49-48", "description": "The Black Aluminium Cup is a stylish and durable cup suitable for both hot and cold beverages. Its sleek black design adds a modern touch to your drinkware collection." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Black Aluminium Cup" } ], "sku": "KIT-BRD-BLA-049", "price": 3594, "stockOnHand": 75 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_48.jpg

echo "Processing 50/100: Black Whisk"
curl -s -o /tmp/img_49.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/black-whisk/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_49.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Black Whisk", "slug": "prod-50-49", "description": "The Black Whisk is a kitchen essential for whisking and beating ingredients. Its ergonomic handle and sleek design make it a practical and stylish tool." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Black Whisk" } ], "sku": "KIT-BRD-BLA-050", "price": 5994, "stockOnHand": 73 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_49.jpg

echo "Processing 51/100: Boxed Blender"
curl -s -o /tmp/img_50.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/boxed-blender/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_50.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Boxed Blender", "slug": "prod-51-50", "description": "The Boxed Blender is a powerful and compact blender perfect for smoothies, shakes, and more. Its convenient design and multiple functions make it a versatile kitchen appliance." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Boxed Blender" } ], "sku": "KIT-BRD-BOX-051", "price": 23994, "stockOnHand": 9 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_50.jpg

echo "Processing 52/100: Carbon Steel Wok"
curl -s -o /tmp/img_51.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/carbon-steel-wok/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_51.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Carbon Steel Wok", "slug": "prod-52-51", "description": "The Carbon Steel Wok is a versatile cooking pan suitable for stir-frying, sautéing, and deep frying. Its sturdy construction ensures even heat distribution for delicious meals." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Carbon Steel Wok" } ], "sku": "KIT-BRD-CAR-052", "price": 17994, "stockOnHand": 40 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_51.jpg

echo "Processing 53/100: Chopping Board"
curl -s -o /tmp/img_52.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/chopping-board/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_52.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Chopping Board", "slug": "prod-53-52", "description": "The Chopping Board is an essential kitchen accessory for food preparation. Made from durable material, it provides a safe and hygienic surface for cutting and chopping." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Chopping Board" } ], "sku": "KIT-BRD-CHO-053", "price": 7794, "stockOnHand": 14 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_52.jpg

echo "Processing 54/100: Citrus Squeezer Yellow"
curl -s -o /tmp/img_53.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/citrus-squeezer-yellow/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_53.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Citrus Squeezer Yellow", "slug": "prod-54-53", "description": "The Citrus Squeezer in Yellow is a handy tool for extracting juice from citrus fruits. Its vibrant color adds a cheerful touch to your kitchen gadgets." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Citrus Squeezer Yellow" } ], "sku": "KIT-BRD-CIT-054", "price": 5394, "stockOnHand": 22 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_53.jpg

echo "Processing 55/100: Egg Slicer"
curl -s -o /tmp/img_54.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/egg-slicer/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_54.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Egg Slicer", "slug": "prod-55-54", "description": "The Egg Slicer is a convenient tool for slicing boiled eggs evenly. Its perfect for salads, sandwiches, and other dishes where sliced eggs are desired." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Egg Slicer" } ], "sku": "KIT-BRD-SLI-055", "price": 4194, "stockOnHand": 40 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_54.jpg

echo "Processing 56/100: Electric Stove"
curl -s -o /tmp/img_55.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/electric-stove/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_55.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Electric Stove", "slug": "prod-56-55", "description": "The Electric Stove provides a portable and efficient cooking solution. Ideal for small kitchens or as an additional cooking surface for various culinary needs." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Electric Stove" } ], "sku": "KIT-BRD-ELE-056", "price": 29994, "stockOnHand": 21 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_55.jpg

echo "Processing 57/100: Fine Mesh Strainer"
curl -s -o /tmp/img_56.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/fine-mesh-strainer/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_56.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Fine Mesh Strainer", "slug": "prod-57-56", "description": "The Fine Mesh Strainer is a versatile tool for straining liquids and sifting dry ingredients. Its fine mesh ensures efficient filtering for smooth cooking and baking." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Fine Mesh Strainer" } ], "sku": "KIT-BRD-FIN-057", "price": 5994, "stockOnHand": 85 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_56.jpg

echo "Processing 58/100: Fork"
curl -s -o /tmp/img_57.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/fork/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_57.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Fork", "slug": "prod-58-57", "description": "The Fork is a classic utensil for various dining and serving purposes. Its durable and ergonomic design makes it a reliable choice for everyday use." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Fork" } ], "sku": "KIT-BRD-FOR-058", "price": 2394, "stockOnHand": 7 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_57.jpg

echo "Processing 59/100: Glass"
curl -s -o /tmp/img_58.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/glass/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_58.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Glass", "slug": "prod-59-58", "description": "The Glass is a versatile and elegant drinking vessel suitable for a variety of beverages. Its clear design allows you to enjoy the colors and textures of your drinks." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Glass" } ], "sku": "KIT-BRD-GLA-059", "price": 2994, "stockOnHand": 46 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_58.jpg

echo "Processing 60/100: Grater Black"
curl -s -o /tmp/img_59.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/grater-black/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_59.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Grater Black", "slug": "prod-60-59", "description": "The Grater in Black is a handy kitchen tool for grating cheese, vegetables, and more. Its sleek design and sharp blades make food preparation efficient and easy." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Grater Black" } ], "sku": "KIT-BRD-GRA-060", "price": 6594, "stockOnHand": 84 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_59.jpg

echo "Processing 61/100: Hand Blender"
curl -s -o /tmp/img_60.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/hand-blender/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_60.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Hand Blender", "slug": "prod-61-60", "description": "The Hand Blender is a versatile kitchen appliance for blending, pureeing, and mixing. Its compact design and powerful motor make it a convenient tool for various recipes." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Hand Blender" } ], "sku": "KIT-BRD-HAN-061", "price": 20994, "stockOnHand": 84 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_60.jpg

echo "Processing 62/100: Ice Cube Tray"
curl -s -o /tmp/img_61.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/ice-cube-tray/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_61.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Ice Cube Tray", "slug": "prod-62-61", "description": "The Ice Cube Tray is a practical accessory for making ice cubes in various shapes. Perfect for keeping your drinks cool and adding a fun element to your beverages." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Ice Cube Tray" } ], "sku": "KIT-BRD-CUB-062", "price": 3594, "stockOnHand": 13 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_61.jpg

echo "Processing 63/100: Kitchen Sieve"
curl -s -o /tmp/img_62.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/kitchen-sieve/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_62.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Kitchen Sieve", "slug": "prod-63-62", "description": "The Kitchen Sieve is a versatile tool for sifting and straining dry and wet ingredients. Its fine mesh design ensures smooth results in your cooking and baking." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Kitchen Sieve" } ], "sku": "KIT-BRD-KIT-063", "price": 4794, "stockOnHand": 68 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_62.jpg

echo "Processing 64/100: Knife"
curl -s -o /tmp/img_63.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/knife/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_63.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Knife", "slug": "prod-64-63", "description": "The Knife is an essential kitchen tool for chopping, slicing, and dicing. Its sharp blade and ergonomic handle make it a reliable choice for food preparation." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Knife" } ], "sku": "KIT-BRD-KNI-064", "price": 8994, "stockOnHand": 7 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_63.jpg

echo "Processing 65/100: Lunch Box"
curl -s -o /tmp/img_64.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/lunch-box/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_64.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Lunch Box", "slug": "prod-65-64", "description": "The Lunch Box is a convenient and portable container for packing and carrying your meals. With compartments for different foods, its perfect for on-the-go dining." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Lunch Box" } ], "sku": "KIT-BRD-LUN-065", "price": 7794, "stockOnHand": 94 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_64.jpg

echo "Processing 66/100: Microwave Oven"
curl -s -o /tmp/img_65.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/microwave-oven/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_65.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Microwave Oven", "slug": "prod-66-65", "description": "The Microwave Oven is a versatile kitchen appliance for quick and efficient cooking, reheating, and defrosting. Its compact size makes it suitable for various kitchen setups." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Microwave Oven" } ], "sku": "KIT-BRD-MIC-066", "price": 53994, "stockOnHand": 59 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_65.jpg

echo "Processing 67/100: Mug Tree Stand"
curl -s -o /tmp/img_66.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/mug-tree-stand/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_66.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Mug Tree Stand", "slug": "prod-67-66", "description": "The Mug Tree Stand is a stylish and space-saving solution for organizing your mugs. Keep your favorite mugs easily accessible and neatly displayed in your kitchen." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Mug Tree Stand" } ], "sku": "KIT-BRD-TRE-067", "price": 9594, "stockOnHand": 88 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_66.jpg

echo "Processing 68/100: Pan"
curl -s -o /tmp/img_67.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/pan/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_67.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Pan", "slug": "prod-68-67", "description": "The Pan is a versatile and essential cookware item for frying, sautéing, and cooking various dishes. Its non-stick coating ensures easy food release and cleanup." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Pan" } ], "sku": "KIT-BRD-PRD-068", "price": 14994, "stockOnHand": 90 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_67.jpg

echo "Processing 69/100: Plate"
curl -s -o /tmp/img_68.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/plate/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_68.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Plate", "slug": "prod-69-68", "description": "The Plate is a classic and essential dishware item for serving meals. Its durable and stylish design makes it suitable for everyday use or special occasions." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Plate" } ], "sku": "KIT-BRD-PLA-069", "price": 2394, "stockOnHand": 66 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_68.jpg

echo "Processing 70/100: Red Tongs"
curl -s -o /tmp/img_69.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/red-tongs/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_69.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Red Tongs", "slug": "prod-70-69", "description": "The Red Tongs are versatile kitchen tongs suitable for various cooking and serving tasks. Their vibrant color adds a pop of excitement to your kitchen utensils." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Red Tongs" } ], "sku": "KIT-BRD-TON-070", "price": 4194, "stockOnHand": 82 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_69.jpg

echo "Processing 71/100: Silver Pot With Glass Cap"
curl -s -o /tmp/img_70.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/silver-pot-with-glass-cap/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_70.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Silver Pot With Glass Cap", "slug": "prod-71-70", "description": "The Silver Pot with Glass Cap is a stylish and functional cookware item for boiling, simmering, and preparing delicious meals. Its glass cap allows you to monitor cooking progress." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Silver Pot With Glass Cap" } ], "sku": "KIT-BRD-SIL-071", "price": 23994, "stockOnHand": 40 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_70.jpg

echo "Processing 72/100: Slotted Turner"
curl -s -o /tmp/img_71.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/slotted-turner/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_71.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Slotted Turner", "slug": "prod-72-71", "description": "The Slotted Turner is a kitchen utensil designed for flipping and turning food items. Its slotted design allows excess liquid to drain, making it ideal for frying and sautéing." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Slotted Turner" } ], "sku": "KIT-BRD-SLO-072", "price": 5394, "stockOnHand": 88 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_71.jpg

echo "Processing 73/100: Spice Rack"
curl -s -o /tmp/img_72.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/spice-rack/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_72.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Spice Rack", "slug": "prod-73-72", "description": "The Spice Rack is a convenient organizer for your spices and seasonings. Keep your kitchen essentials within reach and neatly arranged with this stylish spice rack." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Spice Rack" } ], "sku": "KIT-BRD-SPI-073", "price": 11994, "stockOnHand": 79 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_72.jpg

echo "Processing 74/100: Spoon"
curl -s -o /tmp/img_73.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/spoon/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_73.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Spoon", "slug": "prod-74-73", "description": "The Spoon is a versatile kitchen utensil for stirring, serving, and tasting. Its ergonomic design and durable construction make it an essential tool for every kitchen." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Spoon" } ], "sku": "KIT-BRD-SPO-074", "price": 2994, "stockOnHand": 59 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_73.jpg

echo "Processing 75/100: Tray"
curl -s -o /tmp/img_74.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/tray/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_74.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Tray", "slug": "prod-75-74", "description": "The Tray is a functional and decorative item for serving snacks, appetizers, or drinks. Its stylish design makes it a versatile accessory for entertaining guests." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Tray" } ], "sku": "KIT-BRD-TRA-075", "price": 10194, "stockOnHand": 71 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_74.jpg

echo "Processing 76/100: Wooden Rolling Pin"
curl -s -o /tmp/img_75.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/wooden-rolling-pin/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_75.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Wooden Rolling Pin", "slug": "prod-76-75", "description": "The Wooden Rolling Pin is a classic kitchen tool for rolling out dough for baking. Its smooth surface and sturdy handles make it easy to achieve uniform thickness." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Wooden Rolling Pin" } ], "sku": "KIT-BRD-WOO-076", "price": 7194, "stockOnHand": 80 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_75.jpg

echo "Processing 77/100: Yellow Peeler"
curl -s -o /tmp/img_76.jpg "https://cdn.dummyjson.com/product-images/kitchen-accessories/yellow-peeler/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_76.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Yellow Peeler", "slug": "prod-77-76", "description": "The Yellow Peeler is a handy tool for peeling fruits and vegetables with ease. Its bright yellow color adds a cheerful touch to your kitchen gadgets." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Yellow Peeler" } ], "sku": "KIT-BRD-YEL-077", "price": 3594, "stockOnHand": 35 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MAISON_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_76.jpg

echo "Processing 78/100: Apple MacBook Pro 14 Inch Space Grey"
curl -s -o /tmp/img_77.jpg "https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_77.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Apple MacBook Pro 14 Inch Space Grey", "slug": "prod-78-77", "description": "The MacBook Pro 14 Inch in Space Grey is a powerful and sleek laptop, featuring Apples M1 Pro chip for exceptional performance and a stunning Retina display." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Apple MacBook Pro 14 Inch Space Grey" } ], "sku": "LAP-APP-APP-078", "price": 1199994, "stockOnHand": 24 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$TECH_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_77.jpg

echo "Processing 79/100: Asus Zenbook Pro Dual Screen Laptop"
curl -s -o /tmp/img_78.jpg "https://cdn.dummyjson.com/product-images/laptops/asus-zenbook-pro-dual-screen-laptop/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_78.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Asus Zenbook Pro Dual Screen Laptop", "slug": "prod-79-78", "description": "The Asus Zenbook Pro Dual Screen Laptop is a high-performance device with dual screens, providing productivity and versatility for creative professionals." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Asus Zenbook Pro Dual Screen Laptop" } ], "sku": "LAP-ASU-ASU-079", "price": 1079994, "stockOnHand": 45 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$TECH_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_78.jpg

echo "Processing 80/100: Huawei Matebook X Pro"
curl -s -o /tmp/img_79.jpg "https://cdn.dummyjson.com/product-images/laptops/huawei-matebook-x-pro/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_79.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Huawei Matebook X Pro", "slug": "prod-80-79", "description": "The Huawei Matebook X Pro is a slim and stylish laptop with a high-resolution touchscreen display, offering a premium experience for users on the go." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Huawei Matebook X Pro" } ], "sku": "LAP-HUA-HUA-080", "price": 839994, "stockOnHand": 75 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$TECH_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_79.jpg

echo "Processing 81/100: Lenovo Yoga 920"
curl -s -o /tmp/img_80.jpg "https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_80.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Lenovo Yoga 920", "slug": "prod-81-80", "description": "The Lenovo Yoga 920 is a 2-in-1 convertible laptop with a flexible hinge, allowing you to use it as a laptop or tablet, offering versatility and portability." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Lenovo Yoga 920" } ], "sku": "LAP-LEN-LEN-081", "price": 659994, "stockOnHand": 40 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$TECH_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_80.jpg

echo "Processing 82/100: New DELL XPS 13 9300 Laptop"
curl -s -o /tmp/img_81.jpg "https://cdn.dummyjson.com/product-images/laptops/new-dell-xps-13-9300-laptop/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_81.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "New DELL XPS 13 9300 Laptop", "slug": "prod-82-81", "description": "The New DELL XPS 13 9300 Laptop is a compact and powerful device, featuring a virtually borderless InfinityEdge display and high-end performance for various tasks." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "New DELL XPS 13 9300 Laptop" } ], "sku": "LAP-DEL-DEL-082", "price": 899994, "stockOnHand": 74 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$TECH_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_81.jpg

echo "Processing 83/100: Blue & Black Check Shirt"
curl -s -o /tmp/img_82.jpg "https://cdn.dummyjson.com/product-images/mens-shirts/blue-&-black-check-shirt/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_82.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Blue & Black Check Shirt", "slug": "prod-83-82", "description": "The Blue & Black Check Shirt is a stylish and comfortable mens shirt featuring a classic check pattern. Made from high-quality fabric, its suitable for both casual and semi-formal occasions." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Blue & Black Check Shirt" } ], "sku": "MEN-FAS-BLU-083", "price": 17994, "stockOnHand": 38 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_82.jpg

echo "Processing 84/100: Gigabyte Aorus Men Tshirt"
curl -s -o /tmp/img_83.jpg "https://cdn.dummyjson.com/product-images/mens-shirts/gigabyte-aorus-men-tshirt/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_83.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Gigabyte Aorus Men Tshirt", "slug": "prod-84-83", "description": "The Gigabyte Aorus Men Tshirt is a cool and casual shirt for gaming enthusiasts. With the Aorus logo and sleek design, its perfect for expressing your gaming style." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Gigabyte Aorus Men Tshirt" } ], "sku": "MEN-GIG-GIG-084", "price": 14994, "stockOnHand": 90 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_83.jpg

echo "Processing 85/100: Man Plaid Shirt"
curl -s -o /tmp/img_84.jpg "https://cdn.dummyjson.com/product-images/mens-shirts/man-plaid-shirt/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_84.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Man Plaid Shirt", "slug": "prod-85-84", "description": "The Man Plaid Shirt is a timeless and versatile mens shirt with a classic plaid pattern. Its comfortable fit and casual style make it a wardrobe essential for various occasions." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Man Plaid Shirt" } ], "sku": "MEN-CLA-PLA-085", "price": 20994, "stockOnHand": 82 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_84.jpg

echo "Processing 86/100: Man Short Sleeve Shirt"
curl -s -o /tmp/img_85.jpg "https://cdn.dummyjson.com/product-images/mens-shirts/man-short-sleeve-shirt/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_85.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Man Short Sleeve Shirt", "slug": "prod-86-85", "description": "The Man Short Sleeve Shirt is a breezy and stylish option for warm days. With a comfortable fit and short sleeves, its perfect for a laid-back yet polished look." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Man Short Sleeve Shirt" } ], "sku": "MEN-CAS-SHO-086", "price": 11994, "stockOnHand": 2 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_85.jpg

echo "Processing 87/100: Men Check Shirt"
curl -s -o /tmp/img_86.jpg "https://cdn.dummyjson.com/product-images/mens-shirts/men-check-shirt/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_86.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Men Check Shirt", "slug": "prod-87-86", "description": "The Men Check Shirt is a classic and versatile shirt featuring a stylish check pattern. Suitable for various occasions, it adds a smart and polished touch to your wardrobe." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Men Check Shirt" } ], "sku": "MEN-URB-CHE-087", "price": 16794, "stockOnHand": 95 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_86.jpg

echo "Processing 88/100: Nike Air Jordan 1 Red And Black"
curl -s -o /tmp/img_87.jpg "https://cdn.dummyjson.com/product-images/mens-shoes/nike-air-jordan-1-red-and-black/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_87.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Nike Air Jordan 1 Red And Black", "slug": "prod-88-87", "description": "The Nike Air Jordan 1 in Red and Black is an iconic basketball sneaker known for its stylish design and high-performance features, making it a favorite among sneaker enthusiasts and athletes." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Nike Air Jordan 1 Red And Black" } ], "sku": "MEN-NIK-NIK-088", "price": 89994, "stockOnHand": 7 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_87.jpg

echo "Processing 89/100: Nike Baseball Cleats"
curl -s -o /tmp/img_88.jpg "https://cdn.dummyjson.com/product-images/mens-shoes/nike-baseball-cleats/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_88.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Nike Baseball Cleats", "slug": "prod-89-88", "description": "Nike Baseball Cleats are designed for maximum traction and performance on the baseball field. They provide stability and support for players during games and practices." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Nike Baseball Cleats" } ], "sku": "MEN-NIK-NIK-089", "price": 47994, "stockOnHand": 12 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_88.jpg

echo "Processing 90/100: Puma Future Rider Trainers"
curl -s -o /tmp/img_89.jpg "https://cdn.dummyjson.com/product-images/mens-shoes/puma-future-rider-trainers/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_89.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Puma Future Rider Trainers", "slug": "prod-90-89", "description": "The Puma Future Rider Trainers offer a blend of retro style and modern comfort. Perfect for casual wear, these trainers provide a fashionable and comfortable option for everyday use." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Puma Future Rider Trainers" } ], "sku": "MEN-PUM-PUM-090", "price": 53994, "stockOnHand": 90 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_89.jpg

echo "Processing 91/100: Sports Sneakers Off White & Red"
curl -s -o /tmp/img_90.jpg "https://cdn.dummyjson.com/product-images/mens-shoes/sports-sneakers-off-white-&-red/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_90.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Sports Sneakers Off White & Red", "slug": "prod-91-90", "description": "The Sports Sneakers in Off White and Red combine style and functionality, making them a fashionable choice for sports enthusiasts. The red and off-white color combination adds a bold and energetic touch." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Sports Sneakers Off White & Red" } ], "sku": "MEN-OFF-SPO-091", "price": 71994, "stockOnHand": 17 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_90.jpg

echo "Processing 92/100: Sports Sneakers Off White Red"
curl -s -o /tmp/img_91.jpg "https://cdn.dummyjson.com/product-images/mens-shoes/sports-sneakers-off-white-red/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_91.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Sports Sneakers Off White Red", "slug": "prod-92-91", "description": "Another variant of the Sports Sneakers in Off White Red, featuring a unique design. These sneakers offer style and comfort for casual occasions." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Sports Sneakers Off White Red" } ], "sku": "MEN-OFF-SPO-092", "price": 65994, "stockOnHand": 62 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_91.jpg

echo "Processing 93/100: Brown Leather Belt Watch"
curl -s -o /tmp/img_92.jpg "https://cdn.dummyjson.com/product-images/mens-watches/brown-leather-belt-watch/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_92.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Brown Leather Belt Watch", "slug": "prod-93-92", "description": "The Brown Leather Belt Watch is a stylish timepiece with a classic design. Featuring a genuine leather strap and a sleek dial, it adds a touch of sophistication to your look." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Brown Leather Belt Watch" } ], "sku": "MEN-FAS-BRO-093", "price": 53994, "stockOnHand": 32 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_92.jpg

echo "Processing 94/100: Longines Master Collection"
curl -s -o /tmp/img_93.jpg "https://cdn.dummyjson.com/product-images/mens-watches/longines-master-collection/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_93.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Longines Master Collection", "slug": "prod-94-93", "description": "The Longines Master Collection is an elegant and refined watch known for its precision and craftsmanship. With a timeless design, its a symbol of luxury and sophistication." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Longines Master Collection" } ], "sku": "MEN-LON-LON-094", "price": 899994, "stockOnHand": 100 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_93.jpg

echo "Processing 95/100: Rolex Cellini Date Black Dial"
curl -s -o /tmp/img_94.jpg "https://cdn.dummyjson.com/product-images/mens-watches/rolex-cellini-date-black-dial/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_94.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Rolex Cellini Date Black Dial", "slug": "prod-95-94", "description": "The Rolex Cellini Date with Black Dial is a classic and prestigious watch. With a black dial and date complication, it exudes sophistication and is a symbol of Rolexs heritage." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Rolex Cellini Date Black Dial" } ], "sku": "MEN-ROL-ROL-095", "price": 5399994, "stockOnHand": 40 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_94.jpg

echo "Processing 96/100: Rolex Cellini Moonphase"
curl -s -o /tmp/img_95.jpg "https://cdn.dummyjson.com/product-images/mens-watches/rolex-cellini-moonphase/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_95.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Rolex Cellini Moonphase", "slug": "prod-96-95", "description": "The Rolex Cellini Moonphase is a masterpiece of horology, featuring a moon phase complication and exquisite design. It reflects Rolexs commitment to precision and elegance." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Rolex Cellini Moonphase" } ], "sku": "MEN-ROL-ROL-096", "price": 7799994, "stockOnHand": 36 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_95.jpg

echo "Processing 97/100: Rolex Datejust"
curl -s -o /tmp/img_96.jpg "https://cdn.dummyjson.com/product-images/mens-watches/rolex-datejust/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_96.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Rolex Datejust", "slug": "prod-97-96", "description": "The Rolex Datejust is an iconic and versatile timepiece with a date window. Known for its timeless design and reliability, its a symbol of Rolexs watchmaking excellence." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Rolex Datejust" } ], "sku": "MEN-ROL-ROL-097", "price": 6599994, "stockOnHand": 86 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_96.jpg

echo "Processing 98/100: Rolex Submariner Watch"
curl -s -o /tmp/img_97.jpg "https://cdn.dummyjson.com/product-images/mens-watches/rolex-submariner-watch/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_97.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Rolex Submariner Watch", "slug": "prod-98-97", "description": "The Rolex Submariner is a legendary dive watch with a rich history. Known for its durability and water resistance, its a symbol of adventure and exploration." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Rolex Submariner Watch" } ], "sku": "MEN-ROL-ROL-098", "price": 8399994, "stockOnHand": 55 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$MODE_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_97.jpg

echo "Processing 99/100: Amazon Echo Plus"
curl -s -o /tmp/img_98.jpg "https://cdn.dummyjson.com/product-images/mobile-accessories/amazon-echo-plus/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_98.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Amazon Echo Plus", "slug": "prod-99-98", "description": "The Amazon Echo Plus is a smart speaker with built-in Alexa voice control. It features premium sound quality and serves as a hub for controlling smart home devices." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Amazon Echo Plus" } ], "sku": "MOB-AMA-AMA-099", "price": 59994, "stockOnHand": 61 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$TECH_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_98.jpg

echo "Processing 100/100: Apple Airpods"
curl -s -o /tmp/img_99.jpg "https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods/thumbnail.webp"

ASSET_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -F operations='{"query":"mutation CreateAssets(\$input: [CreateAssetInput!]!) { createAssets(input: \$input) { ... on Asset { id } } }","variables":{"input":[{"file":null}]}}' \
  -F map='{"0":["variables.input.0.file"]}' \
  -F 0=@/tmp/img_99.jpg)

ASSET_ID=$(echo \$ASSET_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4)

PROD_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProduct(\$input: CreateProductInput!) { createProduct(input: \$input) { ... on Product { id } } }", "variables": { "input": { "translations": [ { "languageCode": "fr", "name": "Apple Airpods", "slug": "prod-100-99", "description": "The Apple Airpods offer a seamless wireless audio experience. With easy pairing, high-quality sound, and Siri integration, they are perfect for on-the-go listening." } ], "assetIds": ["\$ASSET_ID"] } }}
EOF
)

PROD_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
  -H "Content-Type: application/json" \
  -d "\$PROD_PAYLOAD")

PROD_ID=$(echo \$PROD_RES | grep -o '"id":"[0-9]*"' | cut -d'"' -f4 | head -n 1)

if [ ! -z "\$PROD_ID" ]; then
    VAR_PAYLOAD=$(cat <<EOF
{"query":"mutation CreateProductVariant(\$input: [CreateProductVariantInput!]!) { createProductVariants(input: \$input) { ... on ProductVariant { id } } }", "variables": { "input": [ { "productId": "\$PROD_ID", "translations": [ { "languageCode": "fr", "name": "Apple Airpods" } ], "sku": "MOB-APP-APP-100", "price": 77994, "stockOnHand": 67 } ] }}
EOF
)
    VAR_RES=$(curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$VAR_PAYLOAD")
      
    COL_PAYLOAD=$(cat <<EOF
{"query":"mutation AssignCollection(\$colId: ID!, \$prodIds: [ID!]!) { addProductsToCollection(collectionId: \$colId, productIds: \$prodIds) { id } }", "variables": { "colId": "$TECH_COL_ID", "prodIds": ["\$PROD_ID"] }}
EOF
)
    curl -s -b /tmp/seed_cookie.txt -X POST http://localhost:32887/admin-api \
      -H "Content-Type: application/json" \
      -d "\$COL_PAYLOAD" > /dev/null
fi

rm /tmp/img_99.jpg

echo "Finished importing 100 products."
