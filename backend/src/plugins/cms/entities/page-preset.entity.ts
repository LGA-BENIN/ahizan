import { VendureEntity, DeepPartial, ID } from '@vendure/core';
import { Entity, Column, ManyToOne } from 'typeorm';

@Entity()
export class PagePreset extends VendureEntity {
    constructor(input?: DeepPartial<PagePreset>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ nullable: true })
    thumbnail: string;

    @Column({ type: 'text' })
    sectionsJson: string;

    @Column({ default: false })
    isBuiltIn: boolean;

    @Column({ default: false })
    isDefault: boolean;

    // --- Draft system ---
    @Column({ default: false })
    isDraft: boolean;

    @Column({ type: 'varchar', nullable: true })
    draftOwnerId: ID | null;

    @Column({ type: 'varchar', nullable: true })
    draftSessionId: string | null;

    // --- Status & versioning ---
    @Column({ type: 'varchar', default: 'published' })
    status: 'draft' | 'published' | 'archived';

    @Column({ type: 'int', default: 1 })
    version: number;

    @Column({ type: 'timestamp', nullable: true })
    publishedAt: Date;

    @Column({ type: 'varchar', nullable: true })
    previousPresetId: ID | null;

    @Column({ type: 'varchar', nullable: true })
    sourcePresetId: ID | null;

    // --- Backup flag ---
    @Column({ default: false })
    isBackup: boolean;

    // --- Undo/Redo: stores array of sectionsJson snapshots ---
    @Column({ type: 'text', nullable: true })
    changeHistory: string;

    // --- Change history pointer (index into changeHistory array) ---
    @Column({ type: 'int', default: -1 })
    historyPointer: number;
}
