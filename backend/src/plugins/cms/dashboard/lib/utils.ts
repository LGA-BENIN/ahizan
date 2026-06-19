import { print } from 'graphql';

// --- Helper to get the Backend URL ---
export const getBackendBaseUrl = () => {
    const origin = window.location.origin;
    if (origin.includes(':5173') || origin.includes(':5174') || origin.includes(':5175') || origin.includes(':4200')) {
        return origin.replace(/:(5173|5174|5175|4200)/, ':3000');
    }
    return origin;
};

// --- GraphQL Fetcher ---
export async function fetchGraphQL(query: any, variables?: any, file?: File) {
    const apiUrl = getBackendBaseUrl() + '/admin-api';
    const headers: Record<string, string> = {};
    let body: any;

    let queryStr: string;
    if (typeof query === 'string') {
        queryStr = query;
    } else if (query.loc?.source?.body) {
        queryStr = query.loc.source.body;
    } else if (query.kind === 'Document') {
        queryStr = print(query);
    } else {
        queryStr = String(query);
    }
    let vars = variables?.variables || variables || {};
    
    let uploadFile = file;
    if (!uploadFile && vars && typeof vars === 'object') {
        const fileKey = Object.keys(vars).find(k => vars[k] instanceof File);
        if (fileKey) {
            uploadFile = vars[fileKey];
            vars = { ...vars, [fileKey]: null };
        }
    }

    if (uploadFile) {
        const formData = new FormData();
        let mapPath = 'variables.file';
        if (queryStr.includes('createAssets')) {
            mapPath = 'variables.input.0.file';
            if (!vars.input) vars = { input: [{ file: null }] };
        } else if (vars.file === null) {
            mapPath = 'variables.file';
        }
        const operations = { query: queryStr, variables: vars };
        formData.append('operations', JSON.stringify(operations));
        formData.append('map', JSON.stringify({ '0': [mapPath] }));
        formData.append('0', uploadFile);
        body = formData;
    } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ query: queryStr, variables: vars });
    }

    const response = await fetch(apiUrl, { method: 'POST', headers, credentials: 'include', body });
    try {
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
        }
        const result = await response.json();
        if (result.errors) {
            const msg = result.errors.map((e: any) => e.message).join(', ');
            throw new Error(msg);
        }
        return result.data;
    } catch (err: any) {
        throw err;
    }
}

export const cls = {
    page: 'vd-cms-builder',
    sidebar: 'vd-cms-sidebar',
    main: 'vd-cms-main',
    card: 'vd-cms-card',
    label: 'vd-cms-label',
    input: 'vd-cms-input',
    select: 'vd-cms-select',
    textarea: 'vd-cms-textarea',
    btnPrimary: 'vd-cms-btn-primary',
    btnSecondary: 'vd-cms-btn-secondary',
    btnDanger: 'vd-cms-btn-danger',
    btnOutline: 'vd-cms-btn-outline',
    badge: 'vd-cms-badge',
    sectionItem: 'vd-cms-section-item',
    sectionItemActive: 'vd-cms-section-item-active',
    editor: 'vd-cms-editor',
    grid2: 'vd-cms-grid-2',
};
