import { canManageMembers } from "../common-account-logic";
import { getCommonAccountEmail, type CommonAccountStatus } from "../common-account";
import { listMembers } from "../queries";
import { AddMemberForm } from "./add-member-form";
import { MemberItem } from "./member-item";

const STATUS_WARNINGS: Partial<Record<CommonAccountStatus, string>> = {
  missing:
    "La cuenta común del grupo no está configurada (GMAIL_USER), así que cualquier miembro puede gestionar miembros.",
  error:
    "No se pudo comprobar la configuración de la cuenta común del grupo. La base de datos sigue aplicando sus reglas.",
};

export async function MembersSection({
  me,
  commonAccountStatus,
}: {
  me: string;
  commonAccountStatus: CommonAccountStatus;
}) {
  const { members, total } = await listMembers();
  // Server-only comparison: the common account's address is never rendered.
  const canManage = canManageMembers({ commonEmail: getCommonAccountEmail(), me });
  const warning = STATUS_WARNINGS[commonAccountStatus];

  return (
    <section aria-labelledby="cuentas" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="cuentas" className="text-lg font-semibold">
          Cuentas con acceso al panel
        </h2>
        <p className="text-sm text-muted-foreground">
          Solo las cuentas de Google de esta lista pueden iniciar sesión en el panel. Al quitar
          una cuenta, esa persona pierde el acceso de inmediato.
        </p>
        {!canManage && (
          <p className="text-sm text-muted-foreground">
            Solo la cuenta común del grupo puede gestionar miembros.
          </p>
        )}
        {warning && (
          <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
            {warning}
          </p>
        )}
      </div>
      <ul className="divide-y rounded-lg border">
        {members.map((member) => (
          <MemberItem
            key={member.email}
            member={member}
            me={me}
            memberCount={total}
            canManage={canManage}
          />
        ))}
      </ul>
      {canManage && <AddMemberForm />}
    </section>
  );
}
