import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileUpdateSchema, type ProfileUpdateInput } from "@job-copilot/shared";
import { FormField } from "../../components/FormField";
import { TagInput } from "../../components/TagInput";
import { ApiRequestError } from "../../lib/api-client";
import { useProfile, useUpdateProfile } from "./profile.api";

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
  });

  // Populate the form once the profile loads (can't set defaultValues
  // before the query resolves).
  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name,
        currentRole: profile.currentRole,
        experienceYears: profile.experienceYears,
        location: profile.location,
        summary: profile.summary,
        targetRoles: profile.targetRoles,
        preferredLocations: profile.preferredLocations,
        workMode: profile.workMode,
        links: profile.links,
      });
    }
  }, [profile, reset]);

  const onSubmit = handleSubmit((data) => {
    updateProfile.mutate(data, { onSuccess: (data) => reset(data) });
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading profile...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Employment history, education, projects, and certifications will populate here once
          resume upload ships (Phase 4) — you'll be able to edit everything AI extracts.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-border bg-surface p-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Name" error={errors.name?.message} {...register("name")} />
          <FormField label="Current role" error={errors.currentRole?.message} {...register("currentRole")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Years of experience"
            type="number"
            min={0}
            error={errors.experienceYears?.message}
            {...register("experienceYears")}
          />
          <FormField label="Location" error={errors.location?.message} {...register("location")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="summary" className="text-sm font-medium">
            Summary
          </label>
          <textarea
            id="summary"
            rows={3}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            {...register("summary")}
          />
        </div>

        <Controller
          control={control}
          name="targetRoles"
          render={({ field }) => (
            <TagInput label="Target roles" values={field.value ?? []} onChange={field.onChange} />
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
            />
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField label="GitHub" {...register("links.github")} />
          <FormField label="LinkedIn" {...register("links.linkedin")} />
          <FormField label="Portfolio" {...register("links.portfolio")} />
        </div>

        {updateProfile.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {updateProfile.error instanceof ApiRequestError
              ? updateProfile.error.message
              : "Something went wrong."}
          </p>
        )}
        {updateProfile.isSuccess && !isDirty && (
          <p className="text-sm text-emerald-600">Saved.</p>
        )}

        <button
          type="submit"
          disabled={updateProfile.isPending || !isDirty}
          className="rounded-lg bg-primary-solid text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50"
        >
          {updateProfile.isPending ? "Saving..." : "Save changes"}
        </button>
      </form>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
        <h2 className="text-sm font-medium">Skills</h2>
        {profile && profile.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span
                key={skill.name}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-xs px-2 py-1"
              >
                {skill.name}
                {!skill.confirmed && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">(unconfirmed)</span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No skills yet — add some during onboarding, or once resume upload ships.
          </p>
        )}
      </div>
    </div>
  );
}
