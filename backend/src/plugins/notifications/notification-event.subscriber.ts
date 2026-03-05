import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import {
    EventBus,
    OrderStateTransitionEvent,
    PaymentStateTransitionEvent,
    StockMovementEvent,
    FulfillmentStateTransitionEvent,
    RequestContext,
    ProductVariantService,
} from '@vendure/core';
import { BrevoSmsService } from './brevo-sms.service';
import { BrevoSettings } from './entities/brevo-settings.entity';

@Injectable()
export class NotificationEventSubscriber implements OnApplicationBootstrap {
    private readonly logger = new Logger('NotificationEventSubscriber');

    constructor(
        private readonly eventBus: EventBus,
        private readonly smsService: BrevoSmsService,
        private readonly productVariantService: ProductVariantService,
    ) { }

    onApplicationBootstrap() {
        this.subscribeToOrderEvents();
        this.subscribeToPaymentEvents();
        this.subscribeToFulfillmentEvents();
        this.subscribeToStockEvents();
    }

    // ─────────────────────────────────────────────────────────────
    // 1. ORDER STATE TRANSITIONS
    // ─────────────────────────────────────────────────────────────
    private subscribeToOrderEvents() {
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
            const settings = await this.smsService.getSettings();
            if (!settings?.brevoApiKey) return;

            const { order, toState } = event;

            // ── Acheteur : Commande Confirmée ──
            if (
                settings.enableOrderConfirmedSms &&
                (toState === 'PaymentAuthorized' || toState === 'PaymentSettled')
            ) {
                const phone = order.customer?.phoneNumber;
                if (phone && settings.templateOrderConfirmed) {
                    const content = this.smsService.interpolate(settings.templateOrderConfirmed, {
                        orderCode: order.code,
                    });
                    await this.smsService.sendSms(phone, content, settings);
                }
            }

            // ── Acheteur : Commande Annulée ──
            if (toState === 'Cancelled') {
                const phone = order.customer?.phoneNumber;
                if (phone) {
                    const content = `Ahizan: Votre commande ${order.code} a été annulée. Contactez-nous pour plus d'informations.`;
                    await this.smsService.sendSms(phone, content, settings);
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. PAYMENT STATE TRANSITIONS
    // ─────────────────────────────────────────────────────────────
    private subscribeToPaymentEvents() {
        this.eventBus.ofType(PaymentStateTransitionEvent).subscribe(async (event) => {
            const settings = await this.smsService.getSettings();
            if (!settings?.brevoApiKey || !settings.enablePaymentFailedSms) return;

            if (event.toState === 'Declined' || event.toState === 'Error') {
                const phone = event.order.customer?.phoneNumber;
                if (phone && settings.templatePaymentFailed) {
                    const content = this.smsService.interpolate(settings.templatePaymentFailed, {
                        orderCode: event.order.code,
                    });
                    await this.smsService.sendSms(phone, content, settings);
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. FULFILLMENT (SHIPPING) STATE TRANSITIONS
    // ─────────────────────────────────────────────────────────────
    private subscribeToFulfillmentEvents() {
        this.eventBus.ofType(FulfillmentStateTransitionEvent).subscribe(async (event) => {
            const settings = await this.smsService.getSettings();
            if (!settings?.brevoApiKey || !settings.enableShippingUpdateSms) return;

            const { toState, fulfillment } = event;

            if (toState === 'Shipped' || toState === 'Delivered') {
                // Find the first order linked to this fulfillment
                const order = fulfillment.orders?.[0];
                const phone = order?.customer?.phoneNumber;
                if (phone && settings.templateShippingUpdate) {
                    const content = this.smsService.interpolate(settings.templateShippingUpdate, {
                        status: toState === 'Shipped' ? 'expédiée' : 'livrée',
                        orderCode: order?.code || '',
                    });
                    await this.smsService.sendSms(phone, content, settings);
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. STOCK MOVEMENTS — Low Stock & Out of Stock Alerts
    // ─────────────────────────────────────────────────────────────
    private subscribeToStockEvents() {
        this.eventBus.ofType(StockMovementEvent).subscribe(async (event) => {
            const settings = await this.smsService.getSettings();
            if (!settings?.brevoApiKey || !settings.enableStockAlertEmail) return;

            for (const movement of event.stockMovements) {
                try {
                    const variant = await this.productVariantService.findOne(
                        event.ctx,
                        movement.productVariant.id,
                        ['product'],
                    );
                    if (!variant) continue;

                    // Use the stock movement data itself to determine the new stock on hand
                    const storedStockOnHand = (movement as any).stockOnHand ?? 0;
                    const productName = variant.name || (variant as any).product?.name || 'Produit inconnu';

                    if (storedStockOnHand === 0) {
                        this.logger.warn(
                            `[StockAlert] Rupture de stock: "${productName}" (variantId: ${variant.id}). Notification vendeur à implémenter.`,
                        );
                        // TODO: Look up the seller owning this product and send email/SMS via BrevoSmsService
                    } else if (storedStockOnHand <= 5 && storedStockOnHand > 0) {
                        this.logger.warn(
                            `[StockAlert] Stock bas (${storedStockOnHand}): "${productName}" (variantId: ${variant.id}). Notification vendeur à implémenter.`,
                        );
                        // TODO: Look up the seller owning this product and send email/SMS via BrevoSmsService
                    }
                } catch (err: any) {
                    this.logger.error(`Error checking stock for movement: ${err.message}`);
                }
            }
        });
    }
}
