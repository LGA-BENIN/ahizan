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
            if (!settings?.brevoApiKey || !settings.channelsConfig) return;

            const { order, toState } = event;

            // ── Acheteur : Commande Confirmée ──
            if (toState === 'PaymentAuthorized' || toState === 'PaymentSettled') {
                const config = settings.channelsConfig?.OrderConfirmed;
                if (config?.enabled) {
                    const phone = order.customer?.phoneNumber;
                    const email = order.customer?.emailAddress;
                    const vars = { orderCode: order.code, firstName: order.customer?.firstName || '' };

                    if ((config.channel === 'SMS' || config.channel === 'BOTH') && phone && config.smsTemplate) {
                        const content = this.smsService.interpolate(config.smsTemplate, vars);
                        await this.smsService.sendSms(phone, content, settings);
                    }
                    if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                        const subject = this.smsService.interpolate(config.emailSubject || 'Commande Confirmée', vars);
                        const content = this.smsService.interpolate(config.emailTemplate, vars);
                        await this.smsService.sendTransactionalEmail(email, subject, content, settings);
                    }
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
            if (!settings?.brevoApiKey || !settings.channelsConfig) return;

            if (event.toState === 'Declined' || event.toState === 'Error') {
                const config = settings.channelsConfig?.PaymentFailed;
                if (config?.enabled) {
                    const phone = event.order.customer?.phoneNumber;
                    const email = event.order.customer?.emailAddress;
                    const vars = { orderCode: event.order.code };

                    if ((config.channel === 'SMS' || config.channel === 'BOTH') && phone && config.smsTemplate) {
                        const content = this.smsService.interpolate(config.smsTemplate, vars);
                        await this.smsService.sendSms(phone, content, settings);
                    }
                    if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                        const subject = this.smsService.interpolate(config.emailSubject || 'Échec du Paiement', vars);
                        const content = this.smsService.interpolate(config.emailTemplate, vars);
                        await this.smsService.sendTransactionalEmail(email, subject, content, settings);
                    }
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
            if (!settings?.brevoApiKey || !settings.channelsConfig) return;

            const { toState, fulfillment } = event;

            if (toState === 'Shipped' || toState === 'Delivered') {
                const config = settings.channelsConfig?.ShippingUpdate;
                if (config?.enabled) {
                    const order = fulfillment.orders?.[0];
                    const phone = order?.customer?.phoneNumber;
                    const email = order?.customer?.emailAddress;
                    const vars = {
                        status: toState === 'Shipped' ? 'expédiée' : 'livrée',
                        orderCode: order?.code || '',
                    };

                    if ((config.channel === 'SMS' || config.channel === 'BOTH') && phone && config.smsTemplate) {
                        const content = this.smsService.interpolate(config.smsTemplate, vars);
                        await this.smsService.sendSms(phone, content, settings);
                    }
                    if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                        const subject = this.smsService.interpolate(config.emailSubject || 'Mise à jour Livraison', vars);
                        const content = this.smsService.interpolate(config.emailTemplate, vars);
                        await this.smsService.sendTransactionalEmail(email, subject, content, settings);
                    }
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
            if (!settings?.brevoApiKey || !settings.channelsConfig) return;

            const config = settings.channelsConfig?.StockAlert;
            if (!config?.enabled) return;

            for (const movement of event.stockMovements) {
                try {
                    const variant = await this.productVariantService.findOne(
                        event.ctx,
                        movement.productVariant.id,
                        ['product'],
                    );
                    if (!variant) continue;

                    const storedStockOnHand = (movement as any).stockOnHand ?? 0;
                    const productName = variant.name || (variant as any).product?.name || 'Produit inconnu';

                    if (storedStockOnHand === 0 || (storedStockOnHand <= 5 && storedStockOnHand > 0)) {
                        this.logger.warn(`[StockAlert] Triggered config for "${productName}". Notifications will be routed via vendor lookup in future implementation.`);
                        // In a full implementation, we lookup the vendor email here and route via SendTransactionalEmail.
                    }
                } catch (err: any) {
                    this.logger.error(`Error checking stock for movement: ${err.message}`);
                }
            }
        });
    }
}
