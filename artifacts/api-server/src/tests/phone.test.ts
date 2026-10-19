import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPhoneDisplay, normalizePhone, toWaNumber } from "../lib/phone";

describe("normalizePhone", () => {
  it("returns the local 08… form for every common scraped format", () => {
    assert.equal(normalizePhone("0812-3456-7890"), "081234567890");
    assert.equal(normalizePhone("+62 812 3456 7890"), "081234567890");
    assert.equal(normalizePhone("6281234567890"), "081234567890");
    assert.equal(normalizePhone("81234567890"), "081234567890");
    assert.equal(normalizePhone("(021) 555-1234"), "0215551234");
    assert.equal(normalizePhone(""), "");
  });
});

describe("toWaNumber", () => {
  it("always yields a 62… number for wa.me", () => {
    assert.equal(toWaNumber("081234567890"), "6281234567890");
    assert.equal(toWaNumber("+62 812-3456-7890"), "6281234567890");
    assert.equal(toWaNumber("6281234567890"), "6281234567890");
    assert.equal(toWaNumber("81234567890"), "6281234567890");
    assert.equal(toWaNumber("021-5551234"), "62215551234");
  });

  it("rejects values that cannot be a phone number", () => {
    assert.equal(toWaNumber(""), "");
    assert.equal(toWaNumber("-"), "");
    assert.equal(toWaNumber("12345"), "");
    assert.equal(toWaNumber("0812"), "");
  });
});

describe("formatPhoneDisplay", () => {
  it("shows a copy-ready +62 number", () => {
    assert.equal(formatPhoneDisplay("081234567890"), "+62 812-3456-7890");
    assert.equal(formatPhoneDisplay("6281234567890"), "+62 812-3456-7890");
    assert.equal(formatPhoneDisplay("+62 812 3456 7890"), "+62 812-3456-7890");
  });

  it("keeps a landline readable and falls back to the raw value", () => {
    assert.equal(formatPhoneDisplay("0215551234"), "+62 215551234");
    assert.equal(formatPhoneDisplay("tidak ada"), "tidak ada");
  });
});
