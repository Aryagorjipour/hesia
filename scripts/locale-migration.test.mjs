import assert from "node:assert/strict";
import { describe, it } from "node:test";

const DEFAULT_LOCALE = { calendar: "gregorian", direction: "ltr" };
const V7_AUTO_LOCALE = { calendar: "jalali", direction: "rtl" };

function migrateSettingsLocaleV9(settings) {
  const { locale } = settings;
  if (
    locale?.calendar === V7_AUTO_LOCALE.calendar &&
    locale?.direction === V7_AUTO_LOCALE.direction
  ) {
    return { ...settings, locale: DEFAULT_LOCALE };
  }
  return settings;
}

describe("locale migration v9", () => {
  it("restores LTR for v7 auto-migrated jalali+rtl", () => {
    const result = migrateSettingsLocaleV9({
      locale: V7_AUTO_LOCALE,
    });
    assert.deepEqual(result.locale, DEFAULT_LOCALE);
  });

  it("preserves explicit jalali+ltr choice", () => {
    const locale = { calendar: "jalali", direction: "ltr" };
    const result = migrateSettingsLocaleV9({ locale });
    assert.deepEqual(result.locale, locale);
  });

  it("preserves explicit gregorian+rtl choice", () => {
    const locale = { calendar: "gregorian", direction: "rtl" };
    const result = migrateSettingsLocaleV9({ locale });
    assert.deepEqual(result.locale, locale);
  });
});