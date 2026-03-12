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

    @OneToOne(type => Asset, { nullable: true })
    @JoinColumn()
    logo: Asset;

    @OneToOne(type => Asset, { nullable: true })
    @JoinColumn()
    coverImage: Asset;

    @OneToOne(type => User, { nullable: true })
    @JoinColumn()
    user: User;

    @Column({ type: 'varchar', default: VendorStatus.PENDING })
    status: VendorStatus;



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

    // --- New Business Fields ---

    @Column({ type: 'varchar', default: 'INDIVIDUAL' })
    type: 'INDIVIDUAL' | 'ONLINE' | 'SHOP' | 'ENTERPRISE';

    @Column({ type: 'simple-json', nullable: true })
    dynamicDetails: any;

    // --- Legal & Identity Fields ---

    @Column({ nullable: true })
    rccmNumber: string;

    @OneToOne(type => Asset, { nullable: true })
    @JoinColumn()
    rccmFile: Asset;

    @Column({ nullable: true })
    ifuNumber: string;

    @OneToOne(type => Asset, { nullable: true })
    @JoinColumn()
    ifuFile: Asset;

    @Column({ nullable: true })
    idCardNumber: string; // Carte d'identité / CIP

    @OneToOne(type => Asset, { nullable: true })
    @JoinColumn()
    idCardFile: Asset;

    // --- Social Media Fields ---

    @Column({ nullable: true })
    website: string;

    @Column({ nullable: true })
    facebook: string;

    @Column({ nullable: true })
    instagram: string;

    // --- Wallet Fields ---

    @Column({ type: 'int', default: 0 })
    walletBalance: number; // Stored in smallest currency unit (e.g. FCFA)

    @Column({ type: 'boolean', default: false })
    allowNegativeBalance: boolean; // If true, orders are not blocked when balance is 0
}
