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
        // Cast to integer to ensure match with productVariant.id (integer in DB)
        const ids = (args.variantIds || [])
            .map((id: any) => parseInt(String(id), 10))
            .filter((n: number) => !isNaN(n));
        if (ids.length > 0) {
            return qb.andWhere('productVariant.id IN (:...variantIds)', { variantIds: ids });
        }
        // If no IDs provided, return no products to avoid showing everything in a restricted collection
        return qb.andWhere('1 = 0');
    },
});
