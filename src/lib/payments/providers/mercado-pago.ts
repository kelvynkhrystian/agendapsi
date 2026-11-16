import crypto from "crypto";
import {
  IPaymentProvider,
  PaymentProviderKey,
  PaymentEnvironment,
  MercadoPagoCredentials,
  CreatePaymentInput,
  CreatePaymentResult,
  RefundInput,
  RefundResult,
  TestConnectionResult,
  WebhookEventResult,
} from "../types";

export class MercadoPagoProvider implements IPaymentProvider {
  readonly key: PaymentProviderKey = "MERCADO_PAGO";
  readonly name = "Mercado Pago";

  private getBaseUrl(): string {
    return "https://api.mercadopago.com";
  }

  async testConnection(
    credentials: MercadoPagoCredentials,
    _environment: PaymentEnvironment
  ): Promise<TestConnectionResult> {
    const token = credentials.accessToken?.trim();
    if (!token) {
      return { success: false, message: "Access Token do Mercado Pago não fornecido." };
    }

    // Suporte a mock em testes ou chaves de teste locais
    if (token.startsWith("mock_") || process.env.PSI_MOCK_PAYMENTS === "true") {
      return {
        success: true,
        message: "Conexão de teste validada com sucesso (Simulação Local).",
        details: { mode: "MOCK", tokenPrefix: token.substring(0, 10) },
      };
    }

    try {
      const res = await fetch(`${this.getBaseUrl()}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "PSI-Consultorios/1.0",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || `Erro ${res.status}: Falha ao autenticar no Mercado Pago.`,
          details: errorData,
        };
      }

      const data = await res.json();
      return {
        success: true,
        message: `Conectado com sucesso como ${data.nickname || data.email || "Usuário Mercado Pago"}.`,
        details: {
          id: data.id,
          nickname: data.nickname,
          email: data.email,
          site_id: data.site_id,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Falha na requisição ao Mercado Pago: ${errorMsg}`,
      };
    }
  }

  async createPayment(
    input: CreatePaymentInput,
    credentials: MercadoPagoCredentials,
    _environment: PaymentEnvironment,
    webhookUrl: string
  ): Promise<CreatePaymentResult> {
    const token = credentials.accessToken?.trim();
    if (!token) {
      throw new Error("Access Token do Mercado Pago não configurado.");
    }

    const amountFloat = Number((input.amountCents / 100).toFixed(2));
    const [firstName, ...rest] = input.patient.fullName.trim().split(" ");
    const lastName = rest.join(" ") || "Paciente";

    // Simulação controlada em testes
    if (token.startsWith("mock_") || process.env.PSI_MOCK_PAYMENTS === "true") {
      const mockId = `mp_${Date.now()}`;
      return {
        success: true,
        gatewayPaymentId: mockId,
        gatewayStatus: "pending",
        pixQrCode: `00020126580014br.gov.bcb.pix0136${mockId}520400005303986540${amountFloat}5802BR5915PSI Consultorio6009SAO PAULO62070503***6304`,
        pixQrCodeBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        checkoutUrl: `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=${mockId}`,
        instructions: "Escaneie o QR Code ou copie o código Pix para pagar no seu aplicativo bancário.",
      };
    }

    const payload = {
      transaction_amount: amountFloat,
      description: input.description,
      payment_method_id: "pix",
      payer: {
        email: input.patient.email,
        first_name: firstName,
        last_name: lastName,
        identification: input.patient.cpf
          ? { type: "CPF", number: input.patient.cpf.replace(/\D/g, "") }
          : undefined,
      },
      external_reference: input.paymentId,
      notification_url: webhookUrl,
    };

    const res = await fetch(`${this.getBaseUrl()}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `psi_${input.paymentId}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Erro Mercado Pago: ${JSON.stringify(data)}`);
    }

    const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
    const ticketUrl = data.point_of_interaction?.transaction_data?.ticket_url;

    return {
      success: true,
      gatewayPaymentId: String(data.id),
      gatewayStatus: data.status || "pending",
      pixQrCode: qrCode,
      pixQrCodeBase64: qrCodeBase64,
      checkoutUrl: ticketUrl,
      instructions: "Utilize o Pix Copia e Cola ou escaneie o QR Code no seu aplicativo do banco para concluir o pagamento.",
      rawResponse: data,
    };
  }

  async processRefund(
    input: RefundInput,
    credentials: MercadoPagoCredentials,
    _environment: PaymentEnvironment
  ): Promise<RefundResult> {
    const token = credentials.accessToken?.trim();
    if (!token) {
      return { success: false, gatewayStatus: "FAILED", refundedAmountCents: 0, error: "Access Token não configurado." };
    }

    if (!input.gatewayPaymentId) {
      return { success: false, gatewayStatus: "FAILED", refundedAmountCents: 0, error: "ID de pagamento externo não encontrado." };
    }

    // Mock para testes
    if (token.startsWith("mock_") || process.env.PSI_MOCK_PAYMENTS === "true") {
      return {
        success: true,
        gatewayRefundId: `ref_mp_${Date.now()}`,
        gatewayStatus: "approved",
        refundedAmountCents: input.amountCents,
      };
    }

    const refundAmountFloat = Number((input.amountCents / 100).toFixed(2));
    const res = await fetch(`${this.getBaseUrl()}/v1/payments/${input.gatewayPaymentId}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: refundAmountFloat }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        gatewayStatus: "FAILED",
        refundedAmountCents: 0,
        error: data.message || `Erro ao estornar no Mercado Pago: ${res.statusText}`,
      };
    }

    return {
      success: true,
      gatewayRefundId: String(data.id),
      gatewayStatus: data.status || "approved",
      refundedAmountCents: input.amountCents,
    };
  }

  async verifyWebhook(
    rawBody: string,
    headers: Headers | Record<string, string | string[] | undefined>,
    credentials: MercadoPagoCredentials
  ): Promise<WebhookEventResult> {
    let bodyObj: any = {};
    try {
      bodyObj = typeof rawBody === "string" && rawBody.trim() ? JSON.parse(rawBody) : {};
    } catch {
      bodyObj = {};
    }

    // Header extraction
    const getHeader = (name: string): string | null => {
      if (headers instanceof Headers) {
        return headers.get(name);
      }
      const val = headers[name] || headers[name.toLowerCase()];
      if (Array.isArray(val)) return val[0] || null;
      return typeof val === "string" ? val : null;
    };

    const xSignature = getHeader("x-signature");
    const xRequestId = getHeader("x-request-id");

    // Validação criptográfica de x-signature se webhookSecret estiver configurado
    if (credentials.webhookSecret && xSignature && xRequestId) {
      try {
        const parts = xSignature.split(",").reduce((acc, part) => {
          const [k, v] = part.split("=");
          if (k && v) acc[k.trim()] = v.trim();
          return acc;
        }, {} as Record<string, string>);

        const ts = parts.ts;
        const v1 = parts.v1;
        const dataId = bodyObj.data?.id || bodyObj.id;

        if (ts && v1 && dataId) {
          const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
          const hmac = crypto.createHmac("sha256", credentials.webhookSecret);
          hmac.update(template);
          const computedHash = hmac.digest("hex");

          if (computedHash !== v1) {
            console.warn("[MercadoPago] Assinatura do webhook inválida:", { computedHash, v1 });
          }
        }
      } catch (e) {
        console.warn("[MercadoPago] Falha ao verificar x-signature:", e);
      }
    }

    const eventId = String(bodyObj.id || bodyObj.data?.id || `mp_evt_${Date.now()}`);
    const eventType = String(bodyObj.action || bodyObj.type || "payment.updated");
    const gatewayPaymentId = String(bodyObj.data?.id || bodyObj.id || "");

    // Consulta à API oficial do Mercado Pago para conciliação segura e autoritativa
    let authoritativeStatus = bodyObj.data?.status || bodyObj.status;
    let paymentExternalRef = bodyObj.external_reference;

    if (gatewayPaymentId && credentials.accessToken && !credentials.accessToken.startsWith("mock_")) {
      try {
        const checkRes = await fetch(`${this.getBaseUrl()}/v1/payments/${gatewayPaymentId}`, {
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
        if (checkRes.ok) {
          const freshData = await checkRes.json();
          authoritativeStatus = freshData.status;
          paymentExternalRef = freshData.external_reference || paymentExternalRef;
        }
      } catch {
        // Se a requisição de conciliação falhar, utiliza o status informado no payload
      }
    }

    let newStatus: any = undefined;
    if (authoritativeStatus === "approved") {
      newStatus = "APPROVED";
    } else if (authoritativeStatus === "refunded") {
      newStatus = "REFUNDED";
    } else if (authoritativeStatus === "rejected") {
      newStatus = "REJECTED";
    } else if (authoritativeStatus === "cancelled") {
      newStatus = "CANCELLED";
    } else if (authoritativeStatus === "pending" || authoritativeStatus === "in_process") {
      newStatus = "PENDING";
    }

    return {
      handled: true,
      eventId,
      eventType,
      provider: "MERCADO_PAGO",
      gatewayPaymentId,
      paymentId: paymentExternalRef,
      newStatus,
      rawPayload: bodyObj,
      message: `Mercado Pago evento ${eventType} processado. Status: ${authoritativeStatus}`,
    };
  }
}
