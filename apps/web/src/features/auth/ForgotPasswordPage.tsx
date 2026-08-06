import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@job-copilot/shared";
import { FormField } from "../../components/FormField";
import { useForgotPassword } from "./auth.api";

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((data) => forgotPassword.mutate(data));

  if (forgotPassword.isSuccess) {
    const { devToken } = forgotPassword.data;
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Check your email</h1>
        <p className="text-sm text-slate-500">
          If that email is registered, a reset link is on its way.
        </p>
        {devToken && (
          <div className="rounded-lg border border-dashed border-border p-3 text-xs text-slate-500 space-y-2">
            <p>No email provider is configured yet — dev-only token:</p>
            <code className="block break-all">{devToken}</code>
            <Link
              to={`/reset-password?token=${devToken}`}
              className="text-primary hover:underline inline-block"
            >
              Continue to reset password →
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Forgot password</h1>
        <p className="text-sm text-slate-500 mt-1">We'll send you a reset link.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <button
          type="submit"
          disabled={forgotPassword.isPending}
          className="w-full rounded-lg bg-primary-solid text-white text-sm font-medium py-2.5 disabled:opacity-50"
        >
          {forgotPassword.isPending ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <Link to="/login" className="text-sm text-slate-500 hover:text-primary">
        Back to log in
      </Link>
    </div>
  );
}
