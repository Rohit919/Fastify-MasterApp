import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders, userEvent } from "@/test/test-utils";
import { DataTable } from "@/components/data-table";
import type { DataTableColumn } from "@/components/data-table";

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: "a", name: "Ann" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Cat" },
];

const columns: DataTableColumn<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name },
];

/** Wrapper providing controlled selection state + a bulk-action spy. */
function Harness({
  onBulk,
  unselectableId,
}: {
  onBulk: (ids: string[]) => void;
  unselectableId?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <DataTable<Row>
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      enableSelection
      selectedIds={selected}
      onSelectionChange={setSelected}
      isRowSelectable={(r) => r.id !== unselectableId}
      bulkActions={({ selectedIds }) => (
        <button onClick={() => onBulk(selectedIds)}>Delete selected</button>
      )}
    />
  );
}

describe("DataTable selection", () => {
  it("selects individual rows and exposes them to bulk actions", async () => {
    const onBulk = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Harness onBulk={onBulk} />);

    // Row checkboxes: index 0 is the header select-all.
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]); // Ann

    // Bulk bar appears with the count.
    expect(await screen.findByText("1 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete selected/i }));
    expect(onBulk).toHaveBeenCalledWith(["a"]);
  });

  it("select-all selects every selectable row", async () => {
    const onBulk = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Harness onBulk={onBulk} unselectableId="c" />);

    await user.click(screen.getAllByRole("checkbox")[0]); // header select-all

    // 'c' is not selectable → only a and b.
    expect(await screen.findByText("2 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /delete selected/i }));
    expect(onBulk).toHaveBeenCalledWith(["a", "b"]);
  });

  it("no bulk bar is shown when nothing is selected", () => {
    renderWithProviders(<Harness onBulk={vi.fn()} />);
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });
});
