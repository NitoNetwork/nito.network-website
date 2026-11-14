import test from "node:test";
import assert from "node:assert/strict";
import { locales, pageUrl, route } from "../src/data";
import { whitepaperCopy } from "../src/content/whitepaper";
import { render } from "../src/render";

test("native whitepaper is linked from all existing entry points in seven languages", () => {
  for (const locale of locales) {
    assert.deepEqual(route(pageUrl(locale, "whitepaper")), {
      locale,
      page: "whitepaper",
      valid: true,
    });
    for (const page of ["home", "network", "resources"] as const) {
      assert.ok(
        render(locale, page).includes(
          `href="${pageUrl(locale, "whitepaper")}" target="_blank" rel="noopener noreferrer"`,
        ),
      );
    }
    const html = render(locale, "whitepaper");
    assert.match(html, /data-whitepaper/);
    assert.doesNotMatch(html, /<iframe/);
    assert.match(html, /aria-current="location"/);
    assert.match(html, /<noscript>/);
    assert.equal((html.match(/<h1>/g) ?? []).length, 1);
    assert.deepEqual(
      Object.keys(whitepaperCopy[locale]),
      Object.keys(whitepaperCopy.en),
    );
    assert.ok(
      Object.values(whitepaperCopy[locale]).every(
        (value) => value.trim().length,
      ),
    );
  }
});
