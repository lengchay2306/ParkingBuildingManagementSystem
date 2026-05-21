import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthApiError, registerUser } from "@/services/auth.service";
import { cn } from "@/lib/utils";

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(30, "Full name must be at most 30 characters."),
  email: z.string().email("Invalid email address."),
  phone: z
    .string()
    .trim()
    .max(10, "Phone number must be at most 10 digits.")
    .regex(/^[0-9]+$/, "Phone number must contain digits only."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

type RegisterFormProps = {
  className?: string;
  onSwitchToLogin?: () => void;
  onRegistered?: () => void;
};

const mapBackendErrorToField = (message: string): keyof RegisterFormValues | null => {
  const lower = message.toLowerCase();
  if (lower.includes("email") || lower.includes("account")) {
    return "email";
  }
  if (lower.includes("password")) {
    return "password";
  }
  if (lower.includes("fullname") || lower.includes("full name") || lower.includes("name")) {
    return "fullName";
  }
  if (lower.includes("phone")) {
    return "phone";
  }
  return null;
};

export function RegisterForm({ className, onSwitchToLogin, onRegistered }: RegisterFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerUser(values);
      toast.success("Registration successful", {
        description: "Your Customer account has been created. Please sign in.",
      });
      if (onRegistered) {
        onRegistered();
        return;
      }
      await router.navigate({ to: "/login" });
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 400) {
        const message = error.message || "Invalid data or account already exists.";
        const field = mapBackendErrorToField(message);
        if (field) {
          form.setError(field, { type: "server", message });
        } else {
          setFormError(message);
        }
        return;
      }
      setFormError("Unable to register right now. Please try again later.");
    }
  });

  const {
    register,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <form
      onSubmit={onSubmit}
      className={cn("mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft", className)}
    >
      <h2 className="text-2xl font-semibold tracking-tight">Create account</h2>
      

      {formError ? (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName ? <p className="text-sm text-destructive">{errors.fullName.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
           
            {...register("email")}
          />
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
           
            inputMode="numeric"
           
            {...register("phone")}
          />
          {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
           
           
            {...register("password")}
          />
          {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-6 h-10 w-full font-semibold">
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            Creating account...
          </span>
        ) : (
          "Register"
        )}
      </Button>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
