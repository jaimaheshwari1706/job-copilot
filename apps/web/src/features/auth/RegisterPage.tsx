import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema, type RegisterInput } from "@job-copilot/shared";
import { FormField } from "../../components/FormField";
import { ApiRequestError } from "../../lib/api-client";
import { useRegister } from "./auth.api";

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((data) => {
    registerUser.mutate(data, { onSuccess: () => navigate("/dashboard", { replace: true }) });
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Create your account</h1>
        <p className="text-sm text-slate-500 mt-1">Start finding better-matched roles.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Name" autoComplete="name" error={errors.name?.message} {...register("name")} />
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {registerUser.isError && (
          <p className="text-sm text-red-600">
            {registerUser.error instanceof ApiRequestError
              ? registerUser.error.message
              : "Something went wrong."}
          </p>
        )}

        <button
          type="submit"
          disabled={registerUser.isPending}
          className="w-full rounded-lg bg-primary-solid text-white text-sm font-medium py-2.5 disabled:opacity-50"
        >
          {registerUser.isPending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
