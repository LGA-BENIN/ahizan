import { DeepPartial, VendureEntity, Asset, User } from '@vendure/core';
import { Column, Entity, OneToOne, JoinColumn, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { GeographicLocation } from './geographic-location.entity';
import { Market } from './market.entity';


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

    @OneToOne(() => Asset, { nullable: true })
    @JoinColumn()
    logo: Asset;

    @OneToOne(() => Asset, { nullable: true })
    @JoinColumn()
    coverImage: Asset;

    @OneToOne(() => User, { nullable: true })
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

    @OneToOne(() => Asset, { nullable: true })
    @JoinColumn()
    rccmFile: Asset;

    @Column({ nullable: true })
    ifuNumber: string;

    @OneToOne(() => Asset, { nullable: true })
    @JoinColumn()
    ifuFile: Asset;

    @Column({ nullable: true })
    idCardNumber: string; // Carte d'identité / CIP

    @OneToOne(() => Asset, { nullable: true })
    @JoinColumn()
    idCardFile: Asset;

    // --- Social Media Fields ---

    @Column({ nullable: true })
    website: string;

    @Column({ nullable: true })
    facebook: string;

    @Column({ nullable: true })
    instagram: string;

    // --- Payment Reception Fields ---

    @Column({ type: 'varchar', default: 'MOBILE_MONEY' })
    paymentMethod: 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CASH';

    @Column({ nullable: true })
    mobileMoneyProvider: string; // MTN, MOOV, CELTIIS

    @Column({ nullable: true })
    mobileMoneyNumber: string;

    @Column({ nullable: true })
    bankName: string;

    @Column({ nullable: true })
    bankAccountNumber: string;

    // --- Wallet Fields ---

    @Column({ type: 'int', default: 0 })
    walletBalance: number; // Stored in smallest currency unit (e.g. FCFA)

    @Column({ type: 'boolean', default: false })
    allowNegativeBalance: boolean; // If true, orders are not blocked when balance is 0

    // --- Geolocation & Market Fields ---

    @Column({ type: 'float', nullable: true })
    latitude: number;

    @Column({ type: 'float', nullable: true })
    longitude: number;

    @ManyToOne(() => GeographicLocation, { nullable: true })
    @JoinColumn()
    location: GeographicLocation;

    @ManyToOne(() => Market, { nullable: true })
    @JoinColumn()
    physicalMarket: Market;

    @ManyToMany(() => Market)
    @JoinTable({ name: 'vendor_markets_market' })
    markets: Market[];
}
