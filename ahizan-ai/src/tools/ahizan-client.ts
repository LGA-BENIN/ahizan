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
    this.apiUrl = config?.apiUrl || process.env.VENDURE_ADMIN_API_URL || 'http://127.0.0.1:3000/admin-api';
    this.adminUsername = config?.adminUsername || process.env.SUPERADMIN_USERNAME || 'superadmin';
    this.adminPassword = config?.adminPassword || process.env.SUPERADMIN_PASSWORD || 'superadmin';
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
      // Check cookies
      const cookie = res.headers.get('set-cookie');
      if (cookie) {
        this.cachedToken = cookie;
        this.tokenExpiresAt = Date.now() + (3600 * 1000 * 24);
        return cookie;
      }
    }

    throw new Error(`Failed to authenticate with Ahizan Backend: ${JSON.stringify(json.errors || json.data)}`);
  }

  async query<T = any>(queryStr: string, variables?: Record<string, any>, contextToken?: string): Promise<T> {
    const token = contextToken || await this.ensureAdminToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token.includes('=')) {
      headers['Cookie'] = token;
    } else {
      headers['Authorization'] = `Bearer ${token}`;
      headers['vendure-auth-token'] = token;
    }

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: queryStr,
        variables
      })
    });

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(`Ahizan API error: ${json.errors.map((e: any) => e.message).join(', ')}`);
    }

    return json.data;
  }
}
