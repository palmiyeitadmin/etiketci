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

/** Left half of the login: what the product makes, shown as a real label on its liner. */
export function LoginShowcasePanel() {
    const { t } = useI18n();

    return (
        <section className="flex flex-col justify-center gap-10 px-2 py-10 lg:py-0">
            <div className="flex max-w-md flex-col gap-3">
                <h2 className="text-xl font-medium text-ink">{t("auth.login.showcaseTitle")}</h2>
                <p className="text-base text-ink-2">{t("auth.login.showcaseDescription")}</p>
            </div>

            <div className="rounded-2xl bg-[#eef2f0] px-10 py-14 sm:px-16">
                <LabelProof widthMm={60} heightMm={40} caption={t("auth.login.showcaseCaption")} className="mx-auto max-w-[360px]">
                    <div className="grid h-full grid-rows-[22%_1fr] font-sans text-[#111111]">
                        <div className="flex items-center bg-[#1f5d3a] px-[5%] text-[clamp(11px,2.4vw,15px)] font-semibold text-white">PALMİYE</div>
                        <div className="grid min-h-0 grid-cols-[1fr_auto] grid-rows-[auto_auto_1fr] gap-x-[5%] px-[5%] pb-[5%] pt-[4%]">
                            <div className="col-span-2 text-[clamp(11px,2.2vw,15px)] font-medium">Sızma zeytinyağı 500 ml</div>
                            <div className="col-span-2 font-mono text-[clamp(8px,1.5vw,10px)] text-[#444]">ZYT-0500-SZM</div>
                            <div className="mt-[4%] min-h-0"><SampleBarcode /></div>
                            <div className="mt-[4%] aspect-square h-full min-h-0"><SampleQr /></div>
                        </div>
                    </div>
                </LabelProof>
            </div>
        </section>
    );
}
