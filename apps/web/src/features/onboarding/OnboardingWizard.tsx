import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { UploadCloud } from "lucide-react";
import { onboardingSchema, type OnboardingInput, type WorkMode } from "@job-copilot/shared";
import { FormField } from "../../components/FormField";
import { TagInput } from "../../components/TagInput";
import { ApiRequestError } from "../../lib/api-client";
import { useCompleteOnboarding, useProfile } from "../profile/profile.api";

const STEPS = ["Basics", "Preferences", "Skills", "Links"] as const;
type Step = (typeof STEPS)[number];

const WORK_MODES: { value: WorkMode; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { data: existingProfile } = useProfile();
  const completeOnboarding = useCompleteOnboarding();
  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = STEPS[stepIndex] ?? STEPS[0];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: existingProfile?.name ?? "",
      currentRole: existingProfile?.currentRole ?? "",
      location: existingProfile?.location ?? "",
      targetRoles: existingProfile?.targetRoles ?? [],
      preferredLocations: existingProfile?.preferredLocations ?? [],
      skills: existingProfile?.skills.map((s) => s.name) ?? [],
      expectedSalaryCurrency: "USD",
    },
  });

  const onSubmit = handleSubmit((data) => {
    completeOnboarding.mutate(data, {
      onSuccess: () => navigate("/dashboard", { replace: true }),
    });
  });

  async function goNext() {
    // Only validate the field(s) relevant to the current step so users
    // aren't blocked by unrelated later-step errors.
    const fieldsPerStep: Record<Step, (keyof OnboardingInput)[]> = {
      Basics: ["name"],
      Preferences: [],
      Skills: [],
      Links: ["github", "linkedin", "portfolio"],
    };
    const valid = await trigger(fieldsPerStep[step]);
    if (valid) setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4 py-10">
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl p-8 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            <span>{step}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          disabled
          title="Resume upload is available on the Resume page — auto-filling this form from it ships with AI extraction (Phase 8)"
          className="w-full mb-6 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-sm text-slate-400 cursor-not-allowed"
        >
          <UploadCloud size={16} />
          Skip by uploading your resume (coming soon)
        </button>

        <form onSubmit={onSubmit} className="space-y-5">
          {step === "Basics" && (
            <>
              <FormField label="Name" error={errors.name?.message} {...register("name")} />
              <FormField label="Current role" error={errors.currentRole?.message} {...register("currentRole")} />
              <FormField
                label="Years of experience"
                type="number"
                min={0}
                error={errors.experienceYears?.message}
                {...register("experienceYears")}
              />
              <FormField label="Location" error={errors.location?.message} {...register("location")} />
            </>
          )}

          {step === "Preferences" && (
            <>
              <Controller
                control={control}
                name="targetRoles"
                render={({ field }) => (
                  <TagInput
                    label="Target roles"
                    values={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="e.g. Full Stack Developer"
                  />
                )}
              />
              <Controller
                control={control}
                name="preferredLocations"
                render={({ field }) => (
                  <TagInput
                    label="Preferred locations"
                    values={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="e.g. Bangalore, Remote"
                  />
                )}
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Work mode</span>
                <div className="flex gap-2">
                  {WORK_MODES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue("workMode", value)}
                      className={`flex-1 rounded-lg border py-2 text-sm transition-colors ${
                        watch("workMode") === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-surface-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Expected salary (min)"
                  type="number"
                  min={0}
                  {...register("expectedSalaryMin")}
                />
                <FormField
                  label="Expected salary (max)"
                  type="number"
                  min={0}
                  {...register("expectedSalaryMax")}
                />
              </div>
            </>
          )}

          {step === "Skills" && (
            <Controller
              control={control}
              name="skills"
              render={({ field }) => (
                <TagInput
                  label="Skills"
                  values={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="e.g. React, Node.js, TypeScript"
                />
              )}
            />
          )}

          {step === "Links" && (
            <>
              <FormField label="GitHub" placeholder="https://github.com/you" error={errors.github?.message} {...register("github")} />
              <FormField label="LinkedIn" placeholder="https://linkedin.com/in/you" error={errors.linkedin?.message} {...register("linkedin")} />
              <FormField label="Portfolio" placeholder="https://you.dev" error={errors.portfolio?.message} {...register("portfolio")} />
            </>
          )}

          {completeOnboarding.isError && (
            <p className="text-sm text-red-600">
              {completeOnboarding.error instanceof ApiRequestError
                ? completeOnboarding.error.message
                : "Something went wrong."}
            </p>
          )}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="text-sm text-slate-500 disabled:opacity-0 hover:text-primary"
            >
              Back
            </button>

            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-primary text-white text-sm font-medium px-5 py-2.5"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={completeOnboarding.isPending}
                className="rounded-lg bg-primary text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50"
              >
                {completeOnboarding.isPending ? "Finishing..." : "Finish"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
