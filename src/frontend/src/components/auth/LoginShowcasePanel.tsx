"use client";

import Image from "next/image";
import { FlowArrow, Printer, SealCheck, Stack } from "@phosphor-icons/react";
import { useI18n } from "@/lib/i18n";

const showcasePointConfig = [
    {
        key: "templates",
        icon: Stack,
        tone: "from-blue-500/20 to-blue-400/5 text-blue-100",
    },
    {
        key: "approvals",
        icon: SealCheck,
        tone: "from-emerald-500/20 to-emerald-400/5 text-emerald-100",
    },
    {
        key: "print",
        icon: Printer,
        tone: "from-amber-500/20 to-amber-400/5 text-amber-100",
    },
] as const;

export function LoginShowcasePanel() {
    const { t } = useI18n();

    return (
        <section className="relative hidden min-h-[680px] overflow-hidden rounded-[2.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_28%),linear-gradient(180deg,#081120_0%,#0d1a2c_100%)] p-8 shadow-[0_30px_120px_rgba(2,6,23,0.45)] lg:flex lg:flex-col xl:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:76px_76px] opacity-[0.08]" />
            <div className="pointer-events-none absolute -left-12 top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl animate-plms-pulse-soft" />
            <div className="pointer-events-none absolute bottom-8 right-8 h-40 w-40 rounded-full border border-white/10 animate-plms-orbit-drift" />
            <div className="pointer-events-none absolute right-20 top-20 h-20 w-20 rounded-full border border-blue-300/20 bg-white/5 animate-plms-float" />

            <div className="relative z-10 flex h-full flex-col">
                <div className="max-w-xl space-y-6">
                    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-blue-100/80">
                        {t("auth.login.showcaseEyebrow")}
                    </div>

                    <div className="relative h-12 w-44">
                        <Image
                            src="/assets/palmiye_logo_white.png"
                            alt={t("shell.title")}
                            fill
                            sizes="176px"
                            className="object-contain object-left"
                            priority
                        />
                    </div>

                    <div className="space-y-4">
                        <h2 className="max-w-lg text-5xl font-black tracking-[-0.07em] text-white">
                            {t("auth.login.showcaseTitle")}
                        </h2>
                        <p className="max-w-xl text-base font-medium leading-7 text-slate-300">
                            {t("auth.login.showcaseDescription")}
                        </p>
                    </div>
                </div>

                <div className="relative mt-10 grid gap-4 xl:grid-cols-3">
                    {showcasePointConfig.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <article
                                key={item.key}
                                className="animate-plms-fade-up rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
                                style={{ animationDelay: `${index * 120}ms` }}
                            >
                                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone}`}>
                                    <Icon size={22} weight="duotone" />
                                </div>
                                <div className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-white">
                                    {t(`auth.login.showcasePoint${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}Title`)}
                                </div>
                                <p className="mt-3 text-sm font-medium leading-6 text-slate-300">
                                    {t(`auth.login.showcasePoint${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}Body`)}
                                </p>
                            </article>
                        );
                    })}
                </div>

                <div className="relative mt-auto pt-10">
                    <div className="animate-plms-float rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-6 shadow-[0_22px_70px_rgba(15,23,42,0.28)] backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                                    {t("auth.login.showcaseSignalLabel")}
                                </div>
                                <div className="mt-3 text-2xl font-black tracking-[-0.05em] text-white">
                                    {t("auth.login.showcaseSignalValue")}
                                </div>
                            </div>
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-blue-500/10 text-blue-100">
                                <FlowArrow size={24} weight="duotone" />
                            </div>
                        </div>
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">
                                {t("auth.login.showcaseSignalTemplates")}
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">
                                {t("auth.login.showcaseSignalApprovals")}
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-200">
                                {t("auth.login.showcaseSignalPrint")}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
