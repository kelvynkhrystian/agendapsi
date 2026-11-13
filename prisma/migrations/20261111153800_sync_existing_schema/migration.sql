-- AlterTable
ALTER TABLE `LegalPage` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `publishedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `NotificationDelivery` ADD COLUMN `acceptedAt` DATETIME(3) NULL,
    ADD COLUMN `attemptCount` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `attemptedAt` DATETIME(3) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `deliveredAt` DATETIME(3) NULL,
    ADD COLUMN `errorCode` VARCHAR(191) NULL,
    ADD COLUMN `failedAt` DATETIME(3) NULL,
    ADD COLUMN `maskedRecipient` VARCHAR(191) NULL,
    ADD COLUMN `messageType` VARCHAR(191) NULL,
    ADD COLUMN `metadataJson` TEXT NULL,
    ADD COLUMN `provider` VARCHAR(191) NULL DEFAULT 'SYSTEM',
    ADD COLUMN `providerMessageId` VARCHAR(191) NULL,
    ADD COLUMN `recipientReference` VARCHAR(191) NULL,
    ADD COLUMN `relatedAppointmentId` VARCHAR(191) NULL,
    ADD COLUMN `sanitizedErrorMessage` TEXT NULL,
    ADD COLUMN `subjectOrCategory` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `errorDetails` TEXT NULL;

-- AlterTable
ALTER TABLE `ProfessionalProfile` ADD COLUMN `displayName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SiteSettings` ADD COLUMN `aboutAutoplay` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `aboutFps` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `aboutFrameCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `aboutFramesJson` MEDIUMTEXT NULL,
    ADD COLUMN `aboutLoop` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `aboutMediaType` VARCHAR(191) NOT NULL DEFAULT 'IMAGE',
    ADD COLUMN `aboutMediaUrl` TEXT NULL,
    ADD COLUMN `aboutPlaybackDirection` VARCHAR(191) NOT NULL DEFAULT 'FORWARD',
    ADD COLUMN `aboutPlaybackMode` VARCHAR(191) NOT NULL DEFAULT 'AUTOMATIC',
    ADD COLUMN `aboutPlaybackSpeed` DOUBLE NOT NULL DEFAULT 1,
    ADD COLUMN `aboutPositioning` VARCHAR(191) NOT NULL DEFAULT 'center',
    ADD COLUMN `aboutPosterUrl` TEXT NULL,
    ADD COLUMN `accentColor` VARCHAR(191) NULL DEFAULT '#f59e0b',
    ADD COLUMN `addressCity` VARCHAR(191) NULL,
    ADD COLUMN `addressComplement` VARCHAR(191) NULL,
    ADD COLUMN `addressNeighborhood` VARCHAR(191) NULL,
    ADD COLUMN `addressNumber` VARCHAR(191) NULL,
    ADD COLUMN `addressPostalCode` VARCHAR(191) NULL,
    ADD COLUMN `addressState` VARCHAR(191) NULL,
    ADD COLUMN `backgroundColor` VARCHAR(191) NULL DEFAULT '#f8fafc',
    ADD COLUMN `benefitsJson` MEDIUMTEXT NULL,
    ADD COLUMN `buttonColor` VARCHAR(191) NULL DEFAULT '#0d9488',
    ADD COLUMN `faviconUrl` VARCHAR(191) NULL,
    ADD COLUMN `googleMapsEmbedUrl` TEXT NULL,
    ADD COLUMN `googleMapsUrl` TEXT NULL,
    ADD COLUMN `heroAutoplay` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `heroBgCustomColor` VARCHAR(191) NULL,
    ADD COLUMN `heroBgDetectedColor` VARCHAR(191) NULL,
    ADD COLUMN `heroBgMediaRef` TEXT NULL,
    ADD COLUMN `heroBgMode` VARCHAR(191) NOT NULL DEFAULT 'AUTO',
    ADD COLUMN `heroBgStatus` VARCHAR(191) NOT NULL DEFAULT 'IDLE',
    ADD COLUMN `heroFps` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `heroFrameCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `heroFramesJson` MEDIUMTEXT NULL,
    ADD COLUMN `heroLoop` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `heroMediaType` VARCHAR(191) NOT NULL DEFAULT 'IMAGE',
    ADD COLUMN `heroMediaUrl` TEXT NULL,
    ADD COLUMN `heroMobileAutoplay` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `heroMobileBgDetectedColor` VARCHAR(191) NULL,
    ADD COLUMN `heroMobileBgMediaRef` TEXT NULL,
    ADD COLUMN `heroMobileBgStatus` VARCHAR(191) NOT NULL DEFAULT 'IDLE',
    ADD COLUMN `heroMobileFps` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `heroMobileFrameCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `heroMobileFramesJson` MEDIUMTEXT NULL,
    ADD COLUMN `heroMobileLoop` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `heroMobileMediaType` VARCHAR(191) NOT NULL DEFAULT 'IMAGE',
    ADD COLUMN `heroMobileMediaUrl` TEXT NULL,
    ADD COLUMN `heroMobilePlaybackDirection` VARCHAR(191) NOT NULL DEFAULT 'FORWARD',
    ADD COLUMN `heroMobilePlaybackMode` VARCHAR(191) NOT NULL DEFAULT 'AUTOMATIC',
    ADD COLUMN `heroMobilePlaybackSpeed` DOUBLE NOT NULL DEFAULT 1,
    ADD COLUMN `heroMobilePositioning` VARCHAR(191) NOT NULL DEFAULT 'center',
    ADD COLUMN `heroMobilePosterUrl` TEXT NULL,
    ADD COLUMN `heroPlaybackDirection` VARCHAR(191) NOT NULL DEFAULT 'FORWARD',
    ADD COLUMN `heroPlaybackMode` VARCHAR(191) NOT NULL DEFAULT 'AUTOMATIC',
    ADD COLUMN `heroPlaybackSpeed` DOUBLE NOT NULL DEFAULT 1,
    ADD COLUMN `heroPositioning` VARCHAR(191) NOT NULL DEFAULT 'center',
    ADD COLUMN `heroPosterUrl` TEXT NULL,
    ADD COLUMN `logoHorizontalUrl` VARCHAR(191) NULL,
    ADD COLUMN `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#0f766e',
    ADD COLUMN `sectionsConfigJson` MEDIUMTEXT NULL,
    ADD COLUMN `showFloatingWhatsApp` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showLocation` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `textColor` VARCHAR(191) NULL DEFAULT '#0f172a',
    ADD COLUMN `themeName` VARCHAR(191) NOT NULL DEFAULT 'VERDE',
    ADD COLUMN `whatsappDefaultMessage` TEXT NULL;

-- AlterTable
ALTER TABLE `StoredFile` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `title` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `StoredFileShare` ADD COLUMN `revokedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `SystemSettings` ADD COLUMN `defaultBufferMinutes` INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN `defaultConfirmationPolicy` ENUM('AUTOMATIC', 'UPON_PAYMENT', 'MANUAL_ADMIN', 'PAYMENT_AND_ADMIN') NOT NULL DEFAULT 'AUTOMATIC',
    ADD COLUMN `defaultModality` ENUM('PRESENTIAL', 'ONLINE', 'BOTH') NOT NULL DEFAULT 'BOTH',
    ADD COLUMN `googleMeetAccessToken` TEXT NULL,
    ADD COLUMN `googleMeetAccountEmail` VARCHAR(191) NULL,
    ADD COLUMN `googleMeetClientId` VARCHAR(191) NULL,
    ADD COLUMN `googleMeetClientSecret` VARCHAR(191) NULL,
    ADD COLUMN `googleMeetConnectedAt` DATETIME(3) NULL,
    ADD COLUMN `googleMeetRefreshToken` TEXT NULL,
    ADD COLUMN `googleMeetStatus` VARCHAR(191) NULL,
    ADD COLUMN `googleMeetTokenExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `peerJsLastTestedAt` DATETIME(3) NULL,
    ADD COLUMN `peerJsPath` VARCHAR(191) NULL DEFAULT '/peerjs',
    ADD COLUMN `peerJsSecure` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `peerJsServerHost` VARCHAR(191) NULL,
    ADD COLUMN `peerJsServerPort` INTEGER NULL,
    ADD COLUMN `peerJsStunServer` VARCHAR(191) NULL,
    ADD COLUMN `peerJsTestStatus` VARCHAR(191) NULL,
    ADD COLUMN `peerJsTurnSecret` VARCHAR(191) NULL,
    ADD COLUMN `peerJsTurnServer` VARCHAR(191) NULL,
    ADD COLUMN `peerJsTurnUser` VARCHAR(191) NULL,
    ADD COLUMN `smtpEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `smtpEncryption` VARCHAR(191) NOT NULL DEFAULT 'TLS',
    ADD COLUMN `smtpSenderName` VARCHAR(191) NULL,
    ADD COLUMN `whatsappEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `whatsappInstanceId` VARCHAR(191) NULL,
    ADD COLUMN `whatsappProvider` VARCHAR(191) NOT NULL DEFAULT 'GENERIC',
    ADD COLUMN `whatsappSenderNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `VideoMeeting` ADD COLUMN `calendarEventId` VARCHAR(191) NULL,
    ADD COLUMN `conferenceUrl` TEXT NULL;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NOT NULL,
    `recipientRole` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `targetUrl` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `relatedEntityType` VARCHAR(191) NULL,
    `relatedEntityId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_recipientId_createdAt_idx`(`recipientId` ASC, `createdAt` ASC),
    INDEX `Notification_recipientId_isRead_idx`(`recipientId` ASC, `isRead` ASC),
    INDEX `Notification_recipientRole_isRead_idx`(`recipientRole` ASC, `isRead` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PatientEmailChangeToken` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `oldEmail` VARCHAR(191) NOT NULL,
    `newEmail` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PatientEmailChangeToken_patientId_idx`(`patientId` ASC),
    INDEX `PatientEmailChangeToken_tokenHash_idx`(`tokenHash` ASC),
    UNIQUE INDEX `PatientEmailChangeToken_tokenHash_key`(`tokenHash` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SharedNotificationTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `deliveryMode` VARCHAR(191) NOT NULL DEFAULT 'APP_ONLY',
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SharedNotificationTemplate_eventType_key`(`eventType` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `NotificationDelivery_channel_status_idx` ON `NotificationDelivery`(`channel` ASC, `status` ASC);

-- CreateIndex
CREATE INDEX `NotificationDelivery_createdAt_idx` ON `NotificationDelivery`(`createdAt` ASC);

-- CreateIndex
CREATE INDEX `NotificationDelivery_relatedAppointmentId_idx` ON `NotificationDelivery`(`relatedAppointmentId` ASC);

-- CreateIndex
CREATE INDEX `NotificationDelivery_sentAt_idx` ON `NotificationDelivery`(`sentAt` ASC);

-- AddForeignKey
ALTER TABLE `PatientEmailChangeToken` ADD CONSTRAINT `PatientEmailChangeToken_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
