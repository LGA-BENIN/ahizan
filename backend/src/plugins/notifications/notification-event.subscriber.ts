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
    Administrator,
} from '@vendure/core';
import { BrevoSmsService } from './brevo-sms.service';
import { BrevoSettings } from './entities/brevo-settings.entity';
import { VendorEvent } from '../multivendor/events/vendor-event';
import { Vendor } from '../multivendor/entities/vendor.entity';
import { ChatMessage } from '../multivendor/entities/chat-message.entity';
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
        eventType: string = 'SYSTEM_EVENT',
        channelsOverride?: ('IN_APP' | 'PUSH')[],
        targetRole?: 'CUSTOMER' | 'VENDOR' | 'ADMIN',
        channelId?: number,
    ) {
        try {
            const channels: ('IN_APP' | 'PUSH')[] = channelsOverride ?? ['IN_APP', 'PUSH'];
            await this.notificationsService.notify(ctx, {
                userId,
                eventType,
                title,
                body,
                channels,
                actionUrl,
                iconUrl,
                targetRole,
                channelId,
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
        if (!channelsConfig.GuestOrderConfirmed) {
            this.logger.log('Initializing default GuestOrderConfirmed configuration...');
            channelsConfig.GuestOrderConfirmed = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Confirmation de votre commande Ahizan - #{{ orderCode }}',
                emailTemplate: '<p>Bonjour {{ firstName }},</p>\n<p>Merci pour votre commande sur Ahizan ! Votre commande <strong>#{{ orderCode }}</strong> a été enregistrée avec succès.</p>\n<p>Pour suivre vos commandes et bénéficier d\'une expérience personnalisée, nous vous invitons à créer votre mot de passe pour finaliser la création de votre compte Ahizan :</p>\n<p><a href="{{ trackUrl }}" style="background: #1d4ed8; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Suivre ma commande / Finaliser mon inscription ({{ email }})</a></p>\n<p>À très bientôt sur Ahizan !</p>',
                smsTemplate: 'Ahizan: Merci pour votre commande {{ orderCode }}. Finalisez votre inscription sur {{ signupUrl }}'
            };
            modified = true;
        }
        if (!channelsConfig.OrderConfirmed) {
            this.logger.log('Initializing default OrderConfirmed configuration...');
            channelsConfig.OrderConfirmed = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Confirmation de votre commande Ahizan - #{{ orderCode }}',
                emailTemplate: '<p>Bonjour {{ firstName }},</p>\n<p>Merci pour votre commande sur Ahizan ! Votre commande <strong>#{{ orderCode }}</strong> a été enregistrée avec succès.</p>\n<p>Vous pouvez consulter les détails et le statut de votre commande à tout moment sur votre compte Ahizan.</p>\n<p>À très bientôt sur Ahizan !</p>',
                smsTemplate: 'Ahizan: Votre commande {{ orderCode }} a été confirmée.'
            };
            modified = true;
        }
        if (!channelsConfig.NewOrderVendor) {
            this.logger.log('Initializing default NewOrderVendor configuration...');
            channelsConfig.NewOrderVendor = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Nouvelle Vente ! - Commande #{{ orderCode }}',
                emailTemplate: '<p>Félicitation !</p>\n<p>Vous avez reçu une nouvelle commande <strong>#{{ orderCode }}</strong> sur votre boutique Ahizan.</p>\n<p>Connectez-vous à votre espace vendeur pour préparer et gérer l\'expédition.</p>',
                smsTemplate: 'Ahizan Seller: Vous avez reçu une nouvelle commande {{ orderCode }}.'
            };
            modified = true;
        }
        if (!channelsConfig.ShippingUpdate) {
            this.logger.log('Initializing default ShippingUpdate configuration...');
            channelsConfig.ShippingUpdate = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Mise à jour de la livraison - Commande #{{ orderCode }}',
                emailTemplate: '<p>Bonjour,</p>\n<p>Votre commande <strong>#{{ orderCode }}</strong> est maintenant <strong>{{ status }}</strong>.</p>',
                smsTemplate: 'Ahizan: Votre commande {{ orderCode }} est {{ status }}.'
            };
            modified = true;
        }
        if (!channelsConfig.StockAlert) {
            this.logger.log('Initializing default StockAlert configuration...');
            channelsConfig.StockAlert = {
                enabled: true,
                channel: 'EMAIL',
                emailSubject: 'Alerte Stock Faible : {{ productName }} - Ahizan',
                emailTemplate: '<p>Bonjour {{ businessName }},</p>\n<p>Attention : le stock pour le produit <strong>{{ productName }}</strong> est descendu à <strong>{{ stockLevel }} unité(s)</strong>.</p>\n<p>Veuillez réapprovisionner votre inventaire dès que possible.</p>',
                smsTemplate: 'Ahizan Seller: Alerte stock pour {{ productName }} (reste {{ stockLevel }}).'
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
            
            // Reload message to ensure relations are fully loaded (critical for direct admin messages with null entities)
            const dbMessage = await this.connection.getRepository(ctx, ChatMessage).findOne({
                where: { id: message.id },
                relations: ['customer', 'vendor']
            }) || message;
            
            if (dbMessage.sender === 'CUSTOMER') {
                if (dbMessage.vendor) {
                    const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
                        where: { id: dbMessage.vendor.id },
                        relations: ['user']
                    });
                    if (vendor?.user) {
                        await this.sendInAppAndPushNotification(
                            ctx,
                            String(vendor.user.id),
                            'Nouveau message',
                            `Vous avez reçu un nouveau message de ${dbMessage.customer?.firstName || 'un client'}.`,
                            '/dashboard/messages',
                            undefined,
                            'VENDOR_EVENT',
                            undefined,
                            'VENDOR',
                        );
                    }
                }
            } else if (dbMessage.sender === 'VENDOR') {
                if (dbMessage.customer) {
                    const customer = await this.connection.getRepository(ctx, Customer).findOne({
                        where: { id: dbMessage.customer.id },
                        relations: ['user']
                    });
                    if (customer?.user) {
                        await this.sendInAppAndPushNotification(
                            ctx,
                            String(customer.user.id),
                            'Nouveau message',
                            `${dbMessage.vendor?.name || 'Une boutique'} vous a envoyé un message.`,
                            '/account/messages',
                            undefined,
                            'BUYER_EVENT',
                            undefined,
                            'CUSTOMER',
                        );
                    }
                }
            } else if (dbMessage.sender === 'SUPERADMIN') {
                if (dbMessage.customer && dbMessage.vendor) {
                    // Intervention in a monitored client-seller conversation: notify both
                    const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
                        where: { id: dbMessage.vendor.id },
                        relations: ['user']
                    });
                    if (vendor?.user) {
                        await this.sendInAppAndPushNotification(
                            ctx,
                            String(vendor.user.id),
                            'Message de l\'administrateur',
                            `L'administrateur a envoyé un message dans votre discussion.`,
                            '/dashboard/messages',
                            undefined,
                            'VENDOR_EVENT',
                            undefined,
                            'VENDOR',
                        );
                    }
                    const customer = await this.connection.getRepository(ctx, Customer).findOne({
                        where: { id: dbMessage.customer.id },
                        relations: ['user']
                    });
                    if (customer?.user) {
                        await this.sendInAppAndPushNotification(
                            ctx,
                            String(customer.user.id),
                            'Message de l\'administrateur',
                            `L'administrateur a envoyé un message dans votre discussion.`,
                            '/account/messages',
                            undefined,
                            'BUYER_EVENT',
                            undefined,
                            'CUSTOMER',
                        );
                    }
                } else if (dbMessage.vendor) {
                    const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
                        where: { id: dbMessage.vendor.id },
                        relations: ['user']
                    });
                    if (vendor?.user) {
                        await this.sendInAppAndPushNotification(
                            ctx,
                            String(vendor.user.id),
                            'Message de l\'administrateur',
                            `L'administrateur vous a envoyé un message.`,
                            '/dashboard/messages',
                            undefined,
                            'VENDOR_EVENT',
                            undefined,
                            'VENDOR',
                        );
                    }
                } else if (dbMessage.customer) {
                    const customer = await this.connection.getRepository(ctx, Customer).findOne({
                        where: { id: dbMessage.customer.id },
                        relations: ['user']
                    });
                    if (customer?.user) {
                        await this.sendInAppAndPushNotification(
                            ctx,
                            String(customer.user.id),
                            'Message de l\'administrateur',
                            `L'administrateur vous a envoyé un message.`,
                            '/account/messages',
                            undefined,
                            'BUYER_EVENT',
                            undefined,
                            'CUSTOMER',
                        );
                    }
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

            const { order, fromState, toState } = event;

            // ── Acheteur : Commande Confirmée ──
            if (toState === 'PaymentAuthorized' || toState === 'PaymentSettled') {
                // Skip duplicate notification if transition is PaymentAuthorized -> PaymentSettled
                if (fromState === 'PaymentAuthorized' && toState === 'PaymentSettled') {
                    return;
                }

                // Strict DB Deduplication: Do not process order if already notified in last 120 seconds
                try {
                    const dupCheck: { count: string }[] = await this.connection.rawConnection.query(`
                        SELECT count(*)::int as count 
                        FROM notification_log 
                        WHERE body LIKE $1 AND "createdAt" > NOW() - INTERVAL '120 seconds'
                    `, [`%${order.code}%`]);
                    if (dupCheck && parseInt(dupCheck[0]?.count, 10) > 0) {
                        return;
                    }
                } catch (dupErr) {}
                let buyerUserId = order.customer?.user?.id;
                let isGuest = !buyerUserId;

                if (!buyerUserId && order.customer?.id) {
                    const customer = await this.connection.rawConnection.getRepository(Customer).findOne({
                        where: { id: order.customer.id },
                        relations: ['user']
                    });
                    buyerUserId = customer?.user?.id;
                    if (!customer?.user) {
                        isGuest = true;
                    }
                }

                // Determine if we should use GuestOrderConfirmed or OrderConfirmed
                const guestConfig = settings.channelsConfig?.GuestOrderConfirmed;
                const standardConfig = settings.channelsConfig?.OrderConfirmed;
                const config = (isGuest && guestConfig?.enabled) ? guestConfig : standardConfig;

                if (config?.enabled) {
                    const phone = order.customer?.phoneNumber;
                    const email = order.customer?.emailAddress || '';
                    const sfUrl = process.env.STOREFRONT_URL || 'https://ahizan.com';
                    const trackUrl = `${sfUrl}/track-order?code=${order.code}&email=${encodeURIComponent(email)}`;
                    const signupUrl = `${process.env.AUTH_URL || 'https://auth.ahizan.com'}/register?email=${encodeURIComponent(email)}&notice=track-order&redirectTo=${encodeURIComponent(`${sfUrl}/account/orders/${order.code}`)}`;
                    const vars = { 
                        orderCode: order.code, 
                        firstName: order.customer?.firstName || '',
                        lastName: order.customer?.lastName || '',
                        email: email,
                        trackUrl: trackUrl,
                        signupUrl: trackUrl,
                        signupLink: trackUrl,
                    };

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

                // In-App/Push notification to Buyer if registered
                if (buyerUserId) {
                    let buyerChannels: ('IN_APP' | 'PUSH')[] = ['IN_APP', 'PUSH'];
                    try {
                        const vRows: { user_id: string }[] = await this.connection.rawConnection.query(`
                            SELECT DISTINCT v."userId" as user_id
                            FROM order_line ol
                            INNER JOIN product_variant pv ON ol."productVariantId" = pv.id
                            INNER JOIN product p ON pv."productId" = p.id
                            INNER JOIN vendor v ON (p."customFieldsVendorid" = v.id OR ol."sellerChannelId" = v."channelId")
                            WHERE ol."orderId" = $1 AND v."userId" IS NOT NULL
                        `, [order.id]);
                        const vUserIds = vRows.map(v => v.user_id?.toString()).filter(Boolean);
                        if (vUserIds.includes(buyerUserId.toString())) {
                            buyerChannels = ['IN_APP'];
                        }
                    } catch (e) {}

                    await this.sendInAppAndPushNotification(
                        event.ctx,
                        buyerUserId.toString(),
                        `Commande Confirmée`,
                        `Votre commande ${order.code} a été confirmée avec succès.`,
                        `/account/orders/${order.code}`,
                        undefined,
                        'BUYER_EVENT',
                        buyerChannels,
                        'CUSTOMER',
                    );
                }

                // ── Notification Push & In-App aux SuperAdmins sur chaque vente ──
                try {
                    const formattedTotal = Number(order.totalWithTax).toLocaleString('fr-FR');
                    await this.notificationsService.notifySuperAdmins(event.ctx, {
                        eventType: 'NEW_ORDER_ADMIN',
                        title: `Nouvelle vente ! 🎉`,
                        body: `Commande #${order.code} d'un montant de ${formattedTotal} FCFA enregistrée sur la plateforme.`,
                        actionUrl: `/orders/${order.id}`,
                        channels: ['IN_APP', 'PUSH'],
                    });
                } catch (adminErr: any) {
                    this.logger.error(`Erreur notification superadmin sur vente #${order.code}: ${adminErr.message}`);
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
                        undefined,
                        'BUYER_EVENT',
                        undefined,
                        'CUSTOMER',
                    );
                }
            }

            // ── Vendeur : Notification de Nouvelle Vente ──
            if (toState === 'PaymentAuthorized' || toState === 'PaymentSettled') {
                let buyerUserIdForVendorCheck: string | undefined;
                try {
                    let bUid = order.customer?.user?.id;
                    if (!bUid && order.customer?.id) {
                        const cust = await this.connection.rawConnection.getRepository(Customer).findOne({
                            where: { id: order.customer.id },
                            relations: ['user']
                        });
                        bUid = cust?.user?.id;
                    }
                    if (bUid) buyerUserIdForVendorCheck = bUid.toString();
                } catch (_) {}

                try {
                    const vendorRows: { vendor_id: string; vendor_name: string; phone_number: string; email: string; user_id: string; channel_id: string }[] = await this.connection.rawConnection.query(`
                        SELECT DISTINCT v.id as vendor_id, v.name as vendor_name, v."phoneNumber" as phone_number, v.email, v."userId" as user_id, v."channelId" as channel_id
                        FROM order_line ol
                        INNER JOIN product_variant pv ON ol."productVariantId" = pv.id
                        INNER JOIN product p ON pv."productId" = p.id
                        INNER JOIN vendor v ON (p."customFieldsVendorid" = v.id OR ol."sellerChannelId" = v."channelId")
                        WHERE ol."orderId" = $1 AND v.id IS NOT NULL
                    `, [order.id]);

                    const config = settings.channelsConfig?.NewOrderVendor;

                    for (const v of vendorRows) {
                        // CRITICAL: If this vendor IS the buyer (same userId), skip seller alert
                        if (buyerUserIdForVendorCheck && v.user_id && v.user_id.toString() === buyerUserIdForVendorCheck) {
                            continue;
                        }

                        // Extract items specific to this vendor
                        const vendorItems: { product_name: string; quantity: number; line_price: number }[] = await this.connection.rawConnection.query(`
                            SELECT 
                                p.name as product_name,
                                ol.quantity,
                                ol."proratedLinePrice" as line_price
                            FROM order_line ol
                            INNER JOIN product_variant pv ON ol."productVariantId" = pv.id
                            INNER JOIN product p ON pv."productId" = p.id
                            INNER JOIN vendor v ON (p."customFieldsVendorid" = v.id OR ol."sellerChannelId" = v."channelId")
                            WHERE ol."orderId" = $1 AND v.id = $2
                        `, [order.id, v.vendor_id]);

                        const vendorTotal = vendorItems.reduce((acc, curr) => acc + parseInt(curr.line_price as any || '0', 10), 0);
                        const formattedVendorTotal = Number(vendorTotal).toLocaleString('fr-FR');

                        const itemsListText = vendorItems
                            .map(i => `- ${i.product_name} (x${i.quantity}) : ${Number(i.line_price).toLocaleString('fr-FR')} FCFA`)
                            .join('\n');

                        const itemsListHtml = vendorItems
                            .map(i => `<li><strong>${i.product_name}</strong> (x${i.quantity}) — ${(i.line_price / 100).toLocaleString('fr-FR')} FCFA</li>`)
                            .join('');

                        const vars = {
                            orderCode: order.code,
                            businessName: v.vendor_name || 'Vendeur',
                            vendorTotal: formattedVendorTotal,
                            vendorSubtotal: formattedVendorTotal,
                            itemsList: itemsListText,
                            itemsListHtml,
                        };

                        const phone = v.phone_number;
                        const email = v.email;

                        if (config?.enabled) {
                            if ((config.channel === 'SMS' || config.channel === 'BOTH') && phone && config.smsTemplate) {
                                const content = this.smsService.interpolate(config.smsTemplate, vars);
                                await this.smsService.sendSms(phone, content, settings);
                            }
                            if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && email && config.emailTemplate) {
                                const subject = this.smsService.interpolate(config.emailSubject || 'Nouvelle Vente ! - Commande #{{ orderCode }}', vars);
                                const content = this.smsService.interpolate(config.emailTemplate, vars);
                                await this.smsService.sendTransactionalEmail(email, subject, content, settings);
                            }
                        }

                        // Real-time In-App & PWA Push to Seller EXCLUSIVELY for their products
                        if (v.user_id) {
                            await this.sendInAppAndPushNotification(
                                event.ctx,
                                v.user_id.toString(),
                                `Nouvelle Vente ! 🎉`,
                                `Félicitations ! Vous avez reçu une commande #${order.code} d'un montant de ${formattedVendorTotal} FCFA.`,
                                `/dashboard/orders`,
                                undefined,
                                'VENDOR_EVENT',
                                undefined,
                                'VENDOR',
                                v.channel_id ? parseInt(v.channel_id, 10) : undefined,
                            );
                        }
                    }
                } catch (e: any) {
                    this.logger.error(`Failed to notify sellers for order ${order.code}: ${e.message}`);
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
                            undefined,
                            'BUYER_EVENT',
                            undefined,
                            'CUSTOMER',
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
                    const productName = variant.name || (variant as any).product?.name || 'Produit';

                    if (storedStockOnHand <= 5 && storedStockOnHand >= 0) {
                        // Find owner vendor via channel or customFields
                        const vendorRows: { vendor_id: string; vendor_name: string; email: string; phone_number: string; user_id: string; channel_id: string }[] = await this.connection.rawConnection.query(`
                            SELECT v.id as vendor_id, v.name as vendor_name, v.email, v."phoneNumber" as phone_number, v."userId" as user_id, v."channelId" as channel_id
                            FROM vendor v
                            INNER JOIN product p ON (p."customFieldsVendorid" = v.id)
                            INNER JOIN product_variant pv ON pv."productId" = p.id
                            WHERE pv.id = $1
                            LIMIT 1
                        `, [variant.id]);

                        const v = vendorRows[0];
                        if (v) {
                            const vars = {
                                productName,
                                stockLevel: storedStockOnHand.toString(),
                                businessName: v.vendor_name || 'Vendeur',
                            };

                            if ((config.channel === 'SMS' || config.channel === 'BOTH') && v.phone_number && config.smsTemplate) {
                                const content = this.smsService.interpolate(config.smsTemplate, vars);
                                await this.smsService.sendSms(v.phone_number, content, settings);
                            }

                            if ((config.channel === 'EMAIL' || config.channel === 'BOTH') && v.email && config.emailTemplate) {
                                const subject = this.smsService.interpolate(config.emailSubject || 'Alerte Stock Faible : {{ productName }} - Ahizan', vars);
                                const content = this.smsService.interpolate(config.emailTemplate, vars);
                                await this.smsService.sendTransactionalEmail(v.email, subject, content, settings);
                            }

                            if (v.user_id) {
                                await this.sendInAppAndPushNotification(
                                    event.ctx,
                                    v.user_id.toString(),
                                    `Stock Faible : ${productName} ⚠️`,
                                    `Attention : il ne reste que ${storedStockOnHand} unité(s) en stock pour "${productName}".`,
                                    `/dashboard/products`,
                                    undefined,
                                    'VENDOR_EVENT',
                                    undefined,
                                    'VENDOR',
                                    v.channel_id ? parseInt(v.channel_id, 10) : undefined,
                                );
                            }
                        }
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
                const config = settings.channelsConfig?.VendorRegistration || settings.channelsConfig?.SellerAccountVerification;
                const displayName = vendor.name || vendor.businessName || '';
                const email = vendor.email || event.input?.email || '';

                // 1. Notify SuperAdmins immediately (In-App & Push)
                try {
                    await this.notificationsService.notifySuperAdmins(event.ctx, {
                        eventType: 'VENDOR_REGISTRATION',
                        title: 'Nouvelle Candidature Vendeur 🏪',
                        body: `La boutique "${displayName}" (${email}) vient de soumettre son dossier d'inscription.`,
                        actionUrl: '/admin/vendors',
                        channels: ['IN_APP', 'PUSH'],
                    });
                } catch (adminErr: any) {
                    this.logger.error(`Failed to notify superadmin on vendor registration: ${adminErr.message}`);
                }

                // 2. Notify Vendor (Confirmation Email / SMS)
                if (config?.enabled) {
                    let verificationToken = '';
                    const vWithUser = await this.connection.rawConnection.getRepository(Vendor).findOne({
                        where: { id: vendor.id },
                        relations: ['user']
                    });
                    const vendorUser = vWithUser?.user;
                    const phone = vendor.phoneNumber || event.input?.phoneNumber || '';

                    if (vendorUser) {
                        const userWithAuth = await this.connection.getRepository(event.ctx, User).findOne({
                            where: { id: vendorUser.id },
                            relations: ['authenticationMethods']
                        });
                        const nativeMethod = userWithAuth?.getNativeAuthenticationMethod(false);
                        verificationToken = nativeMethod?.verificationToken || '';
                    }

                    const nameParts = displayName.trim().split(/\s+/);
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';

                    const vars = {
                        businessName: displayName,
                        name: displayName,
                        firstName,
                        lastName,
                        email: email,
                        verificationToken,
                        verificationLink: `https://seller.ahizan.com/verify?token=${verificationToken}`,
                    };

                    this.logger.log(`Vendor registration event for vendor "${displayName}" (${email}). Sending notification...`);

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
                            `Boutique Approuvée 🎉`,
                            `Félicitations ! Votre boutique "${vendor.name || vendor.businessName || ''}" a été approuvée par l'administrateur.`,
                            `/dashboard`,
                            undefined,
                            'VENDOR_EVENT',
                            undefined,
                            'VENDOR',
                            vendor.channelId ? parseInt(vendor.channelId, 10) : undefined,
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
                            undefined,
                            'VENDOR_EVENT',
                            undefined,
                            'VENDOR',
                            vendor.channelId ? parseInt(vendor.channelId, 10) : undefined,
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
            const headers = req?.headers || {};
            const registrationRole = req?.get?.('x-ahizan-registration-role') || headers['x-ahizan-registration-role'];
            const referer = String(headers.referer || headers.origin || '').toLowerCase();
            const urlStr = String(req?.url || '').toLowerCase();

            // Check if user has vendor role in DB
            const userWithRoles = await this.connection.getRepository(ctx, User).findOne({
                where: { id: user.id },
                relations: ['roles']
            });
            const hasVendorRole = userWithRoles?.roles?.some(r => r.code === 'vendor' || r.code.toLowerCase().includes('seller')) || false;

            const email = user.identifier;

            // Check if vendor record exists for user or email
            const VendorEntity = this.connection.rawConnection.entityMetadatas.find(m => m.name === 'Vendor')?.target;
            let hasVendorRecord = false;
            if (VendorEntity) {
                const v = await this.connection.rawConnection.getRepository(VendorEntity).findOne({
                    where: [
                        { email: email },
                        { user: { id: user.id } }
                    ]
                });
                hasVendorRecord = !!v;
            }

            const isSeller = registrationRole === 'vendor' || 
                             hasVendorRole || 
                             hasVendorRecord ||
                             referer.includes('seller') || 
                             referer.includes('role=vendor') ||
                             urlStr.includes('role=vendor');

            const config = settings.channelsConfig?.BuyerRegistration || settings.channelsConfig?.SellerAccountVerification;

            if (!config?.enabled) return;

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

            const verificationLink = isSeller 
                ? `https://seller.ahizan.com/verify?token=${token}&role=vendor` 
                : `https://ahizan.com/verify?token=${token}`;

            const vars = {
                firstName: firstName || email.split('@')[0],
                lastName,
                name: `${firstName} ${lastName}`.trim() || email.split('@')[0],
                businessName: `${firstName} ${lastName}`.trim() || email.split('@')[0],
                email,
                verificationToken: token,
                verificationLink,
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
