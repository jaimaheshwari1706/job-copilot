import { Link } from "react-router-dom";
import { APPLICATION_STATUS_ORDER, type Application, type ApplicationStatus } from "@job-copilot/shared";
import { useUpdateApplication } from "./applications.api";

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const updateApplication = useUpdateApplication();

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-xs text-slate-500 uppercase">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium">Role</th>
            <th className="text-left px-4 py-2.5 font-medium">Company</th>
            <th className="text-left px-4 py-2.5 font-medium">Status</th>
            <th className="text-left px-4 py-2.5 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {applications.map((app) => (
            <tr key={app.id} className="hover:bg-surface-muted/50">
              <td className="px-4 py-2.5">
                <Link to={`/applications/${app.id}`} className="font-medium hover:text-primary">
                  {app.jobSnapshot.title}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-slate-500">{app.jobSnapshot.company}</td>
              <td className="px-4 py-2.5">
                <select
                  value={app.status}
                  onChange={(e) =>
                    updateApplication.mutate({ id: app.id, status: e.target.value as ApplicationStatus })
                  }
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none"
                >
                  {APPLICATION_STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-2.5 text-slate-400 text-xs">
                {new Date(app.updatedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
