import Link from "next/link";
import { Badge, EmptyState } from "./ui";
import { formatDate, shortId } from "@/lib/format";
import { accountStatus, roleLabels, userLabel, type AdminUser } from "@/lib/users";

/**
 * Search results.
 *
 * Every row links to the account rather than expanding in place: the detail
 * page is where actions live, and an administrator who has just acted on an
 * account should be looking at that account, not at a list that has scrolled.
 */
export function UserTable({ users }: { users: AdminUser[] }) {
  if (users.length === 0) {
    return (
      <EmptyState
        title="No matching accounts"
        body="Search by display name, email address, or account ID. Partial matches are fine."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Account</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Status</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Roles</th>
            <th scope="col" className="eyebrow px-6 py-3 font-normal">Registered</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const status = accountStatus(user);
            return (
              <tr key={user.id} className="border-b border-line last:border-0 hover:bg-sand">
                <td className="px-6 py-4">
                  <Link href={`/users/${user.id}`} className="block">
                    <span className="font-medium underline-offset-4 hover:underline">
                      {userLabel(user)}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {user.email ?? "No email"} · {shortId(user.id)}
                    </span>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <Badge tone={status.tone}>{status.label}</Badge>
                </td>
                <td className="px-6 py-4">
                  <span className="flex flex-wrap gap-1.5">
                    {roleLabels(user).map((role) => (
                      <Badge key={role.label} tone={role.tone}>
                        {role.label}
                      </Badge>
                    ))}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-ink-soft">
                  {formatDate(user.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
