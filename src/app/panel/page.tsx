import { getCurrentMember } from "@/lib/auth/member";

export default async function HomePage() {
  const member = await getCurrentMember();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Hola, {member.name}</h1>
      <p className="text-muted-foreground">Bienvenido al panel del Core Team.</p>
    </div>
  );
}
