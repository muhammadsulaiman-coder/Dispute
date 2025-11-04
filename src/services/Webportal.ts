// src/services/Webportal.ts
// Service wrapper that exposes helper functions to the frontend.
// Uses the existing src/services/googlesheets.ts mock service by default.
// Change USE_DEMO to false to use Apps Script endpoint (production).

import { googleSheetsService, Dispute as MockDispute } from './googleSheets';

export type Dispute = MockDispute;

// Updated to use the same deployment URL as login
const API_URL = "https://script.google.com/macros/s/AKfycbwYsrrQ1JisPulBgFyEySusajEXLrbgOlkTjaDQPowBNi5sfLrvq9zvRKuflfBP4hylWw/exec";

// Toggle this flag:
// - true  = use local mock (googleSheetsService)  <-- recommended for local/dev
// - false = call Apps Script endpoint (production)
export const USE_DEMO = true;

/**
 * Utility: try multiple possible keys from the sheet row.
 */
function getFirst(row: Record<string, any>, ...keys: string[]) {
  if (!row) return "";
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    // try case-insensitive match for keys returned by Apps Script (headers with spaces)
    const foundKey = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && row[foundKey] !== "") {
      return row[foundKey];
    }
  }
  return "";
}

/**
 * Normalize a single raw row (from Apps Script or other source) into our Dispute type.
 */
function normalizeRow(row: Record<string, any>): Dispute {
  const supplierField = String(getFirst(row, "Supplier", "supplier", "Supplier Name", "supplierName") || "");
  let supplierName = supplierField;
  let supplierEmail = String(getFirst(row, "supplierEmail", "Supplier Email", "supplier_email") || "");

  // try to extract email from supplier field (e.g. "Acme Co (supplier@acme.com)")
  const emailMatch = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/.exec(supplierField);
  if (emailMatch) {
    supplierEmail = emailMatch[1];
    supplierName = supplierField.replace(emailMatch[0], "").replace(/[()<>]/g, "").trim();
  }

  const idFromRow = getFirst(row, "id", "ID", "Id") || `${getFirst(row, "Order Item ID", "OrderItemID") || ""}-${getFirst(row, "TrackingID", "TrackingId") || ""}`;

  const dispute: Dispute = {
    Timestamp: String(getFirst(row, "Timestamp", "submissionDate", "Submission Date", "SubmissionDate") || ""),
    supplierName: supplierName || "",
    supplierEmail: supplierEmail || "",
    supplierId: String(getFirst(row, "supplierId", "SupplierID", "supplier_id") || ""),
    disputeType: String(getFirst(row, "disputeType", "Dispute Type") || ""),
    disputeDescription: String(getFirst(row, "disputeDescription", "reason", "ReasonforDispute", "Reason for Dispute", "Reason") || ""),
    orderNumber: String(getFirst(row, "orderNumber", "orderItemId", "Order Item ID", "OrderItemID") || ""),
    disputeAmount: String(getFirst(row, "disputeAmount", "Dispute Amount") || ""),
    attachments: String(getFirst(row, "attachments", "Attachments") || ""),
    priority: String(getFirst(row, "priority", "Priority") || "Medium"),
    category: String(getFirst(row, "category", "Category") || ""),
    subcategory: String(getFirst(row, "subcategory", "Subcategory") || ""),
    expectedResolution: String(getFirst(row, "expectedResolution", "Expected Resolution") || ""),
    contactPhone: String(getFirst(row, "contactPhone", "Contact Phone") || ""),
    preferredContactMethod: String(getFirst(row, "preferredContactMethod", "Preferred Contact Method") || ""),
    Status: (getFirst(row, "status", "Status") as Dispute["Status"]) || "Pending",
  };

  return dispute;
}

/**
 * Get all disputes from the Adminportal tab (normalized).
 */
export async function getAdminportalDisputes(): Promise<Dispute[]> {
  if (USE_DEMO) {
    // use your mock service
    return await googleSheetsService.getDisputes();
  }

  const res = await fetch(`${API_URL}?tab=Adminportal`);
  if (!res.ok) throw new Error("Failed to fetch Adminportal data");
  const raw = await res.json();
  if (!Array.isArray(raw)) return [];
  return raw.map((r: any) => normalizeRow(r));
}

/**
 * Get supplier-specific disputes (Supplierview).
 * You can pass supplierEmail or supplierId to filter on server side (client side fallback is applied).
 */
export async function getSupplierviewDisputes(supplierIdOrEmail?: string): Promise<Dispute[]> {
  if (USE_DEMO) {
    return await googleSheetsService.getDisputes(supplierIdOrEmail);
  }

  const res = await fetch(`${API_URL}?tab=Supplierview`);
  if (!res.ok) throw new Error("Failed to fetch Supplierview data");
  const raw = await res.json();
  let arr: Dispute[] = Array.isArray(raw) ? raw.map((r: any) => normalizeRow(r)) : [];
  if (supplierIdOrEmail) {
    arr = arr.filter((d) => d.supplierEmail === supplierIdOrEmail || d.supplierId === supplierIdOrEmail);
  }
  return arr;
}

/**
 * Create a new dispute (Newform tab).
 * Accepts a minimal object similar to your NewDisputeForm component.
 */
export async function createDispute(payload: {
  orderItemId: string;
  trackingId: string;
  reason: string;
  supplierName: string;
  supplierEmail: string;
  supplierId?: string;
  city?: string;
  deliveryPartner?: string;
}): Promise<boolean> {
  if (USE_DEMO) {
    // googleSheetsService.createDispute expects Omit<Dispute, 'id'|'submissionDate'|'lastUpdateDate'>
    return await googleSheetsService.createDispute({
      orderItemId: payload.orderItemId,
      trackingId: payload.trackingId,
      supplierCity: payload.city || "",
      deliveryPartner: payload.deliveryPartner || "",
      supplierName: payload.supplierName,
      supplierEmail: payload.supplierEmail,
      supplierId: payload.supplierId
    } as any);
  }

  const body = {
    tab: "Newform",
    Timestamp: new Date().toISOString(),
    OrderItemID: payload.orderItemId,
    TrackingID: payload.trackingId,
    City: payload.city || "",
    DeliveryPartner: payload.deliveryPartner || "",
    Supplier: `${payload.supplierName} (${payload.supplierEmail})`,
    ReasonforDispute: payload.reason
  };

  // Use text/plain to avoid CORS preflight (same approach as login)
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const result = await res.json();
  return result && result.success === true;
}

/**
 * Update a dispute status (updates Adminportal and keeps things in sync).
 */
export async function updateDisputeStatus(disputeId: string, newStatus: Dispute["Status"]): Promise<boolean> {
  if (USE_DEMO) {
    return await googleSheetsService.updateDisputeStatus(disputeId, newStatus);
  }

  // Use text/plain to avoid CORS preflight (same approach as login)
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "updateStatus",
      id: disputeId,
      status: newStatus
    })
  });

  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const result = await res.json();
  return result && result.success === true;
}

/**
 * Small helper alias used by some components you pasted earlier.
 */
export const fetchDisputes = getAdminportalDisputes;

export default {
  getAdminportalDisputes,
  getSupplierviewDisputes,
  createDispute,
  updateDisputeStatus,
  fetchDisputes
};

