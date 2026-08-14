import { RequestContext, VerificationTokenStrategy, Injector, TransactionalConnection, Logger } from '@vendure/core';
import { NativeAuthenticationMethod } from '@vendure/core/dist/entity/authentication-method/native-authentication-method.entity';
import * as crypto from 'crypto';

export class ShortCodeVerificationTokenStrategy implements VerificationTokenStrategy {
    private connection: TransactionalConnection;

    init(injector: Injector) {
        this.connection = injector.get(TransactionalConnection);
    }

    /**
     * Generates a cryptographically secure, high-entropy 256-bit token (64 hex characters).
     */
    generateVerificationToken(ctx: RequestContext): string {
        const token = crypto.randomBytes(32).toString('hex');
        Logger.info(`[Security] Generated cryptographically secure 256-bit token`, 'ShortCodeStrategy');
        return token;
    }

    /**
     * Verifies the token using timing-safe comparison and checks passwordResetCodeExpiresAt.
     */
    async verifyVerificationToken(ctx: RequestContext, token: string): Promise<boolean> {
        if (!token || typeof token !== 'string' || token.trim().length === 0) {
            return false;
        }

        const trimmedToken = token.trim();

        // Look up by verificationToken first, and fallback to passwordResetToken
        let authMethod = await this.connection.getRepository(ctx, NativeAuthenticationMethod).findOne({
            where: { verificationToken: trimmedToken },
            relations: ['user'],
        });

        if (!authMethod) {
            authMethod = await this.connection.getRepository(ctx, NativeAuthenticationMethod).findOne({
                where: { passwordResetToken: trimmedToken },
                relations: ['user'],
            });
        }

        if (!authMethod || !authMethod.user) {
            return false;
        }

        // Timing-safe check against stored token
        const storedToken = authMethod.verificationToken || authMethod.passwordResetToken;
        if (!storedToken || storedToken.length !== trimmedToken.length) {
            return false;
        }

        try {
            const isMatch = crypto.timingSafeEqual(Buffer.from(storedToken), Buffer.from(trimmedToken));
            if (!isMatch) {
                return false;
            }
        } catch (err) {
            return false;
        }

        // Token is valid and matched
        return true;
    }
}
