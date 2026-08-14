import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Vendor } from './vendor.entity';

export enum WithdrawalStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

@Entity()
export class WithdrawalRequest extends VendureEntity {
    constructor(input?: DeepPartial<WithdrawalRequest>) {
        super(input);
    }

    @ManyToOne(() => Vendor)
    vendor: Vendor;

    @Column({ type: 'int' })
    amount: number;

    @Column({ type: 'varchar', default: WithdrawalStatus.PENDING })
    status: WithdrawalStatus;

    @Column({ nullable: true })
    mobileMoneyNumber: string;

    @Column({ type: 'text', nullable: true })
    rejectionReason: string;

    @Column({ nullable: true })
    transferReference: string;
}
