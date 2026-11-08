import { defineMessages } from "../define";

/** Shared UI texts: confirm dialog, role guard, global search palette. */
export default defineMessages(
    {
        tr: {
            confirm: {
                working: "İşleniyor",
                cancel: "Vazgeç",
            },
            accessDenied: {
                title: "Bu sayfaya erişim yetkiniz yok",
                body: "Erişime ihtiyacınız varsa sistem yöneticinize başvurun.",
                back: "Panele dön",
            },
            search: {
                label: "Ara",
                placeholder: "Ara",
                searching: "Aranıyor",
                results: (n: number) => `${n} sonuç`,
                noResults: "Sonuç bulunamadı",
                move: "gezin",
                open: "aç",
                close: "kapat",
                // The search API answers in English; these tables give the UI its own words.
                groups: {
                    pages: "Sayfalar",
                    templates: "Şablonlar",
                    products: "Ürünler",
                    printintents: "Baskı talepleri",
                    users: "Kullanıcılar",
                    roles: "Roller",
                },
                types: {
                    page: "sayfa",
                    template: "şablon",
                    product: "ürün",
                    "print-intent": "baskı",
                    user: "kullanıcı",
                    role: "rol",
                },
                /** Page results keyed by href. */
                pages: {
                    "/": { label: "Panel", description: "Genel durum" },
                    "/products": { label: "Ürünler", description: "Ürün kataloğu" },
                    "/templates": { label: "Şablonlar", description: "Etiket şablonları ve sürümleri" },
                    "/print-intents": { label: "Baskı talepleri", description: "Baskı kuyruğu" },
                    "/approvals": { label: "Onaylar", description: "Onay bekleyen sürümler" },
                    "/admin/users": { label: "Kullanıcılar", description: "Kullanıcı yönetimi" },
                    "/admin/roles": { label: "Roller", description: "Rol ve yetki yönetimi" },
                    "/content-library": { label: "Kütüphane", description: "Şablon görselleri" },
                },
            },
        },
    },
    {
        confirm: {
            working: "Working",
            cancel: "Cancel",
        },
        accessDenied: {
            title: "You do not have access to this page",
            body: "Ask your system administrator if you need access.",
            back: "Back to dashboard",
        },
        search: {
            label: "Search",
            placeholder: "Search",
            searching: "Searching",
            results: (n: number) => `${n} ${n === 1 ? "result" : "results"}`,
            noResults: "No results",
            move: "move",
            open: "open",
            close: "close",
            groups: {
                pages: "Pages",
                templates: "Templates",
                products: "Products",
                printintents: "Print requests",
                users: "Users",
                roles: "Roles",
            },
            types: {
                page: "page",
                template: "template",
                product: "product",
                "print-intent": "print",
                user: "user",
                role: "role",
            },
            pages: {
                "/": { label: "Dashboard", description: "Overview" },
                "/products": { label: "Products", description: "Product catalog" },
                "/templates": { label: "Templates", description: "Label templates and versions" },
                "/print-intents": { label: "Print requests", description: "Print queue" },
                "/approvals": { label: "Approvals", description: "Versions waiting for review" },
                "/admin/users": { label: "Users", description: "User management" },
                "/admin/roles": { label: "Roles", description: "Roles and permissions" },
                "/content-library": { label: "Library", description: "Template images" },
            },
        },
    },
);
