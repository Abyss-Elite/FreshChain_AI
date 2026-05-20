"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";

export default function RegisterPage() {
  const { register, handleSubmit } = useForm({
    defaultValues: { name: "", email: "", password: "", role: "SHIPPER" }
  });
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Register account</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(() => toast.success("Tao tai khoan demo thanh cong"))}>
            <Field label="Ho ten"><Input {...register("name")} /></Field>
            <Field label="Email"><Input {...register("email")} /></Field>
            <Field label="Password"><Input type="password" {...register("password")} /></Field>
            <Field label="Role"><Select {...register("role")}><option value="SHIPPER">Chu hang</option><option value="CARRIER">Chu xe</option><option value="ADMIN">Admin</option></Select></Field>
            <Button className="w-full">Register</Button>
            <p className="text-center text-sm text-muted-foreground">Da co tai khoan? <Link className="text-emerald-600" href="/login">Login</Link></p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
