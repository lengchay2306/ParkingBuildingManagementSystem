import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRoleHome, login, requireGuest } from "@/lib/auth";
import { AuthApiError, registerUser } from "@/services/auth.service";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    await requireGuest();
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

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

  const handleRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterError(null);

    const fullName = registerFullName.trim();
    const customerEmail = registerEmail.trim();
    const phone = registerPhone.trim();
    const customerPassword = registerPassword;

    if (fullName.length < 2 || fullName.length > 30) {
      setRegisterError("Họ tên phải từ 2 đến 30 kí tự.");
      return;
    }
    if (!/^[0-9]{1,10}$/.test(phone)) {
      setRegisterError("Số điện thoại chỉ gồm tối đa 10 chữ số.");
      return;
    }
    if (customerPassword.length < 8) {
      setRegisterError("Mật khẩu phải có ít nhất 8 kí tự.");
      return;
    }

    setIsRegistering(true);
    try {
      await registerUser({
        email: customerEmail,
        password: customerPassword,
        fullName,
        phone,
      });
      setEmail(customerEmail);
      setPassword("");
      setRegisterPassword("");
      setMode("login");
      toast.success("Đăng kí thành công", {
        description: "Tài khoản Customer đã được tạo. Bạn có thể đăng nhập ngay.",
      });
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 400) {
        setRegisterError(err.message || "Dữ liệu không hợp lệ hoặc tài khoản đã tồn tại.");
        return;
      }
      setRegisterError(err instanceof Error ? err.message : "Đăng kí thất bại.");
    } finally {
      setIsRegistering(false);
    }
  };

  const showLogin = () => {
    setMode("login");
    setError(null);
    setRegisterError(null);
  };

  const showRegister = () => {
    setMode("register");
    setError(null);
    setRegisterError(null);
    setRegisterEmail(email);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto grid min-h-[calc(100vh-3.5rem)] w-full max-w-7xl items-center gap-8 px-6 py-10 lg:grid-cols-5">
        <section className="min-h-[280px] lg:col-span-3 lg:min-h-[420px]">
          <div className="relative h-full min-h-[280px] overflow-hidden rounded-3xl border border-border bg-card lg:min-h-[420px]">
            <img
              src="/assets/login-building.png"
              alt="Parking building"
              className="absolute inset-0 size-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/25 to-transparent"
              aria-hidden
            />
            <div className="relative flex h-full min-h-[280px] flex-col justify-end p-6 lg:min-h-[420px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Smart Parking Access
              </p>
              <h2 className="mt-1.5 max-w-md text-lg font-semibold tracking-tight md:text-xl">
                Fast entry with plate recognition and live slot availability.
              </h2>
            </div>
          </div>
        </section>

        <section className="flex items-center lg:col-span-2">
          <Card className="w-full rounded-3xl border-border bg-card shadow-sm">
            <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl tracking-tight">
              {mode === "login" ? "Account login" : "Đăng kí tài khoản"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to manage parking sessions and reservations."
                : "Tạo tài khoản Customer để sử dụng cổng tài xế."}
            </CardDescription>
            </CardHeader>
            <CardContent>
            {mode === "login" ? (
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

                <p className="text-center text-sm text-muted-foreground">
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={showRegister}
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    Đăng kí
                  </button>
                  .
                </p>
              </form>
            ) : (
              <form className="grid gap-4" onSubmit={handleRegisterSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="register-full-name">Họ tên</Label>
                  <Input
                    id="register-full-name"
                    autoComplete="name"
                    value={registerFullName}
                    onChange={(event) => setRegisterFullName(event.target.value)}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    value={registerEmail}
                    onChange={(event) => setRegisterEmail(event.target.value)}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="register-phone">Số điện thoại</Label>
                  <Input
                    id="register-phone"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={registerPhone}
                    onChange={(event) => setRegisterPhone(event.target.value)}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="register-password">Mật khẩu</Label>
                  <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>

                {registerError ? (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {registerError}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={isRegistering}
                  className="h-11 rounded-xl text-[13px] font-semibold"
                >
                  {isRegistering ? "Đang đăng kí..." : "Đăng kí"}
                  {!isRegistering ? <ArrowRight className="size-4" /> : null}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Đã có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={showLogin}
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    Đăng nhập
                  </button>
                  .
                </p>
              </form>
            )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
