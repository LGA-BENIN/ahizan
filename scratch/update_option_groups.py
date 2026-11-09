import re

path = 'backend/src/plugins/multivendor/dashboard/products-list.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the input list with select dropdown
old_pattern = r'''<div style=\{\{ flex: '1 1 45%' \}\}>\s*<label style=\{\{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' \}\}>\s*Groupe d'option\s*</label>\s*<input\s*type="text"\s*list=\{`groups-datalist-\$\{idx\}`\}[\s\S]*?</datalist>\s*</div>'''

new_block = '''<div style={{ flex: '1 1 45%' }}>
                                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                            Groupe d'option
                                                        </label>
                                                        <select
                                                            value={allAvailableGroupNames.includes(opt.groupName) ? opt.groupName : (opt.groupName ? '__CUSTOM__' : '')}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setEditingVariantOptions(prev => {
                                                                    if (!prev) return prev;
                                                                    const nextOpts = [...prev.options];
                                                                    nextOpts[idx] = { ...nextOpts[idx], groupName: val === '__CUSTOM__' ? '' : val };
                                                                    return { ...prev, options: nextOpts };
                                                                });
                                                            }}
                                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, color: '#0f172a', background: '#ffffff', boxSizing: 'border-box' }}
                                                        >
                                                            <option value="">-- Choisir un attribut --</option>
                                                            {allAvailableGroupNames.map(g => (
                                                                <option key={g} value={g}>{g}</option>
                                                            ))}
                                                            <option value="__CUSTOM__">✍️ Autre attribut personnalisé...</option>
                                                        </select>
                                                        {(!allAvailableGroupNames.includes(opt.groupName) || opt.groupName === '') && (
                                                            <input
                                                                type="text"
                                                                placeholder="Saisir le nom (ex: Couleur, Taille...)"
                                                                value={opt.groupName}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setEditingVariantOptions(prev => {
                                                                        if (!prev) return prev;
                                                                        const nextOpts = [...prev.options];
                                                                        nextOpts[idx] = { ...nextOpts[idx], groupName: val };
                                                                        return { ...prev, options: nextOpts };
                                                                    });
                                                                }}
                                                                style={{ width: '100%', marginTop: '6px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, color: '#0f172a', boxSizing: 'border-box' }}
                                                            />
                                                        )}
                                                    </div>'''

content, count = re.subn(old_pattern, new_block, content, count=1)
print(f'Replaced {count} occurrences of option group input.')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
