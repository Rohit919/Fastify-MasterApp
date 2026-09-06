import { EmptyState } from '@/components/feedback/empty-state';

/**
 * Orders page — placeholder.
 * The backend orders module is scaffolded but not yet implemented
 * (no Order Prisma model / routes). When the API exposes GET /orders,
 * add modules/orders/api/get-orders.ts + hooks/use-orders.ts and render
 * the shared <Table> here, mirroring the users module.
 */
export function OrdersPage() {
  return (
    <section>
      <h1 style={{ marginTop: 0, fontSize: 22, color: '#1e293b' }}>Orders</h1>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <EmptyState message="Orders API not implemented yet. This page is wired and ready." />
      </div>
    </section>
  );
}
