-- AlterTable
ALTER TABLE "RiskEvaluation" ADD COLUMN     "anomalyScore" DOUBLE PRECISION,
ADD COLUMN     "investigator" JSONB,
ADD COLUMN     "latencyMs" DOUBLE PRECISION,
ADD COLUMN     "mlScore" DOUBLE PRECISION,
ADD COLUMN     "policyScore" DOUBLE PRECISION;
