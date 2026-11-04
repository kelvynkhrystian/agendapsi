import { NotificationHistoryView } from "@/components/notifications/notification-history-view";

export default function PatientNotificationsPage() {
  return (
    <NotificationHistoryView
      title="Minhas Notificações"
      subtitle="Acompanhe confirmações de consultas, lembretes, pagamentos e documentos liberados."
    />
  );
}
