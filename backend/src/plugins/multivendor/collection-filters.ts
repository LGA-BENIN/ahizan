import { CollectionFilter, LanguageCode } from '@vendure/core';

export const variantIdCollectionFilter = new CollectionFilter({
    code: 'variant-id-filter',
    description: [{
        languageCode: LanguageCode.en,
        value: 'Filter by variant IDs',
    }, {
        languageCode: LanguageCode.fr,
        value: 'Filtrer par IDs de variante',
    }],
    args: {
        variantIds: {
            type: 'string',
            list: true,
            ui: { component: 'item-id-input' },
        },
    },
    apply: (qb, args) => {
        if (args.variantIds && args.variantIds.length > 0) {
            return qb.andWhere('productVariant.id IN (:...variantIds)', { variantIds: args.variantIds });
        }
        // If no IDs provided, return no products to avoid showing everything in a restricted collection
        return qb.andWhere('1 = 0');
    },
});
