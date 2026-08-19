import { Entity, ManyToOne, Index, Column } from 'typeorm';
import { VendureEntity, DeepPartial, Customer } from '@vendure/core';
import { Vendor } from './vendor.entity';

@Entity()
export class ChatMessage extends VendureEntity {
    constructor(input?: DeepPartial<ChatMessage>) {
        super(input);
    }

    @ManyToOne(type => Customer, { onDelete: 'CASCADE' })
    @Index()
    customer: Customer;

    @ManyToOne(type => Vendor, { onDelete: 'CASCADE' })
    @Index()
    vendor: Vendor;

    @Column()
    sender: 'CUSTOMER' | 'VENDOR' | 'SUPERADMIN';

    @Column({ type: 'text' })
    content: string;

    @Column({ default: false })
    deleted: boolean;

    @Column({ default: false })
    modified: boolean;

    @Column({ default: false })
    seen: boolean;
}
