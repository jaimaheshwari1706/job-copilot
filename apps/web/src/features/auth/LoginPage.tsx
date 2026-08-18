import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, type LoginInput } from "@job-copilot/shared";
import { FormField } from "../../components/FormField";
import { ApiRequestError } from "../../lib/api-client";
import { useLogin } from "./auth.api";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((data) => {
    login.mutate(data, { onSuccess: () => navigate("/dashboard", { replace: true }) });
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Log in</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Welcome back.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {login.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {login.error instanceof ApiRequestError ? login.error.message : "Something went wrong."}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-lg bg-primary-solid text-white text-sm font-medium py-2.5 disabled:opacity-50"
        >
          {login.isPending ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
        <Link to="/forgot-password" className="hover:text-primary">
          Forgot password?
        </Link>
        <Link to="/register" className="hover:text-primary">
          Create account
        </Link>
      </div>
    </div>
  );
}
