import { redirect } from "next/navigation";

export default async function AdminClinicalRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const params = await searchParams;
  if (params.patientId) {
    redirect(`/admin/pacientes/${params.patientId}?tab=records`);
  }
  redirect("/admin/pacientes");
}
