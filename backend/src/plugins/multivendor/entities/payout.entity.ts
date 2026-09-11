import { Entity, ManyToOne, OneToMany, Column } from 'typeorm';
import { VendureEntity, DeepPartial, User } from '@vendure/core';
import { Vendor } from './vendor.entity';
import { Settlement } from './settlement.entity';

export enum PayoutStatus {
    DRAFT = 'DRAFT',                       // Brouillon généré
    PENDING_APPROVAL = 'PENDING_APPROVAL', // En attente de signature Finance Manager (seuil > 25k FCFA)
    APPROVED = 'APPROVED',                 // Validé par le Finance Manager
    PROCESSING = 'PROCESSING',             // Ordre envoyé au PSP Mobile Money / Banque
    COMPLETED = 'COMPLETED',               // Virement réussi
    REJECTED = 'REJECTED',                 // Rejeté par la finance
    FAILED = 'FAILED'                      // Échec technique de transfert
}

@Entity()
export class Payout extends VendureEntity {
    constructor(input?: DeepPartial<Payout>) {
        super(input);
    }

    @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
    vendor: Vendor;

    @Column({ type: 'int' })
    amount: number; // Montant total en centimes / FCFA

    @Column({ type: 'varchar', default: 'XOF' })
    currencyCode: string;

    @Column({ type: 'varchar', default: 'MOBILE_MONEY' })
    paymentMethod: 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CASH';

    @Column({ type: 'varchar', nullable: true })
    destinationProvider: string | null; // MTN, MOOV, CELTIIS, BANK_NAME

    @Column({ type: 'varchar', nullable: true })
    destinationAccount: string | null; // Numéro de téléphone ou IBAN

    @Column({
        type: 'varchar',
        default: PayoutStatus.DRAFT
    })
    status: PayoutStatus;

    // --- Double validation financière (Principe des 4 yeux - Tome 10) ---
    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    initiatedBy: User | null; // Opérateur financier ayant initié le payout

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    approvedBy: User | null; // Finance Manager ayant validé le payout

    @Column({ type: 'timestamp', nullable: true })
    approvedAt: Date | null;

    @Column({ type: 'varchar', nullable: true })
    transactionReference: string | null; // Réf transaction PSP (FedaPay, Kkiapay, MTN MoMo API)

    @Column({ type: 'text', nullable: true })
    rejectionReason: string | null;

    @Column({ type: 'text', nullable: true })
    failureReason: string | null;

    @OneToMany(() => Settlement, settlement => settlement.payout)
    settlements: Settlement[];
}
