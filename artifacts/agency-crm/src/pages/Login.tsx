import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, LockKeyhole } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

export function Login({
  onSuccess,
  loginConfigured = true,
}: {
  onSuccess: () => void;
  loginConfigured?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim()) {
      setError("Masukkan password terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = (await res.json().catch(() => ({}))) as { error?: unknown };

      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : `Login gagal (HTTP ${res.status}).`);
        return;
      }

      onSuccess();
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <img
            src="/websensial-logo.png"
            alt="Websensial"
            className="mx-auto h-9 w-auto object-contain"
          />
          <CardTitle className="text-lg">Masuk ke dashboard</CardTitle>
          <CardDescription>
            Data prospek dan invoice hanya bisa dibuka setelah login.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!loginConfigured ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Login belum aktif. Set <code>AUTH_PASSWORD</code> (atau{" "}
                <code>ADMIN_API_KEY</code>) di environment Vercel, lalu redeploy.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Memeriksa…
                  </>
                ) : (
                  <>
                    <LockKeyhole className="h-4 w-4" /> Masuk
                  </>
                )}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground">
                Sesi berlaku 30 hari di browser ini. Logout kapan saja dari header.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
