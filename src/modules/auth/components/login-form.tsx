"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import centerLogo from "@/media/logo.png";

const loginSchema = z.object({
  username: z.string().min(3, "Usuario requerido"),
  password: z.string().min(4, "Contrasena requerida")
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);

    const result = await signIn("credentials", {
      username: values.username,
      password: values.password,
      redirect: false
    });

    if (result?.error) {
      setError("Credenciales invalidas");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex justify-center">
          <Image
            src={centerLogo}
            alt="Logo"
            priority
            className="h-20 w-auto object-contain"
          />
        </div>
        <CardTitle className="text-center">INICIAR SESION</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">Usuario</label>
            <Input {...form.register("username")} />
            {form.formState.errors.username && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm">Contrasena</label>
            <Input type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
