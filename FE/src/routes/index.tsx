import { ArrowRight, CarFront, Mail, MapPin, Phone, Shield, Zap } from "lucide-react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { getRoleHome, getSessionRole } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const role = await getSessionRole();
    if (role) {
      throw redirect({ to: getRoleHome(role) });
    }
  },
  head: () => ({
    meta: [
      { title: "Overview - PARKOS" },
      {
        name: "description",
        content:
          "PARKOS overview for occupancy, operations health, and real-time parking activity.",
      },
    ],
  }),
  component: Index,
});

const heroImage =
  "https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=2400&q=80";
const sectionImage =
  "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=1800&q=80";

const features = [
  { icon: Zap, title: "Nhanh chóng", detail: "Vào ra dưới 5 giây" },
  { icon: Shield, title: "An toàn", detail: "Giám sát 24/7" },
  { icon: CarFront, title: "Tiện lợi", detail: "Đặt chỗ trước linh hoạt" },
];

function Index() {
  const router = useRouter();

  useEffect(() => {
    void getSessionRole().then((role) => {
      if (role) {
        void router.navigate({ to: getRoleHome(role) });
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative border-b border-border/80">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${heroImage})` }}
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--background) 42%, transparent), var(--background) 92%)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto flex min-h-[74vh] w-full max-w-7xl items-center px-6 py-20">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-hairline-strong bg-surface-2/90 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                Smart Parking · 24/7
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] md:text-6xl">
                Đỗ xe thông minh,
                <br />
                <span className="text-primary">không lo chỗ trống</span>
              </h1>
              <p className="mt-5 max-w-xl text-[16px] text-muted-foreground">
                Hệ thống tòa nhà đỗ xe hiện đại với AI nhận diện biển số, đặt chỗ trực tuyến và
                thanh toán không tiền mặt.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Đăng nhập <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-[1fr_1.05fr]">
          <article className="lg:pt-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
              Giới thiệu dự án
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
              Tòa nhà đỗ xe thế hệ mới
            </h2>
            <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
              Parking Building System là giải pháp quản lý đỗ xe toàn diện với 1.000+ chỗ trên 10
              tầng. Tích hợp camera AI, cảm biến IoT và ứng dụng di động giúp tài xế tìm chỗ trống
              trong vài giây.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {features.map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-card p-4">
                  <item.icon className="size-4 text-primary" />
                  <h3 className="mt-3 text-[15px] font-semibold">{item.title}</h3>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
          <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-pop">
            <div
              className="h-full min-h-[360px] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${sectionImage})` }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, transparent 58%, color-mix(in oklab, var(--background) 76%, transparent))",
              }}
              aria-hidden
            />
          </article>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <article className="rounded-2xl border border-hairline-strong bg-[linear-gradient(100deg,oklch(0.54_0.16_275),oklch(0.5_0.14_255))] px-8 py-14 text-center shadow-pop">
            <h2 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
              Sẵn sàng đặt chỗ đỗ xe?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] text-primary-foreground/90">
              Đặt chỗ trước chỉ với vài thao tác. Đảm bảo có chỗ ngay khi bạn đến.
            </p>
            <div className="mt-8">
              <Link
                to="/driver"
                className="inline-flex h-10 items-center rounded-md bg-primary-foreground px-6 text-[13px] font-semibold text-background transition-opacity hover:opacity-90"
              >
                Đặt chỗ ngay
              </Link>
            </div>
          </article>
        </section>
      </main>

      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Parking Building System</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Giải pháp đỗ xe thông minh cho đô thị hiện đại.
            </p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
              Địa chỉ
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-primary" />
              123 Nguyễn Văn Linh, Q.7, TP.HCM
            </p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Phone className="size-4 text-primary" />
              Hotline: 1900 1234
            </p>
            <p className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              contact@parkingbs.vn
            </p>
          </div>
        </div>
        <div className="border-t border-border">
          <p className="mx-auto max-w-7xl px-6 py-5 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            © 2026 Parking Building System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
