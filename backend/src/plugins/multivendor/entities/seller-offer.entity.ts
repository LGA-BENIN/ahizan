import { Entity, ManyToOne, Index, Column } from 'typeorm';
import { VendureEntity, DeepPartial, ProductVariant } from '@vendure/core';
import { Vendor } from './vendor.entity';

export enum ProductCondition {
    NEW = 'NEW',
    USED = 'USED'
}

export enum DeliveryTimeUnit {
    HOURS = 'HOURS',
    DAYS = 'DAYS'
}

@Entity()
@Index(['vendor', 'productVariant'], { unique: true })
export class SellerOffer extends VendureEntity {
    constructor(input?: DeepPartial<SellerOffer>) {
        super(input);
    }

    @ManyToOne(type => Vendor, { onDelete: 'CASCADE' })
    vendor: Vendor;

    @ManyToOne(type => ProductVariant, { onDelete: 'CASCADE' })
    productVariant: ProductVariant;

    @Column({ type: 'int' })
    price: number; // Price in cents/subunits (e.g. 15000000 for 150 000 FCFA)

    @Column({ type: 'int', default: 0 })
    stock: number;

    @Column({ type: 'varchar', nullable: true })
    sku: string | null; // Seller specific SKU

    @Column({ type: 'int', default: 2 })
    deliveryTimeValue: number; // e.g. 2

    @Column({
        type: 'varchar',
        default: DeliveryTimeUnit.DAYS
    })
    deliveryTimeUnit: DeliveryTimeUnit; // e.g. 'DAYS' or 'HOURS'

    @Column({
        type: 'varchar',
        default: ProductCondition.NEW
    })
    condition: ProductCondition; // 'NEW' or 'USED'

    @Column({ type: 'boolean', default: false })
    onPromotion: boolean;

    @Column({ type: 'int', nullable: true })
    promotionalPrice: number | null; // Promotional price in cents/subunits

    @Column({ type: 'varchar', nullable: true })
    featuredAssetId: string | null;

    @Column({ type: 'varchar', default: 'approved' })
    status: string; // 'approved', 'pending', 'rejected'

    @Column({ type: 'text', nullable: true })
    rejectionReason: string | null;
}
