import {
  IPaymentProvider,
  PaymentProviderKey,
  PaymentEnvironment,
  PagBankCredentials,
  CreatePaymentInput,
  CreatePaymentResult,
  RefundInput,
  RefundResult,
  TestConnectionResult,
  WebhookEventResult,
} from "../types";

export class PagBankProvider implements IPaymentProvider {
  readonly key: PaymentProviderKey = "PAGBANK";
  readonly name = "PagBank";

  private getBaseUrl(env: PaymentEnvironment): string {
    return env === "PRODUCTION"
      ? "https://api.pagseguro.com"
      : "https://sandbox.api.pagseguro.com";
  }

  async testConnection(
    credentials: PagBankCredentials,
    environment: PaymentEnvironment
  ): Promise<TestConnectionResult> {
    const token = credentials.token?.trim();
    if (!token) {
      return { success: false, message: "Token de API do PagBank não fornecido." };
    }

    if (token.startsWith("mock_") || process.env.PSI_MOCK_PAYMENTS === "true") {
      return {
        success: true,
        message: "Conexão de teste validada com sucesso (Simulação PagBank).",
        details: { mode: "MOCK", environment },
      };
    }

    try {
      const res = await fetch(`${this.getBaseUrl(environment)}/public-keys`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "PSI-Consultorios/1.0",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.error_messages?.[0]?.description || `Erro ${res.status}: Token inválido no PagBank.`,
          details: errorData,
        };
      }

      const data = await res.json();
      return {
        success: true,
        message: "Conectado com sucesso à API do PagBank.",
        details: { publicKey: data.public_key ? "Configurada" : "Pendente" },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Falha na requisição ao PagBank: ${errorMsg}`,
      };
    }
  }

  async createPayment(
    input: CreatePaymentInput,
    credentials: PagBankCredentials,
    environment: PaymentEnvironment,
    webhookUrl: string
  ): Promise<CreatePaymentResult> {
    const token = credentials.token?.trim();
    if (!token) {
      throw new Error("Token de API do PagBank não configurado.");
    }

    if (token.startsWith("mock_") || process.env.PSI_MOCK_PAYMENTS === "true") {
      const mockId = `pagbank_${Date.now()}`;
      return {
        success: true,
        gatewayPaymentId: mockId,
        gatewayStatus: "WAITING_PAYMENT",
        pixQrCode: `00020126580014br.gov.bcb.pix0136${mockId}520400005303986540${(input.amountCents / 100).toFixed(2)}5802BR5915PSI Consultorio6009SAO PAULO62070503***6304`,
        pixQrCodeBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        checkoutUrl: `https://sandbox.pagseguro.uol.com.br/checkout/payment.html?code=${mockId}`,
        instructions: "Copie o código Pix ou aponte a câmera para o QR Code para pagar no seu aplicativo bancário.",
      };
    }

    const baseUrl = this.getBaseUrl(environment);
    const cleanPhone = input.patient.phone.replace(/\D/g, "");
    const areaCode = cleanPhone.slice(0, 2) || "11";
    const phoneNumber = cleanPhone.slice(2) || "999999999";
    const cleanCpf = input.patient.cpf ? input.patient.cpf.replace(/\D/g, "") : "11111111111";

    const payload = {
      reference_id: input.paymentId,
      customer: {
        name: input.patient.fullName,
        email: input.patient.email,
        tax_id: cleanCpf,
        phones: [
          {
            country: "55",
            area: areaCode,
            number: phoneNumber,
            type: "MOBILE",
          },
        ],
      },
      items: [
        {
          reference_id: input.appointmentId || input.packageId || "consulta",
          name: input.description.substring(0, 100),
          quantity: 1,
          unit_amount: input.amountCents, // PagBank espera centavos inteiros
        },
      ],
      qr_codes: [
        {
          amount: {
            value: input.amountCents,
          },
          expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      notification_urls: webhookUrl ? [webhookUrl] : [],
    };

    const res = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data.error_messages?.map((e: any) => e.description).join("; ") || "Erro ao criar pedido no PagBank.";
      throw new Error(msg);
    }

    const qrCodeObj = data.qr_codes?.[0];
    const pixText = qrCodeObj?.text || "";
    const pixImageLink = qrCodeObj?.links?.find((l: any) => l.media === "image/png")?.href || "";

    return {
      success: true,
      gatewayPaymentId: data.id,
      gatewayStatus: "WAITING_PAYMENT",
      pixQrCode: pixText,
      checkoutUrl: pixImageLink,
      instructions: "Utilize o Pix Copia e Cola ou escaneie o QR Code no seu aplicativo do banco para concluir o pagamento.",
      rawResponse: data,
    };
  }

  async processRefund(
    input: RefundInput,
    credentials: PagBankCredentials,
    environment: PaymentEnvironment
  ): Promise<RefundResult> {
    const token = credentials.token?.trim();
    if (!token) {
      return { success: false, gatewayStatus: "FAILED", refundedAmountCents: 0, error: "Token do PagBank não configurado." };
    }

    if (!input.gatewayPaymentId) {
      return { success: false, gatewayStatus: "FAILED", refundedAmountCents: 0, error: "ID de pagamento PagBank ausente." };
    }

    if (token.startsWith("mock_") || process.env.PSI_MOCK_PAYMENTS === "true") {
      return {
        success: true,
        gatewayRefundId: `ref_pb_${Date.now()}`,
        gatewayStatus: "REFUNDED",
        refundedAmountCents: input.amountCents,
      };
    }

    const res = await fetch(`${this.getBaseUrl(environment)}/charges/${input.gatewayPaymentId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: {
          value: input.amountCents,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        gatewayStatus: "FAILED",
        refundedAmountCents: 0,
        error: data.error_messages?.[0]?.description || `Erro ao estornar PagBank: ${res.statusText}`,
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
    _headers: Headers | Record<string, string | string[] | undefined>,
    _credentials: PagBankCredentials
  ): Promise<WebhookEventResult> {
    let bodyObj: any = {};
    try {
      bodyObj = typeof rawBody === "string" && rawBody.trim() ? JSON.parse(rawBody) : {};
    } catch {
      bodyObj = {};
    }

    const orderId = bodyObj.id || bodyObj.order_id || "";
    const referenceId = bodyObj.reference_id || "";
    const charges = bodyObj.charges || [];
    const firstCharge = charges[0] || {};
    const chargeStatus = firstCharge.status || bodyObj.status || "WAITING_PAYMENT";
    const eventId = String(bodyObj.event_id || `${orderId}_${chargeStatus}_${Date.now()}`);

    let newStatus: any = undefined;
    if (chargeStatus === "PAID") {
      newStatus = "APPROVED";
    } else if (chargeStatus === "REFUNDED" || chargeStatus === "CANCELED") {
      newStatus = chargeStatus === "REFUNDED" ? "REFUNDED" : "CANCELLED";
    } else if (chargeStatus === "DECLINED") {
      newStatus = "REJECTED";
    } else if (chargeStatus === "WAITING_PAYMENT" || chargeStatus === "IN_ANALYSIS") {
      newStatus = "PENDING";
    }

    return {
      handled: true,
      eventId,
      eventType: `charge.${chargeStatus.toLowerCase()}`,
      provider: "PAGBANK",
      gatewayPaymentId: orderId,
      paymentId: referenceId,
      newStatus,
      rawPayload: bodyObj,
      message: `PagBank notificação processada para pedido ${orderId}. Status: ${chargeStatus}`,
    };
  }
}
