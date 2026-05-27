import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { LoginCarScene } from "@/components/LoginCarScene";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRoleHome, login, requireGuest } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    await requireGuest();
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const role = await login(email, password);
      await router.navigate({ to: getRoleHome(role) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="login-road-vignette" />
          <div className="login-road-plane" />
        </div>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-3.5rem)] w-full max-w-7xl gap-6 px-6 py-10 lg:grid-cols-5">
          <section className="min-h-[360px] lg:col-span-3">
          <LoginCarScene className="bg-transparent" />
          </section>

          <section className="flex items-center lg:col-span-2">
            <Card className="mx-auto w-full max-w-lg rounded-3xl border-border/80 bg-card/90 shadow-pop backdrop-blur-md">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl tracking-tight">Account login</CardTitle>
                
              </CardHeader>
              <CardContent>
                <form className="grid gap-5" onSubmit={handleSubmit}>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                    
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-11 rounded-xl"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                     
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11 rounded-xl"
                      required
                    />
                  </div>

                  {error ? (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 rounded-xl text-[13px] font-semibold"
                  >
                    {isSubmitting ? "Signing in..." : "Sign in"}
                    {!isSubmitting ? <ArrowRight className="size-4" /> : null}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}