import { tool } from 'ai';
import { z } from 'zod';
import { AhizanClient } from '../ahizan-client';
import { RequestContext } from '../types';

export function createAnalyticsTools(client: AhizanClient, getContext?: () => RequestContext | undefined) {
  const getSalesStatistics = tool({
    description: 'Retourne les statistiques réelles des ventes et des commandes sur Ahizan (chiffre d\'affaires total, nombre de commandes, commandes payées, panier moyen).',
    parameters: z.object({
      period: z.string().optional().describe('Période d\'analyse (ex: "all", "today", "week", "month")'),
    }),
    execute: async ({ period = 'all' }) => {
      const context = getContext?.();
      const query = `
        query GetOrdersForStats {
          orders(options: { take: 1000, sort: { createdAt: DESC } }) {
            totalItems
            items {
              id
              code
              state
              totalWithTax
              createdAt
            }
          }
        }
      `;

      const data = await client.query(query, {}, context?.authToken);
      const orders = data?.orders?.items || [];

      let totalRevenue = 0;
      let paidOrdersCount = 0;
      let pendingPaymentCount = 0;

      for (const ord of orders) {
        totalRevenue += (ord.totalWithTax || 0);
        if (ord.state === 'PaymentSettled' || ord.state === 'Delivered' || ord.state === 'Shipped') {
          paidOrdersCount++;
        } else {
          pendingPaymentCount++;
        }
      }

      const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

      return {
        period,
        totalOrders: orders.length,
        paidOrdersCount,
        pendingPaymentCount,
        totalRevenue,
        totalSalesFormatted: `${(totalRevenue).toLocaleString('fr-FR')} FCFA`,
        averageOrderValueFormatted: `${(avgOrderValue).toLocaleString('fr-FR')} FCFA`
      };
    },
  });

  const getTopVendors = tool({
    description: 'Liste les vendeurs de la marketplace Ahizan, leurs statuts et leur volume de produits.',
    parameters: z.object({
      limit: z.number().optional().describe('Nombre de vendeurs à retourner (défaut 10)'),
    }),
    execute: async ({ limit = 10 }) => {
      const context = getContext?.();
      const query = `
        query GetVendorsList {
          vendors(options: { take: 100 }) {
            totalItems
            items {
              id
              name
              status
              zone
              createdAt
            }
          }
        }
      `;

      const data = await client.query(query, {}, context?.authToken);
      const vendors = data?.vendors?.items || [];
      const approvedCount = vendors.filter((v: any) => v.status === 'APPROVED').length;
      const pendingCount = vendors.filter((v: any) => v.status === 'PENDING').length;

      return {
        totalVendors: vendors.length,
        approvedVendorsCount: approvedCount,
        pendingVendorsCount: pendingCount,
        topVendors: vendors.slice(0, limit).map((v: any) => ({
          id: v.id,
          name: v.name,
          status: v.status,
          zone: v.zone || 'Non définie',
          registeredAt: v.createdAt
        }))
      };
    },
  });

  return {
    getSalesStatistics,
    getTopVendors,
  };
}
