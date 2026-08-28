#!/usr/bin/env python3
import sys

filepath = '/srv/ahizan/seller/src/components/dashboard/products/create-form.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start marker (the line with allowedFacets.length === 0)
start_marker = '                                ) : allowedFacets.length === 0 ? ('
end_marker = '                                )}\n                            </div>\n                        </div>\n                    )}'

start_idx = content.find(start_marker)
# Find the end of the facets ternary - it ends with the closing of the facets section
end_idx = content.find(end_marker, start_idx)

if start_idx == -1:
    print("ERROR: start_marker not found")
    sys.exit(1)
if end_idx == -1:
    print("ERROR: end_marker not found")
    sys.exit(1)

print(f"Found block: chars {start_idx} to {end_idx + len(end_marker)}")
print(f"Block preview (last 100 chars): {repr(content[end_idx:end_idx + len(end_marker)])}")

replacement = '''                                ) : allowedFacets.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-4 italic">Aucun attribut sp\u00e9cifique n\u2019est d\u00e9fini pour les cat\u00e9gories s\u00e9lectionn\u00e9es.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {allowedFacets.map((facet: any) => {
                                            const selectedFvId = facetValueIds.find((id: string) =>
                                                facet.values?.some((fv: any) => String(fv.id) === id)
                                            );
                                            const autreKey = `autre:${facet.id}`;
                                            const autreTextKey = facetValueIds.find((id: string) => id.startsWith(`autre:${facet.id}:`));
                                            const autreSelected = selectedFvId === autreKey || !!autreTextKey;
                                            const isBadgeStyle = facet.values && facet.values.length <= 6;
                                            return (
                                                <div key={facet.id} className="p-4 border border-border/60 rounded-xl bg-muted/10 hover:bg-muted/20 transition-colors">
                                                    <Label className="text-xs font-bold text-foreground mb-2 block">
                                                        {facet.name}
                                                        <span className="text-[10px] text-muted-foreground font-normal ml-1">(S\u00e9lectionnez une option)</span>
                                                    </Label>
                                                    {isBadgeStyle ? (
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
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}'''

new_content = content[:start_idx] + replacement + content[end_idx + len(end_marker):]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SUCCESS: create-form.tsx facets block replaced")
