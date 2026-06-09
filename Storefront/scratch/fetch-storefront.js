async function test() {
    try {
        const res = await fetch('http://127.0.0.1:3001/collection/cloths');
        console.log("STATUS:", res.status, res.statusText);
        const text = await res.text();
        console.log("BODY SAMPLE:", text.substring(0, 1000));
        // Check for specific elements like category header or dynamic product grid
        console.log("CONTAINS CATEGORY_HEADER:", text.includes('CATEGORY_HEADER'));
        console.log("CONTAINS DYNAMIC_PRODUCT_GRID:", text.includes('DYNAMIC_PRODUCT_GRID'));
        console.log("CONTAINS titleOverride:", text.includes('displayTitle') || text.includes('titleOverride') || text.includes('Bannière'));
    } catch(e) {
        console.error("ERROR:", e);
    }
}
test();
