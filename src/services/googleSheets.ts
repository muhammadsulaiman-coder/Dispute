// Google Sheets API service for Markaz Supplier Return Dispute Portal

export interface Dispute {
  id: string;
  orderItemId: string;
  trackingId: string;
  supplierCity: string;
  deliveryPartner: string;
  supplierName: string;
  supplierEmail: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected' | 'Fake Signatures' | 'Paid';
  lastUpdateDate: string;
  reason?: string;
  submissionDate: string;
  supplierId?: string;
}

export interface DisputeMetrics {
  totalSubmitted: number;
  totalPending: number;
  totalResolved: number;
  totalInProgress: number;
  totalRejected: number;
  totalFakeSignatures: number;
  totalPaid: number;
}

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwJg5HRmr2jtAvzKPj_MN74vFoMxRAA15HCITXOmnV90Ft-MIP3JG_C94D2BcqVRRc/exec";

class GoogleSheetsService {
  private isDemoMode: boolean;

  constructor() {
    this.isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";
  }

  async getDisputes(supplierId?: string): Promise<Dispute[]> {
    if (this.isDemoMode) {
      return [];
    }

    const response = await fetch(
      `${GOOGLE_SCRIPT_URL}?action=getDisputes${supplierId ? `&supplierId=${supplierId}` : ""}`
    );

    if (!response.ok) throw new Error("Failed to fetch disputes");

    return response.json();
  }

  async updateDisputeStatus(disputeId: string, status: Dispute["status"]): Promise<boolean> {
    if (this.isDemoMode) {
      return true;
    }

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateDisputeStatus", disputeId, status }),
    });

    return response.ok;
  }

  async createDispute(dispute: Omit<Dispute, "id" | "submissionDate" | "lastUpdateDate">): Promise<boolean> {
    if (this.isDemoMode) {
      return true;
    }

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "createDispute", ...dispute }),
    });

    return response.ok;
  }

  calculateMetrics(disputes: Dispute[]): DisputeMetrics {
    return {
      totalSubmitted: disputes.length,
      totalPending: disputes.filter((d) => d.status === "Pending").length,
      totalResolved: disputes.filter((d) => d.status === "Resolved").length,
      totalInProgress: disputes.filter((d) => d.status === "In Progress").length,
      totalRejected: disputes.filter((d) => d.status === "Rejected").length,
      totalFakeSignatures: disputes.filter((d) => d.status === "Fake Signatures").length,
      totalPaid: disputes.filter((d) => d.status === "Paid").length,
    };
  }
}

export const googleSheetsService = new GoogleSheetsService();
