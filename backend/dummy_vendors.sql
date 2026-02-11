-- Dummy Data for Ahizan Vendors (20 Entries)
-- Run this script in your PostgreSQL database 'ahizan'

INSERT INTO "vendor" (
    "createdAt", "updatedAt", "name", "description", "status", "type", 
    "phoneNumber", "address", "zone", "email", "deliveryInfo", 
    "returnPolicy", "rating", "ratingCount", "verificationStatus", "commissionRate"
) VALUES 
-- 1. Fresh Market Cotonou
(NOW(), NOW(), 'Fresh Market Cotonou', 'Best fresh vegetables and fruits directly from local farmers.', 'APPROVED', 'BUSINESS', '+229 97 00 00 01', 'Marche Dantokpa, Cotonou', 'Cotonou - Dantokpa', 'contact@freshmarket.bj', 'Free delivery within Cotonou for orders over 5000 FCFA', 'No returns on perishable goods', 4.8, 124, true, 5.0),

-- 2. Tech Zone Benin
(NOW(), NOW(), 'Tech Zone Benin', 'Authentic electronics, smartphones, and laptops.', 'APPROVED', 'BUSINESS', '+229 66 11 22 33', 'Haie Vive, Cotonou', 'Cotonou - Haie Vive', 'sales@techzone.bj', 'Nationwide delivery available', '7-day return policy for factory defects', 4.5, 89, true, 8.5),

-- 3. Mode Elegance
(NOW(), NOW(), 'Mode Elegance', 'Traditional and modern African wear for men and women.', 'PENDING', 'INDIVIDUAL', '+229 95 44 55 66', 'Porto-Novo, Quartier Ayimlonfide', 'Porto-Novo', 'fashion@elegance.bj', 'Delivery via taxi or bus', 'Exchange only within 3 days', 0.0, 0, false, 10.0),

-- 4. Saveurs du Benin
(NOW(), NOW(), 'Saveurs du Benin', 'Authentic Beninese spices, snacks, and dried foods.', 'APPROVED', 'INDIVIDUAL', '+229 61 23 45 67', 'Abomey-Calavi, Zoca', 'Abomey-Calavi', 'info@saveurs.bj', 'Worldwide shipping available', 'Returns accepted if package is unopened', 4.9, 210, true, 7.0),

-- 5. Artisanat Royal
(NOW(), NOW(), 'Artisanat Royal', 'Handcrafted jewelry, pottery, and art pieces.', 'SUSPENDED', 'BUSINESS', '+229 90 90 90 90', 'Ouidah, Route des Esclaves', 'Ouidah', 'art@royal.bj', 'Pickup only', 'No returns', 3.2, 15, true, 12.0),

-- 6. Electro Benin Discount
(NOW(), NOW(), 'Electro Benin Discount', 'Home appliances at unbeatable prices.', 'APPROVED', 'BUSINESS', '+229 67 88 99 00', 'Carrefour IITA, Calavi', 'Abomey-Calavi', 'electro@discount.bj', 'Delivery and installation included', '1 year warranty', 4.2, 56, true, 8.0),

-- 7. Bio Beauty Nature
(NOW(), NOW(), 'Bio Beauty Nature', 'Natural cosmetics and shea butter products.', 'APPROVED', 'INDIVIDUAL', '+229 94 11 22 33', 'Fidjrosse, Cotonou', 'Cotonou - Fidjrosse', 'beauty@bio.bj', 'Delivery via Zemidjan', 'No returns on opened products', 4.7, 45, true, 6.0),

-- 8. Parakou Textiles
(NOW(), NOW(), 'Parakou Textiles', 'High quality cotton fabrics from the north.', 'APPROVED', 'BUSINESS', '+229 96 55 44 33', 'Marche Arzeke, Parakou', 'Parakou', 'sales@koton.parakou.bj', 'Shipping across Benin', 'Returns accepted', 4.6, 78, true, 9.0),

-- 9. Afro Chic Boutique
(NOW(), NOW(), 'Afro Chic Boutique', 'Trendy clothing for young people.', 'PENDING', 'BUSINESS', '+229 62 33 44 55', 'Ganhi, Cotonou', 'Cotonou - Ganhi', 'chic@afro.bj', 'Express delivery', 'Exchange available', 0.0, 0, false, 10.0),

-- 10. Le Petit Boulanger
(NOW(), NOW(), 'Le Petit Boulanger', 'Fresh bread and pastries every morning.', 'APPROVED', 'BUSINESS', '+229 97 12 34 56', 'Menontin, Cotonou', 'Cotonou - Menontin', 'bread@boulanger.bj', 'Morning delivery only', 'Freshness guaranteed', 4.9, 312, true, 5.0),

-- 11. Informatique Pro
(NOW(), NOW(), 'Informatique Pro', 'Computer repair and parts.', 'APPROVED', 'BUSINESS', '+229 66 77 88 99', 'Saint Michel, Cotonou', 'Cotonou - Saint Michel', 'repair@infopro.bj', 'On-site service', '30 days warranty on repairs', 4.3, 28, true, 10.0),

-- 12. Vignon Decoration
(NOW(), NOW(), 'Vignon Decoration', 'Events decoration and party rentals.', 'APPROVED', 'INDIVIDUAL', '+229 95 00 11 22', 'Godomey, Calavi', 'Abomey-Calavi', 'deco@vignon.bj', 'Setup included', 'Cancellation fees apply', 4.8, 67, true, 15.0),

-- 13. Supermarche du Pont
(NOW(), NOW(), 'Supermarche du Pont', 'Groceries and household items.', 'APPROVED', 'BUSINESS', '+229 90 11 22 33', 'Porto-Novo, Pont', 'Porto-Novo', 'shop@supermarche.bj', 'Free delivery locally', 'Returns with receipt', 4.1, 150, true, 7.5),

-- 14. Bohicon Auto Pieces
(NOW(), NOW(), 'Bohicon Auto Pieces', 'Spare parts for automobiles.', 'APPROVED', 'BUSINESS', '+229 61 55 66 77', 'Carrefour Bohicon', 'Bohicon', 'parts@auto.bj', 'Delivery via bus', 'Warranty on new parts', 4.4, 92, true, 8.0),

-- 15. Mama Koko Cuisine
(NOW(), NOW(), 'Mama Koko Cuisine', 'Catering service for weddings and events.', 'APPROVED', 'INDIVIDUAL', '+229 94 33 22 11', 'Zogbo, Cotonou', 'Cotonou - Zogbo', 'mama@cuisine.bj', 'Booking required 1 week in advance', '50% deposit required', 5.0, 42, true, 12.0),

-- 16. Librairie du Savoir
(NOW(), NOW(), 'Librairie du Savoir', 'School books and stationery.', 'APPROVED', 'BUSINESS', '+229 97 88 77 66', 'Etoile Rouge, Cotonou', 'Cotonou - Etoile Rouge', 'books@savoir.bj', 'Delivery for schools', 'Exchange accepted', 4.5, 203, true, 6.5),

-- 17. Shoes City
(NOW(), NOW(), 'Shoes City', 'Imported sneakers and shoes.', 'PENDING', 'INDIVIDUAL', '+229 66 44 33 22', 'Cadjehoun, Cotonou', 'Cotonou - Cadjehoun', 'kicks@shoes.bj', 'Try before you buy', '7 days return', 0.0, 0, false, 10.0),

-- 18. Bijouterie Fine
(NOW(), NOW(), 'Bijouterie Fine', 'Gold and silver jewelry.', 'APPROVED', 'BUSINESS', '+229 90 22 33 44', 'Ganhi, Cotonou', 'Cotonou - Ganhi', 'gold@fine.bj', 'Secure delivery', 'Certificate of authenticity provided', 4.9, 11, true, 10.0),

-- 19. Pharmaprix
(NOW(), NOW(), 'Pharmaprix', 'Parapharmacy and wellness products.', 'APPROVED', 'BUSINESS', '+229 62 11 99 88', 'Agla, Cotonou', 'Cotonou - Agla', 'health@pharma.bj', 'Discreet delivery', 'No returns', 4.7, 134, true, 8.0),

-- 20. Agri-Benin
(NOW(), NOW(), 'Agri-Benin', 'Fertilizers and farming tools.', 'APPROVED', 'BUSINESS', '+229 95 66 77 88', 'Allada, Centre', 'Allada', 'farm@agri.bj', 'Bulk delivery available', 'Technical support included', 4.6, 56, true, 5.0);
