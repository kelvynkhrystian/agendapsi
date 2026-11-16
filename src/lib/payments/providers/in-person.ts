import {
  IPaymentProvider,
  PaymentProviderKey,
  PaymentEnvironment,
  InPersonCredentials,
  CreatePaymentInput,
  CreatePaymentResult,
  RefundInput,
  RefundResult,
  TestConnectionResult,
  WebhookEventResult,
} from "../types";

export class InPersonProvider implements IPaymentProvider {
  readonly key: PaymentProviderKey = "IN_PERSON";
  readonly name = "Pagamento Presencial";

  async testConnection(
    _credentials: InPersonCredentials,
    _environment: PaymentEnvironment
  ): Promise<TestConnectionResult> {
    return {
      success: true,
      message: "Pagamento Presencial ativo. Não requer conexão externa de API nem webhooks.",
      details: { mode: "IN_PERSON" },
    };
  }

  async createPayment(
    input: CreatePaymentInput,
    credentials: InPersonCredentials,
    _environment: PaymentEnvironment,
    _webhookUrl: string
  ): Promise<CreatePaymentResult> {
    const instructions =
      credentials.instructions?.trim() ||
      "O pagamento poderá ser realizado diretamente na recepção em dinheiro, cartão ou Pix no momento do atendimento.";

    return {
      success: true,
      gatewayPaymentId: `presencial_${input.paymentId}`,
      gatewayStatus: "PENDING",
      instructions,
    };
  }

  async processRefund(
    input: RefundInput,
    _credentials: InPersonCredentials,
    _environment: PaymentEnvironment
  ): Promise<RefundResult> {
    return {
      success: true,
      gatewayRefundId: `ref_presencial_${Date.now()}`,
      gatewayStatus: "REFUNDED",
      refundedAmountCents: input.amountCents,
    };
  }

  async verifyWebhook(
    _rawBody: string,
    _headers: Headers | Record<string, string | string[] | undefined>,
    _credentials: InPersonCredentials
  ): Promise<WebhookEventResult> {
    return {
      handled: false,
      eventId: `in_person_${Date.now()}`,
      eventType: "NONE",
      provider: "IN_PERSON",
      rawPayload: {},
      message: "Pagamento presencial não opera com webhooks.",
    };
  }
}
