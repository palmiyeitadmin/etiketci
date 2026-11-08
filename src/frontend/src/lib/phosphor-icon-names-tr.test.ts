import { describe, expect, it } from "vitest";
import { searchPhosphorIcons } from "@/lib/phosphor-icon-catalog";
import { phosphorIconManifest } from "@/lib/phosphor-icon-manifest";
import { turkishIconName, turkishIconNameSource } from "@/lib/phosphor-icon-names-tr";

// Letter-aware boundaries: \b would treat "ş" as a break and find "Bar" in "Barış".
const COMMON_ENGLISH = new RegExp(
  "(?<![A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû])(Arrow|Arrows|Circle|Square|Fill|Fat|Left|Right|Up|Down|Line|Lines|Simple|Plus|Minus|Book|Box|File|Folder|User|Users|Clock|Chart|Bar|Hand|Lock|Warning|Cloud|Sun|Moon|Rain|Snow|Wind|Star|Heart|Open|Slash|Half|Double|Dashed|Vertical|Horizontal|Text|Check|Caret|Dots|Number|Logo|Tool|Truck|Package|Ruler|House|Car)(?![A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû])",
  "i"
);

/** Words spelled the same in both languages, and abbreviations kept as they are. */
const SAME_IN_TURKISH = new Set([
  "atom", "bluetooth", "dna", "gif", "gps", "hamburger", "kanban", "lego", "metal", "onigiri", "park", "pi",
  "pizza", "poker", "robot", "rss", "siren", "sigma", "snowboard", "tablet", "usb", "video", "x", "z", "h", "p", "v",
  "a", "t", "b", "u", "yin", "yang", "tai", "chi", "git", "airplay", "c", "cpu", "android", "film", "golf", "medium", "vue",
]);

/** Words of a Turkish name that should be Turkish: abbreviations (PDF) and proper nouns (… Times) are left out. */
function translatableWords(name: string) {
  return name
    .split(/[^A-Za-zÇĞİÖŞÜçğıöşü0-9]+/)
    .filter(Boolean)
    .filter((word, index) => !(word.length > 1 && word === word.toUpperCase()) && !(index > 0 && /^[A-ZÇĞİÖŞÜ]/.test(word)))
    .map((word) => word.toLocaleLowerCase("tr"));
}

const keys = phosphorIconManifest.map((item) => item.key);

describe("turkishIconName", () => {
  it("names every manifest icon from the overrides or the dictionary", () => {
    const fallbacks = keys.filter((key) => turkishIconNameSource(key) === "fallback");
    expect(fallbacks).toEqual([]);
    for (const key of keys) {
      const name = turkishIconName(key);
      expect(name.trim().length, key).toBeGreaterThan(0);
      expect(name.charAt(0), key).toBe(name.charAt(0).toLocaleUpperCase("tr"));
    }
  });

  it("leaves no common English words untranslated", () => {
    const offenders = keys
      .filter((key) => !key.endsWith("Logo") && !key.includes("Logo"))
      .map((key) => `${key}: ${turkishIconName(key)}`)
      .filter((entry) => COMMON_ENGLISH.test(entry.split(": ")[1]));
    expect(offenders).toEqual([]);
  });

  it("does not reuse any English word of the icon's own name", () => {
    const offenders: string[] = [];
    for (const item of phosphorIconManifest) {
      if (item.key.includes("Logo")) continue;
      const english = new Set(item.label.toLowerCase().split(" "));
      const turkish = translatableWords(turkishIconName(item.key));
      const leftover = turkish.filter((word) => english.has(word) && !SAME_IN_TURKISH.has(word));
      if (leftover.length > 0) offenders.push(`${item.key}: ${turkishIconName(item.key)}`);
    }
    expect(offenders).toEqual([]);
  });

  it("keeps brands in logo names", () => {
    expect(turkishIconName("GithubLogo")).toBe("GitHub logosu");
    expect(turkishIconName("YoutubeLogo")).toBe("YouTube logosu");
    expect(turkishIconName("GitlabLogoSimple")).toBe("GitLab logosu (sade)");
  });

  it("gives every icon a different name", () => {
    const names = keys.map((key) => turkishIconName(key));
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    expect(duplicates).toEqual([]);
  });

  it("reads naturally for the icons labels use most", () => {
    expect(turkishIconName("Package")).toMatch(/^(Paket|Koli)$/);
    expect(turkishIconName("Warning")).toBe("Uyarı");
    expect(turkishIconName("Truck")).toBe("Kamyon");
    expect(turkishIconName("Ruler")).toBe("Cetvel");
    expect(turkishIconName("Sun")).toBe("Güneş");
    expect(turkishIconName("CloudRain")).toBe("Yağmurlu bulut");
    expect(turkishIconName("Snowflake")).toBe("Kar tanesi");
    expect(turkishIconName("Wind")).toBe("Rüzgâr");
    expect(turkishIconName("Recycle")).toBe("Geri dönüşüm");
    expect(turkishIconName("ArrowCircleDown")).toBe("Daire içinde aşağı ok");
    expect(turkishIconName("ArrowUpRight")).toBe("Sağ üst ok");
    expect(turkishIconName("CaretDoubleUp")).toBe("Çift yukarı ok ucu");
    expect(turkishIconName("WarningCircle")).toBe("Daire içinde uyarı");
    expect(turkishIconName("CalendarCheck")).toBe("Onaylı takvim");
    expect(turkishIconName("FolderSimpleLock")).toBe("Kilitli klasör (sade)");
    expect(turkishIconName("FilePdf")).toBe("PDF dosyası");
    expect(turkishIconName("NumberCircleThree")).toBe("Daire içinde 3");
    expect(turkishIconName("QrCode")).toBe("Karekod (QR)");
    expect(turkishIconName("House")).toBe("Ev");
  });
});

describe("Turkish icon name search", () => {
  const find = (query: string) => searchPhosphorIcons(query, { turkishNames: true }).map((item) => item.key);

  it("finds an icon by its Turkish name, ignoring case and diacritics", () => {
    expect(find("Yağmurlu bulut")).toContain("CloudRain");
    expect(find("yagmurlu")).toContain("CloudRain");
    expect(find("CETVEL")).toContain("Ruler");
    expect(find("tır")).toContain("TruckTrailer");
    expect(find("güneş paneli")).toContain("SolarPanel");
  });

  it("finds every icon by its full Turkish name", () => {
    const missing = keys.filter((key) => !find(turkishIconName(key)).includes(key as never));
    expect(missing).toEqual([]);
  });

  it("matches word starts only", () => {
    expect(find("ok")).toContain("ArrowDown");
    expect(find("ok")).not.toContain("Martini");
  });

  it("leaves English-only search unchanged", () => {
    expect(searchPhosphorIcons("dirsekli").map((item) => item.key)).toEqual([]);
    expect(find("dirsekli")).toContain("ArrowElbowLeft");
    expect(searchPhosphorIcons("ruler").map((item) => item.key)).toContain("Ruler");
  });
});
