import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection } from '@vendure/core';
import { PasswordPolicy } from '../entities/password-policy.entity';
import { OnApplicationBootstrap } from '@nestjs/common';

@Injectable()
export class PasswordPolicyService implements OnApplicationBootstrap {
    constructor(private connection: TransactionalConnection) {}

    async onApplicationBootstrap() {
        const repo = this.connection.rawConnection.getRepository(PasswordPolicy);
        try {
            const count = await repo.count();
            if (count === 0) {
                console.log('Seeding Default Password Policy...');
                await repo.save(new PasswordPolicy({
                    securedPasswordEnabled: false,
                    minLength: 8,
                    maxLength: 20,
                    requireUppercase: false,
                    requireLowercase: false,
                    requireNumber: false,
                    requireSymbol: false,
                    blacklistedWords: []
                }));
                console.log('Default Password Policy Seeded.');
            }
        } catch (e) {
            console.error('Error seeding password policy:', e);
        }
    }

    async getPolicy(ctx: RequestContext): Promise<PasswordPolicy> {
        const repo = this.connection.getRepository(ctx, PasswordPolicy);
        let policy = await repo.findOne({ where: {}, order: { id: 'ASC' } });
        if (!policy) {
            policy = await repo.save(new PasswordPolicy());
        }
        return policy;
    }

    async updatePolicy(ctx: RequestContext, input: any): Promise<PasswordPolicy> {
        const repo = this.connection.getRepository(ctx, PasswordPolicy);
        let policy = await repo.findOne({ where: {}, order: { id: 'ASC' } });
        if (!policy) {
            policy = new PasswordPolicy();
        }
        
        if (input.securedPasswordEnabled !== undefined) policy.securedPasswordEnabled = input.securedPasswordEnabled;
        if (input.minLength !== undefined) policy.minLength = input.minLength;
        if (input.maxLength !== undefined) policy.maxLength = input.maxLength;
        if (input.requireUppercase !== undefined) policy.requireUppercase = input.requireUppercase;
        if (input.requireLowercase !== undefined) policy.requireLowercase = input.requireLowercase;
        if (input.requireNumber !== undefined) policy.requireNumber = input.requireNumber;
        if (input.requireSymbol !== undefined) policy.requireSymbol = input.requireSymbol;
        if (input.blacklistedWords !== undefined) policy.blacklistedWords = input.blacklistedWords;

        return repo.save(policy);
    }
}
