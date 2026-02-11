import { DeepPartial, VendureEntity, Asset, User } from '@vendure/core';
import { Column, Entity, OneToOne, JoinColumn } from 'typeorm';

export enum VendorStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    SUSPENDED = 'SUSPENDED',
}

@Entity()
export class Vendor extends VendureEntity {
    constructor(input?: DeepPartial<Vendor>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @OneToOne(type => Asset)
    @JoinColumn()
    logo: Asset;

    @OneToOne(type => Asset)
    @JoinColumn()
    coverImage: Asset;

    @OneToOne(type => User, { nullable: true })
    @JoinColumn()
    user: User;

    @Column({ type: 'varchar', default: VendorStatus.PENDING })
    status: VendorStatus;

    @Column({ type: 'varchar', default: 'INDIVIDUAL' })
    type: 'INDIVIDUAL' | 'BUSINESS';

    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    zone: string; // e.g. "Cotonou - Akpakpa"

    @Column({ nullable: true })
    email: string;

    @Column({ type: 'text', nullable: true })
    deliveryInfo: string;

    @Column({ type: 'text', nullable: true })
    returnPolicy: string;

    @Column({ type: 'float', default: 0 })
    rating: number;

    @Column({ type: 'int', default: 0 })
    ratingCount: number;

    @Column({ type: 'boolean', default: false })
    verificationStatus: boolean;

    @Column({ type: 'text', nullable: true })
    rejectionReason: string;

    @Column({ type: 'float', default: 0 })
    commissionRate: number;
}
