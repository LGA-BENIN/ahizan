import urllib.request
import json
import http.cookiejar

ADMIN_URL = "http://localhost:3000/admin-api"

# Setup cookie jar and opener
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def gql_request(query, variables=None, auth_token=None):
    payload = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["vendure-auth-token"] = auth_token
        headers["Authorization"] = f"Bearer {auth_token}"
    req = urllib.request.Request(ADMIN_URL, data=payload, headers=headers)
    try:
        resp = opener.open(req)
        token = resp.headers.get("vendure-auth-token")
        data = json.loads(resp.read().decode("utf-8"))
        return data, token
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode("utf-8"))
        return None, None

login_mutation = """
mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
        __typename
        ... on CurrentUser {
            id
            identifier
        }
        ... on ErrorResult {
            message
        }
    }
}
"""

print("1. Authenticating as SuperAdmin...")
login_res, token = gql_request(login_mutation, {
    "username": "superadmin",
    "password": "AhizanSecureAdmin2026!"
})
print("Login result:", login_res)
print("Auth token:", token)

create_collection_mutation = """
mutation CreateCollection($input: CreateCollectionInput!) {
    createCollection(input: $input) {
        id
        name
        slug
        parentId
    }
}
"""

# Let's verify collections to create:
# 1. Root: "Mode & Vêtements" (or "Mode & Habillement") under root (id: "1")
# 2. Main Sub-collection: "Pagnes & Tissus Africains" under root
# 3. Sub-categories under "Pagnes & Tissus Africains":
#    - "Pagne Wax"
#    - "Pagne Tissé Traditionnel"
#    - "Bazin Riche & Dentelles"
#    - "Tenues & Prêt-à-porter en Pagne"

def create_col(name, slug, description, parent_id):
    inp = {
        "isPrivate": False,
        "parentId": str(parent_id),
        "translations": [
            {
                "languageCode": "fr",
                "name": name,
                "slug": slug,
                "description": description
            }
        ],
        "filters": []
    }
    res, _ = gql_request(create_collection_mutation, {"input": inp}, auth_token=token)
    if res and "data" in res and res["data"]["createCollection"]:
        col = res["data"]["createCollection"]
        print(f"  [SUCCESS] Créé : {col['name']} (ID: {col['id']}, slug: {col['slug']}, parent: {col['parentId']})")
        return col["id"]
    else:
        print(f"  [ERROR] Échec création de {name}:", res)
        return None

print("\n2. Création de la structure de collections (Option 1)...")

# A. Grand Rayon Racine
mode_id = create_col(
    name="Mode & Vêtements",
    slug="mode-vetements",
    description="Vêtements, pagnes traditionnels, tenues et accessoires de mode africaine et contemporaine.",
    parent_id="1"
)

if mode_id:
    # B. Collection Pagnes & Tissus Africains
    pagne_id = create_col(
        name="Pagnes & Tissus Africains",
        slug="pagnes-tissus-africains",
        description="Collection de pagnes wax, pagnes tissés traditionnels, bazins et tissus africains authentiques.",
        parent_id=mode_id
    )

    if pagne_id:
        # C. Sous-catégories spécialisées
        create_col(
            name="Pagne Wax",
            slug="pagne-wax",
            description="Pagnes Wax de qualité supérieure (Hollandais, Woodin, Uniwax, etc.).",
            parent_id=pagne_id
        )
        create_col(
            name="Pagne Tissé Traditionnel",
            slug="pagne-tisse-traditionnel",
            description="Pagne tissé artisanal et traditionnel (Kanvô du Bénin, Faso Dan Fani, Baoulé, etc.).",
            parent_id=pagne_id
        )
        create_col(
            name="Bazin Riche & Dentelles",
            slug="bazin-riche-dentelles",
            description="Bazin riche teinté, brodé, soies et dentelles raffinées.",
            parent_id=pagne_id
        )
        create_col(
            name="Tenues & Prêt-à-porter en Pagne",
            slug="tenues-pret-a-porter-pagne",
            description="Robes, chemises, ensembles et tenues confectionnées en pagne pour hommes, femmes et enfants.",
            parent_id=pagne_id
        )

print("\nStructure créée avec succès !")
