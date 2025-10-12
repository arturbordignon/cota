import Link from "next/link";

import {
  ArrowRight,
  CheckCircle,
  Lightning,
  MagicWand,
  MonitorPlay,
  Rocket,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

const navigation = [
  { name: "Features", href: "#features" },
  { name: "Workflow", href: "#workflow" },
  { name: "Testimonials", href: "#testimonials" },
  { name: "FAQ", href: "#faq" },
];

const features = [
  {
    name: "Automated Bilingual Proposals",
    description:
      "Generate polished documents in Portuguese and English with localized pricing tables, contracts, and compliance notes.",
    icon: MagicWand,
  },
  {
    name: "Crane Fleet Intelligence",
    description:
      "Pull live availability, capacity charts, and accessory requirements for every crane in your catalog.",
    icon: MonitorPlay,
  },
  {
    name: "Client-Centric Portal",
    description:
      "Share a branded, mobile-ready portal where clients can approve, request changes, and sign proposals instantly.",
    icon: UsersThree,
  },
  {
    name: "Operational Audit Trail",
    description:
      "Track every revision, collaborator comment, and approval step to keep internal controls audit-ready.",
    icon: Lightning,
  },
];

const workflow = [
  {
    title: "Capture Project Brief",
    body: "Start with a guided intake that collects project specs, crane classes, and compliance constraints in minutes.",
  },
  {
    title: "Generate Smart Proposal",
    body: "Crane Proposals drafts the bilingual document, inserts technical sheets, and preps pricing with recommended markups.",
  },
  {
    title: "Collaborate & Approve",
    body: "Operations, engineering, and finance review in-context, leaving threaded comments and flagging risks before sending.",
  },
  {
    title: "Deliver & Convert",
    body: "Clients receive an interactive experience with video walkthroughs, scope toggles, and e-signatures built in.",
  },
];

const metrics = [
  { label: "Proposal Speed", value: "4x faster" },
  { label: "Approval Rate Lift", value: "+37%" },
  { label: "Client Satisfaction", value: "9.4 / 10" },
  { label: "Engineering Hours Saved", value: "28 hrs / month" },
];

const testimonials = [
  {
    quote:
      "Our bid team now builds bilingual proposals before the site visit is even over. Clients love the video walkthrough and technical clarity.",
    author: "Mariana Lopes",
    role: "Commercial Director, Gruas Atlantico",
  },
  {
    quote:
      "Risk mitigation is visible in every proposal. The audit trail helped us pass a tough compliance review without scrambling for evidence.",
    author: "Daniel Freitas",
    role: "Head of Operations, Elevate Group",
  },
];

const faqs = [
  {
    question: "Can I embed my own videos in the proposal portal?",
    answer:
      "Yes. Upload walkthroughs or 3D crane simulations and they will appear alongside the technical scope, both on the client portal and the PDF export.",
  },
  {
    question: "Does it integrate with my CRM and ERP?",
    answer:
      "We provide native integrations with leading CRMs and ERPs used in heavy lifting. A REST API and Zapier connector cover any custom workflows.",
  },
  {
    question: "Is the platform compliant with regional safety standards?",
    answer:
      "Crane Proposals keeps templates aligned with NR-18, OSHA, and other regional standards. Compliance notes are localized based on the project location.",
  },
];

const demoVideoUrl = "https://www.youtube.com/embed/YlUKcNNmywk?rel=0&modestbranding=1";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative overflow-hidden bg-gradient-to-b from-[rgba(17,24,39,0.9)] via-[rgba(17,24,39,0.85)] to-[rgba(17,24,39,0.75)] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_80%_at_50%_0%,rgba(234,170,8,0.15),rgba(17,24,39,0.9))]" />

        <div className="container">
          <nav className="flex items-center justify-between py-6 text-sm font-medium uppercase tracking-wide text-white/80">
            <div className="flex items-center gap-2 text-white">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                <Rocket size={24} weight="duotone" />
              </span>
              <span className="text-lg font-semibold text-white">Crane Proposals</span>
            </div>
            <div className="hidden items-center gap-8 md:flex">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="transition-colors hover:text-white"
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="#pricing"
                className="hidden rounded-full border border-white/20 px-5 py-2 text-white/80 transition hover:border-white hover:text-white md:inline-flex"
              >
                Pricing
              </Link>
              <Link
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-ink transition hover:bg-primary/90"
              >
                Book a demo
                <ArrowRight size={18} weight="bold" />
              </Link>
            </div>
          </nav>
        </div>

        <section className="container pb-20 pt-10 text-white md:pt-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:items-center">
            <div className="space-y-8">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70">
                Heavy-lift proposals reimagined
              </p>
              <div className="space-y-4">
                <h1 className="text-balance font-display text-4xl leading-tight text-white md:text-5xl lg:text-6xl">
                  Turn crane expertise into cinematic proposals that win enterprise projects.
                </h1>
                <p className="max-w-xl text-lg text-white/80">
                  Showcase engineering confidence with bilingual proposals, embedded walkthrough
                  videos, and approval workflows designed for heavy industry. Crane Proposals keeps
                  your fleet booked and your clients impressed.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="#contact"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-ink transition hover:bg-primary/90"
                >
                  Schedule a live tour
                  <ArrowRight size={18} weight="bold" />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-semibold text-white/80 transition hover:border-white hover:text-white"
                >
                  Explore features
                </Link>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-white/60">
                {metrics.map((item) => (
                  <div key={item.label} className="flex flex-col">
                    <span className="text-lg font-semibold text-white">{item.value}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_30px_60px_-40px_rgba(17,24,39,0.9)]">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-white/10 mix-blend-screen" />
                <iframe
                  title="Crane Proposals demo video"
                  src={demoVideoUrl}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="absolute -bottom-10 left-6 hidden w-64 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-white backdrop-blur md:block">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/90 text-ink shadow-lg">
                    <MonitorPlay size={26} weight="duotone" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">Proposal Walkthrough</p>
                    <p className="text-xs uppercase tracking-wider text-white/60">
                      3 minute overview
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-white/70">
                  See how fast your team can move from project intake to a signed bilingual
                  proposal.
                </p>
              </div>
            </div>
          </div>
        </section>
      </header>

      <main className="flex-1">
        <section id="features" className="container space-y-16 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-semibold text-ink md:text-4xl">
              Built for the realities of heavy lifting proposals.
            </h2>
            <p className="mt-4 text-lg text-muted">
              A purpose-built workspace that combines operational rigor, engineering detail, and
              beautiful storytelling.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="surface-card relative overflow-hidden p-8 transition hover:-translate-y-1 hover:shadow-[0_25px_55px_-45px_rgba(17,24,39,0.9)]"
              >
                <feature.icon size={32} weight="duotone" className="text-primary" />
                <h3 className="mt-6 text-xl font-semibold text-ink">{feature.name}</h3>
                <p className="mt-3 text-muted">{feature.description}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                  Learn more
                  <ArrowRight size={16} weight="bold" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="bg-surface py-24">
          <div className="container space-y-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-balance text-3xl font-semibold text-ink md:text-4xl">
                  A guided workflow that keeps teams aligned.
                </h2>
                <p className="mt-4 text-lg text-muted">
                  Align commercial, engineering, and operations with a repeatable playbook for every
                  bid.
                </p>
              </div>
              <Link
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-6 py-3 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/10"
              >
                Talk to sales
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {workflow.map((step, index) => (
                <div key={step.title} className="surface-card flex flex-col gap-4 p-8">
                  <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-ink">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    Stage {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-ink">{step.title}</h3>
                  <p className="text-muted">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="surface-card p-10">
              <h2 className="text-balance text-3xl font-semibold text-ink md:text-4xl">
                Transform how your heavy-lift experts sell, collaborate, and execute.
              </h2>
              <ul className="mt-8 space-y-4 text-muted">
                {[
                  "Reusable proposal templates tuned by crane specialists.",
                  "One-click technical sheet insertion across your fleet.",
                  "Client-ready portal with dynamic scopes and e-signatures.",
                  "Analytics that spotlight conversion velocity and risk hotspots.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle size={22} weight="duotone" className="mt-1 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="#contact"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-ink transition hover:bg-primary/90"
                >
                  Book a strategy call
                  <ArrowRight size={18} weight="bold" />
                </Link>
                <Link
                  href="#pricing"
                  className="inline-flex items-center gap-2 rounded-full border border-outline px-6 py-3 font-semibold text-ink transition hover:border-primary hover:text-primary"
                >
                  View pricing
                </Link>
              </div>
            </div>
            <div className="surface-card flex flex-col justify-between gap-6 p-10">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-muted">Industry Impact</p>
                <h3 className="mt-3 text-2xl font-semibold text-ink">
                  Teams closing mega-projects with Crane Proposals
                </h3>
              </div>
              <dl className="grid gap-6">
                {metrics.map((metric) => (
                  <div key={metric.label}>
                    <dt className="text-sm uppercase tracking-[0.25em] text-muted">
                      {metric.label}
                    </dt>
                    <dd className="text-3xl font-semibold text-ink">{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section id="testimonials" className="bg-surface py-24">
          <div className="container space-y-12">
            <div className="max-w-2xl">
              <h2 className="text-balance text-3xl font-semibold text-ink md:text-4xl">
                Trusted by crane rental leaders and heavy-lift specialists.
              </h2>
              <p className="mt-4 text-lg text-muted">
                Hear how commercial teams translate technical expertise into faster wins.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {testimonials.map((testimonial) => (
                <blockquote
                  key={testimonial.author}
                  className="surface-card flex h-full flex-col p-8"
                >
                  <p className="text-lg text-ink">&ldquo;{testimonial.quote}&rdquo;</p>
                  <footer className="mt-6 text-sm text-muted">
                    <span className="font-semibold text-ink">{testimonial.author}</span> ·{" "}
                    {testimonial.role}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="container py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-semibold text-ink md:text-4xl">
              Flexible plans tailored to your fleet size.
            </h2>
            <p className="mt-4 text-lg text-muted">
              Start with a focused deployment or roll out cross-region with enterprise controls.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                name: "Growth",
                price: "$990",
                cadence: "per month",
                features: [
                  "Up to 10 team seats",
                  "Core proposal templates",
                  "Client portal & e-signatures",
                  "CRM sync",
                ],
                highlighted: false,
              },
              {
                name: "Scale",
                price: "$1,890",
                cadence: "per month",
                features: [
                  "Unlimited seats",
                  "Advanced automation & AI writing",
                  "Compliance workflows",
                  "Dedicated success manager",
                ],
                highlighted: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                cadence: "tailored engagement",
                features: [
                  "Multi-business unit rollouts",
                  "Private cloud & SSO",
                  "Custom integrations",
                  "White-glove onboarding",
                ],
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`surface-card flex flex-col gap-6 p-8 ${
                  plan.highlighted
                    ? "border-primary shadow-[0_22px_60px_-45px_rgba(17,24,39,0.8)]"
                    : ""
                }`}
              >
                <div>
                  <h3 className="text-xl font-semibold text-ink">{plan.name}</h3>
                  <p className="mt-2 text-sm uppercase tracking-[0.25em] text-muted">
                    {plan.cadence}
                  </p>
                </div>
                <div className="text-3xl font-semibold text-ink">{plan.price}</div>
                <ul className="space-y-3 text-sm text-muted">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle size={18} weight="duotone" className="mt-0.5 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="#contact"
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold transition ${
                    plan.highlighted
                      ? "bg-primary text-ink hover:bg-primary/90"
                      : "border border-outline text-ink hover:border-primary hover:text-primary"
                  }`}
                >
                  {plan.highlighted ? "Start with Scale" : "Talk to us"}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="bg-surface py-24">
          <div className="container grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
            <div>
              <h2 className="text-balance text-3xl font-semibold text-ink md:text-4xl">
                Frequently asked questions.
              </h2>
              <p className="mt-4 text-lg text-muted">
                Everything you want to know about launching Crane Proposals in your organization.
              </p>
            </div>
            <dl className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.question} className="surface-card p-6">
                  <dt className="text-lg font-semibold text-ink">{faq.question}</dt>
                  <dd className="mt-3 text-muted">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer
        id="contact"
        className="relative overflow-hidden bg-gradient-to-br from-ink via-[#111928] to-[#1f2937] py-20 text-white"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_20%,rgba(234,170,8,0.25),rgba(15,23,42,0.9))]" />
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="space-y-6">
              <h2 className="text-balance text-3xl font-semibold text-white md:text-4xl">
                Ready to deliver proposals your clients can&apos;t ignore?
              </h2>
              <p className="text-lg text-white/70">
                Send us your next bid scenario and we&apos;ll craft a bespoke demo highlighting the
                Crane Proposals workflow end-to-end.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="mailto:hello@craneproposals.com"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-ink transition hover:bg-primary/90"
                >
                  hello@craneproposals.com
                </Link>
                <Link
                  href="#"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 font-semibold text-white/80 transition hover:border-white hover:text-white"
                >
                  Download one-pager
                </Link>
              </div>
            </div>
            <div className="surface-card space-y-6 rounded-3xl bg-white/5 p-8 text-white shadow-[0_20px_70px_-50px_rgba(17,24,39,1)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-ink">
                  <UsersThree size={28} weight="duotone" />
                </span>
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-white/70">Talk with us</p>
                  <p className="text-lg font-semibold text-white">
                    Schedule your blueprint session
                  </p>
                </div>
              </div>
              <p className="text-white/70">
                We&apos;ll audit your current proposal workflow, map integrations, and build a
                tailored rollout plan in under a week.
              </p>
              <Link
                href="#"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
              >
                Pick a time
                <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-4 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
            <p>&copy; {new Date().getFullYear()} Crane Proposals. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-white">
                Privacy
              </Link>
              <Link href="#" className="hover:text-white">
                Terms
              </Link>
              <Link href="#" className="hover:text-white">
                Security
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
