// Browser smoke test: renders the demo page with stubbed Home Assistant elements
// and exercises flipping, editing, gestures and the editor.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startServer } from "../scripts/serve_demo.mjs";

let server;
let browser;
let baseUrl;

before(async () => {
  ({ server, url: baseUrl } = await startServer(0));
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function openDemo(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1180, height: 1400 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(`${baseUrl}demo/`, { waitUntil: "networkidle" });
  return { page, context, errors };
}

const card = (page, index) => page.locator("#grid > .cell > imagenote-card").nth(index);

test("demo renders every card without page errors", async () => {
  const { page, context, errors } = await openDemo();
  assert.equal(await page.locator("#grid > .cell > imagenote-card").count(), 14);
  assert.deepEqual(errors, []);
  assert.equal(await card(page, 0).locator(".face.current .title-overlay").innerText(), "Kitchen");
  assert.equal(await card(page, 0).locator(".stage").getAttribute("aria-pressed"), "false");
  await context.close();
});

test("a tap flips the card and a second tap flips it back", async () => {
  const { page, context } = await openDemo();
  const stage = card(page, 0).locator(".stage");
  await stage.click();
  assert.equal(await stage.getAttribute("aria-pressed"), "true");
  await page.waitForTimeout(800);
  await stage.click();
  assert.equal(await stage.getAttribute("aria-pressed"), "false");
  await context.close();
});

test("keyboard flips with Enter and Space", async () => {
  const { page, context } = await openDemo();
  const stage = card(page, 0).locator(".stage");
  await stage.focus();
  await page.keyboard.press("Enter");
  assert.equal(await stage.getAttribute("aria-pressed"), "true");
  await page.keyboard.press("Space");
  assert.equal(await stage.getAttribute("aria-pressed"), "false");
  await context.close();
});

test("notes from an input_text entity can be edited on the card", async () => {
  const { page, context } = await openDemo();
  const fridge = card(page, 1);
  const cur = () => fridge.locator(".face.current");
  await fridge.locator(".stage").click();
  await page.waitForTimeout(800);
  await cur().locator(".edit").click();
  assert.equal(await cur().locator(".note-editor").evaluate((el) => el.classList.contains("visible")), true);
  assert.match(await cur().locator(".counter").innerText(), /characters left/);
  await cur().locator("textarea").fill("Bought the milk.");
  await cur().locator(".save").click();
  await page.waitForFunction(
    () => document.querySelectorAll("#grid > .cell > imagenote-card")[1].shadowRoot.querySelector(".face.current .note-body").innerText.includes("Bought the milk."),
  );
  assert.match(await cur().locator(".note-meta").innerText(), /Updated/);
  // Escape cancels without saving.
  await cur().locator(".edit").click();
  await cur().locator("textarea").fill("discard me");
  await page.keyboard.press("Escape");
  assert.match(await cur().locator(".note-body").innerText(), /Bought the milk\./);
  await context.close();
});

test("hold and double tap run their actions instead of flipping", async () => {
  const { page, context } = await openDemo();
  const actions = card(page, 13);
  await actions.scrollIntoViewIfNeeded();
  const box = await actions.locator(".stage").boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  let events = await page.evaluate(() => window.__events);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "hass-more-info");
  assert.equal(events[0].detail.entityId, "input_text.fridge_note");
  assert.equal(await actions.locator(".stage").getAttribute("aria-pressed"), "false");

  await page.mouse.click(x, y);
  await page.mouse.click(x, y);
  await page.waitForTimeout(400);
  events = await page.evaluate(() => window.__events);
  assert.equal(events.length, 2);
  assert.equal(events[1].type, "open");
  assert.equal(events[1].url, "https://example.com");
  assert.equal(await actions.locator(".stage").getAttribute("aria-pressed"), "false");

  // A single tap still flips, after the double-tap window has passed.
  await page.mouse.click(x, y);
  await page.waitForTimeout(400);
  assert.equal(await actions.locator(".stage").getAttribute("aria-pressed"), "true");
  await context.close();
});

test("pictures with notes become a slide sequence with arrows, dots, keys and swipes", async () => {
  const { page, context } = await openDemo();
  const gallery = card(page, 8); // 3 pictures with notes → 6 slides
  const stage = gallery.locator(".stage");
  const cur = () => gallery.locator(".face.current");
  assert.equal(await gallery.locator(".dots button").count(), 6);
  assert.equal(await cur().locator(".title-overlay").innerText(), "Bike");

  await stage.click();                       // → note of the bike
  await page.waitForTimeout(800);
  assert.match(await cur().locator(".note-body").innerText(), /Chain oiled/);
  assert.equal(await stage.getAttribute("aria-pressed"), "true");

  await stage.focus();
  await page.keyboard.press("ArrowRight");   // → second picture (arrows are hidden on note pages)
  await page.waitForTimeout(800);
  assert.equal(await cur().locator(".title-overlay").innerText(), "Garage");
  assert.equal(await gallery.locator(".dots button.active").evaluate((el) => Array.from(el.parentNode.children).indexOf(el)), 2);

  await stage.focus();
  await page.keyboard.press("ArrowLeft");    // back to the bike note
  await page.waitForTimeout(800);
  assert.match(await cur().locator(".note-body").innerText(), /Chain oiled/);

  await gallery.locator(".dots button").nth(5).click(); // last slide: note from the entity
  await page.waitForTimeout(800);
  assert.match(await cur().locator(".note-body").innerText(), /Milk is running low/);

  // Swipe left on the last slide wraps around to the first picture.
  const box = await stage.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 5 });
  await page.mouse.move(box.x + box.width * 0.3, y, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  assert.equal(await cur().locator(".title-overlay").innerText(), "Bike");
  await context.close();
});

test("slides can be pictures and notes in any order, at most ten", async () => {
  const { page, context } = await openDemo();
  const trip = card(page, 9);
  const stage = trip.locator(".stage");
  const cur = () => trip.locator(".face.current");
  assert.equal(await trip.locator(".dots button").count(), 5);
  assert.equal(await cur().locator(".title-overlay").innerText(), "Arrival");
  await stage.click();
  await page.waitForTimeout(800);
  assert.match(await cur().locator(".note-body").innerText(), /Day 1/);
  await stage.click();
  await page.waitForTimeout(800);
  assert.match(await cur().locator(".note-body").innerText(), /Day 2/);
  assert.equal(await trip.locator(".badge span").innerText(), "Photo");
  await stage.click();
  await page.waitForTimeout(800);
  assert.equal(await cur().locator(".title-overlay").innerText(), "Lake");
  assert.equal(await trip.locator(".badge span").innerText(), "Note");

  const error = await page.evaluate(() => {
    const el = document.createElement("imagenote-card");
    try {
      el.setConfig({ type: "custom:imagenote-card", slides: Array.from({ length: 11 }, () => ({ note: "x" })) });
      return "";
    } catch (err) {
      return err.message;
    }
  });
  assert.match(error, /at most 10/);
  await context.close();
});

test("the editor adds and removes pictures", async () => {
  const { page, context } = await openDemo();
  const editor = page.locator("imagenote-card-editor");
  const configs = [];
  await page.evaluate(() => {
    window.__configs = [];
    document.querySelector("imagenote-card-editor").addEventListener("config-changed", (ev) => window.__configs.push(ev.detail.config));
  });
  await editor.locator(".chip.add-image").click();
  let latest = await page.evaluate(() => window.__configs.at(-1));
  assert.equal(latest.slides.length, 2);
  assert.equal(latest.slides[0].image, "./sample-2.svg");
  assert.equal(latest.slides[0].note_entity, "input_text.fridge_note");
  assert.equal(latest.image, undefined);
  assert.equal(latest.title, "Fridge");
  assert.equal(await editor.locator(".chip.active").innerText(), "2 · Picture");

  await editor.locator(".remove-page").click();
  latest = await page.evaluate(() => window.__configs.at(-1));
  assert.equal(latest.slides, undefined);
  assert.equal(latest.image, "./sample-2.svg");
  assert.equal(latest.note_entity, "input_text.fridge_note");
  configs.push(latest);
  await context.close();
});

test("fixed-height hosts (sections view) are never overflowed", async () => {
  const { page, context } = await openDemo();
  const sizes = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#sections .host")).slice(0, 3).map((host) => {
      const card = host.querySelector("imagenote-card");
      const h = host.getBoundingClientRect();
      const c = card.shadowRoot.querySelector("ha-card").getBoundingClientRect();
      const back = card.shadowRoot.querySelector(".face.current").getBoundingClientRect();
      return { host: [h.width, h.height], card: [c.width, c.height], back: [back.width, back.height] };
    }),
  );
  for (const { host, card: c, back } of sizes) {
    assert.deepEqual(c, host);
    assert.deepEqual(back, host);
  }
  // The note side keeps its footer inside the card and scrolls long text.
  const first = page.locator("#sections imagenote-card").first();
  assert.equal(await first.locator(".face.current .layer-note").evaluate((el) => el.classList.contains("scrollable")), true);
  const footer = await first.locator(".face.current .note-footer").boundingBox();
  const host = await page.locator("#sections .host").first().boundingBox();
  assert.ok(footer.y + footer.height <= host.y + host.height + 0.5);
  await context.close();
});

test("the editor reorders pictures", async () => {
  const { page, context } = await openDemo();
  const editor = page.locator("imagenote-card-editor");
  await page.evaluate(() => {
    window.__configs = [];
    document.querySelector("imagenote-card-editor").addEventListener("config-changed", (ev) => window.__configs.push(ev.detail.config));
  });
  await editor.locator(".chip.add-note").click();
  assert.equal(await editor.locator(".chip.active").innerText(), "2 · Note");
  assert.equal(await editor.locator(".picture").isVisible(), false);
  assert.equal(await editor.locator(".move-left").isVisible(), true);
  assert.equal(await editor.locator(".move-right").isVisible(), false);
  await editor.locator(".move-left").click();
  const latest = await page.evaluate(() => window.__configs.at(-1));
  assert.equal(latest.slides.length, 2);
  assert.equal(latest.slides[0].kind, "note");
  assert.equal(latest.slides[1].image, "./sample-2.svg");
  assert.equal(await editor.locator(".chip.active").innerText(), "1 · Note");
  assert.equal(await editor.locator(".move-left").isVisible(), false);
  assert.equal(await editor.locator(".move-right").isVisible(), true);
  await context.close();
});

test("layout: grid renders one tile per picture that flips on its own", async () => {
  const { page, context } = await openDemo();
  const tiles = card(page, 10).locator("imagenote-card");
  assert.equal(await tiles.count(), 4);
  assert.equal(await tiles.nth(0).locator(".face.current .title-overlay").innerText(), "Tomatoes");
  await tiles.nth(1).locator(".stage").click();
  await page.waitForTimeout(300);
  assert.equal(await tiles.nth(1).locator(".stage").getAttribute("aria-pressed"), "true");
  assert.equal(await tiles.nth(0).locator(".stage").getAttribute("aria-pressed"), "false");
  assert.match(await tiles.nth(1).locator(".face.current .note-body").innerText(), /Cut back the mint/);
  // Tiles share the fixed height of a sections host.
  const host = await page.locator("#sections .host").nth(3).boundingBox();
  const tile = await page.locator("#sections .host").nth(3).locator("imagenote-card imagenote-card").first().boundingBox();
  assert.ok(tile.y + tile.height <= host.y + host.height + 0.5);
  assert.ok(tile.height > 100);
  await context.close();
});

test("checklists tick, write back to input_text and stay local otherwise", async () => {
  const { page, context } = await openDemo();
  const shopping = card(page, 11);
  const cur = () => shopping.locator(".face.current");
  await page.waitForTimeout(300);
  assert.equal(await cur().locator(".check").count(), 3);
  assert.equal(await cur().locator(".check input").nth(0).isChecked(), true);
  assert.equal(await cur().evaluate((el) => el.classList.contains("sticky")), true);
  await cur().locator(".check input").nth(1).click();
  await page.waitForFunction(() => window.__hassStates?.()["input_text.shopping"].state.includes("- [x] Bread"));
  assert.equal(await shopping.locator(".stage").getAttribute("aria-pressed"), "true"); // still on the note, no flip

  const boiler = card(page, 12);
  await boiler.locator(".stage").click();
  await page.waitForTimeout(800);
  const bc = () => boiler.locator(".face.current");
  assert.match(await bc().locator(".note-body").innerText(), /54\.5 °C/);
  await bc().locator(".check input").nth(0).click();
  await page.waitForTimeout(100);
  const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("imagenote:checks:")).length);
  assert.equal(stored, 1);
  await page.reload({ waitUntil: "networkidle" });
  const boiler2 = card(page, 12);
  await boiler2.locator(".stage").click();
  await page.waitForTimeout(800);
  assert.equal(await boiler2.locator(".face.current .check input").nth(0).isChecked(), true);
  await context.close();
});

test("expired pages are dimmed or hidden, colours and expiry dates show", async () => {
  const { page, context } = await openDemo();
  const boiler = card(page, 12);
  const cur = () => boiler.locator(".face.current");
  assert.equal(await boiler.locator(".dots button").count(), 4);
  await boiler.locator(".dots button").nth(2).click();
  await page.waitForTimeout(800);
  assert.equal(await cur().evaluate((el) => el.classList.contains("expired")), true);
  assert.equal(await cur().locator(".note-tag").innerText(), "EXPIRED");
  await boiler.locator(".dots button").nth(3).click();
  await page.waitForTimeout(800);
  assert.match(await cur().locator(".note-meta").innerText(), /Until/);
  const bg = await cur().evaluate((el) => getComputedStyle(el).getPropertyValue("--imagenote-note-background").trim());
  assert.equal(bg, "#d4f5cd");

  const hidden = await page.evaluate(() => {
    const el = document.createElement("imagenote-card");
    el.setConfig({ type: "custom:imagenote-card", expired_slides: "hide", slides: [{ note: "a" }, { note: "old", expires: "2020-01-01" }, { note: "c" }] });
    document.body.append(el);
    const dots = el.shadowRoot.querySelectorAll(".dots button").length;
    el.remove();
    return dots;
  });
  assert.equal(hidden, 0); // two visible slides → no dots, the expired one is gone
  await context.close();
});

test("empty and broken states show placeholders", async () => {
  const { page, context } = await openDemo();
  assert.match(await card(page, 5).locator(".face.current .placeholder").innerText(), /No picture yet/);
  await page.waitForFunction(
    () => document.querySelectorAll("#grid > .cell > imagenote-card")[6].shadowRoot.querySelector(".face.current .placeholder").innerText.includes("could not be loaded"),
  );
  await card(page, 6).locator(".stage").click();
  await page.waitForTimeout(800);
  assert.match(await card(page, 6).locator(".face.current .note-body").innerText(), /input_text\.missing not found/);
  await context.close();
});

test("reduced motion falls back to a crossfade", async () => {
  const { page, context } = await openDemo({ reducedMotion: "reduce" });
  const classes = await card(page, 0).locator(".scene").getAttribute("class");
  assert.match(classes, /\bmode-fade\b/);
  assert.doesNotMatch(classes, /\bmode-flip\b/);
  await context.close();
});

test("language follows hass", async () => {
  const { page, context } = await openDemo();
  await page.click("#lang");
  assert.equal(await card(page, 0).locator(".badge span").innerText(), "Notiz");
  await context.close();
});

test("the editor emits config-changed", async () => {
  const { page, context } = await openDemo();
  const received = page.evaluate(
    () =>
      new Promise((resolve) => {
        document
          .querySelector("imagenote-card-editor")
          .addEventListener("config-changed", (ev) => resolve(ev.detail.config), { once: true });
      }),
  );
  await page.locator("imagenote-card-editor").locator(".clear").click();
  const config = await received;
  assert.equal(config.image, undefined);
  assert.equal(config.title, "Fridge");
  assert.equal(config.type, "custom:imagenote-card");
  await context.close();
});
