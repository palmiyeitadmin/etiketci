"use client";

import { useI18n } from "@/lib/i18n";
import { LabelProof } from "@/components/ui/LabelProof";

/** Deterministic bar pattern so the sample barcode looks real without encoding anything. */
const BARS = [3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 1, 1, 3, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 1, 2, 2, 1, 3, 1, 1, 2];

function SampleBarcode() {
    let x = 0;
    const rects = BARS.map((width, index) => {
        const rect = index % 2 === 0 ? <rect key={index} x={x} y={0} width={width} height={40} /> : null;
        x += width;
        return rect;
    });
    return (
        <svg viewBox={`0 0 ${x} 40`} preserveAspectRatio="none" className="h-full w-full" aria-hidden>
            <g fill="#111111">{rects}</g>
        </svg>
    );
}

/** A 21×21 module pattern with the three finder squares, so it reads as a QR code (it encodes nothing). */
function SampleQr() {
    const size = 21;
    const cells: JSX.Element[] = [];
    const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
    let seed = 11;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            seed = (seed * 9301 + 49297) % 233280;
            if (!inFinder(x, y) && seed / 233280 > 0.5) {
                cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
            }
        }
    }
    const finder = (ox: number, oy: number) => (
        <g key={`${ox}-${oy}`}>
            <rect x={ox} y={oy} width={7} height={7} />
            <rect x={ox + 1} y={oy + 1} width={5} height={5} fill="#ffffff" />
            <rect x={ox + 2} y={oy + 2} width={3} height={3} />
        </g>
    );
    return (
        <svg viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className="h-full w-full" aria-hidden>
            <g fill="#111111">
                {cells}
                {finder(0, 0)}
                {finder(14, 0)}
                {finder(0, 14)}
            </g>
        </svg>
    );
}

/**
 * Left half of the login: what the product makes, shown as a real label on its liner. The sample is a
 * package label for a bioclimatic pergola profile, the kind of label Palmiye's factory prints. Sizes use
 * container units so the label keeps its proportions at any width.
 */
export function LoginShowcasePanel() {
    const { t } = useI18n();
    const facts: [string, string][] = [
        [t("auth.login.showcaseLength"), "4000 mm"],
        [t("auth.login.showcaseColor"), "RAL 7016"],
        [t("auth.login.showcaseQuantity"), "12"],
        [t("auth.login.showcasePackage"), "2 / 6"],
    ];

    return (
        <section className="flex flex-col justify-center gap-10 px-2 py-10 lg:py-0">
            <div className="flex max-w-md flex-col gap-3">
                <h2 className="text-xl font-medium text-ink">{t("auth.login.showcaseTitle")}</h2>
                <p className="text-base text-ink-2">{t("auth.login.showcaseDescription")}</p>
            </div>

            <div className="rounded-2xl bg-mat px-10 py-14 sm:px-16">
                <LabelProof widthMm={100} heightMm={70} caption={t("auth.login.showcaseCaption")} className="mx-auto max-w-[420px]">
                    <div className="flex h-full flex-col font-sans text-[#111111] [container-type:inline-size]">
                        <div className="flex items-center justify-between bg-[#fce300] px-[4.5cqw] py-[2.2cqw]">
                            <span className="text-[4.6cqw] font-semibold tracking-wide">PALMİYE</span>
                            <span className="font-mono text-[2.6cqw]">SP-2026-1148</span>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col gap-[2.2cqw] px-[4.5cqw] pb-[4cqw] pt-[3cqw]">
                            <div>
                                <div className="text-[5.2cqw] font-semibold leading-tight">Skyroof Prestige</div>
                                <div className="text-[3.1cqw] text-[#444]">{t("auth.login.showcaseProduct")}</div>
                            </div>
                            <dl className="grid grid-cols-4 border-y border-[#111111]/20 py-[1.6cqw]">
                                {facts.map(([label, value]) => (
                                    <div key={label} className="flex flex-col">
                                        <dt className="text-[2.3cqw] text-[#555]">{label}</dt>
                                        <dd className="text-[3.4cqw] font-medium">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                            <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto] gap-x-[4cqw]">
                                <div className="flex min-h-0 flex-col gap-[0.8cqw]">
                                    <div className="min-h-0 flex-1"><SampleBarcode /></div>
                                    <div className="text-center font-mono text-[2.5cqw] tracking-wider">SKY-PRS-LML-4000</div>
                                </div>
                                <div className="aspect-square h-full min-h-0"><SampleQr /></div>
                            </div>
                        </div>
                    </div>
                </LabelProof>
            </div>
        </section>
    );
}
