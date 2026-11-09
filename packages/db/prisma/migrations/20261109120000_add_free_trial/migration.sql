-- New accounts start on a free trial that ends; before this, they got the
-- Essencial plan with a "trialing" subscription that never ended.
ALTER TABLE "Plan" ADD COLUMN "isTrial" BOOLEAN NOT NULL DEFAULT false;

-- The API keeps these rows up to date on start; they are created here too so
-- the accounts below can be moved onto them.
INSERT INTO "Plan" ("id", "name", "slug", "currency", "amountCents", "proposalsPerMonth", "isUnlimited", "isAnnual", "isTrial", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'Teste grátis', 'br-trial', 'BRL', 0, 10, false, false, true, now(), now()),
  (gen_random_uuid()::text, 'Free trial', 'us-trial', 'USD', 0, 10, false, false, true, now(), now())
ON CONFLICT ("slug") DO NOTHING;

-- Accounts that never paid through Stripe move to the trial in their currency,
-- with 14 days from today to choose a plan. Accounts with a paid subscription
-- keep their plan.
CREATE TEMP TABLE "_contas_sem_pagamento" AS
SELECT a."id" AS "accountId", trial."id" AS "trialPlanId"
FROM "Account" a
LEFT JOIN "Plan" atual ON atual."id" = a."currentPlanId"
JOIN "Plan" trial ON trial."slug" = CASE WHEN atual."currency" = 'USD' THEN 'us-trial' ELSE 'br-trial' END
WHERE NOT EXISTS (
  SELECT 1 FROM "Subscription" s
  WHERE s."accountId" = a."id"
    AND s."stripeSubscriptionId" IS NOT NULL
    AND s."status" IN ('active', 'trialing')
);

UPDATE "Account" a
SET "currentPlanId" = c."trialPlanId", "updatedAt" = now()
FROM "_contas_sem_pagamento" c
WHERE a."id" = c."accountId";

UPDATE "Subscription" s
SET "planId" = c."trialPlanId", "currentPeriodEnd" = now() + interval '14 days', "updatedAt" = now()
FROM "_contas_sem_pagamento" c
WHERE s."accountId" = c."accountId"
  AND s."stripeSubscriptionId" IS NULL
  AND s."status" = 'trialing';

INSERT INTO "Subscription" ("id", "accountId", "planId", "status", "currentPeriodEnd", "cancelAtPeriodEnd", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c."accountId", c."trialPlanId", 'trialing', now() + interval '14 days', false, now(), now()
FROM "_contas_sem_pagamento" c
WHERE NOT EXISTS (
  SELECT 1 FROM "Subscription" s
  WHERE s."accountId" = c."accountId" AND s."status" = 'trialing' AND s."stripeSubscriptionId" IS NULL
);

DROP TABLE "_contas_sem_pagamento";
