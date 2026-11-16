import { PaymentStatus, PaymentMethod } from "@prisma/client";

export type PaymentProviderKey = "MERCADO_PAGO" | "ASAAS" | "PAGBANK" | "IN_PERSON";

export type PaymentEnvironment = "SANDBOX" | "PRODUCTION";

export type ProviderHealthStatus = "CONNECTED" | "ERROR" | "NOT_CONFIGURED" | "DISCONNECTED";

export interface MercadoPagoCredentials {
  accessToken: string;
  publicKey?: string;
  webhookSecret?: string;
}

export interface AsaasCredentials {
  apiKey: string;
  webhookSecret?: string;
}

export interface PagBankCredentials {
  token: string;
  publicKey?: string;
  webhookSecret?: string;
}

export interface InPersonCredentials {
  instructions?: string;
}

export type AnyProviderCredentials =
  | MercadoPagoCredentials
  | AsaasCredentials
  | PagBankCredentials
  | InPersonCredentials;

export interface GatewayConfigDTO {
  id: string;
  slotNumber: number;
  providerKey: PaymentProviderKey;
  name: string;
  isEnabled: boolean;
  isSandbox: boolean;
  isDefault: boolean;
  environment: PaymentEnvironment;
  hasCredentials: boolean;
  maskedAccessToken?: string;
  maskedPublicKey?: string;
  maskedWebhookSecret?: string;
  webhookUrl: string;
  healthStatus: ProviderHealthStatus;
  healthMessage?: string | null;
  lastCheckedAt?: string | null;
  lastTestedAt?: string | null;
  lastWebhookReceivedAt?: string | null;
  instructions?: string | null;
}

export interface CreatePaymentInput {
  paymentId: string;
  appointmentId?: string;
  packageId?: string;
  patient: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    cpf?: string | null;
  };
  amountCents: number;
  description: string;
  returnUrl?: string;
  methodPreference?: "PIX" | "CREDIT_CARD" | "ANY";
}

export interface CreatePaymentResult {
  success: boolean;
  gatewayPaymentId: string;
  gatewayStatus: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  checkoutUrl?: string;
  instructions?: string;
  rawResponse?: any;
  error?: string;
}

export interface RefundInput {
  paymentId: string;
  gatewayPaymentId?: string;
  amountCents: number;
  reason?: string;
  adminUserId: string;
}

export interface RefundResult {
  success: boolean;
  gatewayRefundId?: string;
  gatewayStatus: string;
  refundedAmountCents: number;
  error?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface WebhookEventResult {
  handled: boolean;
  duplicate?: boolean;
  eventId: string;
  eventType: string;
  provider: PaymentProviderKey;
  gatewayPaymentId?: string;
  paymentId?: string;
  newStatus?: PaymentStatus;
  refundAmountCents?: number;
  rawPayload: any;
  message?: string;
}

export interface IPaymentProvider {
  readonly key: PaymentProviderKey;
  readonly name: string;

  testConnection(
    credentials: AnyProviderCredentials,
    environment: PaymentEnvironment
  ): Promise<TestConnectionResult>;

  createPayment(
    input: CreatePaymentInput,
    credentials: AnyProviderCredentials,
    environment: PaymentEnvironment,
    webhookUrl: string
  ): Promise<CreatePaymentResult>;

  processRefund(
    input: RefundInput,
    credentials: AnyProviderCredentials,
    environment: PaymentEnvironment
  ): Promise<RefundResult>;

  verifyWebhook(
    rawBody: string,
    headers: Headers | Record<string, string | string[] | undefined>,
    credentials: AnyProviderCredentials
  ): Promise<WebhookEventResult>;
}
