import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth.store";

const user = {
  id: "u1",
  email: "user@example.com",
  name: "User",
  role: "user",
};

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      user: null,
      roles: [],
      permissions: [],
      initialized: false,
    });
  });

  it("keeps a session in memory and evaluates permissions", () => {
    useAuthStore.getState().setSession({ accessToken: "access", user });
    useAuthStore
      .getState()
      .setAuthorization({ roles: ["USER"], permissions: ["todos.read"] });
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    expect(useAuthStore.getState().can("todos.read")).toBe(true);
    expect(window.localStorage.getItem("admin-auth")).toBeNull();
  });

  it("clears credentials and authorization together", () => {
    useAuthStore.getState().setSession({ accessToken: "access", user });
    useAuthStore.getState().clearSession();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
