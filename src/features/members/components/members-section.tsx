import { listMembers } from "../queries";
import { AddMemberForm } from "./add-member-form";
import { MemberItem } from "./member-item";

export async function MembersSection({ me }: { me: string }) {
  const members = await listMembers();

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
      </div>
      <ul className="divide-y rounded-lg border">
        {members.map((member) => (
          <MemberItem key={member.email} member={member} me={me} memberCount={members.length} />
        ))}
      </ul>
      <AddMemberForm />
    </section>
  );
}
