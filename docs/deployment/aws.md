# AWS Deployment Plan

This document captures the initial AWS layout for the Cota backend. Adjust as architecture evolves (Terraform/CDK recommended once requirements stabilize).

## Services
- **ECS Fargate** for API + worker tasks (separate services, same VPC).
- **Application Load Balancer** (public) exposing the API on HTTPS.
- **Amazon RDS (PostgreSQL 15)** for relational data.
- **Amazon ElastiCache (Redis 7)** for caching + BullMQ queues.
- **Amazon S3** for user uploads, proposal PDFs, static landing pages.
- **AWS Systems Manager Parameter Store / Secrets Manager** for secrets + configuration.
- **Amazon CloudWatch** for logs, metrics, and alarms.
- **Amazon ECR** for container registry.

## Networking
- VPC with at least 2 public subnets (ALB) and 2 private subnets (ECS tasks, RDS, ElastiCache).
- Security groups:
  - ALB SG allowing inbound 80/443, outbound to API SG.
  - API SG allowing inbound from ALB on 3333, outbound to RDS/Redis/S3.
  - Worker SG allowing outbound only (no inbound). Needs access to Redis, RDS, S3.
  - RDS SG allowing inbound from API/worker SGs.
  - Redis SG allowing inbound from API/worker SGs.

## Build & Release
1. Enable `corepack` + pnpm in CI runner.
2. Run checks: `pnpm install`, `pnpm lint`, `pnpm build`, `pnpm --filter @cota/db prisma generate`.
3. Build Docker images:
   ```bash
   docker build -f Dockerfile.api -t $ECR/api:$GIT_SHA .
   docker build -f Dockerfile.worker -t $ECR/worker:$GIT_SHA .
   ```
4. Push to ECR and update ECS service (via CodePipeline, GitHub Actions, etc.).

## Runtime configuration
Set via environment variables (Parameter Store):
- `DATABASE_URL`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `AWS_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `FRONTEND_BASE_URL`, `CDN_BASE_URL`
- `QUEUE_PREFIX`
- `PDF_RENDER_TIMEOUT_MS`

For production use IAM roles for tasks instead of static S3 keys when possible.

## Observability
- Enable CloudWatch log drivers on ECS task definitions.
- Configure metric filters (HTTP 5xx, queue depth via custom metrics).
- Set alarms for RDS connections, CPU/memory, queue failure rate.

## Disaster recovery
- Enable automated RDS backups + multi-AZ.
- Version S3 bucket + lifecycle policies.
- Consider cross-region replication for critical assets.

## Staging environment
Repeat stack in separate AWS account or isolated VPC. Use smaller instance sizes, separate RDS/Redis (can be single-AZ). Keep staging S3 bucket read-only from production.
