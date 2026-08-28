import { Column, Entity, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';

export enum GeoCorrectionStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

@Entity()
export class GeoUserCorrection extends VendureEntity {
    constructor(input?: DeepPartial<GeoUserCorrection>) {
        super(input);
    }

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'float' })
    latitude: number;

    @Column({ type: 'float' })
    longitude: number;

    @Column({ type: 'varchar', nullable: true })
    suggestedGeoId: string;

    @Column({ type: 'int', nullable: true })
    suggestedGeoZoneId: number;

    @Column({ type: 'text', nullable: true })
    userComment: string;

    @Column({ type: 'varchar', nullable: true })
    submittedByUserId: string;

    @Index()
    @Column({ type: 'varchar', default: GeoCorrectionStatus.PENDING })
    status: GeoCorrectionStatus;

    @CreateDateColumn()
    createdAt: Date;
}
