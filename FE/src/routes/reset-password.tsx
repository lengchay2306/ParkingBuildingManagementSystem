import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireGuest } from "@/lib/auth";
import { AuthApiError, resetPassword } from "@/services/auth.service";

type ResetPasswordSearch = {
  token?: string;
};

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  beforeLoad: async () => {
    await requireGuest();
  },
  head: () => ({
    meta: [
      { title: "Đặt lại mật khẩu - PARKOS" },
      { name: "description", content: "Đặt lại mật khẩu tài khoản PARKOS." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!token?.trim()) {
      setError("Thiếu token đặt lại mật khẩu. Mở lại liên kết từ email.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 kí tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token.trim(), newPassword);
      toast.success("Đã đặt lại mật khẩu", {
        description: "Bạn có thể đăng nhập bằng mật khẩu mới.",
      });
      await navigate({ to: "/login" });
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Không đặt lại được mật khẩu.",
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
            <CardTitle className="text-2xl tracking-tight">Đặt lại mật khẩu</CardTitle>
            <CardDescription>Nhập mật khẩu mới cho tài khoản của bạn.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={handleSubmit}>
              {!token ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Liên kết thiếu token. Hãy mở đúng URL từ email đặt lại mật khẩu.
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="reset-password">Mật khẩu mới</Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reset-confirm">Xác nhận mật khẩu</Label>
                <Input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
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
                disabled={isSubmitting || !token}
                className="h-11 rounded-xl text-[13px] font-semibold"
              >
                {isSubmitting ? "Đang lưu..." : "Đặt lại mật khẩu"}
                {!isSubmitting ? <ArrowRight className="size-4" /> : null}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
                  Về đăng nhập
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
