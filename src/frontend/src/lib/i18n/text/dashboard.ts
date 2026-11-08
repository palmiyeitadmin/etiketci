import { defineMessages } from "../define";

const trNumber = (n: number) => n.toLocaleString("tr-TR");
const enNumber = (n: number) => n.toLocaleString("en-US");

/** Dashboard, operational pulse and dashboard feed texts. */
export default defineMessages(
    {
        tr: {
            home: {
                title: "Panel",
                loading: "Panel yükleniyor",
                newPrint: "Baskı talebi oluştur",
                newTemplate: "Yeni şablon",
                printedToday: "Bugün basılan etiket",
                vsYesterday: (diff: number) => diff === 0 ? "Dünle aynı" : `Düne göre ${diff > 0 ? "+" : "−"}${trNumber(Math.abs(diff))}`,
                awaitingOutcome: "Sonucu bekleyen baskı",
                awaitingHint: (count: number) => count > 0 ? "Operatörün sonucu girmesi gerekiyor" : "Bekleyen yok",
                openRequests: "Açık baskı talebi",
                openHint: "Henüz PDF'i açılmamış talepler",
                pendingApprovals: "Onay bekleyen sürüm",
                approvalsHint: (count: number) => count > 0 ? "Onaylar sayfasında" : "Bekleyen yok",
                chartTitle: "Basılan etiketler",
                chartSubtitle: "Son 14 gün, bugün vurgulu",
                chartTotal: (total: number) => `Toplam ${trNumber(total)} etiket`,
                labels: "etiket",
                jobs: "baskı",
                failed: "hatalı",
                favorites: "Favori şablonlar",
                noFavorites: "Şablon listesinde yıldızladığınız şablonlar burada görünür.",
                recentTemplates: "Son değişen şablonlar",
                recentActivity: "Son işlemler",
            },
            /** Subtitles of audit items in the dashboard feed (lib/dashboard-feed.ts). */
            feed: {
                draftSaved: "Taslak değişiklikleri kaydedildi",
                layoutUpdated: "yerleşim güncellendi",
                notesUpdated: "notlar güncellendi",
                draftSavedAgain: (version: string) => `Taslak v${version} tekrar kaydedildi`,
                draftChanged: (version: string, changes: string[]) => `Taslak v${version}: ${changes.join(" ve ")}`,
            },
        },
    },
    {
        home: {
            title: "Dashboard",
            loading: "Loading dashboard",
            newPrint: "New print request",
            newTemplate: "New template",
            printedToday: "Labels printed today",
            vsYesterday: (diff: number) => diff === 0 ? "Same as yesterday" : `${diff > 0 ? "+" : "−"}${enNumber(Math.abs(diff))} vs yesterday`,
            awaitingOutcome: "Prints awaiting outcome",
            awaitingHint: (count: number) => count > 0 ? "An operator needs to record the result" : "None waiting",
            openRequests: "Open print requests",
            openHint: "Requests whose PDF has not been opened yet",
            pendingApprovals: "Versions awaiting approval",
            approvalsHint: (count: number) => count > 0 ? "See the approvals page" : "None waiting",
            chartTitle: "Labels printed",
            chartSubtitle: "Last 14 days, today highlighted",
            chartTotal: (total: number) => `${enNumber(total)} labels in total`,
            labels: "labels",
            jobs: "prints",
            failed: "failed",
            favorites: "Favorite templates",
            noFavorites: "Templates you star in the template list appear here.",
            recentTemplates: "Recently changed templates",
            recentActivity: "Recent activity",
        },
        feed: {
            draftSaved: "Draft changes were saved",
            layoutUpdated: "layout updated",
            notesUpdated: "notes updated",
            draftSavedAgain: (version: string) => `Draft v${version} was saved again`,
            draftChanged: (version: string, changes: string[]) => `Draft v${version}: ${changes.join(" and ")}`,
        },
    },
);
