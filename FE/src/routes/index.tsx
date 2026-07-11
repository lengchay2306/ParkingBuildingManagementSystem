import { CarFront, Mail, MapPin, Phone, Shield, Zap } from "lucide-react";
import { createFileRoute, redirect } from "@tanstack/react-router";

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
      { title: "Tổng quan - PARKOS" },
      {
        name: "description",
        content:
          "Tổng quan PARKOS về tình trạng lấp đầy, vận hành và hoạt động đỗ xe theo thời gian thực.",
      },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Zap, title: "Nhanh chóng", detail: "Vào ra dưới 5 giây" },
  { icon: Shield, title: "An toàn", detail: "Giám sát 24/7" },
  { icon: CarFront, title: "Tiện lợi", detail: "Đặt chỗ trước linh hoạt" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative border-b border-border/80">
          <div
            className="index-hero-image absolute inset-0 bg-cover bg-center opacity-30"
            aria-hidden
          />
          <div className="index-hero-overlay absolute inset-0" aria-hidden />
          <div className="relative mx-auto flex min-h-[74vh] w-full max-w-7xl items-center px-6 py-20">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-hairline-strong bg-surface-2/90 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                Đỗ xe thông minh · 24/7
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.04] tracking-[-0.04em] md:text-6xl">
                Đỗ xe thông minh
              </h1>
              <p className="mt-5 max-w-xl text-[16px] text-muted-foreground">
                Hệ thống tòa nhà đỗ xe hiện đại với AI nhận diện biển số, đặt chỗ trực tuyến và
                thanh toán không tiền mặt.
              </p>
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
              className="index-section-image h-full min-h-[360px] w-full bg-cover bg-center"
              aria-hidden
            />
            <div className="index-section-overlay pointer-events-none absolute inset-0" aria-hidden />
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
              Huỳnh Khương An, Gò Vấp,TP.HCM  (nhà anh Huy rô nan đô)
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
            © 2026 Hệ thống đỗ xe tòa nhà. Bảo lưu mọi quyền.
          </p>
        </div>
      </footer>
    </div>
  );
}
