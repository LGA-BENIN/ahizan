import { Entity, ManyToOne, Column } from 'typeorm';
import { VendureEntity, DeepPartial, Order, User } from '@vendure/core';
import { Vendor } from './vendor.entity';

export enum MissionType {
    PICKUP = 'PICKUP',                   // Collecte boutique vendeur -> Hub Ahizan
    HUB_TRANSFER = 'HUB_TRANSFER',       // Transfert inter-hubs
    FINAL_DELIVERY = 'FINAL_DELIVERY',   // Hub Ahizan -> Client final (avec OTP)
    RETURN_PICKUP = 'RETURN_PICKUP',     // Récupération produit chez le client
    RETURN_SELLER = 'RETURN_SELLER'      // Restitution au vendeur
}

export enum MissionStatus {
    PENDING = 'PENDING',                 // En attente d'assignation
    ASSIGNED = 'ASSIGNED',               // Livreur assigné
    EN_ROUTE = 'EN_ROUTE',               // Coursier en déplacement
    ARRIVED = 'ARRIVED',                 // Coursier sur place
    COMPLETED = 'COMPLETED',             // Mission accomplie
    FAILED = 'FAILED',                   // Échec (client absent, boutique fermée)
    CANCELLED = 'CANCELLED'              // Mission annulée
}

@Entity()
export class DeliveryMission extends VendureEntity {
    constructor(input?: DeepPartial<DeliveryMission>) {
        super(input);
    }

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    order: Order;

    @ManyToOne(() => Vendor, { nullable: true, onDelete: 'SET NULL' })
    vendor: Vendor | null; // Vendeur concerné si mission de collecte

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    driverUser: User | null; // Utilisateur livreur assigné

    @Column({
        type: 'varchar',
        default: MissionType.PICKUP
    })
    type: MissionType;

    @Column({
        type: 'varchar',
        default: MissionStatus.PENDING
    })
    status: MissionStatus;

    @Column({ nullable: true })
    driverName: string;

    @Column({ nullable: true })
    driverPhone: string;

    @Column({ type: 'text', nullable: true })
    pickupAddress: string;

    @Column({ type: 'float', nullable: true })
    pickupLatitude: number;

    @Column({ type: 'float', nullable: true })
    pickupLongitude: number;

    @Column({ type: 'text', nullable: true })
    deliveryAddress: string;

    @Column({ type: 'float', nullable: true })
    deliveryLatitude: number;

    @Column({ type: 'float', nullable: true })
    deliveryLongitude: number;

    // --- Validation par Code OTP (Tome 6) ---
    @Column({ nullable: true })
    otpCode: string; // OTP à 6 chiffres

    @Column({ type: 'timestamp', nullable: true })
    otpVerifiedAt: Date | null;

    @Column({ type: 'text', nullable: true })
    failureReason: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;
}
