import { LanguageCode, ShippingCalculator } from '@vendure/core';

export const globalFixedShippingCalculator = new ShippingCalculator({
    code: 'global-fixed-shipping',
    description: [{ languageCode: LanguageCode.en, value: 'Global Fixed Shipping' }, { languageCode: LanguageCode.fr, value: 'Livraison Fixe Globale' }],
    args: {
        price: {
            type: 'int',
            config: { inputType: 'money' },
            label: [{ languageCode: LanguageCode.en, value: 'Shipping Price (CFA)' }, { languageCode: LanguageCode.fr, value: 'Prix Livraison (CFA)' }],
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
