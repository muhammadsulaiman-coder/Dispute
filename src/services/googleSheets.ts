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

// Mock data for demo mode
const MOCK_DISPUTES: Dispute[] = [
  {
    id: '1',
    orderItemId: 'ORD001',
    trackingId: 'TRK001',
    supplierCity: 'Karachi',
    deliveryPartner: 'TCS',
    supplierName: 'Demo Supplier',
    supplierEmail: 'supplier@demo',
    status: 'Pending',
    lastUpdateDate: '2024-01-15',
    reason: 'Damaged item received',
    submissionDate: '2024-01-10',
    supplierId: 'SUP001'
  },
  {
    id: '2',
    orderItemId: 'ORD002',
    trackingId: 'TRK002',
    supplierCity: 'Lahore',
    deliveryPartner: 'Leopards',
    supplierName: 'Demo Supplier',
    supplierEmail: 'supplier@demo',
    status: 'In Progress',
    lastUpdateDate: '2024-01-14',
    reason: 'Wrong item delivered',
    submissionDate: '2024-01-08',
    supplierId: 'SUP001'
  },
  {
    id: '3',
    orderItemId: 'ORD003',
    trackingId: 'TRK003',
    supplierCity: 'Islamabad',
    deliveryPartner: 'M&P',
    supplierName: 'Demo Supplier',
    supplierEmail: 'supplier@demo',
    status: 'Resolved',
    lastUpdateDate: '2024-01-12',
    reason: 'Late delivery',
    submissionDate: '2024-01-05',
    supplierId: 'SUP001'
  },
  {
    id: '4',
    orderItemId: 'ORD004',
    trackingId: 'TRK004',
    supplierCity: 'Faisalabad',
    deliveryPartner: 'TCS',
    supplierName: 'Another Supplier',
    supplierEmail: 'another@supplier.com',
    status: 'Rejected',
    lastUpdateDate: '2024-01-11',
    reason: 'Invalid claim',
    submissionDate: '2024-01-03',
    supplierId: 'SUP002'
  },
  {
    id: '5',
    orderItemId: 'ORD005',
    trackingId: 'TRK005',
    supplierCity: 'Multan',
    deliveryPartner: 'Leopards',
    supplierName: 'Third Supplier',
    supplierEmail: 'third@supplier.com',
    status: 'Pending',
    lastUpdateDate: '2024-01-16',
    reason: 'Quality issue',
    submissionDate: '2024-01-15',
    supplierId: 'SUP003'
  },
  {
    id: '6',
    orderItemId: 'ORD006',
    trackingId: 'TRK006',
    supplierCity: 'Peshawar',
    deliveryPartner: 'TCS',
    supplierName: 'Demo Supplier',
    supplierEmail: 'supplier@demo',
    status: 'Fake Signatures',
    lastUpdateDate: '2024-01-13',
    reason: 'Suspicious signature detected',
    submissionDate: '2024-01-12',
    supplierId: 'SUP001'
  },
  {
    id: '7',
    orderItemId: 'ORD007',
    trackingId: 'TRK007',
    supplierCity: 'Quetta',
    deliveryPartner: 'Leopards',
    supplierName: 'Fourth Supplier',
    supplierEmail: 'fourth@supplier.com',
    status: 'Paid',
    lastUpdateDate: '2024-01-17',
    reason: 'Payment compensation requested',
    submissionDate: '2024-01-16',
    supplierId: 'SUP004'
  }
];

class GoogleSheetsService {
  private isDemoMode: boolean;

  constructor() {
    // Check if we're in demo mode
    this.isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || true; // Default to demo mode
  }

  async getDisputes(supplierId?: string): Promise<Dispute[]> {
    if (this.isDemoMode) {
      // Return mock data, filtered by supplier if needed
      let disputes = [...MOCK_DISPUTES];
      
      if (supplierId) {
        disputes = disputes.filter(d => d.supplierId === supplierId);
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return disputes;
    }

    // TODO: Implement actual Google Sheets API call
    // This would use the Google Sheets API to read from the provided sheet
    throw new Error('Google Sheets API integration not implemented yet');
  }

  async updateDisputeStatus(disputeId: string, status: Dispute['status']): Promise<boolean> {
    if (this.isDemoMode) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // In a real implementation, this would update the Google Sheet
      const disputeIndex = MOCK_DISPUTES.findIndex(d => d.id === disputeId);
      if (disputeIndex !== -1) {
        MOCK_DISPUTES[disputeIndex].status = status;
        MOCK_DISPUTES[disputeIndex].lastUpdateDate = new Date().toISOString().split('T')[0];
        return true;
      }
      return false;
    }

    // TODO: Implement actual Google Sheets API call
    throw new Error('Google Sheets API integration not implemented yet');
  }

  async createDispute(dispute: Omit<Dispute, 'id' | 'submissionDate' | 'lastUpdateDate'>): Promise<boolean> {
    if (this.isDemoMode) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newDispute: Dispute = {
        ...dispute,
        id: `DISP${Date.now()}`,
        submissionDate: new Date().toISOString().split('T')[0],
        lastUpdateDate: new Date().toISOString().split('T')[0],
        status: 'Pending'
      };
      
      MOCK_DISPUTES.unshift(newDispute);
      return true;
    }

    // TODO: Implement actual Google Sheets API call
    throw new Error('Google Sheets API integration not implemented yet');
  }

  calculateMetrics(disputes: Dispute[]): DisputeMetrics {
    return {
      totalSubmitted: disputes.length,
      totalPending: disputes.filter(d => d.status === 'Pending').length,
      totalResolved: disputes.filter(d => d.status === 'Resolved').length,
      totalInProgress: disputes.filter(d => d.status === 'In Progress').length,
      totalRejected: disputes.filter(d => d.status === 'Rejected').length,
      totalFakeSignatures: disputes.filter(d => d.status === 'Fake Signatures').length,
      totalPaid: disputes.filter(d => d.status === 'Paid').length
    };
  }

  async getDisputesByStatus(): Promise<Record<string, number>> {
    const disputes = await this.getDisputes();
    return {
      Pending: disputes.filter(d => d.status === 'Pending').length,
      'In Progress': disputes.filter(d => d.status === 'In Progress').length,
      Resolved: disputes.filter(d => d.status === 'Resolved').length,
      Rejected: disputes.filter(d => d.status === 'Rejected').length,
      'Fake Signatures': disputes.filter(d => d.status === 'Fake Signatures').length,
      Paid: disputes.filter(d => d.status === 'Paid').length
    };
  }

  async sendNotification(dispute: Dispute, newStatus: string): Promise<void> {
    // TODO: Implement email notification via Gmail API or Apps Script
    console.log(`Notification sent for dispute ${dispute.id}: Status changed to ${newStatus}`);
  }
}

export const googleSheetsService = new GoogleSheetsService();