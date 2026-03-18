import { Column, Entity, PrimaryColumn } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';

@Entity()
export class PlatformSettings extends VendureEntity {
    constructor(input?: DeepPartial<PlatformSettings>) {
        super(input);
    }

    @PrimaryColumn()
    id: string = 'platform_settings';

    @Column({ default: 'Ahizan' })
    platformName: string;

    @Column({ type: 'float', default: 10 })
    defaultCommissionRate: number;

    @Column({ type: 'boolean', default: false })
    showVendorContact: boolean;

    @Column('simple-json', { nullable: true })
    vendorContactFields: {
        phone?: boolean;
        email?: boolean;
        whatsapp?: boolean;
        facebook?: boolean;
        instagram?: boolean;
        website?: boolean;
    };

    @Column({ default: 'XOF' })
    defaultCurrencyCode: string;

    @Column({ default: '+229' })
    defaultPhonePrefix: string;

    @Column({ type: 'boolean', default: false })
    emailVerificationRequired: boolean;

    @Column({ type: 'boolean', default: false })
    vendorAutoApproval: boolean;

    @Column({ default: 'ahizan.com' })
    placeholderEmailDomain: string;
}
