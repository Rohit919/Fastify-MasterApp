import { useState } from "react";
import type { AuditLogDto } from "@app/api-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { Loading } from "@/components/feedback/loading";
import { ErrorState } from "@/components/feedback/error-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatDate } from "@/lib/utils";
import { useAuditLogs } from "../hooks/use-audit-logs";

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const logs = useAuditLogs(page, action);
  if (logs.isLoading) return <Loading label="Loading audit log…" />;
  if (logs.error) return <ErrorState message={logs.error.message} />;

  const rows = logs.data?.data ?? [];
  const meta = logs.data?.meta;
  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: 22 }}>Audit log</h1>
        <div style={{ width: 300 }}>
          <Input
            aria-label="Filter audit actions"
            placeholder="Filter by exact action"
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState message="No audit events found." />
      ) : (
        <Table<AuditLogDto>
          rowKey={(row) => row.id}
          rows={rows}
          columns={[
            { header: "Time", render: (row) => formatDate(row.createdAt) },
            { header: "Action", render: (row) => row.action },
            { header: "Actor", render: (row) => row.actorId ?? "system" },
            {
              header: "Target",
              render: (row) =>
                [row.targetType, row.targetId].filter(Boolean).join(":") || "—",
            },
            { header: "Request", render: (row) => row.requestId ?? "—" },
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
    </section>
  );
}
