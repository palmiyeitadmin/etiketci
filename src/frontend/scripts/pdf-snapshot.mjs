#!/usr/bin/env node
/**
 * Downloads a label PDF from the API and turns every page into a PNG, so you can see what will be printed
 * without a browser PDF viewer (headless browsers cannot show PDFs in an iframe).
 *
 * Usage:
 *   node scripts/pdf-snapshot.mjs --template <id> --version <id> [--product <id>] [--out <dir>]
 *   node scripts/pdf-snapshot.mjs --intent <id> [--out <dir>]          (the PDF of a print request)
 *
 * Environment:
 *   PLMS_API_URL       backend base URL           (default http://127.0.0.1:8080)
 *   PLMS_EMAIL         user to sign in with       (default admin@plms.local)
 *   PLMS_PASSWORD      password                   (required unless the default dev password works)
 *
 * Needs poppler-utils (pdftoppm, pdfinfo). Prints the page count, page size in mm and the PNG paths.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 2) {
        if (!argv[i]?.startsWith("--")) throw new Error(`Unexpected argument: ${argv[i]}`);
        args[argv[i].slice(2)] = argv[i + 1];
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));
const api = (process.env.PLMS_API_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const email = process.env.PLMS_EMAIL || "admin@plms.local";
const password = process.env.PLMS_PASSWORD || "Admin123!";
const outDir = resolve(args.out || "pdf-snapshot");

let path;
if (args.intent) {
    path = `/api/PrintIntents/${args.intent}/pdf`;
} else if (args.template && args.version) {
    path = `/api/Templates/${args.template}/versions/${args.version}/preview${args.product ? `?productId=${args.product}` : ""}`;
} else {
    console.error("Give --intent <id>, or --template <id> --version <id> [--product <id>].");
    process.exit(2);
}

const login = await fetch(`${api}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
});
const loginBody = await login.json().catch(() => ({}));
const token = loginBody?.data?.token;
if (!login.ok || !token) {
    console.error(`Sign-in failed (${login.status}). Set PLMS_EMAIL / PLMS_PASSWORD.`);
    process.exit(1);
}

const response = await fetch(`${api}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" } });
if (!response.ok) {
    console.error(`PDF request failed (${response.status}): ${await response.text()}`);
    process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const pdfPath = join(outDir, "label.pdf");
writeFileSync(pdfPath, Buffer.from(await response.arrayBuffer()));

const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
const pages = Number(/^Pages:\s+(\d+)/m.exec(info)?.[1] ?? 0);
const size = /^Page size:\s+([\d.]+) x ([\d.]+) pts/m.exec(info);
const toMm = (pt) => (Number(pt) * 25.4 / 72).toFixed(1);

execFileSync("pdftoppm", ["-r", "200", "-png", pdfPath, join(outDir, "page")]);

console.log(`PDF:   ${pdfPath}`);
console.log(`Pages: ${pages}`);
if (size) console.log(`Size:  ${toMm(size[1])} × ${toMm(size[2])} mm`);
console.log(`PNG:   ${join(outDir, "page-*.png")}`);
