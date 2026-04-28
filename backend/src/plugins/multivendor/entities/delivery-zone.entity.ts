import { Column, Entity } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';

@Entity()
export class DeliveryZone extends VendureEntity {
    constructor(input?: DeepPartial<DeliveryZone>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ unique: true })
    code: string;

    @Column({ type: 'int', default: 0 })
    price: number;

    @Column({ type: 'boolean', default: true })
    enabled: boolean;

    @Column({ type: 'int', default: 0 })
    order: number;
}
