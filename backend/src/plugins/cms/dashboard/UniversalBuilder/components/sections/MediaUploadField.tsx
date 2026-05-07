import React, { useState, useRef } from 'react';

interface MediaUploadFieldProps {
    label: string;
    value: string;
    onChange: (url: string) => void;
    placeholder?: string;
    accept?: string;
}

import { getBackendBaseUrl } from '../../../lib/utils';

export const MediaUploadField: React.FC<MediaUploadFieldProps> = ({ label, value, onChange, placeholder = "/assets/...", accept = "image/*,video/*" }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const baseUrl = getBackendBaseUrl();
            const gqlUrl = `${baseUrl}/admin-api`;

            // Primary: Use createCmsAsset mutation (dedicated CMS upload endpoint)
            const gqlFormData = new FormData();
            const operations = {
                query: `mutation CreateCmsAsset($file: Upload!) {
                    createCmsAsset(file: $file) {
                        id
                        name
                        preview
                        source
                    }
                }`,
                variables: { file: null }
            };
            gqlFormData.append('operations', JSON.stringify(operations));
            gqlFormData.append('map', JSON.stringify({ '0': ['variables.file'] }));
            gqlFormData.append('0', file);

            const gqlRes = await fetch(gqlUrl, { method: 'POST', credentials: 'include', body: gqlFormData });
            const gqlData = await gqlRes.json();
            if (!gqlData.errors && gqlData.data?.createCmsAsset) {
                const asset = gqlData.data.createCmsAsset;
                onChange(asset.preview || asset.source);
                return;
            }

            // Fallback 1: REST upload (BannerManager endpoint)
            const formData = new FormData();
            formData.append('file', file);
            const uploadUrl = `${baseUrl}/banner/upload`;
            const response = await fetch(uploadUrl, { method: 'POST', body: formData });

            if (response.ok) {
                const data = await response.json();
                if (data.url) {
                    onChange(data.url);
                    return;
                }
            }

            // Fallback 2: Vendure native createAssets mutation
            const gqlFormData2 = new FormData();
            const operations2 = {
                query: `mutation CreateAssets($input: [CreateAssetInput!]!) {
                    createAssets(input: $input) {
                        ... on Asset { id name source preview }
                        ... on AssetList { items { id name source preview } }
                    }
                }`,
                variables: { input: [{ file: null }] }
            };
            gqlFormData2.append('operations', JSON.stringify(operations2));
            gqlFormData2.append('map', JSON.stringify({ '0': ['variables.input.0.file'] }));
            gqlFormData2.append('0', file);

            const gqlRes2 = await fetch(gqlUrl, { method: 'POST', credentials: 'include', body: gqlFormData2 });
            const gqlData2 = await gqlRes2.json();
            if (gqlData2.errors) throw new Error(gqlData2.errors[0].message);
            const assets = gqlData2.data?.createAssets?.items || gqlData2.data?.createAssets;
            const url = Array.isArray(assets) ? assets[0]?.preview || assets[0]?.source : assets?.preview || assets?.source;
            if (url) onChange(url);
            else throw new Error('No URL returned from upload');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const isVideo = value?.match(/\.(mp4|webm|ogg)$/i);

    return (
        <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            <label className="label-pro">{label}</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                    className="input-pro" 
                    value={value || ''} 
                    onChange={(e) => onChange(e.target.value)} 
                    placeholder={placeholder} 
                    style={{ flex: 1 }}
                />
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept={accept} 
                    onChange={handleUpload}
                />
                <button 
                    className="btn-pro" 
                    style={{ padding: '0 12px', height: '36px', whiteSpace: 'nowrap' }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    {uploading ? '⏳ Uploading...' : '📁 Upload'}
                </button>
            </div>
            {error && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px' }}>{error}</div>}
            
            {value && (
                <div style={{ marginTop: '8px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--builder-border)', background: '#000', maxHeight: '120px', display: 'flex', justifyContent: 'center' }}>
                    {isVideo ? (
                        <video src={value} style={{ maxHeight: '120px', maxWidth: '100%' }} autoPlay loop muted playsInline />
                    ) : (
                        <img src={value} style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'contain' }} alt="Preview" />
                    )}
                </div>
            )}
        </div>
    );
};
