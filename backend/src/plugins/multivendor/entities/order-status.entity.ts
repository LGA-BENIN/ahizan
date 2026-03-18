import { Column, Entity } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';

@Entity()
export class OrderStatus extends VendureEntity {
    constructor(input?: DeepPartial<OrderStatus>) {
        super(input);
    }

    @Column({ unique: true })
    code: string;

    @Column()
    label: string;

    @Column({ default: '#6B7280' })
    color: string;

    @Column({ type: 'int', default: 0 })
    order: number;

    @Column({ type: 'boolean', default: false })
    vendorCanSet: boolean;

    @Column({ type: 'boolean', default: false })
    isFinal: boolean;

    @Column({ type: 'boolean', default: true })
    enabled: boolean;
}
