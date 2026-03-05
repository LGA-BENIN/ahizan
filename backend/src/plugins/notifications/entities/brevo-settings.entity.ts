import { Column, Entity, PrimaryColumn } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';

/**
 * @description
 * Stores the Brevo SMS/API settings for the AHIZAN notification system.
 * This entity replaces the need to put BREVO_API_KEY in the .env file for SMS.
 * Settings are managed via the Admin UI.
 */
@Entity()
export class BrevoSettings extends VendureEntity {
    constructor(input?: DeepPartial<BrevoSettings>) {
        super(input);
    }

    // Use a fixed ID so there is always a single settings record
    @PrimaryColumn()
    id: string = 'brevo_settings';

    @Column({ nullable: true })
    brevoApiKey: string;

    @Column({ default: '+229' })
    defaultPhonePrefix: string;

    // --- Toggles for each notification type ---
    @Column({ default: true })
    enableOrderConfirmedSms: boolean;

    @Column({ default: true })
    enableNewOrderVendorSms: boolean;

    @Column({ default: true })
    enableVendorApprovedSms: boolean;

    @Column({ default: true })
    enableVendorRegistrationSms: boolean;

    @Column({ default: false })
    enablePaymentFailedSms: boolean;

    @Column({ default: true })
    enableShippingUpdateSms: boolean;

    @Column({ default: true })
    enableStockAlertEmail: boolean;

    // --- SMS Templates (use {{ variable }} for dynamic content) ---
    @Column({ nullable: true })
    templateOrderConfirmed: string;

    @Column({ nullable: true })
    templateNewOrderVendor: string;

    @Column({ nullable: true })
    templateVendorApproved: string;

    @Column({ nullable: true })
    templateVendorRegistration: string;

    @Column({ nullable: true })
    templatePaymentFailed: string;

    @Column({ nullable: true })
    templateShippingUpdate: string;
}
