import { useState } from "react";
import type { OrderDto, OrderStatus } from "@app/api-contracts";
import { PermissionKeys } from "@app/api-contracts";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Loading } from "@/components/feedback/loading";
import { ErrorState } from "@/components/feedback/error-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { usePermissions } from "@/modules/auth/hooks/use-permissions";
import { useCancelOrder, useOrders } from "../hooks/use-orders";

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const { can } = usePermissions();
  const orders = useOrders(page, status);
  const cancel = useCancelOrder();

  if (orders.isLoading) return <Loading label="Loading orders…" />;
  if (orders.error) return <ErrorState message={orders.error.message} />;

  const rows = orders.data?.data ?? [];
  const meta = orders.data?.meta;

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: 22, color: "#1e293b" }}>Orders</h1>
        <select
          aria-label="Filter by status"
          value={status ?? ""}
          onChange={(event) => {
            setStatus(
              (event.target.value || undefined) as OrderStatus | undefined,
            );
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {["PENDING", "PAID", "SHIPPED", "CANCELLED"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No orders found." />
      ) : (
        <Table<OrderDto>
          rowKey={(order) => order.id}
          rows={rows}
          columns={[
            { header: "Order", render: (order) => order.id },
            { header: "Status", render: (order) => order.status },
            { header: "Items", render: (order) => String(order.items.length) },
            {
              header: "Total",
              render: (order) => `₹${(order.totalCents / 100).toFixed(2)}`,
            },
            {
              header: "Actions",
              render: (order) =>
                order.status === "PENDING" &&
                can(PermissionKeys.OrdersCancel) ? (
                  <Button
                    variant="secondary"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(order.id)}
                  >
                    Cancel
                  </Button>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      )}

      {meta && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </Button>
          <span>
            Page {meta.page} of {Math.max(meta.totalPages, 1)}
          </span>
          <Button
            variant="secondary"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      )}
      {cancel.error && <ErrorState message={cancel.error.message} />}
    </section>
  );
}
