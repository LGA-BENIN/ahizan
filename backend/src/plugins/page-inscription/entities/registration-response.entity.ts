import { VendureEntity, EntityId, DeepPartial } from '@vendure/core';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { RegistrationField } from './registration-field.entity';
import { Vendor } from '../../multivendor/entities/vendor.entity';

@Entity()
export class RegistrationResponse extends VendureEntity {
    constructor(input?: DeepPartial<RegistrationResponse>) {
        super(input);
    }

    @Column({ type: 'text', nullable: true })
    value: string;

    @ManyToOne(type => RegistrationField, { onDelete: 'CASCADE' })
    @JoinColumn()
    registrationField: RegistrationField;

    @ManyToOne(type => Vendor, { onDelete: 'CASCADE' })
    @JoinColumn()
    vendor: Vendor;
}
