import urllib.request
import json
import time

SHOP_URL = 'http://localhost:3000/shop-api'

def run_gql(query, variables=None):
    payload = json.dumps({'query': query, 'variables': variables or {}}).encode('utf-8')
    req = urllib.request.Request(SHOP_URL, data=payload, headers={'Content-Type': 'application/json'})
    t0 = time.time()
    try:
        resp = urllib.request.urlopen(req)
        raw = resp.read()
        t1 = time.time()
        return t1 - t0, len(raw), json.loads(raw.decode('utf-8'))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        return 0, 0, {"error": err_msg}

dead_local_query = """
query GetLocalProducts {
    vendors(options: { filter: { status: { eq: "APPROVED" } }, take: 100 }) {
        items {
            id
            name
            physicalMarket { id name }
            location { id name }
            products {
                id
                name
                slug
                variants {
                    id
                    name
                    priceWithTax
                }
            }
        }
    }
}
"""

search_query = """
query GetCandidatesForLocal($take: Int!) {
    search(input: { take: $take, groupByProduct: false }) {
        items {
            productId
            productVariantId
            productName
            productVariantName
            slug
            productAsset { id preview }
            productVariantAsset { id preview }
            priceWithTax {
                __typename
                ... on SinglePrice { value }
                ... on PriceRange { min max }
            }
            inStock
        }
    }
}
"""

offers_query = """
query GetLocalSellerOffers($variantIds: [ID!]!) {
    sellerOffersForVariants(variantIds: $variantIds) {
        id
        price
        stock
        onPromotion
        promotionalPrice
        condition
        deliveryTimeValue
        deliveryTimeUnit
        featuredAsset { id preview }
        vendor {
            id
            name
            phoneNumber
            latitude
            longitude
            verificationStatus
            rating
            ratingCount
            logo { preview }
            location { id name }
            physicalMarket { id name }
        }
        productVariant {
            id
            name
            sku
            featuredAsset { id preview }
            options { id name code group { id name } }
            product {
                id
                name
                slug
                featuredAsset { id preview }
            }
        }
    }
}
"""

print("--- Testing Baseline Performance ---")
t_dead, sz_dead, d_dead = run_gql(dead_local_query)
print(f"1. Dead localQuery: {t_dead:.3f}s, size: {sz_dead/1024:.1f} KB")

t_search48, sz_search48, d_search48 = run_gql(search_query, {"take": 48})
items48 = d_search48.get("data", {}).get("search", {}).get("items", [])
print(f"2. Search (take=48): {t_search48:.3f}s, size: {sz_search48/1024:.1f} KB, items: {len(items48)}")

v_ids48 = list(set([str(i["productVariantId"]) for i in items48 if i.get("productVariantId")]))
t_off48, sz_off48, d_off48 = run_gql(offers_query, {"variantIds": v_ids48})
offers48 = d_off48.get("data", {}).get("sellerOffersForVariants", [])
print(f"3. SellerOffers (for {len(v_ids48)} variants): {t_off48:.3f}s, size: {sz_off48/1024:.1f} KB, offers: {len(offers48)}")

total_old = t_dead + t_search48 + t_off48
# If run in parallel: max(t_dead, t_search48) + t_off48
parallel_old = max(t_dead, t_search48) + t_off48
print(f"Baseline Cold Load Backend Time: ~{parallel_old:.3f}s (Total network payload: {(sz_dead + sz_search48 + sz_off48)/1024:.1f} KB)")

# Now test optimized: No dead query, candidate take=16
print("\n--- Testing Optimized Performance ---")
t_search16, sz_search16, d_search16 = run_gql(search_query, {"take": 16})
items16 = d_search16.get("data", {}).get("search", {}).get("items", [])
v_ids16 = list(set([str(i["productVariantId"]) for i in items16 if i.get("productVariantId")]))[:16]
t_off16, sz_off16, d_off16 = run_gql(offers_query, {"variantIds": v_ids16})
offers16 = d_off16.get("data", {}).get("sellerOffersForVariants", [])
print(f"1. Search (take=16): {t_search16:.3f}s, size: {sz_search16/1024:.1f} KB, items: {len(items16)}")
print(f"2. SellerOffers (for {len(v_ids16)} variants): {t_off16:.3f}s, size: {sz_off16/1024:.1f} KB, offers: {len(offers16)}")
total_new = t_search16 + t_off16
print(f"Optimized Cold Load Backend Time: {total_new:.3f}s (Total network payload: {(sz_search16 + sz_off16)/1024:.1f} KB)")
print(f"Payload reduction: -{100*(1 - (sz_search16 + sz_off16)/(sz_dead + sz_search48 + sz_off48)):.1f}%")
print(f"Time reduction: -{100*(1 - total_new/parallel_old):.1f}%")
