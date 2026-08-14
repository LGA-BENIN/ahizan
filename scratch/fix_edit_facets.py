#!/usr/bin/env python3
filepath = '/srv/ahizan/seller/src/components/dashboard/products/edit-form.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the badge-style section in edit-form to add Autre badge + inline input
# and also fix the dropdown inline input to be consistent

old_badge_section = '''                                                    {isBadgeStyle ? (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {facet.values.map((fv: any) => {
                                                                const isSelected = selectedFvId === String(fv.id);
                                                                return (
                                                                    <button
                                                                        key={String(fv.id)}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFacetValueIds((prev: string[]) => {
                                                                                const without = prev.filter(id => !facet.values?.some((fv2: any) => String(fv2.id) === id));
                                                                                return isSelected ? without : [...without, String(fv.id)];
                                                                            });
                                                                        }}
                                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 cursor-pointer ${
                                                                            isSelected
                                                                                ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/95"
                                                                                : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                                                        }`}
                                                                    >
                                                                        {fv.name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <Select
                                                            value={selectedFvId || ''}
                                                            onValueChange={(v) => {
                                                                setFacetValueIds((prev: string[]) => {
                                                                    const without = prev.filter(id => !facet.values?.some((fv: any) => String(fv.id) === id));
                                                                    return v ? [...without, v] : without;
                                                                });
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-11 rounded-xl bg-background border-border">
                                                                <SelectValue placeholder={`S\u00e9lectionner ${facet.name}`} />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl">
                                                                {facet.values?.map((fv: any) => (
                                                                    <SelectItem key={String(fv.id)} value={String(fv.id)}>{fv.name}</SelectItem>
                                                                ))}
                                                                <SelectItem value={`autre:${facet.id}`}>\u270f\ufe0f Autre (saisir manuellement)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                    {/* Inline text input when "Autre" is selected in dropdown mode */}
                                                    {selectedFvId === `autre:${facet.id}` && (
                                                        <input
                                                            type="text"
                                                            placeholder={`Autre valeur pour ${facet.name}...`}
                                                            className="mt-2 w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setFacetValueIds((prev: string[]) => {
                                                                    const without = prev.filter(id => !id.startsWith(`autre:${facet.id}:`));
                                                                    return val ? [...without, `autre:${facet.id}:${val}`] : without;
                                                                });
                                                            }}
                                                        />
                                                    )}'''

new_badge_section = '''                                                    {(() => {
                                                        const autreKey = `autre:${facet.id}`;
                                                        const autreTextKey = facetValueIds.find((id: string) => id.startsWith(`autre:${facet.id}:`));
                                                        const autreSelected = selectedFvId === autreKey || !!autreTextKey;
                                                        return isBadgeStyle ? (
                                                            <div className="space-y-2">
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {facet.values.map((fv: any) => {
                                                                        const isSelected = selectedFvId === String(fv.id);
                                                                        return (
                                                                            <button
                                                                                key={String(fv.id)}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setFacetValueIds((prev: string[]) => {
                                                                                        const without = prev.filter(id => !facet.values?.some((fv2: any) => String(fv2.id) === id) && !id.startsWith(`autre:${facet.id}`));
                                                                                        return isSelected ? without : [...without, String(fv.id)];
                                                                                    });
                                                                                }}
                                                                                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200 cursor-pointer ${
                                                                                    isSelected
                                                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/95"
                                                                                        : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                                                                }`}
                                                                            >
                                                                                {fv.name}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFacetValueIds((prev: string[]) => {
                                                                                const without = prev.filter(id => !facet.values?.some((fv2: any) => String(fv2.id) === id) && !id.startsWith(`autre:${facet.id}`));
                                                                                return autreSelected ? without : [...without, autreKey];
                                                                            });
                                                                        }}
                                                                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border border-dashed transition-all duration-200 cursor-pointer ${
                                                                            autreSelected
                                                                                ? "bg-primary/10 text-primary border-primary"
                                                                                : "bg-background text-muted-foreground border-muted-foreground/40 hover:bg-muted"
                                                                        }`}
                                                                    >
                                                                        \u270f\ufe0f Autre
                                                                    </button>
                                                                </div>
                                                                {autreSelected && (
                                                                    <input
                                                                        type="text"
                                                                        placeholder={`Pr\u00e9ciser la valeur pour ${facet.name}\u2026`}
                                                                        defaultValue={autreTextKey ? autreTextKey.split(':').slice(2).join(':') : ''}
                                                                        className="w-full h-10 rounded-xl border border-primary/40 bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setFacetValueIds((prev: string[]) => {
                                                                                const without = prev.filter(id => !id.startsWith(`autre:${facet.id}`));
                                                                                return val.trim() ? [...without, `autre:${facet.id}:${val}`] : [...without, autreKey];
                                                                            });
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <Select
                                                                    value={autreSelected ? autreKey : (selectedFvId || '')}
                                                                    onValueChange={(v) => {
                                                                        setFacetValueIds((prev: string[]) => {
                                                                            const without = prev.filter(id => !facet.values?.some((fv: any) => String(fv.id) === id) && !id.startsWith(`autre:${facet.id}`));
                                                                            return v ? [...without, v] : without;
                                                                        });
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="h-11 rounded-xl bg-background border-border">
                                                                        <SelectValue placeholder={`S\u00e9lectionner ${facet.name}`} />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-xl">
                                                                        {facet.values?.map((fv: any) => (
                                                                            <SelectItem key={String(fv.id)} value={String(fv.id)}>{fv.name}</SelectItem>
                                                                        ))}
                                                                        <SelectItem value={autreKey}>\u270f\ufe0f Autre</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                {autreSelected && (
                                                                    <input
                                                                        type="text"
                                                                        placeholder={`Pr\u00e9ciser la valeur pour ${facet.name}\u2026`}
                                                                        defaultValue={autreTextKey ? autreTextKey.split(':').slice(2).join(':') : ''}
                                                                        className="w-full h-10 rounded-xl border border-primary/40 bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setFacetValueIds((prev: string[]) => {
                                                                                const without = prev.filter(id => !id.startsWith(`autre:${facet.id}`));
                                                                                return val.trim() ? [...without, `autre:${facet.id}:${val}`] : [...without, autreKey];
                                                                            });
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })()}'''

if old_badge_section in content:
    new_content = content.replace(old_badge_section, new_badge_section, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: edit-form.tsx facets block updated with Autre badge for badge-style facets")
else:
    print("ERROR: target block not found in edit-form.tsx")
    # Debug: show what we have around the isBadgeStyle check
    idx = content.find('isBadgeStyle ? (')
    if idx != -1:
        print(f"Found isBadgeStyle at char {idx}")
        print(repr(content[idx-10:idx+200]))
