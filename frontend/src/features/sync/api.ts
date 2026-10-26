import { getJson, postJson } from "@/shared/api/http";
import type { SyncResult, SyncStatus } from "./types";

export async function fetchSyncStatus(): Promise<SyncStatus> {
  return getJson<SyncStatus>("/api/v1/sync/status");
}

export async function triggerSyncEod(): Promise<SyncResult> {
  return postJson<SyncResult>("/api/v1/sync/eod");
}

export async function triggerSyncNews(): Promise<SyncResult> {
  return postJson<SyncResult>("/api/v1/sync/news");
}

export async function triggerSyncSebon(): Promise<SyncResult> {
  return postJson<SyncResult>("/api/v1/sync/sebon");
}

export async function triggerSyncCrosscheck(): Promise<SyncResult> {
  return postJson<SyncResult>("/api/v1/sync/crosscheck");
}

export async function triggerSyncAll(): Promise<SyncResult> {
  return postJson<SyncResult>("/api/v1/sync/all");
}
