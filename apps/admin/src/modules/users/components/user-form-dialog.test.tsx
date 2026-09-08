import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, userEvent } from "@/test/test-utils";
import { UserFormDialog } from "@/modules/users/components/user-form-dialog";

// Mock the mutation hooks so no network happens; capture the create mutate fn.
const createMutate = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());
vi.mock("@/modules/users/hooks/use-user-mutations", () => ({
  useCreateUser: () => ({ mutate: createMutate, isPending: false }),
  useUpdateUser: () => ({ mutate: updateMutate, isPending: false }),
}));

describe("UserFormDialog (create)", () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
  });

  it("submits a valid new user to the create mutation", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <UserFormDialog user={null} open onOpenChange={() => {}} />,
    );

    await user.type(screen.getByLabelText(/name/i), "New Person");
    await user.type(screen.getByLabelText(/email/i), "new@x.io");
    await user.type(screen.getByLabelText(/password/i), "password123");

    await user.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    const [payload] = createMutate.mock.calls[0];
    expect(payload).toMatchObject({
      name: "New Person",
      email: "new@x.io",
      password: "password123",
      role: "user",
    });
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it("blocks submission on invalid input (client validation)", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <UserFormDialog user={null} open onOpenChange={() => {}} />,
    );

    // Empty name/email/password → zod resolver blocks the create call.
    await user.click(screen.getByRole("button", { name: /create user/i }));

    expect(createMutate).not.toHaveBeenCalled();
  });
});

describe("UserFormDialog (edit)", () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
  });

  it("submits changes to the update mutation and hides the password field", async () => {
    const user = userEvent.setup();
    const existing = {
      id: "u1",
      name: "Alice",
      email: "alice@example.com",
      role: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    renderWithProviders(
      <UserFormDialog user={existing} open onOpenChange={() => {}} />,
    );

    // Password field is not rendered in edit mode.
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();

    // Fields are pre-filled from the user (RHF `values`); wait for that to apply.
    await waitFor(() =>
      expect(screen.getByLabelText(/name/i)).toHaveValue("Alice"),
    );

    const name = screen.getByLabelText(/name/i);
    await user.clear(name);
    await user.type(name, "Alice Renamed");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    const [payload] = updateMutate.mock.calls[0];
    expect(payload.userId).toBe("u1");
    expect(payload.body).toMatchObject({
      name: "Alice Renamed",
      email: "alice@example.com",
      role: "user",
    });
  });
});
