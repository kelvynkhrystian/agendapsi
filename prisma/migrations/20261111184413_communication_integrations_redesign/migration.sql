-- AlterTable
ALTER TABLE `notificationdelivery` MODIFY `channel` ENUM('EMAIL', 'WHATSAPP', 'SMS') NOT NULL;

-- AlterTable
ALTER TABLE `notificationtemplate` MODIFY `channel` ENUM('EMAIL', 'WHATSAPP', 'SMS') NOT NULL;

-- AlterTable
ALTER TABLE `patient` ADD COLUMN `smsOptIn` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `smsOptInAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `systemsettings` ADD COLUMN `emailDisabledRecoveryStrategy` VARCHAR(191) NOT NULL DEFAULT 'ADMIN_ASSISTED',
    ADD COLUMN `emailHealthMessage` TEXT NULL,
    ADD COLUMN `emailHealthStatus` VARCHAR(191) NOT NULL DEFAULT 'NOT_CONFIGURED',
    ADD COLUMN `emailLastCheckedAt` DATETIME(3) NULL,
    ADD COLUMN `emailLastTestedAt` DATETIME(3) NULL,
    ADD COLUMN `emailMode` VARCHAR(191) NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN `openWaApiKey` TEXT NULL,
    ADD COLUMN `openWaApiUrl` VARCHAR(191) NULL,
    ADD COLUMN `openWaConnectedNumber` VARCHAR(191) NULL,
    ADD COLUMN `openWaSessionId` VARCHAR(191) NULL DEFAULT 'default',
    ADD COLUMN `smsEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `smsHealthMessage` TEXT NULL,
    ADD COLUMN `smsHealthStatus` VARCHAR(191) NOT NULL DEFAULT 'NOT_CONFIGURED',
    ADD COLUMN `smsLastCheckedAt` DATETIME(3) NULL,
    ADD COLUMN `smsLastTestedAt` DATETIME(3) NULL,
    ADD COLUMN `smsProvider` VARCHAR(191) NOT NULL DEFAULT 'TEXTBEE',
    ADD COLUMN `smtpReplyTo` VARCHAR(191) NULL,
    ADD COLUMN `textbeeApiKey` TEXT NULL,
    ADD COLUMN `textbeeApiUrl` VARCHAR(191) NULL,
    ADD COLUMN `textbeeDeviceId` VARCHAR(191) NULL,
    ADD COLUMN `textbeeHostingMode` VARCHAR(191) NOT NULL DEFAULT 'CLOUD',
    ADD COLUMN `whatsappHealthMessage` TEXT NULL,
    ADD COLUMN `whatsappHealthStatus` VARCHAR(191) NOT NULL DEFAULT 'NOT_CONFIGURED',
    ADD COLUMN `whatsappLastCheckedAt` DATETIME(3) NULL,
    ADD COLUMN `whatsappLastTestedAt` DATETIME(3) NULL,
    ADD COLUMN `whatsappMetaAccessToken` TEXT NULL,
    ADD COLUMN `whatsappMetaAppSecret` TEXT NULL,
    ADD COLUMN `whatsappMetaPhoneNumberId` VARCHAR(191) NULL,
    ADD COLUMN `whatsappMetaTemplateLanguage` VARCHAR(191) NOT NULL DEFAULT 'pt_BR',
    ADD COLUMN `whatsappMetaTemplateName` VARCHAR(191) NULL,
    ADD COLUMN `whatsappMetaVerifyToken` VARCHAR(191) NULL,
    ADD COLUMN `whatsappMetaWabaId` VARCHAR(191) NULL,
    MODIFY `smtpPass` TEXT NULL,
    MODIFY `whatsappApiToken` TEXT NULL;
