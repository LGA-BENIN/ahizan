import React from 'react';
import {
  Store,
  ShoppingBag,
  Package,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Layers,
} from 'lucide-react';

/**
 * P4-3 : Rendu riche des résultats d'outils Ahizan.
 * Au lieu d'afficher du JSON brut, on détecte le type d'outil et on affiche
 * des cartes KPI, des tables et des badges adaptés au contexte métier.
 */

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-2">
      <div className={`shrink-0 ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] text-slate-500 uppercase tracking-wide truncate">{label}</div>
        <div className="text-sm font-bold text-slate-100 truncate">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase();
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    APPROVED: { cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Approuvé' },
    PENDING: { cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: <Clock className="w-3 h-3" />, label: 'En attente' },
    REJECTED: { cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30', icon: <XCircle className="w-3 h-3" />, label: 'Rejeté' },
  };
  const cfg = map[s] || { cls: 'text-slate-400 bg-slate-700/30 border-slate-700', icon: <AlertCircle className="w-3 h-3" />, label: s || 'Inconnu' };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-[11px]">
        <thead className="bg-slate-900/80 text-slate-400">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-2 py-1.5 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-slate-900/40 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-2 py-1.5 text-slate-300 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Détection du type d'outil et rendu adapté. */
export function ToolResultRenderer({ toolName, result }: { toolName: string; result: any }) {
  if (!result) return null;

  // getTopVendors → KPIs + table
  if (toolName === 'getTopVendors' && result.totalVendors !== undefined) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          <KpiCard icon={<Store className="w-4 h-4" />} label="Total vendeurs" value={result.totalVendors} accent="text-sky-400" />
          <KpiCard icon={<CheckCircle2 className="w-4 h-4" />} label="Approuvés" value={result.approvedVendorsCount ?? 0} accent="text-emerald-400" />
          <KpiCard icon={<Clock className="w-4 h-4" />} label="En attente" value={result.pendingVendorsCount ?? 0} accent="text-amber-400" />
        </div>
        {result.topVendors?.length > 0 && (
          <SimpleTable
            headers={['ID', 'Nom', 'Statut', 'Zone', 'Inscrit le']}
            rows={result.topVendors.map((v: any) => [
              `#${v.id}`,
              v.name || '—',
              <StatusBadge key="s" status={v.status} />,
              v.zone || '—',
              v.registeredAt ? new Date(v.registeredAt).toLocaleDateString('fr-FR') : '—',
            ])}
          />
        )}
      </div>
    );
  }

  // getSalesStatistics → KPIs
  if (toolName === 'getSalesStatistics') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        <KpiCard icon={<ShoppingBag className="w-4 h-4" />} label="Commandes" value={result.totalOrders ?? 0} accent="text-sky-400" />
        <KpiCard icon={<CheckCircle2 className="w-4 h-4" />} label="Payées" value={result.paidOrdersCount ?? 0} accent="text-emerald-400" />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="CA total" value={result.totalSalesFormatted || `${result.totalRevenue || 0} FCFA`} accent="text-emerald-400" />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Panier moyen" value={result.averageOrderValueFormatted || '—'} accent="text-sky-400" />
      </div>
    );
  }

  // getPendingApprovals → liste avec badges
  if (toolName === 'getPendingApprovals') {
    return (
      <div className="space-y-2">
        <KpiCard icon={<Clock className="w-4 h-4" />} label="Produits en attente" value={result.pendingCount ?? 0} accent="text-amber-400" />
        {result.items?.length > 0 && (
          <SimpleTable
            headers={['ID', 'Nom', 'Vendeur', 'Prix', 'Créé le']}
            rows={result.items.map((p: any) => [
              `#${p.id}`,
              p.name || 'Sans nom',
              p.customFields?.vendor?.name || '—',
              p.variants?.[0]?.price ? `${p.variants[0].price} FCFA` : '—',
              p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—',
            ])}
          />
        )}
      </div>
    );
  }

  // getProductDetails → carte produit détaillée
  if (toolName === 'getProductDetails' && result.name) {
    const cf = result.customFields || {};
    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-100 truncate">{result.name}</div>
            <div className="text-[10px] text-slate-500 font-mono">#{result.id} • {result.slug}</div>
          </div>
          <StatusBadge status={cf.approvalStatus || result.enabled ? 'approved' : 'pending'} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <KpiCard icon={<Package className="w-4 h-4" />} label="Score FQS" value={cf.fqsScore ?? '—'} accent="text-sky-400" />
          <KpiCard icon={<Store className="w-4 h-4" />} label="Vendeur" value={cf.vendor?.name || '—'} accent="text-amber-400" />
          <KpiCard icon={<Layers className="w-4 h-4" />} label="Variantes" value={result.variants?.length ?? 0} accent="text-slate-400" />
          <KpiCard icon={<CheckCircle2 className="w-4 h-4" />} label="IA normalisé" value={cf.aiNormalized ? 'Oui' : 'Non'} accent={cf.aiNormalized ? 'text-emerald-400' : 'text-slate-500'} />
        </div>
        {result.variants?.length > 0 && (
          <SimpleTable
            headers={['SKU', 'Prix', 'Stock', 'État']}
            rows={result.variants.map((v: any) => [
              v.sku || '—',
              v.price ? `${v.price} FCFA` : '—',
              v.stockOnHand ?? 0,
              v.customFields?.condition || '—',
            ])}
          />
        )}
      </div>
    );
  }

  // findPotentialDuplicates → liste avec scores
  if (toolName === 'findPotentialDuplicates') {
    return (
      <div className="space-y-2">
        <KpiCard icon={<Layers className="w-4 h-4" />} label="Doublons détectés" value={result.foundMatchesCount ?? 0} accent="text-amber-400" />
        {result.duplicates?.length > 0 && (
          <SimpleTable
            headers={['ID', 'Nom', 'Score', 'Raison']}
            rows={result.duplicates.map((d: any) => [
              `#${d.id}`,
              d.name || '—',
              <span key="sc" className={d.similarityScore > 0.5 ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                {Math.round((d.similarityScore || 0) * 100)}%
              </span>,
              d.reason || '—',
            ])}
          />
        )}
      </div>
    );
  }

  // reviewProductSubmission → confirmation d'action
  if (toolName === 'reviewProductSubmission') {
    return (
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2">
        {result.decision === 'approved' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : (
          <XCircle className="w-4 h-4 text-rose-400" />
        )}
        <div className="text-xs">
          <span className="font-semibold text-slate-200">
            Produit #{result.productId} {result.decision === 'approved' ? 'approuvé' : 'rejeté'}
          </span>
          <span className="text-slate-500 ml-2">par {result.appliedBy} • {new Date(result.appliedAt).toLocaleString('fr-FR')}</span>
        </div>
      </div>
    );
  }

  // searchOfficialCatalog → table de résultats
  if (toolName === 'searchOfficialCatalog') {
    return (
      <div className="space-y-2">
        <KpiCard icon={<Package className="w-4 h-4" />} label="Résultats catalogue" value={result.totalItems ?? 0} accent="text-sky-400" />
        {result.items?.length > 0 && (
          <SimpleTable
            headers={['ID', 'Nom', 'SKU', 'Prix', 'Stock']}
            rows={result.items.map((p: any) => [
              `#${p.id}`,
              p.name || '—',
              p.variants?.[0]?.sku || '—',
              p.variants?.[0]?.price ? `${p.variants[0].price} FCFA` : '—',
              p.variants?.[0]?.stockOnHand ?? 0,
            ])}
          />
        )}
      </div>
    );
  }

  // Fallback : JSON compact pour les outils non reconnus
  return (
    <pre className="bg-slate-900 p-2 rounded border border-slate-800 text-slate-300 overflow-x-auto text-[10px]">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
