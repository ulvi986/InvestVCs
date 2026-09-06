// InvestVCS Screener.
//
// Reads the page you are on, asks the analyst service whether the company on it
// is worth the full analysis, and hands it over if you say so.
//
// The page text is extracted in the tab rather than fetched again from here:
// the rendered DOM is what a person is actually looking at, and refetching the
// URL would miss anything client-rendered and would fail on anything behind a
// login.

const DEFAULTS = {
  service: "https://investvcs-analyst.onrender.com",
  app: "https://investvcs.vercel.app",
};

/** A page is mostly navigation and footer. Extracted in the tab, so it has to
 *  be self-contained: this function is serialised and injected. */
function extractPageText() {
  const drop = ["script", "style", "noscript", "svg", "iframe", "nav", "footer", "form"];
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll(drop.join(",")).forEach((node) => node.remove());

  // Prefer the main content when the page marks it, since that is where a
  // company actually describes itself.
  const main = clone.querySelector("main, article, [role='main']") || clone;

  return {
    title: document.title || "",
    text: (main.innerText || main.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40000),
  };
}

const el = (id) => document.getElementById(id);
const show = (id) => {
  ["idle", "working", "result", "error"].forEach((name) => {
    el(name).hidden = name !== id;
  });
};

const settings = {
  async load() {
    const stored = await chrome.storage.sync.get(DEFAULTS);
    return { service: stored.service || DEFAULTS.service, app: stored.app || DEFAULTS.app };
  },
  async save(values) {
    await chrome.storage.sync.set(values);
  },
};

const trimSlash = (value) => (value || "").trim().replace(/\/+$/, "");

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function renderList(listId, blockId, items) {
  const list = el(listId);
  list.replaceChildren();
  const values = (items || []).filter((item) => String(item || "").trim());
  values.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
  el(blockId).hidden = values.length === 0;
}

let lastBriefId = null;

function renderResult(result) {
  lastBriefId = result.briefId || null;

  const worth = Boolean(result.worthFullAnalysis);
  const verdict = el("verdict");
  verdict.textContent = worth ? "Worth a full analysis" : "Not yet worth a full analysis";
  verdict.className = `verdict ${worth ? "yes" : "no"}`;

  el("company").textContent = result.company || "Company not named on this page";
  el("one-liner").textContent = result.oneLiner || "";

  const stage = (result.stage || "unclear").replace(/_/g, " ");
  el("stage").textContent = stage;
  el("stage").title = result.stageReason || "";

  // A percentage reads as more precise than the number deserves, so it is
  // banded instead.
  const quality = Number(result.evidenceQuality);
  el("evidence").textContent = Number.isFinite(quality)
    ? quality >= 0.66 ? "strong" : quality >= 0.33 ? "mixed" : "thin"
    : "unknown";

  renderList("signals", "signals-block", result.signals);
  renderList("flags", "flags-block", result.flags);

  el("recommendation").textContent = result.recommendation || "";
  el("full").hidden = !lastBriefId;

  show("result");
}

function fail(message) {
  el("error-text").textContent = message;
  show("error");
}

async function runScreen() {
  show("working");

  const { service } = await settings.load();
  const base = trimSlash(service);
  if (!base) return fail("Set the analyst service address in Settings first.");

  const tab = await activeTab();
  if (!tab?.id || !/^https?:/.test(tab.url || "")) {
    return fail("Open a company's website and try again. Browser pages cannot be screened.");
  }

  let extracted;
  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageText,
    });
    extracted = injected?.result;
  } catch {
    return fail("This page did not allow its text to be read. Some sites block that.");
  }

  if (!extracted || extracted.text.length < 200) {
    return fail("There is too little text on this page to screen. Try the home or product page.");
  }

  let response;
  try {
    response = await fetch(`${base}/screen`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: tab.url, title: extracted.title, text: extracted.text }),
    });
  } catch {
    return fail(`Could not reach the analyst service at ${base}. Check the address and that it is running.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return fail(`The service returned ${response.status} with no readable body.`);
  }

  if (payload.error) return fail(payload.error);
  if (!response.ok) return fail(`The service returned ${response.status}.`);

  renderResult(payload);
}

async function openFullAnalysis() {
  if (!lastBriefId) return;
  const { app } = await settings.load();
  // The brief is collected by id: the page text is far too large for a URL.
  await chrome.tabs.create({ url: `${trimSlash(app)}/workflow?brief=${encodeURIComponent(lastBriefId)}` });
}

async function init() {
  const stored = await settings.load();
  el("service").value = stored.service;
  el("app").value = stored.app;

  const tab = await activeTab();
  try {
    el("page-host").textContent = new URL(tab?.url || "").hostname;
  } catch {
    el("page-host").textContent = "";
  }

  el("screen").addEventListener("click", runScreen);
  el("retry").addEventListener("click", runScreen);
  el("again").addEventListener("click", runScreen);
  el("full").addEventListener("click", openFullAnalysis);

  el("settings-toggle").addEventListener("click", () => {
    el("settings").hidden = !el("settings").hidden;
  });

  el("save").addEventListener("click", async () => {
    await settings.save({
      service: trimSlash(el("service").value) || DEFAULTS.service,
      app: trimSlash(el("app").value) || DEFAULTS.app,
    });
    el("settings").hidden = true;
  });
}

document.addEventListener("DOMContentLoaded", init);
