import { Injectable } from '@nestjs/common';
import { TransactionalConnection, ID } from '@vendure/core';
import { UserProfile } from '../entities/user-profile.entity';

@Injectable()
export class UserProfileEngineService {
    constructor(private connection: TransactionalConnection) {}

    /**
     * Récupère ou initialise le profil d'affinité d'un utilisateur.
     */
    async getUserProfile(ctx: any, userId: ID): Promise<UserProfile | null> {
        if (!userId) return null;
        return this.connection.getRepository(ctx, UserProfile).findOne({ where: { userId } as any });
    }
}
