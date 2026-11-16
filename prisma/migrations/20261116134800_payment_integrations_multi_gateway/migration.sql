-- AlterTable
ALTER TABLE `GatewayConfiguration` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `environment` VARCHAR(191) NOT NULL DEFAULT 'SANDBOX',
    ADD COLUMN `healthMessage` TEXT NULL,
    ADD COLUMN `healthStatus` VARCHAR(191) NOT NULL DEFAULT 'NOT_CONFIGURED',
    ADD COLUMN `instructions` TEXT NULL,
    ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isSandbox` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lastCheckedAt` DATETIME(3) NULL,
    ADD COLUMN `lastTestedAt` DATETIME(3) NULL,
    ADD COLUMN `lastWebhookReceivedAt` DATETIME(3) NULL,
    ADD COLUMN `webhookSecretEncrypted` TEXT NULL,
    ADD COLUMN `webhookUrl` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `checkoutUrl` TEXT NULL,
    ADD COLUMN `gatewayPaymentId` VARCHAR(191) NULL,
    ADD COLUMN `gatewayProvider` VARCHAR(191) NULL,
    ADD COLUMN `gatewayStatus` VARCHAR(191) NULL,
    ADD COLUMN `metadataJson` TEXT NULL,
    ADD COLUMN `pixQrCode` TEXT NULL,
    ADD COLUMN `pixQrCodeBase64` TEXT NULL,
    MODIFY `method` ENUM('ONLINE_SIMULATED', 'IN_PERSON', 'WHATSAPP_ARRANGED', 'MERCADO_PAGO', 'ASAAS', 'PAGBANK', 'PIX', 'CREDIT_CARD') NOT NULL DEFAULT 'ONLINE_SIMULATED';

-- AlterTable
ALTER TABLE `Refund` ADD COLUMN `gatewayRefundId` VARCHAR(191) NULL,
    ADD COLUMN `gatewayStatus` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PaymentWebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `payloadJson` TEXT NOT NULL,
    `processedStatus` VARCHAR(191) NOT NULL DEFAULT 'PROCESSED',
    `errorMessage` TEXT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentWebhookEvent_provider_idx`(`provider`),
    INDEX `PaymentWebhookEvent_paymentId_idx`(`paymentId`),
    UNIQUE INDEX `PaymentWebhookEvent_provider_eventId_key`(`provider`, `eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `GatewayConfiguration_providerKey_key` ON `GatewayConfiguration`(`providerKey`);

-- CreateIndex
CREATE INDEX `Payment_gatewayPaymentId_idx` ON `Payment`(`gatewayPaymentId`);

-- CreateIndex
CREATE INDEX `Payment_gatewayProvider_idx` ON `Payment`(`gatewayProvider`);
