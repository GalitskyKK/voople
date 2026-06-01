"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { syncPublicUser } from "@/lib/auth/sync-public-user";
import { COPY } from "@/lib/constants/copy";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      setError("root", { message: error.message });
      return;
    }
    try {
      const { username } = await syncPublicUser();
      router.replace(username ? `/${username}` : "/feed");
      router.refresh();
    } catch (syncErr) {
      setError("root", {
        message: syncErr instanceof Error ? syncErr.message : "Ошибка создания профиля",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6"
    >
      <h1 className="text-xl font-bold">{COPY.login}</h1>
      <label className="block text-sm">
        Email
        <input
          type="email"
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
          {...register("email")}
        />
        {errors.email && <span className="text-xs text-red-400">{errors.email.message}</span>}
      </label>
      <label className="block text-sm">
        Пароль
        <input
          type="password"
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2"
          {...register("password")}
        />
        {errors.password && (
          <span className="text-xs text-red-400">{errors.password.message}</span>
        )}
      </label>
      {errors.root && <p className="text-sm text-red-400">{errors.root.message}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {COPY.login}
      </Button>
      <p className="text-center text-sm text-white/50">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-[#7B3AED]">
          {COPY.register}
        </Link>
      </p>
    </form>
  );
}
