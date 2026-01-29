import { LanguageCode, PaymentMethodHandler } from '@vendure/core';

export const cashOnDeliveryHandler = new PaymentMethodHandler({
    code: 'cash-on-delivery',
    description: [{ languageCode: LanguageCode.en, value: 'Cash on Delivery' }, { languageCode: LanguageCode.fr, value: 'Paiement à la livraison' }],
    args: {},
    createPayment: (ctx, order, amount, args, metadata) => {
        return {
            amount,
            state: 'Authorized',
            transactionId: Math.random().toString(36).substring(7), // Mock transaction ID
            metadata: {
                public: {
                    type: 'cash-on-delivery',
                },
            },
        };
    },
    settlePayment: (ctx, order, payment, args) => {
        return {
            success: true,
        };
    },
});
