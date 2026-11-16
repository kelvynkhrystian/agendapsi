-- AlterTable
ALTER TABLE `AvailabilityException` ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `isYearlyRecurring` BOOLEAN NOT NULL DEFAULT false;
