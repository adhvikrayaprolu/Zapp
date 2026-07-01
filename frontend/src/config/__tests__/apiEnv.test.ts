import { describe, it, expect } from "vitest";
import {
  validateProductionApiBaseUrl,
  validateProductionSupabaseUrl,
} from "../apiEnv";

describe("validateProductionApiBaseUrl", () => {
  it("returns error for empty string", () => {
    expect(validateProductionApiBaseUrl("")).toMatch(/required/i);
  });

  it("returns error for loopback URL", () => {
    expect(validateProductionApiBaseUrl("http://127.0.0.1:8000")).toMatch(/loopback/i);
    expect(validateProductionApiBaseUrl("http://[::1]:3000/api")).toMatch(/loopback/i);
  });

  it("returns error for http non-loopback in production validation", () => {
    expect(validateProductionApiBaseUrl("http://api.example.com")).toMatch(/https/i);
  });

  it("returns null for valid https URL", () => {
    expect(validateProductionApiBaseUrl("https://api.example.com")).toBeNull();
    expect(validateProductionApiBaseUrl("https://api.example.com/v1")).toBeNull();
  });
});

describe("validateProductionSupabaseUrl", () => {
  it("returns error for empty string", () => {
    expect(validateProductionSupabaseUrl("")).toMatch(/required/i);
  });

  it("returns error for loopback URL", () => {
    expect(validateProductionSupabaseUrl("http://127.0.0.1:54321")).toMatch(/loopback/i);
    expect(validateProductionSupabaseUrl("http://[::1]:54321")).toMatch(/loopback/i);
  });

  it("returns error for http non-loopback in production validation", () => {
    expect(validateProductionSupabaseUrl("http://project.supabase.co")).toMatch(/https/i);
  });

  it("returns null for valid https URL", () => {
    expect(validateProductionSupabaseUrl("https://project.supabase.co")).toBeNull();
  });
});
