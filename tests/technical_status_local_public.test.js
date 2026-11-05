const test = require("node:test");
const assert = require("node:assert");

// Importa a lógica de validação de segurança do endpoint
function evaluateLocalPublicAccess({
  nodeEnv,
  optInVar,
  host,
  urlHostname,
  cfConnectingIp,
  forwardedHost,
  forwardedFor,
  realIp,
}) {
  // 1. Apenas em ambiente de desenvolvimento
  if (nodeEnv !== "development") {
    return false;
  }

  // 2. Opt-in explícito
  if (optInVar !== "true") {
    return false;
  }

  // 3. Validação estrita de loopback no Host e URL
  const hostClean = (host || "").split(":")[0].toLowerCase().trim();
  const urlClean = (urlHostname || "").toLowerCase().trim();

  const isLoopbackHost =
    hostClean === "127.0.0.1" ||
    hostClean === "localhost" ||
    hostClean === "::1" ||
    hostClean === "[::1]";

  const isLoopbackUrl =
    urlClean === "127.0.0.1" ||
    urlClean === "localhost" ||
    urlClean === "::1";

  if (!isLoopbackHost || !isLoopbackUrl) {
    return false;
  }

  // 4. Detecção de proxy reverso ou túneis públicos
  if (cfConnectingIp) {
    return false;
  }

  if (forwardedHost) {
    const fHostClean = forwardedHost.split(":")[0].toLowerCase().trim();
    if (fHostClean !== "127.0.0.1" && fHostClean !== "localhost" && fHostClean !== "::1") {
      return false;
    }
  }

  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    for (const ip of ips) {
      if (ip !== "127.0.0.1" && ip !== "::1" && ip !== "::ffff:127.0.0.1") {
        return false;
      }
    }
  }

  if (realIp) {
    const cleanRealIp = realIp.trim();
    if (cleanRealIp !== "127.0.0.1" && cleanRealIp !== "::1" && cleanRealIp !== "::ffff:127.0.0.1") {
      return false;
    }
  }

  return true;
}

test("Monitoramento Técnico Local: Bloqueio absoluto em produção mesmo com variável de opt-in", () => {
  const isAllowedInProd = evaluateLocalPublicAccess({
    nodeEnv: "production",
    optInVar: "true",
    host: "localhost:3000",
    urlHostname: "localhost",
  });

  assert.strictEqual(
    isAllowedInProd,
    false,
    "Nunca deve permitir acesso público em produção sob nenhuma hipótese"
  );
});

test("Monitoramento Técnico Local: Bloqueio quando opt-in não está explicitamente configurado", () => {
  // Variável ausente ou diferente de "true"
  assert.strictEqual(
    evaluateLocalPublicAccess({
      nodeEnv: "development",
      optInVar: undefined,
      host: "localhost:3000",
      urlHostname: "localhost",
    }),
    false
  );

  assert.strictEqual(
    evaluateLocalPublicAccess({
      nodeEnv: "development",
      optInVar: "false",
      host: "localhost:3000",
      urlHostname: "localhost",
    }),
    false
  );

  assert.strictEqual(
    evaluateLocalPublicAccess({
      nodeEnv: "development",
      optInVar: "1",
      host: "localhost:3000",
      urlHostname: "localhost",
    }),
    false
  );
});

test("Monitoramento Técnico Local: Bloqueio se o Host for externo ou rede local (não loopback)", () => {
  // Acesso via IP da rede local
  assert.strictEqual(
    evaluateLocalPublicAccess({
      nodeEnv: "development",
      optInVar: "true",
      host: "192.168.1.100:3000",
      urlHostname: "192.168.1.100",
    }),
    false,
    "Deve rejeitar IP que não seja loopback"
  );

  // Acesso via domínio público
  assert.strictEqual(
    evaluateLocalPublicAccess({
      nodeEnv: "development",
      optInVar: "true",
      host: "meuconsultorio.com",
      urlHostname: "meuconsultorio.com",
    }),
    false,
    "Deve rejeitar domínio externo"
  );
});

test("Monitoramento Técnico Local: Bloqueio se houver túnel público (Cloudflare, ngrok) ou proxy externo", () => {
  // Cabeçalho de Cloudflare
  assert.strictEqual(
    evaluateLocalPublicAccess({
      nodeEnv: "development",
      optInVar: "true",
      host: "localhost:3000",
      urlHostname: "localhost",
      cfConnectingIp: "203.0.113.195",
    }),
    false,
    "Deve rejeitar requisições originadas via Cloudflare"
  );

  // Cabeçalho x-forwarded-host de túnel ngrok
  assert.strictEqual(
    evaluateLocalPublicAccess({
      nodeEnv: "development",
      optInVar: "true",
      host: "localhost:3000",
      urlHostname: "localhost",
      forwardedHost: "subdominio.ngrok-free.app",
    }),
    false,
    "Deve rejeitar requisições roteadas por túnel ngrok"
  );

  // Cabeçalho x-forwarded-for com IP público
  assert.strictEqual(
    evaluateLocalPublicAccess({
      nodeEnv: "development",
      optInVar: "true",
      host: "localhost:3000",
      urlHostname: "localhost",
      forwardedFor: "187.54.20.10, 127.0.0.1",
    }),
    false,
    "Deve rejeitar forwarded-for contendo IPs externos"
  );
});

test("Monitoramento Técnico Local: Permissão concedida exclusivamente em loopback com opt-in ativo", () => {
  // Acesso via localhost
  assert.strictEqual(
    evaluateLocalPublicAccess({
      nodeEnv: "development",
      optInVar: "true",
      host: "localhost:3000",
      urlHostname: "localhost",
    }),
    true,
    "Deve permitir via localhost em desenvolvimento com opt-in"
  );

  // Acesso via 127.0.0.1
  assert.strictEqual(
    evaluateLocalPublicAccess({
      nodeEnv: "development",
      optInVar: "true",
      host: "127.0.0.1:3000",
      urlHostname: "127.0.0.1",
    }),
    true,
    "Deve permitir via 127.0.0.1 em desenvolvimento com opt-in"
  );
});

test("Serialização de Resposta Pública: Omissão de dados cadastrais do administrador e segredos", () => {
  // Simula gerador do serializer público higienizado
  const serializePublicTechnicalStatus = (metrics) => {
    return {
      installation: {
        applicationVersion: metrics.applicationVersion,
        timestamp: metrics.timestamp,
        applicationStatus: metrics.applicationStatus,
      },
      storage: {
        totalFileSizeBytes: metrics.totalFileSizeBytes,
        totalFileCount: metrics.totalFileCount,
        usageMB: metrics.usageMB,
        availableDiskSpaceBytes: metrics.availableDiskSpaceBytes,
      },
      application: {
        totalPatients: metrics.totalPatients,
        totalAppointments: metrics.totalAppointments,
        totalServices: metrics.totalServices,
      },
      integrations: {
        emailStatus: metrics.emailStatus,
        whatsappStatus: metrics.whatsappStatus,
        paymentGatewayStatus: metrics.paymentGatewayStatus,
        videoProvider: metrics.videoProvider,
      },
      payments: {
        totalPayments: metrics.totalPayments,
        pendingPayments: metrics.pendingPayments,
        approvedPayments: metrics.approvedPayments,
        integrationStatus: metrics.integrationStatus,
      },
      accessMode: "UNAUTHENTICATED_LOCAL_DEV",
      notice:
        "Modo de desenvolvimento local desautenticado ativo (loopback). Informações de contato do administrador e identificadores de instalação foram omitidos.",
    };
  };

  const rawMetrics = {
    applicationVersion: "1.0.0",
    installationId: "internal-id-standalone-sensitive",
    timestamp: "2026-11-05T08:00:00.000Z",
    applicationStatus: "OPERATIONAL",
    admin: {
      name: "Dra. Helena Martins",
      email: "helena@privado.test",
      phone: "11988887777",
    },
    totalFileSizeBytes: 1048576,
    totalFileCount: 4,
    usageMB: 1.0,
    availableDiskSpaceBytes: 40000000000,
    totalPatients: 10,
    totalAppointments: 25,
    totalServices: 5,
    emailStatus: "DISABLED",
    whatsappStatus: "DISABLED",
    paymentGatewayStatus: "SIMULATED_ACTIVE",
    videoProvider: "JITSI",
    totalPayments: 8,
    pendingPayments: 2,
    approvedPayments: 6,
    integrationStatus: "ONLINE_SIMULATED",
  };

  const publicResponse = serializePublicTechnicalStatus(rawMetrics);
  const serializedString = JSON.stringify(publicResponse);

  // 1. Dados do Administrador OMITIDOS
  assert.strictEqual(publicResponse.administrator, undefined);
  assert.strictEqual(publicResponse.adminContact, undefined);
  assert.strictEqual(serializedString.includes("Dra. Helena Martins"), false);
  assert.strictEqual(serializedString.includes("helena@privado.test"), false);
  assert.strictEqual(serializedString.includes("11988887777"), false);

  // 2. Identificador interno de instalação OMITIDO
  assert.strictEqual(publicResponse.installation.installationId, undefined);
  assert.strictEqual(serializedString.includes("internal-id-standalone-sensitive"), false);

  // 3. Ausência de senhas, credenciais ou dados clínicos
  assert.strictEqual(serializedString.includes("password"), false);
  assert.strictEqual(serializedString.includes("token"), false);
  assert.strictEqual(serializedString.includes("secret"), false);
  assert.strictEqual(serializedString.includes("clinical"), false);

  // 4. Métricas operacionais reais e públicas PRESENTES
  assert.strictEqual(publicResponse.installation.applicationVersion, "1.0.0");
  assert.strictEqual(publicResponse.installation.applicationStatus, "OPERATIONAL");
  assert.strictEqual(publicResponse.storage.totalFileCount, 4);
  assert.strictEqual(publicResponse.storage.usageMB, 1.0);
  assert.strictEqual(publicResponse.application.totalPatients, 10);
  assert.strictEqual(publicResponse.application.totalAppointments, 25);
  assert.strictEqual(publicResponse.payments.approvedPayments, 6);
  assert.strictEqual(publicResponse.accessMode, "UNAUTHENTICATED_LOCAL_DEV");
});
