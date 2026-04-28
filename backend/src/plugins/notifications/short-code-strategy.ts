import { RequestContext, VerificationTokenStrategy, Injector, TransactionalConnection, User, Logger } from '@vendure/core';
import { NativeAuthenticationMethod } from '@vendure/core/dist/entity/authentication-method/native-authentication-method.entity';

export class ShortCodeVerificationTokenStrategy implements VerificationTokenStrategy {
    private connection: TransactionalConnection;

    init(injector: Injector) {
        this.connection = injector.get(TransactionalConnection);
    }

    /**
     * Generates a 6-digit numeric code.
     */
    generateVerificationToken(ctx: RequestContext): string {
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        Logger.info(`Generated 6-digit password reset code: ${token}`, 'ShortCodeStrategy');
        return token;
    }

    /**
     * Verifies the token by checking the custom 'passwordResetCodeExpiresAt' field on the user.
     */
    async verifyVerificationToken(ctx: RequestContext, token: string): Promise<boolean> {
        // Find the user associated with this token
        // Use TypeORM directly to find the auth method by token
        const authMethod = await this.connection.getRepository(ctx, NativeAuthenticationMethod).findOne({
            where: { passwordResetToken: token },
            relations: ['user'],
        });

        if (!authMethod || !authMethod.user) {
            return false;
        }

        const expiresAt = (authMethod.user.customFields as any).passwordResetCodeExpiresAt;
        if (!expiresAt) {
            return false;
        }

        const now = new Date();
        const isExpired = now > new Date(expiresAt);

        return !isExpired;
    }
}
