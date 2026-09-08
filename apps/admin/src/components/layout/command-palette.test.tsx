import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, userEvent } from "@/test/test-utils";
import { CommandPalette } from "@/components/layout/command-palette";
import { useAuthStore } from "@/stores/auth.store";
import { PermissionKeys } from "@app/api-contracts";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

describe("CommandPalette", () => {
  beforeEach(() => {
    navigate.mockReset();
    useAuthStore.setState({ permissions: [], roles: [] });
  });

  it("lists only permitted nav destinations", async () => {
    useAuthStore.setState({ permissions: [PermissionKeys.UsersRead] });
    renderWithProviders(<CommandPalette open onOpenChange={() => {}} />);

    // Settings has no permission gate → always shown; Users shown (has perm).
    expect(await screen.findByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    // Roles requires roles.read which the user lacks → hidden.
    expect(screen.queryByText("Roles")).not.toBeInTheDocument();
  });

  it("navigates to the selected route", async () => {
    useAuthStore.setState({ permissions: [PermissionKeys.UsersRead] });
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette open onOpenChange={onOpenChange} />);

    await user.click(await screen.findByText("Users"));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/users"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("filters results as the user types", async () => {
    useAuthStore.setState({
      permissions: [PermissionKeys.UsersRead, PermissionKeys.RolesRead],
    });
    const user = userEvent.setup();
    renderWithProviders(<CommandPalette open onOpenChange={() => {}} />);

    await user.type(screen.getByPlaceholderText(/search pages/i), "rol");

    await waitFor(() => expect(screen.getByText("Roles")).toBeInTheDocument());
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });
});
