import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { changePassword } from "../api/recovery";

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await changePassword(currentPassword, newPassword);
      clearSession();
      navigate("/login", { replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Password change failed",
      );
    }
  };

  return (
    <section style={{ maxWidth: 480 }}>
      <h1>Change password</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <Input
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
        <Input
          label="New password"
          type="password"
          minLength={12}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
        {error && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        )}
        <Button type="submit">Change password and sign out</Button>
      </form>
    </section>
  );
}
