import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { VendureEntity, DeepPartial } from '@vendure/core';

/**
 * Stores a notification for a user.
 * Covers all channels: in-app, WebSocket/SSE, push, email.
 */
@Entity()
@Index(['userId', 'isRead'])
export class NotificationLog extends VendureEntity {
    constructor(input?: DeepPartial<NotificationLog>) {
        super(input);
    }

    /** The user this notification belongs to */
    @Column({ nullable: true })
    @Index()
    userId: string;

    /** Type of event that triggered this notification */
    @Column()
    eventType: string;

    /** Notification title */
    @Column({ nullable: true })
    title: string;

    /** Notification body/message */
    @Column({ type: 'text', nullable: true })
    body: string;

    /** Optional action URL */
    @Column({ nullable: true })
    actionUrl: string;

    /** Optional icon URL */
    @Column({ nullable: true })
    iconUrl: string;

    /** Whether the user has read this notification */
    @Column({ default: false })
    isRead: boolean;

    /** Channel via which this was sent */
    @Column({ nullable: true })
    channel: string; // 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH'

    /** Raw data payload (JSON) */
    @Column({ type: 'simple-json', nullable: true })
    data: any;

    /** Whether the send succeeded */
    @Column({ default: true })
    sendSuccess: boolean;

    /** Error message if send failed */
    @Column({ nullable: true, type: 'text' })
    sendError: string;
}
