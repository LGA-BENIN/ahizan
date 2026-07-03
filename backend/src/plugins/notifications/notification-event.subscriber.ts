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
    AccountRegistrationEvent,
    Order,
    User,
    Customer,
} from '@vendure/core';
import { BrevoSmsService } from './brevo-sms.service';
import { BrevoSettings } from './entities/brevo-settings.entity';
import { VendorEvent } from '../multivendor/events/vendor-event';
import { Vendor } from '../multivendor/entities/vendor.entity';
import { ChatMessageEvent } from '../multivendor/events/chat-message-event';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationEventSubscriber implements OnApplicationBootstrap {
    private readonly logger = new Logger('NotificationEventSubscriber');

    constructor(
        private readonly eventBus: EventBus,
        private readonly smsService: BrevoSmsService,
        private readonly productVariantService: ProductVariantService,
        private readonly connection: TransactionalConnection,
        private readonly notificationsService: NotificationsService,
    ) { }

    private async sendInAppAndPushNotification(
        ctx: RequestContext,
        userId: string,
        title: string,
        body: string,
        actionUrl?: string,
        iconUrl?: string,
    ) {
        try {
            await this.notificationsService.notify(ctx, {
                userId,
                eventType: 'SYSTEM_EVENT',
                title,
                body,
                channels: ['IN_APP', 'PUSH'],
                actionUrl,
                iconUrl,
            });
        } catch (e: any) {
            this.logger.error(`Failed to send In-App/Push notification to user ${userId}: ${e.message}`);
        }
    }

    async onApplicationBootstrap() {
        await this.ensurePasswordResetConfig();
        this.subscribeToOrderEvents();
        this.subscribeToPaymentEvents();
        this.subscribeToFulfillmentEvents();
        this.subscribeToStockEvents();
        this.subscribeToVendorEvents();
        this.subscribeToAuthEvents();
        this.subscribeToBuyerRegistration();
        this.subscribeToChatEvents();
    }

    private async ensurePasswordResetConfig() {
        const settings = await this.smsService.getSettings();
        if (!settings) return;

        const channelsConfig = settings.channelsConfig || {};
        let modified = false;
        if (!channelsConfig.PasswordReset) {
            this.logger.log('Initializing default PasswordReset configuration...');
            channelsConfig.PasswordReset = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Votre code de réinitialisation Ahizan',
                emailTemplate: 'Bonjour, voici votre code de confirmation Ahizan : {{ passwordResetToken }}. Ce code expire dans 15 minutes.',
                smsTemplate: 'Ahizan: Votre code de réinitialisation est {{ passwordResetToken }}'
            };
            modified = true;
        }
        if (!channelsConfig.BuyerRegistration) {
            this.logger.log('Initializing default BuyerRegistration configuration...');
            channelsConfig.BuyerRegistration = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Bienvenue sur Ahizan - Vérifiez votre adresse e-mail',
                emailTemplate: 'Bonjour {{ firstName }},\n\nMerci de vous être inscrit sur Ahizan. Pour finaliser votre inscription, veuillez vérifier votre adresse e-mail en cliquant sur le lien ci-dessous :\n\n{{ verificationLink }}\n\nOu utilisez votre code de confirmation : {{ verificationToken }}\n\nÀ bientôt !',
                smsTemplate: 'Ahizan: Vérifiez votre compte sur {{ verificationLink }}'
            };
            modified = true;
        }
        if (!channelsConfig.VendorRegistration) {
            this.logger.log('Initializing default VendorRegistration configuration...');
            channelsConfig.VendorRegistration = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Inscription Vendeur reçue - Ahizan',
                emailTemplate: 'Bonjour {{ name }},\n\nNous avons bien reçu votre demande d\'inscription pour la boutique "{{ businessName }}".\n\nPour vérifier votre adresse e-mail et activer votre compte vendeur, veuillez cliquer sur le lien ci-dessous :\n\n{{ verificationLink }}\n\nÀ bientôt sur Ahizan Seller !',
                smsTemplate: 'Ahizan: Inscription de votre boutique reçue.'
            };
            modified = true;
        }
        if (!channelsConfig.SellerAccountVerification) {
            this.logger.log('Initializing default SellerAccountVerification configuration...');
            channelsConfig.SellerAccountVerification = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Bienvenue sur Ahizan Seller - Vérifiez votre adresse e-mail',
                emailTemplate: 'Bonjour {{ firstName }},\n\nMerci de vous être inscrit en tant que vendeur sur Ahizan. Pour finaliser votre inscription et configurer votre boutique, veuillez vérifier votre adresse e-mail en cliquant sur le lien ci-dessous :\n\n{{ verificationLink }}\n\nOu utilisez votre code de confirmation : {{ verificationToken }}\n\nÀ bientôt !',
                smsTemplate: 'Ahizan Seller: Vérifiez votre compte sur {{ verificationLink }}'
            };
            modified = true;
        }
        if (!channelsConfig.VendorApproved) {
            this.logger.log('Initializing default VendorApproved configuration...');
            channelsConfig.VendorApproved = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Votre boutique a été approuvée - Ahizan',
                emailTemplate: 'Bonjour {{ name }},\n\nFélicitations ! Votre demande d\'inscription pour la boutique "{{ businessName }}" a été approuvée par nos administrateurs.\n\nVous pouvez maintenant vous connecter à votre espace vendeur pour commencer à vendre vos produits :\n\nhttps://seller.ahizan.com/dashboard\n\nÀ bientôt,\nL\'équipe Ahizan',
                smsTemplate: 'Ahizan: Félicitations ! Votre boutique {{ businessName }} a été approuvée.'
            };
            modified = true;
        }
        if (!channelsConfig.VendorRejected) {
            this.logger.log('Initializing default VendorRejected configuration...');
            channelsConfig.VendorRejected = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Mise à jour concernant votre inscription Vendeur - Ahizan',
                emailTemplate: 'Bonjour {{ name }},\n\nNous avons examiné votre demande d\'inscription pour la boutique "{{ businessName }}". Malheureusement, celle-ci n\'a pas pu être acceptée pour le motif suivant :\n\n{{ rejectionReason }}\n\nSi vous souhaitez corriger ces informations, vous pouvez vous reconnecter sur votre portail vendeur pour soumettre à nouveau votre dossier.\n\nÀ bientôt,\nL\'équipe Ahizan',
                smsTemplate: 'Ahizan: Votre demande de boutique {{ businessName }} a été rejetée. Motif: {{ rejectionReason }}'
            };
            modified = true;
        }
        if (modified) {
            await this.smsService.saveSettings({ channelsConfig });
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CHAT MESSAGES
    // ─────────────────────────────────────────────────────────────
    private subscribeToChatEvents() {
        this.eventBus.ofType(ChatMessageEvent).subscribe(async (event) => {
            const { ctx, message } = event;
            const actionUrl = 'https://ahizan.com/account/messages';
            
            if (message.sender === 'CUSTOMER') {
                const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
                    where: { id: message.vendor.id },
                    relations: ['user']
                });
                if (vendor?.user) {
                    await this.sendInAppAndPushNotification(
                        ctx,
                        String(vendor.user.id),
                        'Nouveau message',
                        `Vous avez reçu un nouveau message de ${message.customer?.firstName || 'un client'}.`,
                        actionUrl
                    );
                }
            } else if (message.sender === 'VENDOR') {
                const customer = await this.connection.getRepository(ctx, Customer).findOne({
                    where: { id: message.customer.id },
                    relations: ['user']
                });
                if (customer?.user) {
                    await this.sendInAppAndPushNotification(
                        ctx,
                        String(customer.user.id),
                        'Nouveau message',
                        `${message.vendor?.name || 'Une boutique'} vous a envoyé un message.`,
                        actionUrl
                    );
                }
            }
        });
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

                // In-App/Push notification to Buyer
                let buyerUserId = order.customer?.user?.id;
                if (!buyerUserId && order.customer?.id) {
                    const customer = await this.connection.rawConnection.getRepository(Customer).findOne({
                        where: { id: order.customer.id },
                        relations: ['user']
                    });
                    buyerUserId = customer?.user?.id;
                }
                if (buyerUserId) {
                    await this.sendInAppAndPushNotification(
                        event.ctx,
                        buyerUserId.toString(),
                        `Commande Confirmée`,
                        `Votre commande ${order.code} a été confirmée avec succès.`,
                        `/account/orders/${order.code}`,
                    );
                }
            }

            // ── Acheteur : Commande Annulée ──
            if (toState === 'Cancelled') {
                const config = settings.channelsConfig?.OrderCancelled;
                const phone = order.customer?.phoneNumber;
                const email = order.customer?.emailAddress;
                const vars = { orderCode: order.code, firstName: order.customer?.firstName || '' };

                if (config?.enabled) {
                    if ((config.channel === 'SMS' || config.channel === 'BOTH') && phone && config.smsTemplate) {
                        const content = this.smsService.interpolate(config.smsTemplate, vars);
                        await this.smsService.sendSms(phone, content, settings);
                    }
                    if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                        const subject = this.smsService.interpolate(config.emailSubject || 'Commande Annulée', vars);
                        const content = this.smsService.interpolate(config.emailTemplate, vars);
                        await this.smsService.sendTransactionalEmail(email, subject, content, settings);
                    }
                } else if (phone) {
                    const content = `Votre commande ${order.code} a été annulée. Contactez-nous pour plus d'informations.`;
                    await this.smsService.sendSms(phone, content, settings);
                }

                // In-App/Push notification to Buyer
                let buyerUserId = order.customer?.user?.id;
                if (!buyerUserId && order.customer?.id) {
                    const customer = await this.connection.rawConnection.getRepository(Customer).findOne({
                        where: { id: order.customer.id },
                        relations: ['user']
                    });
                    buyerUserId = customer?.user?.id;
                }
                if (buyerUserId) {
                    await this.sendInAppAndPushNotification(
                        event.ctx,
                        buyerUserId.toString(),
                        `Commande Annulée`,
                        `Votre commande ${order.code} a été annulée.`,
                        `/account/orders/${order.code}`,
                    );
                }
            }

            // ── Vendeur : Notification de Nouvelle Vente ──
            if (toState === 'PaymentAuthorized' || toState === 'PaymentSettled') {
                const config = settings.channelsConfig?.NewOrderVendor;
                if (config?.enabled) {
                    try {
                        const fullOrder = await this.connection.getEntityOrThrow(event.ctx, Order, order.id, {
                            relations: [
                                'lines', 
                                'lines.productVariant', 
                                'lines.productVariant.product', 
                                'lines.productVariant.product.customFields.vendor',
                                'lines.productVariant.product.customFields.vendor.user'
                            ]
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

                            // Real-time In-App & PWA Push to Seller
                            const vendorUserId = vendor.user?.id;
                            if (vendorUserId) {
                                await this.sendInAppAndPushNotification(
                                    event.ctx,
                                    vendorUserId.toString(),
                                    `Nouvelle Vente !`,
                                    `Félicitations ! Vous avez reçu une nouvelle commande ${order.code}.`,
                                    `/dashboard/orders`,
                                );
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

                    // Real-time In-App & PWA Push
                    let buyerUserId = order?.customer?.user?.id;
                    if (!buyerUserId && order?.customer?.id) {
                        const cust = await this.connection.rawConnection.getRepository(Customer).findOne({
                            where: { id: order.customer.id },
                            relations: ['user']
                        });
                        buyerUserId = cust?.user?.id;
                    }
                    if (buyerUserId) {
                        const stateText = toState === 'Shipped' ? 'expédiée (en cours de livraison)' : 'livrée';
                        await this.sendInAppAndPushNotification(
                            event.ctx,
                            buyerUserId.toString(),
                            `Mise à jour de livraison`,
                            `Votre commande ${order?.code} est ${stateText}.`,
                            `/account/orders/${order?.code}`,
                        );
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
                    
                    let verificationToken = '';
                    const vWithUser = await this.connection.rawConnection.getRepository(Vendor).findOne({
                        where: { id: vendor.id },
                        relations: ['user']
                    });
                    const vendorUser = vWithUser?.user;
                    if (vendorUser) {
                        const userWithAuth = await this.connection.getRepository(event.ctx, User).findOne({
                            where: { id: vendorUser.id },
                            relations: ['authenticationMethods']
                        });
                        const nativeMethod = userWithAuth?.getNativeAuthenticationMethod(false);
                        verificationToken = nativeMethod?.verificationToken || '';
                    }

                    const vars = {
                        businessName: vendor.businessName || '',
                        name: vendor.name || '',
                        email: email || '',
                        verificationToken,
                        verificationLink: `https://seller.ahizan.com/verify?token=${verificationToken}`,
                    };

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
                        name: vendor.name || '',
                        email: email || '',
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

                    // Real-time In-App & PWA Push to Vendor
                    let vendorUserId = vendor.user?.id;
                    if (!vendorUserId && vendor.id) {
                        const vWithUser = await this.connection.rawConnection.getRepository(Vendor).findOne({
                            where: { id: vendor.id },
                            relations: ['user']
                        });
                        vendorUserId = vWithUser?.user?.id;
                    }
                    if (vendorUserId) {
                        await this.sendInAppAndPushNotification(
                            event.ctx,
                            vendorUserId.toString(),
                            `Boutique Approuvée`,
                            `Félicitations ! Votre boutique "${vendor.name || vendor.businessName || ''}" a été approuvée par l'administrateur.`,
                            `/dashboard`,
                        );
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
                        name: vendor.name || '',
                        email: email || '',
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

                    // Real-time In-App & PWA Push to Vendor
                    let vendorUserId = vendor.user?.id;
                    if (!vendorUserId && vendor.id) {
                        const vWithUser = await this.connection.rawConnection.getRepository(Vendor).findOne({
                            where: { id: vendor.id },
                            relations: ['user']
                        });
                        vendorUserId = vWithUser?.user?.id;
                    }
                    if (vendorUserId) {
                        const reason = vendor.rejectionReason || event.input?.rejectionReason || 'Non spécifiée';
                        await this.sendInAppAndPushNotification(
                            event.ctx,
                            vendorUserId.toString(),
                            `Candidature Rejetée`,
                            `Votre candidature de boutique a été rejetée. Motif : ${reason}`,
                            `/pending`,
                        );
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

                // Determine if it is a seller or buyer
                const userWithRoles = await this.connection.getRepository(ctx, User).findOne({
                    where: { id: user.id },
                    relations: ['roles']
                });
                const isSeller = userWithRoles?.roles?.some(role => role.code === 'vendor' || role.code.toLowerCase().includes('seller')) || false;
                
                let resetLink = '';
                if (isSeller) {
                    resetLink = `https://seller.ahizan.com/reset-password?token=${code}&email=${encodeURIComponent(user.identifier)}`;
                } else {
                    resetLink = `https://ahizan.com/reset-password?token=${code}`;
                }

                const vars = {
                    passwordResetToken: code,
                    identifier: user.identifier,
                    resetLink,
                };

                const email = user.identifier; // Assuming identifier is email for now

                if ((config.channel === 'SMS' || config.channel === 'BOTH') && config.smsTemplate) {
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

    // ─────────────────────────────────────────────────────────────
    // 7. BUYER REGISTRATION — Welcome Email
    // ─────────────────────────────────────────────────────────────
    private subscribeToBuyerRegistration() {
        this.eventBus.ofType(AccountRegistrationEvent).subscribe(async (event) => {
            const settings = await this.smsService.getSettings();
            if (!settings?.channelsConfig) return;

            const { ctx, user } = event;
            if (!user) return;

            // Check if the user is registering as a vendor/seller to load the appropriate config and verification link
            const req = ctx.req;
            const registrationRole = req?.get?.('x-ahizan-registration-role') || req?.headers?.['x-ahizan-registration-role'];
            const isSeller = registrationRole === 'vendor';

            const config = isSeller
                ? settings.channelsConfig?.SellerAccountVerification
                : settings.channelsConfig?.BuyerRegistration;

            if (!config?.enabled) return;

            const email = user.identifier;
            let firstName = '';
            let lastName = '';
            let phone = '';

            const CustomerEntity = this.connection.rawConnection.entityMetadatas.find(m => m.name === 'Customer')?.target;
            if (CustomerEntity) {
                const customer = await this.connection.rawConnection.getRepository(CustomerEntity).findOne({
                    where: { emailAddress: email }
                }) as any;
                if (customer) {
                    firstName = customer.firstName || '';
                    lastName = customer.lastName || '';
                    phone = customer.phoneNumber || '';
                }
            }

            let token = '';
            const userWithAuth = await this.connection.getRepository(ctx, User).findOne({
                where: { id: user.id },
                relations: ['authenticationMethods']
            });
            const nativeMethod = userWithAuth?.getNativeAuthenticationMethod(false);
            token = nativeMethod?.verificationToken || '';

            const vars = {
                firstName,
                lastName,
                email,
                verificationToken: token,
                verificationLink: isSeller 
                    ? `https://seller.ahizan.com/verify?token=${token}` 
                    : `https://ahizan.com/verify?token=${token}`,
            };

            this.logger.log(`${isSeller ? 'Seller' : 'Buyer'} registration event for ${email}`);

            if ((config.channel === 'SMS' || config.channel === 'BOTH') && phone && config.smsTemplate) {
                const content = this.smsService.interpolate(config.smsTemplate, vars);
                await this.smsService.sendSms(phone, content, settings);
            }

            if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                const subject = this.smsService.interpolate(config.emailSubject || 'Bienvenue sur Ahizan !', vars);
                const content = this.smsService.interpolate(config.emailTemplate, vars);
                await this.smsService.sendTransactionalEmail(email, subject, content, settings);
            }
        });
    }
}
