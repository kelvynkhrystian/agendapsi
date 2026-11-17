import { notFound } from "next/navigation";
import { PaymentProviderConfigPage } from "@/components/integrations/payment-provider-form";
import { PROVIDER_SLUG_MAP } from "@/lib/payments/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    provider: string;
  }>;
}

export default async function PaymentProviderPage({ params }: PageProps) {
  const resolvedParams = await params;
  const provider = resolvedParams?.provider || "";
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
