import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPasswordSchema, type ResetPasswordInput } from "@job-copilot/shared";
import { FormField } from "../../components/FormField";
import { ApiRequestError } from "../../lib/api-client";
import { useResetPassword } from "./auth.api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: searchParams.get("token") ?? "" },
  });

  const onSubmit = handleSubmit((data) => {
    resetPassword.mutate(data, {
      onSuccess: () => navigate("/login", { replace: true }),
    });
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Reset password</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Choose a new password.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" {...register("token")} />
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {resetPassword.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {resetPassword.error instanceof ApiRequestError
              ? resetPassword.error.message
              : "Something went wrong."}
          </p>
        )}

        <button
          type="submit"
          disabled={resetPassword.isPending}
          className="w-full rounded-lg bg-primary-solid text-white text-sm font-medium py-2.5 disabled:opacity-50"
        >
          {resetPassword.isPending ? "Resetting..." : "Reset password"}
        </button>
      </form>

      <Link to="/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary">
        Back to log in
      </Link>
    </div>
  );
}
