import { LanguageCode, ShippingCalculator } from '@vendure/core';

export const zoneBasedShippingCalculator = new ShippingCalculator({
    code: 'zone-based-shipping',
    description: [
        { languageCode: LanguageCode.en, value: 'Zone-Based Shipping' },
        { languageCode: LanguageCode.fr, value: 'Livraison par Zone' },
    ],
    args: {
        zoneCode: {
            type: 'string',
            label: [
                { languageCode: LanguageCode.en, value: 'Zone Code' },
                { languageCode: LanguageCode.fr, value: 'Code Zone' },
            ],
        },
        price: {
            type: 'int',
            config: { inputType: 'money' },
            label: [
                { languageCode: LanguageCode.en, value: 'Price (fallback)' },
                { languageCode: LanguageCode.fr, value: 'Prix (fallback)' },
            ],
            ui: { component: 'currency-form-input' },
        },
    },
    calculate: (ctx, order, args) => {
        return {
            price: args.price,
            priceIncludesTax: false,
            taxRate: 0,
            priceWithTax: args.price,
        };
    },
});
