import { Entity, ManyToOne, Index } from 'typeorm';
import { VendureEntity, DeepPartial, Customer } from '@vendure/core';
import { Vendor } from './vendor.entity';

@Entity()
@Index(['customer', 'vendor'], { unique: true })
export class VendorLike extends VendureEntity {
    constructor(input?: DeepPartial<VendorLike>) {
        super(input);
    }

    @ManyToOne(type => Customer, { onDelete: 'CASCADE' })
    customer: Customer;

    @ManyToOne(type => Vendor, { onDelete: 'CASCADE' })
    vendor: Vendor;
}
