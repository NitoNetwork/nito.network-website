import test from "node:test";
import assert from "node:assert/strict";
import { installIOSSessionRecovery } from "../src/ios-session-recovery";

const iPhone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0.7339.39 Mobile/15E148 Safari/604.1";

function storedSession() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

function harness({
  ua = iPhone,
  type = "navigate",
  hidden = false,
  storage = storedSession(),
}: {
  ua?: string;
  type?: string;
  hidden?: boolean;
  storage?: ReturnType<typeof storedSession>;
} = {}) {
  let reloads = 0;
  let listeners = 0;
  let reads = 0;
  const doc = Object.assign(new EventTarget(), { hidden });
  const win = Object.assign(new EventTarget(), {
    document: doc,
    navigator: { userAgent: ua },
    performance: {
      getEntriesByType: () => (type ? [{ type }] : []),
    },
    location: {
      reload: () => {
        reloads++;
      },
    },
  });
  Object.defineProperty(win, "sessionStorage", {
    get() {
      reads++;
      return storage;
    },
    configurable: true,
  });
  const addListener = win.addEventListener.bind(win);
  win.addEventListener = (...args: Parameters<typeof addListener>) => {
    listeners++;
    addListener(...args);
  };
  const dispose = installIOSSessionRecovery(win as unknown as Window);
  return {
    win,
    dispose,
    get reloads() {
      return reloads;
    },
    get listeners() {
      return listeners;
    },
    get reads() {
      return reads;
    },
    show(persisted = false) {
      win.dispatchEvent(Object.assign(new Event("pageshow"), { persisted }));
    },
    visible(value: boolean) {
      doc.hidden = !value;
      doc.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

test("Chrome iOS reloads a cached restoration only once across documents", () => {
  const storage = storedSession();
  const first = harness({ storage });
  first.show();
  first.visible(false);
  first.visible(true);
  assert.equal(first.reloads, 0, "fresh load and app switching stay unchanged");
  first.show(true);
  assert.equal(first.reloads, 1);
  first.show(true);
  first.visible(true);
  assert.equal(first.reloads, 1, "repeated restoration signals cannot loop");

  for (const type of ["reload", "back_forward", "navigate"]) {
    const next = harness({ storage, type });
    next.show(true);
    next.show();
    assert.equal(next.reloads, 0, "guard survives document replacement");
    next.dispose();
  }
  first.dispose();
});

test("history restoration recovers without BFCache; normal reloads do not", () => {
  for (const type of ["navigate", "reload", "", "back_forward"]) {
    const page = harness({ type });
    page.show();
    assert.equal(page.reloads, type === "back_forward" ? 1 : 0);
    page.dispose();
  }
});

test("background restoration waits for visibility and cleanup removes handlers", () => {
  const page = harness({ hidden: true });
  page.show(true);
  assert.equal(page.reloads, 0);
  assert.equal(page.reads, 0);
  page.visible(true);
  assert.equal(page.reloads, 1);
  page.dispose();

  const stopped = harness({ hidden: true });
  stopped.show(true);
  stopped.dispose();
  stopped.visible(true);
  stopped.show(true);
  assert.equal(stopped.reloads, 0);
});

test("only Chrome iOS is targeted, including its desktop-site mode", () => {
  const agents = [
    [iPhone, true],
    [iPhone.replace("iPhone", "iPad"), true],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/605.1.15 CriOS/140 Version/11.1.1 Safari/605.1.15",
      true,
    ],
    [iPhone.replace("CriOS/140.0.7339.39", "Version/18.0"), false],
    [iPhone.replace("CriOS/140.0.7339.39", "FxiOS/140.0"), false],
    [iPhone.replace("CriOS/140.0.7339.39", "EdgiOS/140.0"), false],
    [
      "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36",
      false,
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
      false,
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15",
      false,
    ],
  ] as const;
  for (const [ua, enabled] of agents) {
    const page = harness({ ua, type: "back_forward" });
    page.show(true);
    assert.equal(page.reloads, Number(enabled), ua);
    assert.equal(
      page.listeners,
      Number(enabled),
      "other browsers get no listener",
    );
    if (!enabled) assert.equal(page.reads, 0);
    page.dispose();
  }
});

test("unavailable, full or ineffective storage never causes a reload", () => {
  const fail = () => {
    throw new Error("Storage unavailable");
  };
  const variants = [
    { getItem: fail, setItem: fail },
    { getItem: () => null, setItem: fail },
    { getItem: () => null, setItem: () => {} },
  ];
  for (const storage of variants) {
    const page = harness({ storage });
    assert.doesNotThrow(() => page.show(true));
    page.show(true);
    assert.equal(page.reloads, 0);
    page.dispose();
  }
  const denied = harness();
  Object.defineProperty(denied.win, "sessionStorage", { get: fail });
  assert.doesNotThrow(() => denied.show(true));
  assert.equal(denied.reloads, 0);
  denied.dispose();
});
