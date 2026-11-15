import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton({
  className,
  buttonClassName,
}: {
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <form action={signOut} className={className}>
      <Button type="submit" variant="outline" className={cn("w-full", buttonClassName)}>
        <LogOut />
        Cerrar sesión
      </Button>
    </form>
  );
}
