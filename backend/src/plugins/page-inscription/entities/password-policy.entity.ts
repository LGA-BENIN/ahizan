import { DeepPartial, VendureEntity } from '@vendure/core';
import { Entity, Column } from 'typeorm';

@Entity()
export class PasswordPolicy extends VendureEntity {
    constructor(input?: DeepPartial<PasswordPolicy>) {
        super(input);
    }

    @Column({ default: false })
    securedPasswordEnabled: boolean;

    @Column({ default: 8 })
    minLength: number;

    @Column({ default: 20 })
    maxLength: number;

    @Column({ default: false })
    requireUppercase: boolean;

    @Column({ default: false })
    requireLowercase: boolean;

    @Column({ default: false })
    requireNumber: boolean;

    @Column({ default: false })
    requireSymbol: boolean;

    @Column({ type: 'simple-json', nullable: true })
    blacklistedWords: string[] | null;
}
