import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

export enum VendorStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    SUSPENDED = 'SUSPENDED',
}

@Entity()
export class Vendor extends VendureEntity {
    constructor(input?: DeepPartial<Vendor>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ type: 'varchar', default: VendorStatus.PENDING })
    status: VendorStatus;

    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    email: string;

    @Column({ type: 'float', default: 0 })
    commissionRate: number;
}
