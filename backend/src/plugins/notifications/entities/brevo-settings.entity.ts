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

    @Column('simple-json', { nullable: true })
    channelsConfig: any;
}
