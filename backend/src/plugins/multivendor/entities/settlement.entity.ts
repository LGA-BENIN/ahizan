import { Entity, ManyToOne, Column } from 'typeorm';
import { VendureEntity, DeepPartial, Order, OrderLine } from '@vendure/core';
import { Vendor } from './vendor.entity';
import { Payout } from './payout.entity';

export enum SettlementStatus {
    PENDING = 'PENDING',       // Vente effectuée, en attente de livraison
    HELD = 'HELD',             // Livré, en période de rétractation / litige (ex: 48h)
    RELEASED = 'RELEASED',     // Prêt à être reversé au vendeur
    PAID = 'PAID',             // Inclus dans un Payout complété
    CANCELLED = 'CANCELLED'    // Commande annulée ou remboursée
}

@Entity()
export class Settlement extends VendureEntity {
    constructor(input?: DeepPartial<Settlement>) {
        super(input);
    }

    @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
    vendor: Vendor;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    order: Order;

    @ManyToOne(() => OrderLine, { nullable: true, onDelete: 'SET NULL' })
    orderLine: OrderLine | null;

    @Column({ type: 'int' })
    grossAmount: number; // Montant brut de la vente en centimes / sous-unités

    @Column({ type: 'int', default: 0 })
    commissionAmount: number; // Commission Ahizan prélevée

    @Column({ type: 'float', default: 0.10 })
    commissionRate: number; // Taux de commission appliqué (ex: 0.10 pour 10%)

    @Column({ type: 'int', default: 0 })
    shippingFeeShare: number; // Part des frais de livraison due au vendeur le cas échéant

    @Column({ type: 'int', default: 0 })
    penaltyAmount: number; // Pénalités appliquées (retard, rupture, etc.)

    @Column({ type: 'int' })
    netAmount: number; // Montant net = grossAmount - commissionAmount + shippingFeeShare - penaltyAmount

    @Column({
        type: 'varchar',
        default: SettlementStatus.PENDING
    })
    status: SettlementStatus;

    @Column({ type: 'timestamp', nullable: true })
    releaseDate: Date | null; // Date de libération des fonds (fin du délai de contestation)

    @ManyToOne(() => Payout, payout => payout.settlements, { nullable: true, onDelete: 'SET NULL' })
    payout: Payout | null;
}
