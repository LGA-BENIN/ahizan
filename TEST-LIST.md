# TESTS AHIZAN - BACKEND

## 1.1 Vendor CRUD Admin (16 tests)
createVendor(tous champs/sans email->placeholder/avec password->User+Admin+Customer/avec userId/sans rien->erreur)
vendor(ID)/vendor(inexistant->null)
vendors(pagine/filtre status/zone/type/tri)
updateVendor(champs/commissionRate)
upload fichiers(logo/cover/rccm/ifu/idCard)

## 1.2 Vendor Registration Shop (12)
applyToBecomeVendor(auth->userId/avec password->compte+PENDING/sans rien->erreur)
dynamicDetails/champs legaux+fichiers/sociaux/paiement(MOBILE_MONEY/BANK/CASH)
validation(champs manquants/auto-approbation/email duplique/Role Vendor assigne)

## 1.3 Status Transitions (8)
updateVendorStatus(APPROVED/REJECTED+reason/SUSPENDED)
notifications(APPROVED/REJECTED/admin inscription)
re-soumission(REJECTED+update->PENDING)/SUSPENDED bloque

## 1.4 Vendor Profile Shop (10)
myVendorProfile(auth/sans auth->erreur/sans vendor->null)
updateMyVendorProfile(champs/sociaux/legaux+fichiers/logo+cover)
non-vendor->erreur/re-soumission auto

## 1.5 Wallet (15)
creditWallet/debitWallet(avec note/montant>solde allowNegative=true/false)
setVendorAllowNegativeBalance
canAcceptOrder(suffisant/insuffisant+allowNeg/insuffisant sans allowNeg)
commission(auto PaymentSettled/formule/vendor rate vs default/rate=0/remboursement Cancelled)

## 1.6 Produits Vendor (13)
createMyProduct(+variant/facets/assets)
myVendorProducts(pagine/ownership/autre vendor->erreur)
updateMyProduct/updateMyProductVariant/deleteMyProduct
createVendorFacetValue/facet inexistant->erreur/uploadVendorFile

## 1.7 Commandes Vendor (8)
myVendorOrders pagine
updateMyOrderStatus(autre vendor->erreur/invalide->erreur)
updateMyOrderSellerStatus(valides/invalide->erreur)
updateOrderAdminStatus/invalide->erreur
mono-vendor(produit autre retire)/assignation auto vendor

## 1.8 OrderStatus (5)
orderStatuses/vendorOrderStatuses/CRUD/seeding 7 defaut/permissions vendorCanSet

## 1.9 DeliveryZone (4)
CRUD/ZoneBasedShipping/FixedGlobalShipping

## 1.10 PlatformSettings (7)
get/update/Init defaut/autoApproval/emailVerification/defaultCommission/currency+phone

## 1.11 CMS Pages (5)
CRUD/slug unique/SEO/isActive/shop par slug

## 1.12 CMS Sections (5)
CRUD/scheduling/isActive/dataJson

## 1.13 CMS Presets (14)
CRUD/applyPreset/savePageAsPreset/previewPreset
Draft(create/update/publish/createPresetFromDraft)/archive/restoreVersion

## 1.14 CMS Seasons (6)
CRUD/activeSeason override/saison+preset/configJson

## 1.15 CMS SeasonSchedule (4)
CRUD/priorite/isActive

## 1.16 CMS Habillage (14)
activeHabillage/habillages filtres/createInstant/open
set/unsetDefault/undo/redo/autoSave/publish/delete/preview/changeHistory

## 1.17 CMS Collections/Facets (3)
cmsCollectionsTree(admin/shop)/cmsFacetValues

## 1.18 Banner Manager REST (10)
GET/POST(config/hero/promo/flash-versions/general)/flash-active/upload

## 1.19 Notifications Settings (3)
brevoSettings/update/singleton

## 1.20 Notifications SMS/Email (9)
sendSms(api valide/invalide/formatPhone/interpolate)
sendTransactionalEmail(API/SMTP/fallback ENV)
DynamicEmailSender(DB prioritaire/method api vs smtp)

## 1.21 Notification Events (15)
Order Confirmed/Cancelled->acheteur
Payment Authorized->vendor/Declined->SMS
Fulfillment Shipped/Delivered/Stock alert
Vendor created/APPROVED/REJECTED
PasswordReset(code 6chiffres+expiration)/verifyPasswordResetCode
Buyer Registration/Channel SMS/EMAIL/BOTH

## 1.22 ShortCode Strategy (2)
generateVerificationToken->6 chiffres/verifyVerificationToken

## 1.23 TaxEnforcement (8)
Bootstrap: Standard Tax category/Global Zone/0% Tax Rate/channel XOF/defaultTaxZone+ShippingZone
ProductVariant created/updated->enforceTaxCategory/deja bon->pas update

## 1.24 PageInscription (13)
registrationFields(shop actifs/admin tous)/par ID
vendorRegistrationResponses par vendorId
createRegistrationField(name/label/type/select+options/validation config)
updateRegistrationField/deleteRegistrationField
submitRegistrationResponses
validation(required manquant/fichier trop grand/mime non autorise/texte trop court/trop long)

---
# TESTS AHIZAN - STOREFRONT

## 2.1 Auth (7)
login(valides/invalides/NotVerifiedError/redirectTo safe/redirectTo externe->/)
logout->token retire+redirect
register(email+password/phone format/redirect verify-pending/avec redirectTo)

## 2.2 Email Verification (4)
verifyAccountAction(token valide/invalide/manquant/avec password optionnel)

## 2.3 Password Reset (7)
requestPasswordReset(email valide/vide/inexistant)
resetPassword(token+password valides/passwords non match/token invalide/champs manquants)

## 2.4 Customer Profile (9)
updatePassword(valides/new!=confirm/current==new->erreur/mauvais current)
updateCustomer(firstName+lastName/champs vides->erreur)
requestEmailUpdate(password+email valides/email invalide/champs manquants)

## 2.5 Customer Addresses (6)
createAddress/updateAddress/deleteAddress/suppression echouee->erreur
setDefaultShippingAddress/setDefaultBillingAddress

## 2.6 Checkout Addresses (5)
ensureAddingItemsState(AddingItems/autre etat->transition)
setShippingAddress/setBillingAddress/createCustomerAddress/phone format E164

## 2.7 Checkout Shipping+Payment (9)
setShippingMethod(valide/echec)
transitionToArrangingPayment(succes/etat invalide)
placeOrder(succes+redirect/payment echec/etat incorrect)
setCustomerForOrder(guest/customer existant)

## 2.8 Cart (7)
addItemToOrder/adjustOrderLine(quantity=0->supprime)/removeOrderLine
applyCouponCode(valide/invalide)/removeCouponCode

## 2.9 Collections+Products (5)
GetCollections/GetCollectionBySlug/GetProductBySlug/inexistant->null/Search

## 2.10 CMS Pages Storefront (13)
getPageContent(home)/slug inexistant->null
Sections(HERO/CATEGORY_GRID/FLASH_DEALS/BANNER/PRODUCT_GRID)
THEME_SETTINGS/HEADER_CONF/FOOTER_CONF->layout global
Section scheduling(dans periode/hors periode->masquee)/inactive->masquee
Saison active override/DynamicPageRenderer
SectionCodeWrapper(override/HTML/CSS/JS/injection/sans code->zero overhead)

## 2.11 Order Confirmation+Account Orders (3)
order-confirmation/GetOrderByCode/liste+detail commandes

## 2.12 Search+404 (3)
Recherche produits/pagine/Page inexistante->404

## 2.13 UI Components (10)
AhizanNavbar+mobile/Footer/HeroSection+CTA/CategoryGrid+sous-categories hover
FlashDeals+countdown/ProductCard/CartDrawer/TopFlashBanner/CookieConsent/AhizanHome mapping

---
# TESTS AHIZAN - SELLER

## 3.1 Auth (6)
login(valides/invalides/NotVerifiedError)/logout
register seller+champs vendor/redirect verify-pending ou pending

## 3.2 Vendor Status Pages (6)
/pending(PENDING->message)/rejected(REJECTED->raison+re-soumission)
/resubmit->formulaire/re-soumission->PENDING
APPROVED->acces dashboard/SUSPENDED->bloque

## 3.3 Dashboard Onboarding (3)
Page onboarding/etapes progressivement/complete->dashboard

## 3.4 Dashboard Products (12)
Liste paginee/creer(tous champs/sans nom->erreur/prix negatif/stock negatif)
modifier produit/modifier variant prix+stock/supprimer soft
upload image/produit autre vendor invisible/facets/pagination

## 3.5 Dashboard Orders (8)
Liste/detail+items+total/update status/transition invalide->erreur
update seller status/autre vendor->erreur/filtre status/pagination

## 3.6 Dashboard Wallet (6)
Afficher solde/credit/debit/montant>solde->erreur ou negatif
toggle allowNegativeBalance/historique transactions

## 3.7 Dashboard Profile (10)
Afficher profil/modifier(name+phone+address+zone/delivery+return/socials/legaux+fichiers/logo+cover/type/paiement)
re-soumission auto si REJECTED

## 3.8 Dashboard Page Inscription (7)
Liste registrationFields/creer(name+label+type/select+options/validation config)
modifier/supprimer/reorder champs

## 3.9 Dashboard Settings (2)
Parametres generaux/notification preferences

## 3.10 Seller Storefront Pages (7)
Accueil CMS sections/Dynamic catch-all [...slug]/section registry(HERO/PRODUCT_LIST/CATEGORY_GRID/PROMO_BANNER/POPUP)
getPage(slug)+revalidation 1h/produit vendor/collection vendor/search

## 3.11 Seller Checkout+Cart (5)
Checkout flow/addresses+shipping+payment/confirmation/ajout panier/coupon

## 3.12 Seller Account (5)
Profile customer/adresses/commandes/password reset/email update

## 3.13 Seller Password Reset (3)
requestPasswordReset/resetPassword/verifyPasswordResetCode

## 3.14 Seller UI Components (7)
Dashboard layout sidebar+header/ProductForm/OrderStatusSelect
WalletBalance+actions/ProfileForm+upload/RegistrationFieldManager/Navigation

---
# RESUME TOTAL

| Partie | Tests |
|--------|-------|
| Backend | ~200 |
| Storefront | ~90 |
| Seller | ~87 |
| **TOTAL** | **~377** |
