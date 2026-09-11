import { Entity, ManyToOne, Column } from 'typeorm';
import { VendureEntity, DeepPartial, Order, OrderLine, Customer, User } from '@vendure/core';
import { Vendor } from './vendor.entity';

export enum DisputeStatus {
    OPEN = 'OPEN',                                     // Litige ouvert par le client
    UNDER_REVIEW = 'UNDER_REVIEW',                     // Pris en charge par le service client Ahizan
    RESOLVED_REFUND_CUSTOMER = 'RESOLVED_REFUND_CUSTOMER', // Résolu avec remboursement client
    RESOLVED_FAVOR_VENDOR = 'RESOLVED_FAVOR_VENDOR',       // Résolu en faveur du vendeur
    CANCELLED = 'CANCELLED'                            // Litige annulé par le client
}

@Entity()
export class Dispute extends VendureEntity {
    constructor(input?: DeepPartial<Dispute>) {
        super(input);
    }

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    order: Order;

    @ManyToOne(() => OrderLine, { nullable: true, onDelete: 'SET NULL' })
    orderLine: OrderLine | null;

    @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
    customer: Customer;

    @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
    vendor: Vendor;

    @Column({ type: 'varchar' })
    reason: string; // Ex: PRODUIT_NON_CONFORME, PRODUIT_DEFECTUEUX, ARTICLE_MANQUANT, RETARD_EXCESSIF

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'simple-json', nullable: true })
    evidenceImageUrls: string[];

    @Column({
        type: 'varchar',
        default: DisputeStatus.OPEN
    })
    status: DisputeStatus;

    @Column({ type: 'int', default: 0 })
    refundAmount: number; // Montant de remboursement accordé en centimes

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    arbitratedBy: User | null; // Agent Marketplace ayant tranché

    @Column({ type: 'text', nullable: true })
    resolutionNotes: string | null;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt: Date | null;
}
