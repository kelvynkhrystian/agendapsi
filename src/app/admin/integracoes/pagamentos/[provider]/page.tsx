import { notFound } from "next/navigation";
import { PaymentProviderConfigPage, PROVIDER_SLUG_MAP } from "@/components/integrations/payment-provider-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    provider: string;
  }>;
}

export default async function PaymentProviderPage({ params }: PageProps) {
  const { provider } = await params;
  const providerKey = PROVIDER_SLUG_MAP[provider.toLowerCase()];

  if (!providerKey) {
    notFound();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PaymentProviderConfigPage providerKey={providerKey} />
    </div>
  );
}
