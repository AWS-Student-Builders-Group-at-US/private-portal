import { redirect } from "next/navigation";

// Google calendars and the team subscription link now live on "Mi disponibilidad".
export default function ProfilePage() {
  redirect("/panel/calendario#calendarios");
}
