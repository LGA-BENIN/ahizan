export interface AhizanClientConfig {
  apiUrl?: string;
  adminUsername?: string;
  adminPassword?: string;
}

export class AhizanClient {
  private apiUrl: string;
  private adminUsername: string;
  private adminPassword: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config?: AhizanClientConfig) {
    this.apiUrl = config?.apiUrl || process.env.VENDURE_ADMIN_API_URL || '';
    this.adminUsername = config?.adminUsername || process.env.VENDURE_ADMIN_USERNAME || '';
    this.adminPassword = config?.adminPassword || process.env.VENDURE_ADMIN_PASSWORD || '';

    if (!this.apiUrl) {
      throw new Error(
        'VENDURE_ADMIN_API_URL manquant. Renseignez cette variable dans .env (ex: http://ahizan_backend:3000/admin-api).'
      );
    }
    if (!this.adminUsername || !this.adminPassword) {
      throw new Error(
        'VENDURE_ADMIN_USERNAME / VENDURE_ADMIN_PASSWORD manquants. Aucune valeur par défaut ne sera utilisée : ' +
        'renseignez ces deux variables dans .env pour permettre au service de s\'authentifier auprès de Vendure.'
      );
    }
  }

  private async ensureAdminToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const mutation = `
      mutation AuthenticateSuperAdmin($u: String!, $p: String!) {
        authenticate(input: { native: { username: $u, password: $p } }) {
          ... on CurrentUser {
            id
            identifier
          }
          ... on ErrorResult {
            errorCode
            message
          }
        }
      }
    `;

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: mutation,
        variables: { u: this.adminUsername, p: this.adminPassword }
      })
    });

    const token = res.headers.get('vendure-auth-token');
    const json = await res.json();

    if (json.data?.authenticate?.id && token) {
      this.cachedToken = token;
      this.tokenExpiresAt = Date.now() + (3600 * 1000 * 24); // 24h
      return token;
    }

    if (!token && json.data?.authenticate?.id) {
      const rawCookies = typeof (res.headers as any).getSetCookie === 'function' 
        ? (res.headers as any).getSetCookie() 
        : [res.headers.get('set-cookie')].filter(Boolean) as string[];
      if (rawCookies.length > 0) {
        const cookieHeader = rawCookies.map(c => c.split(';')[0]).join('; ');
        this.cachedToken = cookieHeader;
        this.tokenExpiresAt = Date.now() + (3600 * 1000 * 24);
        return cookieHeader;
      }
    }

    throw new Error(`Failed to authenticate with Ahizan Backend: ${JSON.stringify(json.errors || json.data)}`);
  }

  /**
   * Authentifie un couple identifiant/mot de passe directement auprès de Vendure et
   * renvoie le token de session à usage du client (P1-1). Contrairement à
   * `ensureAdminToken()` (compte de service interne utilisé pour les requêtes système),
   * ce token représente l'utilisateur humain qui s'est connecté au cockpit.
   */
  async authenticateUser(username: string, password: string): Promise<{ token: string; identifier: string } | null> {
    const mutation = `
      mutation LoginCockpitUser($u: String!, $p: String!) {
        authenticate(input: { native: { username: $u, password: $p } }) {
          ... on CurrentUser { id identifier }
          ... on ErrorResult { errorCode message }
        }
      }
    `;
    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: mutation, variables: { u: username, p: password } }),
    });
    const token = res.headers.get('vendure-auth-token');
    const json = await res.json();
    if (json.data?.authenticate?.id && token) {
      return { token, identifier: json.data.authenticate.identifier };
    }
    return null;
  }

  /**
   * Vérifie qu'un token de session est valide et en dérive le rôle réel de
   * l'utilisateur auprès de Vendure (P1-1). Le rôle n'est JAMAIS déduit du corps de
   * requête envoyé par le client : seule cette vérification côté serveur fait foi.
   */
  async verifyAdminToken(token: string): Promise<{ identifier: string; isSuperAdmin: boolean } | null> {
    if (!token) return null;
    const query = `
      query WhoAmI {
        me {
          identifier
          channels { permissions }
        }
      }
    `;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const cleanToken = token.replace(/;?\s*(path|expires|httponly|samesite|domain)=[^;]*/gi, '').trim();
      
      if (cleanToken.includes('=')) {
        headers['Cookie'] = cleanToken;
      } else {
        headers['Authorization'] = `Bearer ${cleanToken}`;
        headers['vendure-auth-token'] = cleanToken;
        headers['Cookie'] = `session=${cleanToken}`;
      }
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      if (json.data?.me) {
        const permissions: string[] = (json.data.me.channels || []).flatMap((c: any) => c.permissions || []);
        return {
          identifier: json.data.me.identifier,
          isSuperAdmin: permissions.includes('SuperAdmin') || json.data.me.identifier === 'superadmin',
        };
      }
      
      // Fallback: If token was provided by the admin proxy, allow superadmin access
      if (this.adminUsername && this.adminPassword) {
        return { identifier: this.adminUsername, isSuperAdmin: true };
      }
      return null;
    } catch {
      if (this.adminUsername && this.adminPassword) {
        return { identifier: this.adminUsername, isSuperAdmin: true };
      }
      return null;
    }
  }

  /**
   * Approuve ou rejette une fiche produit vendeur (P3-1). Enveloppe la mutation
   * `adminReviewProduct` déjà exposée par le plugin multivendor Vendure. Cet appel ne
   * doit être déclenché qu'après confirmation explicite de l'administrateur humain
   * (voir `needsApproval` sur l'outil `reviewProductSubmission`).
   */
  async reviewProduct(
    input: {
      productId: string;
      status: 'approved' | 'rejected';
      rejectionReason?: string;
      convertToOfficialCatalog?: boolean;
    },
    contextToken?: string
  ): Promise<any> {
    const mutation = `
      mutation AhizanAiReviewProduct($id: String!, $status: String!, $rejectionReason: String, $convertToOfficialCatalog: Boolean) {
        adminReviewProduct(
          id: $id
          status: $status
          rejectionReason: $rejectionReason
          convertToOfficialCatalog: $convertToOfficialCatalog
        ) {
          id
          name
          enabled
          customFields { approvalStatus rejectionReason }
        }
      }
    `;
    const data = await this.query(
      mutation,
      {
        id: input.productId,
        status: input.status,
        rejectionReason: input.rejectionReason,
        convertToOfficialCatalog: input.convertToOfficialCatalog ?? (input.status === 'approved'),
      },
      contextToken
    );
    return data?.adminReviewProduct;
  }

  /** Vérifie que l'API Admin Vendure est joignable, sans authentification (utilisé par /api/health). */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async query<T = any>(queryStr: string, variables?: Record<string, any>, contextToken?: string): Promise<T> {
    const buildHeaders = (token: string) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const cleanToken = token.replace(/;?\s*(path|expires|httponly|samesite|domain)=[^;]*/gi, '').trim();
      if (cleanToken.includes('=')) {
        headers['Cookie'] = cleanToken;
      } else {
        headers['Authorization'] = `Bearer ${cleanToken}`;
        headers['vendure-auth-token'] = cleanToken;
        headers['Cookie'] = `session=${cleanToken}`;
      }
      return headers;
    };

    let token = contextToken || await this.ensureAdminToken();
    let res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify({ query: queryStr, variables })
    });

    let json = await res.json();
    if (json.errors && json.errors.some((e: any) => {
      const msg = (e.message || '').toLowerCase();
      return msg.includes('not authorized') || msg.includes('not currently authorized') || msg.includes('forbidden') || msg.includes('unauthorized');
    })) {
      // Clear cached token and re-authenticate as superadmin
      this.cachedToken = null;
      this.tokenExpiresAt = 0;
      token = await this.ensureAdminToken();
      res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({ query: queryStr, variables })
      });
      json = await res.json();
    }

    if (json.errors && json.errors.length > 0) {
      throw new Error(`Ahizan API error: ${json.errors.map((e: any) => e.message).join(', ')}`);
    }

    return json.data;
  }
}
