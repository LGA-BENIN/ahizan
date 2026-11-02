import urllib.request
import json
import http.cookiejar

ADMIN_URL = "http://localhost:3000/admin-api"

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def gql(query, variables=None, auth_token=None):
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

create_col_mutation = """
mutation CreateCollection($input: CreateCollectionInput!) {
    createCollection(input: $input) {
        id
        name
        slug
        parentId
    }
}
"""

print("1. Connexion en tant que SuperAdmin...")
login_res, token = gql(login_mutation, {
    "username": "superadmin",
    "password": "superadmin"
})

if not token and not (login_res and "data" in login_res and login_res["data"].get("login", {}).get("identifier")):
    print("Échec de connexion:", login_res)
    exit(1)

print("  Connecté avec succès !")

# Cache of created collections to avoid duplicates
created_collections = {}

def create_collection(name, slug, description, parent_id):
    key = f"{parent_id}:{slug}"
    if key in created_collections:
        return created_collections[key]

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
    res, _ = gql(create_col_mutation, {"input": inp}, auth_token=token)
    if res and "data" in res and res["data"].get("createCollection"):
        col = res["data"]["createCollection"]
        cid = col["id"]
        created_collections[key] = cid
        print(f"  [OK] {name} (ID: {cid}, Parent: {parent_id}, Slug: {slug})")
        return cid
    else:
        print(f"  [ERREUR] Impossible de créer '{name}':", res)
        return None

print("\n2. Création de l'arborescence complète Mode & Pagnes (Niveau 1, 2, 3 et 4)...")

# --- NIVEAU 1 : Rayon Racine ---
root_id = create_collection(
    name="Mode & Habillement",
    slug="mode-habillement",
    description="Rayon principal de la mode, vêtements, pagnes traditionnels et accessoires en Afrique.",
    parent_id="1"
)

if not root_id:
    print("Erreur création niveau 1. Arrêt.")
    exit(1)

# --- NIVEAU 2 : Grand rayon dédié aux Pagnes & Tissus ---
pagne_root_id = create_collection(
    name="Pagnes & Tissus Africains",
    slug="pagnes-tissus-africains",
    description="Tous les pagnes wax, pagnes tissés traditionnels, bazins et tissus de confection.",
    parent_id=root_id
)

# Structure arborescente détaillée (Niveau 3 & 4)
tree = [
    {
        "name": "Pagne Wax",
        "slug": "pagne-wax",
        "description": "Pagnes Wax imprimés de haute qualité pour toutes vos cérémonies et confections.",
        "children": [
            {
                "name": "Wax Hollandais (Vlisco)",
                "slug": "wax-hollandais-vlisco",
                "description": "Véritables pagnes Wax Hollandais Vlisco 6 yards authentiques."
            },
            {
                "name": "Wax Woodin & Uniwax",
                "slug": "wax-woodin-uniwax",
                "description": "Collections originales Woodin et Uniwax modernes et colorées."
            },
            {
                "name": "Wax Imprimé & Hitarget",
                "slug": "wax-imprime-hitarget",
                "description": "Pagnes imprimés grande résistance, Hitarget et cotons de qualité."
            },
            {
                "name": "Super Wax & Java",
                "slug": "super-wax-java",
                "description": "Super Wax raffiné, Java et pagnes de prestige pour grandes occasions."
            }
        ]
    },
    {
        "name": "Pagne Tissé & Traditionnel",
        "slug": "pagne-tisse-traditionnel",
        "description": "Pagnes tissés à la main au métier à tisser traditionnel par nos maîtres tisserands.",
        "children": [
            {
                "name": "Kanvô (Pagne Tissé du Bénin)",
                "slug": "kanvo-benin",
                "description": "Le véritable Kanvô béninois tissé à la main, symbole d'élégance et d'identité."
            },
            {
                "name": "Faso Dan Fani & Kente",
                "slug": "faso-dan-fani-kente",
                "description": "Faso Dan Fani, Kente royal ghanéen et étoffes artisanales ouest-africaines."
            },
            {
                "name": "Pagne Baoulé & Bogolan",
                "slug": "pagne-baoule-bogolan",
                "description": "Pagne Baoulé de Côte d'Ivoire, Bogolan malien teinté à l'argile naturelle."
            },
            {
                "name": "Pagne Tissé Cérémonie & Mariage",
                "slug": "pagne-tisse-ceremonie",
                "description": "Parures tissées prestigieuses pour mariages coutumiers, dots et cérémonies."
            }
        ]
    },
    {
        "name": "Bazin, Soie & Dentelles",
        "slug": "bazin-soie-dentelles",
        "description": "Tissus nobles et précieux pour boubous de fête et tenues de prestige.",
        "children": [
            {
                "name": "Bazin Riche Getzner & Teinté",
                "slug": "bazin-riche-teinte",
                "description": "Bazin riche 100% coton, teinté artisanalement aux motifs éclatants."
            },
            {
                "name": "Dentelle & Voile Suisse",
                "slug": "dentelle-voile-suisse",
                "description": "Dentelles haut de gamme, voile suisse fin et broderies de luxe."
            },
            {
                "name": "Soie, Satin & Mousseline",
                "slug": "soie-satin-mousseline",
                "description": "Étoffes soyeuses légères et fluides pour robes et voiles."
            },
            {
                "name": "Guipure & Tissus Perlés",
                "slug": "guipure-tissus-perles",
                "description": "Guipures travaillées et tissus incrustés de perles et strass."
            }
        ]
    },
    {
        "name": "Tenues & Prêt-à-porter en Pagne",
        "slug": "tenues-pret-a-porter-pagne",
        "description": "Vêtements cousus et confectionnés par nos créateurs locaux à partir de pagnes authentiques.",
        "children": [
            {
                "name": "Robes & Ensembles Dame en Pagne",
                "slug": "robes-ensembles-dame-pagne",
                "description": "Robes droites, évasées, sirènes, ensembles jupes et pantalons en pagne."
            },
            {
                "name": "Chemises & Ensembles Homme en Pagne",
                "slug": "chemises-ensembles-homme-pagne",
                "description": "Chemises modernes en pagne, costumes africains et ensembles masculins."
            },
            {
                "name": "Tenues Enfants en Pagne",
                "slug": "tenues-enfants-pagne",
                "description": "Jolies tenues, robes et chemisettes en pagne wax pour garçons et filles."
            },
            {
                "name": "Kimonos, Vestes & Mixte",
                "slug": "kimonos-vestes-pagne",
                "description": "Vestes d'inspiration afro-urbaine, kimonos en pagne et créations mixtes."
            }
        ]
    },
    {
        "name": "Accessoires en Pagne & Artisanat",
        "slug": "accessoires-pagne-artisanat",
        "description": "Accessoires de mode et maroquinerie confectionnés avec des finitions en pagne.",
        "children": [
            {
                "name": "Sacs & Pochettes en Pagne",
                "slug": "sacs-pochettes-pagne",
                "description": "Sacs à main, cabas, sacs à dos et pochettes de soirée habillées de pagne."
            },
            {
                "name": "Chaussures & Sandales en Pagne",
                "slug": "chaussures-sandales-pagne",
                "description": "Babouches, sandales, espadrilles et escarpins ornés de pagne wax ou tissé."
            },
            {
                "name": "Foulards, Turbans & Bonnets",
                "slug": "foulards-turbans-pagne",
                "description": "Attaches de tête, foulards assortis, turbans et bonnets en satin wax."
            },
            {
                "name": "Bijoux & Parures en Tissu",
                "slug": "bijoux-parures-pagne",
                "description": "Colliers plastrons, bracelets, boucles d'oreilles et nœuds papillon en pagne."
            }
        ]
    }
]

# Exécution de la création
summary = []

for sub in tree:
    sub_id = create_collection(
        name=sub["name"],
        slug=sub["slug"],
        description=sub["description"],
        parent_id=pagne_root_id
    )
    if sub_id:
        sub_summary = {"name": sub["name"], "id": sub_id, "slug": sub["slug"], "children": []}
        for subsub in sub["children"]:
            subsub_id = create_collection(
                name=subsub["name"],
                slug=subsub["slug"],
                description=subsub["description"],
                parent_id=sub_id
            )
            if subsub_id:
                sub_summary["children"].append({"name": subsub["name"], "id": subsub_id, "slug": subsub["slug"]})
        summary.append(sub_summary)

print("\n" + "="*60)
print("RÉCAPITULATIF DE LA HIÉRARCHIE CRÉÉE :")
print("="*60)
print(f"RAYON RACINE (Niveau 1) : Mode & Habillement (ID: {root_id})")
print(f"  └── GRANDE COLLECTION (Niveau 2) : Pagnes & Tissus Africains (ID: {pagne_root_id})")
for s in summary:
    print(f"        ├── [Niveau 3] {s['name']} (ID: {s['id']})")
    for c in s["children"]:
        print(f"        │     └── [Niveau 4] {c['name']} (ID: {c['id']})")
print("="*60)
