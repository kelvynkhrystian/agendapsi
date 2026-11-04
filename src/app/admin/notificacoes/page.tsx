import { NotificationHistoryView } from "@/components/notifications/notification-history-view";

export default function AdminNotificationsPage() {
  return (
    <NotificationHistoryView
      title="Central de Notificações do Consultório"
      subtitle="Histórico de alertas, solicitações de pacientes, agendamentos e avisos de sistema."
    />
  );
}
