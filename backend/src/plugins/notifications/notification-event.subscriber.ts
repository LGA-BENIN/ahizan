import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import {
    EventBus,
    OrderStateTransitionEvent,
    PaymentStateTransitionEvent,
    StockMovementEvent,
    FulfillmentStateTransitionEvent,
    RequestContext,
    ProductVariantService,
    TransactionalConnection,
    PasswordResetEvent,
    Order,
    User,
} from '@vendure/core';
import { BrevoSmsService } from './brevo-sms.service';
import { BrevoSettings } from './entities/brevo-settings.entity';
import { VendorEvent } from '../multivendor/events/vendor-event';

@Injectable()
export class NotificationEventSubscriber implements OnApplicationBootstrap {
    private readonly logger = new Logger('NotificationEventSubscriber');

    constructor(
        private readonly eventBus: EventBus,
        private readonly smsService: BrevoSmsService,
        private readonly productVariantService: ProductVariantService,
        private readonly connection: TransactionalConnection,
    ) { }

    async onApplicationBootstrap() {
        await this.ensurePasswordResetConfig();
        this.subscribeToOrderEvents();
        this.subscribeToPaymentEvents();
        this.subscribeToFulfillmentEvents();
        this.subscribeToStockEvents();
        this.subscribeToVendorEvents();
        this.subscribeToAuthEvents();
    }

    private async ensurePasswordResetConfig() {
        const settings = await this.smsService.getSettings();
        if (!settings) return;

        const channelsConfig = settings.channelsConfig || {};
        if (!channelsConfig.PasswordReset) {
            this.logger.log('Initializing default PasswordReset configuration...');
            channelsConfig.PasswordReset = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Votre code de réinitialisation Ahizan',
                emailTemplate: 'Bonjour, voici votre code de confirmation Ahizan : {{ passwordResetToken }}. Ce code expire dans 15 minutes.',
                smsTemplate: 'Ahizan: Votre code de réinitialisation est {{ passwordResetToken }}'
            };
            await this.smsService.saveSettings({ channelsConfig });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 1. ORDER STATE TRANSITIONS
    // ─────────────────────────────────────────────────────────────
    private subscribeToOrderEvents() {
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
            const settings = await this.smsService.getSettings();
            if (!settings?.channelsConfig) return;

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

            // ── Vendeur : Notification de Nouvelle Vente ──
            if (toState === 'PaymentAuthorized' || toState === 'PaymentSettled') {
                const config = settings.channelsConfig?.NewOrderVendor;
                if (config?.enabled) {
                    try {
                        const fullOrder = await this.connection.getEntityOrThrow(event.ctx, Order, order.id, {
                            relations: ['lines', 'lines.productVariant', 'lines.productVariant.product', 'lines.productVariant.product.customFields.vendor']
                        });

                        const vendorsToNotify = new Map<string, any>();
                        for (const line of fullOrder.lines || []) {
                            const vendor = (line.productVariant?.product?.customFields as any)?.vendor;
                            if (vendor && vendor.id) {
                                vendorsToNotify.set(vendor.id.toString(), vendor);
                            }
                        }

                        for (const vendor of vendorsToNotify.values()) {
                            const vars = { orderCode: order.code };
                            const phone = vendor.phoneNumber;
                            const email = vendor.email;

                            if ((config.channel === 'SMS' || config.channel === 'BOTH') && phone && config.smsTemplate) {
                                const content = this.smsService.interpolate(config.smsTemplate, vars);
                                await this.smsService.sendSms(phone, content, settings);
                            }
                            if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                                const subject = this.smsService.interpolate(config.emailSubject || 'Nouvelle Vente', vars);
                                const content = this.smsService.interpolate(config.emailTemplate, vars);
                                await this.smsService.sendTransactionalEmail(email, subject, content, settings);
                            }
                        }
                    } catch (e: any) {
                        this.logger.error(`Failed to notify sellers for order ${order.code}: ${e.message}`);
                    }
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
            if (!settings?.channelsConfig) return;

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
            if (!settings?.channelsConfig) return;

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
            if (!settings?.channelsConfig) return;

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

    // ─────────────────────────────────────────────────────────────
    // 5. VENDOR EVENTS — Registration & Approvals
    // ─────────────────────────────────────────────────────────────
    private subscribeToVendorEvents() {
        this.eventBus.ofType(VendorEvent).subscribe(async (event: any) => {
            const settings = await this.smsService.getSettings();
            if (!settings?.channelsConfig) return;

            const vendor = event.vendor;
            if (!vendor) return;

            // Inscription Vendeur Reçue
            if (event.type === 'created') {
                const config = settings.channelsConfig?.VendorRegistration;
                if (config?.enabled) {
                    const phone = vendor.phoneNumber || event.input?.phoneNumber;
                    const email = vendor.email || event.input?.email;
                    const vars = {};

                    if ((config.channel === 'SMS' || config.channel === 'BOTH') && phone && config.smsTemplate) {
                        const content = this.smsService.interpolate(config.smsTemplate, vars);
                        await this.smsService.sendSms(phone, content, settings);
                    }
                    if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                        const subject = this.smsService.interpolate(config.emailSubject || 'Inscription Reçue', vars);
                        const content = this.smsService.interpolate(config.emailTemplate, vars);
                        await this.smsService.sendTransactionalEmail(email, subject, content, settings);
                    }
                }
            }

            // Boutique Approuvée / Activée
            if (event.type === 'statusChanged' && vendor.status === 'APPROVED') {
                const config = settings.channelsConfig?.VendorApproved;
                if (config?.enabled) {
                    const phone = vendor.phoneNumber;
                    const email = vendor.email;
                    const vars = {
                        businessName: vendor.businessName || '',
                    };

                    if ((config.channel === 'SMS' || config.channel === 'BOTH') && phone && config.smsTemplate) {
                        const content = this.smsService.interpolate(config.smsTemplate, vars);
                        await this.smsService.sendSms(phone, content, settings);
                    }
                    if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                        const subject = this.smsService.interpolate(config.emailSubject || 'Boutique Approuvée', vars);
                        const content = this.smsService.interpolate(config.emailTemplate, vars);
                        await this.smsService.sendTransactionalEmail(email, subject, content, settings);
                    }
                }
            }

            // Boutique Rejetée
            if (event.type === 'statusChanged' && vendor.status === 'REJECTED') {
                const config = settings.channelsConfig?.VendorRejected;
                if (config?.enabled) {
                    const phone = vendor.phoneNumber;
                    const email = vendor.email;
                    const vars = {
                        businessName: vendor.businessName || '',
                        rejectionReason: vendor.rejectionReason || event.input?.rejectionReason || 'Non spécifiée',
                    };

                    if ((config.channel === 'SMS' || config.channel === 'BOTH') && phone && config.smsTemplate) {
                        const content = this.smsService.interpolate(config.smsTemplate, vars);
                        await this.smsService.sendSms(phone, content, settings);
                    }
                    if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                        const subject = this.smsService.interpolate(config.emailSubject || 'Candidature Rejetée', vars);
                        const content = this.smsService.interpolate(config.emailTemplate, vars);
                        await this.smsService.sendTransactionalEmail(email, subject, content, settings);
                    }
                }
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 6. AUTH EVENTS — Password Resets
    // ─────────────────────────────────────────────────────────────
    private subscribeToAuthEvents() {
        this.eventBus.ofType(PasswordResetEvent).subscribe(async (event) => {
            const { ctx, user } = event;
            const settings = await this.smsService.getSettings();

            // 1. Set expiration time (15 minutes)
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 15);

            (user.customFields as any).passwordResetCodeExpiresAt = expiresAt;
            await this.connection.getRepository(ctx, User).save(user);

            this.logger.log(`Password reset requested for user ${user.identifier}. Code expires at ${expiresAt.toISOString()}`);

            // 2. Send Notification
            if (settings?.channelsConfig?.PasswordReset?.enabled) {
                const config = settings.channelsConfig.PasswordReset;
                const customer = await this.connection.getRepository(ctx, User).findOne({
                    where: { id: user.id },
                    relations: ['roles'] // We might need customer details if available
                });

                // Ensure native auth method is available to get the code
                const userWithAuth = await this.connection.getRepository(ctx, User).findOne({
                    where: { id: user.id },
                    relations: ['authenticationMethods']
                });

                const authMethod = userWithAuth?.getNativeAuthenticationMethod(false);
                const code = authMethod?.passwordResetToken;

                this.logger.log(`Retrieved password reset code for ${user.identifier}: ${code}`);

                if (!code) {
                    this.logger.warn(`No reset code found for user ${user.identifier}. Skipping notification.`);
                    return;
                }

                const vars = {
                    passwordResetToken: code,
                    identifier: user.identifier,
                };

                const email = user.identifier; // Assuming identifier is email for now
                // In Ahizan, we might want to check if it's a customer or vendor to get phone/proper email.

                if ((config.channel === 'SMS' || config.channel === 'BOTH') && config.smsTemplate) {
                    // Try to find a phone number. For Ahizan, Vendors have phone numbers in their profiles.
                    // Customers might not. Let's try to find a vendor profile if possible.
                    // For now, let's keep it simple.
                    const content = this.smsService.interpolate(config.smsTemplate, vars);
                    this.logger.log(`Sending reset code SMS to ${email}`);
                    // await this.smsService.sendSms(..., content, settings); 
                }

                if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                    const subject = this.smsService.interpolate(config.emailSubject || 'Réinitialisation de mot de passe', vars);
                    const content = this.smsService.interpolate(config.emailTemplate, vars);
                    this.logger.log(`Sending reset code Email to ${email}`);
                    await this.smsService.sendTransactionalEmail(email, subject, content, settings);
                } else if (!config.emailTemplate) {
                    this.logger.warn(`Email template not configured for PasswordReset. Skipping email.`);
                }
            } else {
                this.logger.warn(`PasswordReset notification is disabled or not configured in Settings > Notifications.`);
            }
        });
    }
}
