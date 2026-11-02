import urllib.request
import json
import time

url = "https://api.ahizan.com/shop-api"

query = """
query GetSellerOffersForVariants($variantIds: [ID!]!) {
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
            options {
                id
                name
                code
                group { id name }
            }
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

payload = json.dumps({
    "query": query,
    "variables": {"variantIds": ["77", "164", "165", "216", "218", "219", "220", "221", "222", "677"]}
}).encode("utf-8")

req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
start = time.time()
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = resp.read()
        elapsed = time.time() - start
        data = json.loads(body)
        offers = data.get("data", {}).get("sellerOffersForVariants", [])
        print(f"Time: {elapsed:.2f}s | Size: {len(body)/1024:.1f} KB | Offers: {len(offers)}")
except Exception as e:
    print("Error:", e)
