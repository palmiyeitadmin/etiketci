import Image from "next/image";

/** The Palmiye logo in the colour that reads on the current theme. */
export function BrandLogo({ width, height, className = "", priority = false }: { width: number; height: number; className?: string; priority?: boolean }) {
    return (
        <>
            <Image src="/assets/palmiye_logo_dark.png" alt="Palmiye" width={width} height={height} priority={priority} className={`${className} dark:hidden`} />
            <Image src="/assets/palmiye_logo_white.png" alt="Palmiye" width={width} height={height} priority={priority} className={`${className} hidden dark:block`} />
        </>
    );
}
