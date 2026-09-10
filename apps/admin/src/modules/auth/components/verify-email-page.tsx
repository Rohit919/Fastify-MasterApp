import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { resendVerification, verifyEmail } from "../api/recovery";

export function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      setMessage((await verifyEmail(email, otp)).message);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Verification failed",
      );
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <h1>Verify email</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          label="Six-digit code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          required
        />
        {message && <p style={{ color: "#047857" }}>{message}</p>}
        {error && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        )}
        <Button type="submit">Verify</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={async () =>
            setMessage((await resendVerification(email)).message)
          }
        >
          Resend code
        </Button>
        <Link to="/login">Back to login</Link>
      </form>
    </main>
  );
}
