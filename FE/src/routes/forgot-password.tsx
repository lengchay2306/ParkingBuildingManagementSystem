import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireGuest } from "@/lib/auth";
import { AuthApiError, forgotPassword } from "@/services/auth.service";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: async () => {
    await requireGuest();
  },
  head: () => ({
    meta: [
      { title: "Quên mật khẩu - PARKOS" },
      { name: "description", content: "Yêu cầu email đặt lại mật khẩu PARKOS." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success("Đã gửi email đặt lại mật khẩu", {
        description: "Kiểm tra hộp thư và mở liên kết trong 15 phút.",
      });
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Không gửi được email.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-lg items-center px-6 py-10">
        <Card className="w-full rounded-3xl border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl tracking-tight">Quên mật khẩu</CardTitle>
            <CardDescription>
              Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <p className="rounded-xl border border-border bg-secondary/50 px-3 py-3 text-sm text-muted-foreground">
                  Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.
                </p>
                <Button asChild className="h-11 w-full rounded-xl">
                  <Link to="/login">
                    <ArrowLeft className="size-4" />
                    Về đăng nhập
                  </Link>
                </Button>
              </div>
            ) : (
              <form className="grid gap-5" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
                  {isSubmitting ? "Đang gửi..." : "Gửi liên kết đặt lại"}
                  {!isSubmitting ? <ArrowRight className="size-4" /> : null}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
                    Quay lại đăng nhập
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
