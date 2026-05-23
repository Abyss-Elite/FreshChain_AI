"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm({
    defaultValues: { email: "shipper@freshchain.vn", password: "123456" },
  });

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dang nhap FreshChain AI</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              try {
                const data = await authApi.login(values.email, values.password);
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                toast.success("Dang nhap thanh cong");
                router.push("/matching");
              } catch (error: any) {
                toast.error(error.message || "Khong the dang nhap");
              }
            })}
          >
            <Field label="Email"><Input {...register("email")} /></Field>
            <Field label="Mat khau"><Input type="password" {...register("password")} /></Field>
            <Button className="w-full" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Dang xu ly..." : "Dang nhap"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Chua co tai khoan? <Link className="text-emerald-600" href="/register">Dang ky</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
