import { Injector, PasswordValidationStrategy, RequestContext } from '@vendure/core';
import { PasswordPolicyService } from './service/password-policy.service';

export class DynamicPasswordValidationStrategy implements PasswordValidationStrategy {
    private policyService: PasswordPolicyService;

    init(injector: Injector) {
        this.policyService = injector.get(PasswordPolicyService);
    }

    async validate(ctx: RequestContext, password: string): Promise<boolean | string> {
        try {
            const policy = await this.policyService.getPolicy(ctx);
            if (!policy || !policy.securedPasswordEnabled) {
                return true;
            }

            if (password.length < policy.minLength) {
                return `Le mot de passe doit contenir au moins ${policy.minLength} caractères`;
            }
            if (password.length > policy.maxLength) {
                return `Le mot de passe doit contenir au plus ${policy.maxLength} caractères`;
            }

            if (policy.requireUppercase && !/[A-Z]/.test(password)) {
                return 'Le mot de passe doit contenir au moins une lettre majuscule (A-Z)';
            }
            if (policy.requireLowercase && !/[a-z]/.test(password)) {
                return 'Le mot de passe doit contenir au moins une lettre minuscule (a-z)';
            }
            if (policy.requireNumber && !/[0-9]/.test(password)) {
                return 'Le mot de passe doit contenir au moins un chiffre (0-9)';
            }
            if (policy.requireSymbol && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                return 'Le mot de passe doit contenir au moins un caractère spécial (ex: @, #, $, etc.)';
            }

            if (policy.blacklistedWords && policy.blacklistedWords.length > 0) {
                const lowerPassword = password.toLowerCase();
                for (const word of policy.blacklistedWords) {
                    if (word && word.trim() && lowerPassword.includes(word.toLowerCase().trim())) {
                        return 'mot de passe trop faible veillez choisir une autre';
                    }
                }
            }

            return true;
        } catch (e: any) {
            return true;
        }
    }
}
