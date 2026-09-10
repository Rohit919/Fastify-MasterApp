import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { forgotPassword, resetPassword, verifyResetOtp } from "../api/recovery";

export function RecoveryPage() {
  const [step, setStep] = useState<"email" | "otp" | "password" | "done">(
    "email",
  );
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (step === "email") {
        await forgotPassword(email);
        setStep("otp");
      } else if (step === "otp") {
        const result = await verifyResetOtp(email, otp);
        setResetToken(result.resetToken);
        setStep("password");
      } else if (step === "password") {
        await resetPassword(resetToken, password);
        setStep("done");
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "The request could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <h1>Reset password</h1>
      {step === "done" ? (
        <p>
          Password updated. <Link to="/login">Return to login</Link>.
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          {step === "email" && (
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          )}
          {step === "otp" && (
            <Input
              label="Six-digit code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              required
            />
          )}
          {step === "password" && (
            <Input
              label="New password"
              type="password"
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          )}
          {error && (
            <p role="alert" style={{ color: "#b91c1c" }}>
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Please wait…" : "Continue"}
          </Button>
          <Link to="/login">Back to login</Link>
        </form>
      )}
    </main>
  );
}
