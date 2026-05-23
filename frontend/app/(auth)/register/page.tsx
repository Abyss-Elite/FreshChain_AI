"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { authApi } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm({
    defaultValues: { name: "", company: "", email: "", password: "", role: "SHIPPER" },
  });

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Tao tai khoan</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              try {
                const data = await authApi.register(values);
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                toast.success("Tao tai khoan thanh cong");
                router.push("/matching");
              } catch (error: any) {
                toast.error(error.message || "Khong the tao tai khoan");
              }
            })}
          >
            <Field label="Ho ten"><Input {...register("name")} /></Field>
            <Field label="Cong ty"><Input {...register("company")} /></Field>
            <Field label="Email"><Input type="email" {...register("email")} /></Field>
            <Field label="Mat khau"><Input type="password" {...register("password")} /></Field>
            <Field label="Vai tro">
              <Select {...register("role")}>
                <option value="SHIPPER">Chu hang</option>
                <option value="CARRIER">Chu xe</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </Field>
            <Button className="w-full" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Dang xu ly..." : "Dang ky"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Da co tai khoan? <Link className="text-emerald-600" href="/login">Dang nhap</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
