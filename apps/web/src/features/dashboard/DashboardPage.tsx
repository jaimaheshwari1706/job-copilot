import { Link } from "react-router-dom";
import { Sparkles, Briefcase, Target, Bookmark, TrendingUp, Clock } from "lucide-react";
import type { DashboardStats } from "@job-copilot/shared";
import { JobCard } from "../jobs/JobCard";
import { useDashboardStats } from "./dashboard.api";

const STATUS_LABELS: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

function StatCard({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
        <Icon size={14} /> {label}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FunnelBar({ funnel }: { funnel: DashboardStats["applicationFunnel"] }) {
  const order: Array<keyof typeof funnel> = ["saved", "applied", "assessment", "interview", "offer"];
  const max = Math.max(1, ...order.map((k) => funnel[k] ?? 0));
  return (
    <div className="space-y-2">
      {order.map((status) => (
        <div key={status}>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{STATUS_LABELS[status]}</span>
            <span>{funnel[status] ?? 0}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${((funnel[status] ?? 0) / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) return <p className="text-sm text-slate-500">Loading your dashboard...</p>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Your job search at a glance.</p>
      </div>

      {stats.aiInsight && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-2">
          <Sparkles size={16} className="text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-slate-700 dark:text-slate-200">{stats.aiInsight}</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Jobs discovered" value={stats.jobsDiscovered} />
        <StatCard icon={Target} label="Strong matches" value={stats.strongMatchesCount} />
        <StatCard icon={Bookmark} label="Saved jobs" value={stats.savedJobsCount} />
        <StatCard
          icon={TrendingUp}
          label="Avg. match score"
          value={stats.averageMatchScore !== null ? `${stats.averageMatchScore}%` : "—"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Application funnel</h2>
            <span className="text-xs text-slate-500">
              {stats.applicationsCount} total
              {stats.interviewConversionRate !== null && ` · ${stats.interviewConversionRate}% reach interview`}
            </span>
          </div>
          <FunnelBar funnel={stats.applicationFunnel} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <h2 className="text-sm font-medium flex items-center gap-1.5">
            <Clock size={14} /> Recent activity
          </h2>
          {stats.recentActivity.length > 0 ? (
            <ul className="space-y-2">
              {stats.recentActivity.map((item, i) => (
                <li key={i} className="text-sm">
                  <Link to={`/applications/${item.applicationId}`} className="font-medium hover:text-primary">
                    {item.jobTitle}
                  </Link>
                  <span className="text-slate-500"> at {item.company}</span>
                  <p className="text-xs text-slate-400">
                    {item.description} · {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No activity yet.</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Top recommended jobs</h2>
          <Link to="/jobs/recommended" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>
        {stats.topRecommendedJobs.length > 0 ? (
          <div className="space-y-3">
            {stats.topRecommendedJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Complete your profile to get recommendations.</p>
        )}
      </div>

      {stats.topMissingSkills.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Top skill gaps</h2>
            <Link to="/skills" className="text-xs text-primary hover:underline">
              View analysis →
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stats.topMissingSkills.map((s) => (
              <span key={s.skill} className="rounded-md bg-surface-muted text-xs px-2 py-1">
                {s.skill} · {s.demandPercentage}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
