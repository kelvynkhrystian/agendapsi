import {
  IPaymentProvider,
  PaymentProviderKey,
  PaymentEnvironment,
  AsaasCredentials,
  CreatePaymentInput,
  CreatePaymentResult,
  RefundInput,
  RefundResult,
  TestConnectionResult,
  WebhookEventResult,
} from "../types";

export class AsaasProvider implements IPaymentProvider {
  readonly key: PaymentProviderKey = "ASAAS";
  readonly name = "Asaas";

  private getBaseUrl(env: PaymentEnvironment): string {
    return env === "PRODUCTION"
      ? "https://api.asaas.com/api/v3"
      : "https://sandbox.asaas.com/api/v3";
  }

  async testConnection(
    credentials: AsaasCredentials,
    environment: PaymentEnvironment
  ): Promise<TestConnectionResult> {
    const key = credentials.apiKey?.trim();
    if (!key) {
      return { success: false, message: "Chave de API do Asaas não fornecida." };
    }

    if (key.startsWith("mock_") || process.env.PSI_MOCK_PAYMENTS === "true") {
      return {
        success: true,
        message: "Conexão de teste validada com sucesso (Simulação Asaas).",
        details: { mode: "MOCK", environment },
      };
    }

    try {
      const res = await fetch(`${this.getBaseUrl(environment)}/myAccount`, {
        headers: {
          access_token: key,
          "User-Agent": "PSI-Consultorios/1.0",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.errors?.[0]?.description || `Erro ${res.status}: Chave de API inválida no Asaas.`,
          details: errorData,
        };
      }

      const data = await res.json();
      return {
        success: true,
        message: `Conectado com sucesso à conta Asaas (${data.companyName || data.name || data.email || "Ativa"}).`,
        details: {
          id: data.id,
          name: data.companyName || data.name,
          email: data.email,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Falha na requisição ao Asaas: ${errorMsg}`,
      };
    }
  }

  async createPayment(
    input: CreatePaymentInput,
    credentials: AsaasCredentials,
    environment: PaymentEnvironment,
    _webhookUrl: string
  ): Promise<CreatePaymentResult> {
    const key = credentials.apiKey?.trim();
    if (!key) {
      throw new Error("Chave de API do Asaas não configurada.");
    }

    const amountFloat = Number((input.amountCents / 100).toFixed(2));

    if (key.startsWith("mock_") || process.env.PSI_MOCK_PAYMENTS === "true") {
      const mockId = `pay_asaas_${Date.now()}`;
      return {
        success: true,
        gatewayPaymentId: mockId,
        gatewayStatus: "PENDING",
        pixQrCode: `00020126580014br.gov.bcb.pix0136${mockId}520400005303986540${amountFloat}5802BR5915PSI Consultorio6009SAO PAULO62070503***6304`,
        pixQrCodeBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        checkoutUrl: `https://sandbox.asaas.com/i/${mockId}`,
        instructions: "Copie o código Pix ou aponte a câmera para o QR Code para pagar pelo aplicativo do banco.",
      };
    }

    const baseUrl = this.getBaseUrl(environment);

    // 1. Cria ou localiza o cliente no Asaas
    const custRes = await fetch(`${baseUrl}/customers`, {
      method: "POST",
      headers: {
        access_token: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: input.patient.fullName,
        email: input.patient.email,
        phone: input.patient.phone.replace(/\D/g, ""),
        cpfCnpj: input.patient.cpf ? input.patient.cpf.replace(/\D/g, "") : undefined,
        externalReference: input.patient.id,
      }),
    });

    let customerId = "";
    if (custRes.ok) {
      const custData = await custRes.json();
      customerId = custData.id;
    } else {
      // Tenta buscar por email
      const searchRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(input.patient.email)}`, {
        headers: { access_token: key },
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data?.[0]?.id) {
          customerId = searchData.data[0].id;
        }
      }
    }

    if (!customerId) {
      throw new Error("Não foi possível registrar o cliente no Asaas.");
    }

    // 2. Cria a cobrança via Pix no Asaas
    const today = new Date().toISOString().split("T")[0];
    const payRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        access_token: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: amountFloat,
        dueDate: today,
        description: input.description,
        externalReference: input.paymentId,
        postalService: false,
      }),
    });

    const payData = await payRes.json();
    if (!payRes.ok) {
      throw new Error(payData.errors?.[0]?.description || "Erro ao criar cobrança no Asaas.");
    }

    const paymentId = payData.id;

    // 3. Busca o QR Code Pix dinâmico
    let pixQrCode = "";
    let pixQrCodeBase64 = "";

    try {
      const pixRes = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
        headers: { access_token: key },
      });
      if (pixRes.ok) {
        const pixData = await pixRes.json();
        pixQrCode = pixData.payload || "";
        pixQrCodeBase64 = pixData.encodedImage || "";
      }
    } catch (e) {
      console.warn("[Asaas] Falha ao obter QR code Pix:", e);
    }

    return {
      success: true,
      gatewayPaymentId: paymentId,
      gatewayStatus: payData.status || "PENDING",
      pixQrCode,
      pixQrCodeBase64,
      checkoutUrl: payData.invoiceUrl,
      instructions: "Utilize o Pix Copia e Cola ou escaneie o QR Code no seu aplicativo bancário.",
      rawResponse: payData,
    };
  }

  async processRefund(
    input: RefundInput,
    credentials: AsaasCredentials,
    environment: PaymentEnvironment
  ): Promise<RefundResult> {
    const key = credentials.apiKey?.trim();
    if (!key) {
      return { success: false, gatewayStatus: "FAILED", refundedAmountCents: 0, error: "Chave do Asaas não configurada." };
    }

    if (!input.gatewayPaymentId) {
      return { success: false, gatewayStatus: "FAILED", refundedAmountCents: 0, error: "ID de pagamento Asaas ausente." };
    }

    if (key.startsWith("mock_") || process.env.PSI_MOCK_PAYMENTS === "true") {
      return {
        success: true,
        gatewayRefundId: `ref_asaas_${Date.now()}`,
        gatewayStatus: "REFUNDED",
        refundedAmountCents: input.amountCents,
      };
    }

    const refundAmountFloat = Number((input.amountCents / 100).toFixed(2));
    const res = await fetch(`${this.getBaseUrl(environment)}/payments/${input.gatewayPaymentId}/refund`, {
      method: "POST",
      headers: {
        access_token: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: refundAmountFloat,
        description: input.reason || "Estorno solicitado pelo consultório.",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        gatewayStatus: "FAILED",
        refundedAmountCents: 0,
        error: data.errors?.[0]?.description || `Erro no estorno Asaas: ${res.statusText}`,
      };
    }

    return {
      success: true,
      gatewayRefundId: String(data.id || `ref_${Date.now()}`),
      gatewayStatus: data.status || "REFUNDED",
      refundedAmountCents: input.amountCents,
    };
  }

  async verifyWebhook(
    rawBody: string,
    headers: Headers | Record<string, string | string[] | undefined>,
    credentials: AsaasCredentials
  ): Promise<WebhookEventResult> {
    let bodyObj: any = {};
    try {
      bodyObj = typeof rawBody === "string" && rawBody.trim() ? JSON.parse(rawBody) : {};
    } catch {
      bodyObj = {};
    }

    const getHeader = (name: string): string | null => {
      if (headers instanceof Headers) {
        return headers.get(name);
      }
      const val = headers[name] || headers[name.toLowerCase()];
      if (Array.isArray(val)) return val[0] || null;
      return typeof val === "string" ? val : null;
    };

    // Validação do token de webhook do Asaas (cabeçalho asaas-access-token)
    const asaasToken = getHeader("asaas-access-token");
    if (credentials.webhookSecret && asaasToken) {
      if (asaasToken.trim() !== credentials.webhookSecret.trim()) {
        console.warn("[Asaas] Token de autenticação do webhook inválido:", { asaasToken });
      }
    }

    const eventType = bodyObj.event || "UNKNOWN";
    const paymentData = bodyObj.payment || {};
    const gatewayPaymentId = String(paymentData.id || bodyObj.id || "");
    const paymentId = paymentData.externalReference || bodyObj.externalReference;
    const eventId = String(bodyObj.id || `${gatewayPaymentId}_${eventType}_${Date.now()}`);

    let newStatus: any = undefined;
    if (
      eventType === "PAYMENT_RECEIVED" ||
      eventType === "PAYMENT_CONFIRMED" ||
      eventType === "PAYMENT_APPROVED"
    ) {
      newStatus = "APPROVED";
    } else if (
      eventType === "PAYMENT_REFUNDED" ||
      eventType === "PAYMENT_PARTIALLY_REFUNDED"
    ) {
      newStatus = "REFUNDED";
    } else if (
      eventType === "PAYMENT_OVERDUE" ||
      eventType === "PAYMENT_DELETED"
    ) {
      newStatus = "CANCELLED";
    } else if (
      eventType === "PAYMENT_CREATED" ||
      eventType === "PAYMENT_AWAITING_RISK_ANALYSIS"
    ) {
      newStatus = "PENDING";
    }

    return {
      handled: true,
      eventId,
      eventType,
      provider: "ASAAS",
      gatewayPaymentId,
      paymentId,
      newStatus,
      rawPayload: bodyObj,
      message: `Asaas evento ${eventType} recebido para cobrança ${gatewayPaymentId}.`,
    };
  }
}
