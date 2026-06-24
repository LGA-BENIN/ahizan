const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('http://localhost:3001/vendor/1', { waitUntil: 'networkidle' });

    // Click the first add to cart button
    console.log('Clicking button...');
    const buttons = await page.$$('button[title="Ajouter au panier"]');
    if (buttons.length > 0) {
        await buttons[0].click();
        await page.waitForTimeout(2000); // Wait for transition
        
        // Count buttons again
        const newButtons = await page.$$('button[title="Ajouter au panier"]');
        console.log(`Buttons before: ${buttons.length}, Buttons after: ${newButtons.length}`);
        
        // Dump the HTML of the first and second product cards
        const cards = await page.$$('.bg-white.dark\\:bg-\\[\\#1E293B\\]');
        if (cards.length >= 2) {
            console.log('Card 1 HTML:');
            console.log(await cards[0].innerHTML());
            console.log('Card 2 HTML:');
            console.log(await cards[1].innerHTML());
        }
    } else {
        console.log('No buttons found!');
    }

    await browser.close();
})();
