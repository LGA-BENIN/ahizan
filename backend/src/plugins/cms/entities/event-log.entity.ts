import { VendureEntity, DeepPartial, ID } from '@vendure/core';
import { Entity, Column, Index } from 'typeorm';

export type EventType = 'PRODUCT_IMPRESSION' | 'PRODUCT_CLICK' | 'PRODUCT_LIKE' | 'STORE_LIKE' | 'ADD_TO_CART' | 'CHECKOUT_START' | 'PURCHASE_COMPLETE' | 'SECTION_VIEW' | 'SEARCH_QUERY' | 'PRODUCT_SHARE' | 'TIME_VISIBLE';

@Entity()
export class CMSEventLog extends VendureEntity {
    constructor(input?: DeepPartial<CMSEventLog>) {
        super(input);
    }

    @Index()
    @Column()
    eventType: EventType;

    @Column({ type: 'varchar', nullable: true })
    userId: ID | null;

    @Column({ type: 'varchar', nullable: true })
    geoZoneId: ID | null;

    @Column({ type: 'varchar', nullable: true })
    productId: ID | null;

    @Column({ type: 'text', nullable: true })
    metadataJson: string;

    @Index()
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    timestamp: Date;
}
