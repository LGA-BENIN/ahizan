import { Column, Entity, Index } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';

/**
 * Stores Web Push subscriptions (VAPID).
 * One user can have multiple subscriptions (multiple devices/browsers).
 */
@Entity()
export class PushSubscription extends VendureEntity {
    constructor(input?: DeepPartial<PushSubscription>) {
        super(input);
    }

    /** The user this subscription belongs to */
    @Column({ nullable: true })
    @Index()
    userId: string;

    /** Browser Push API endpoint URL */
    @Column({ type: 'text' })
    endpoint: string;

    /** P256dh key from the browser subscription */
    @Column({ type: 'text' })
    p256dh: string;

    /** Auth key from the browser subscription */
    @Column({ type: 'text' })
    auth: string;

    /** User agent string (browser/device identification) */
    @Column({ nullable: true })
    userAgent: string;

    /** Whether this subscription is still active */
    @Column({ default: true })
    isActive: boolean;

    /** Last time a push was successfully sent */
    @Column({ nullable: true })
    lastUsedAt: Date;
}
