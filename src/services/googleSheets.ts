// googlesheet.ts - Complete Google Sheets API Integration for Dispute Management System

// Configuration
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxc-nY6icCM1G70MuKP7OrDMkOw6PpCHt--peHHaZDCRJmiPv7DfEKpQs9H4DHBW9yA/exec';

// Types
export interface DisputeData {
  supplierName?: string;
  supplierEmail?: string;
  supplierId?: string;
  disputeType?: string;
  disputeDescription?: string;
  orderNumber?: string;
  disputeAmount?: string;
  attachments?: string;
  priority?: string;
  category?: string;
  subcategory?: string;
  expectedResolution?: string;
  contactPhone?: string;
  preferredContactMethod?: string;
  [key: string]: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: {
    supplierId: string;
    supplierName: string;
    email: string;
    role: string;
  };
  message?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Google Sheets API Class
export class GoogleSheetsAPI {
  private baseUrl: string;

  constructor(scriptUrl: string = GOOGLE_APPS_SCRIPT_URL) {
    this.baseUrl = scriptUrl;
  }

  // Generic method to handle API calls
  private async makeRequest<T>(
    method: 'GET' | 'POST',
    params: any = {},
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      let url = this.baseUrl;
      
      if (method === 'GET' && params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
      }

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (method === 'POST' && body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get data from specific sheet
  async getSheetData(sheetName: string = 'Supplierview'): Promise<ApiResponse<any[]>> {
    return this.makeRequest<any[]>('GET', { tab: sheetName });
  }

  // Get all supplier view data
  async getSupplierViewData(): Promise<ApiResponse<any[]>> {
    return this.getSheetData('Supplierview');
  }

  // Get admin portal data
  async getAdminPortalData(): Promise<ApiResponse<any[]>> {
    return this.getSheetData('Adminportal');
  }

  // Get new form submissions
  async getNewFormData(): Promise<ApiResponse<any[]>> {
    return this.getSheetData('Newform');
  }

  // Get login activity logs
  async getLoginActivityData(): Promise<ApiResponse<any[]>> {
    return this.getSheetData('LoginActivity');
  }

  // Get login credentials (for admin purposes only)
  async getLoginCredentials(): Promise<ApiResponse<any[]>> {
    return this.getSheetData('LoginCredentials');
  }

  // Create a new dispute
  async createDispute(disputeData: DisputeData): Promise<ApiResponse> {
    const body = {
      action: 'createDispute',
      ...disputeData
    };

    return this.makeRequest('POST', {}, body);
  }

  // Login supplier
  async loginSupplier(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    const body = {
      action: 'loginSupplier',
      email: credentials.email,
      password: credentials.password
    };

    const response = await this.makeRequest<LoginResponse>('POST', {}, body);
    return response;
  }

  // Get disputes by supplier ID
  async getDisputesBySupplierId(supplierId: string): Promise<ApiResponse<any[]>> {
    const response = await this.getSupplierViewData();
    
    if (response.success && response.data) {
      const filteredDisputes = response.data.filter(
        (dispute: any) => dispute.supplierId === supplierId
      );
      
      return {
        success: true,
        data: filteredDisputes
      };
    }
    
    return response;
  }

  // Get disputes by status
  async getDisputesByStatus(status: string): Promise<ApiResponse<any[]>> {
    const response = await this.getAdminPortalData();
    
    if (response.success && response.data) {
      const filteredDisputes = response.data.filter(
        (dispute: any) => dispute.Status === status
      );
      
      return {
        success: true,
        data: filteredDisputes
      };
    }
    
    return response;
  }

  // Get disputes by date range
  async getDisputesByDateRange(startDate: Date, endDate: Date): Promise<ApiResponse<any[]>> {
    const response = await this.getSupplierViewData();
    
    if (response.success && response.data) {
      const filteredDisputes = response.data.filter((dispute: any) => {
        if (!dispute.Timestamp) return false;
        
        const disputeDate = new Date(dispute.Timestamp);
        return disputeDate >= startDate && disputeDate <= endDate;
      });
      
      return {
        success: true,
        data: filteredDisputes
      };
    }
    
    return response;
  }

  // Search disputes by keyword
  async searchDisputes(keyword: string, fields: string[] = ['disputeDescription', 'supplierName', 'orderNumber']): Promise<ApiResponse<any[]>> {
    const response = await this.getSupplierViewData();
    
    if (response.success && response.data) {
      const filteredDisputes = response.data.filter((dispute: any) => {
        return fields.some(field => {
          const fieldValue = dispute[field];
          return fieldValue && 
                 fieldValue.toString().toLowerCase().includes(keyword.toLowerCase());
        });
      });
      
      return {
        success: true,
        data: filteredDisputes
      };
    }
    
    return response;
  }

  // Get dispute statistics
  async getDisputeStats(): Promise<ApiResponse<{
    total: number;
    pending: number;
    resolved: number;
    inProgress: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }>> {
    const response = await this.getAdminPortalData();
    
    if (!response.success || !response.data) {
      return response as ApiResponse<any>;
    }

    const disputes = response.data;
    const stats = {
      total: disputes.length,
      pending: 0,
      resolved: 0,
      inProgress: 0,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>
    };

    disputes.forEach((dispute: any) => {
      // Count by status
      const status = dispute.Status?.toLowerCase();
      if (status === 'pending') stats.pending++;
      else if (status === 'resolved') stats.resolved++;
      else if (status === 'in progress') stats.inProgress++;

      // Count by type
      const type = dispute.disputeType;
      if (type) {
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }

      // Count by priority
      const priority = dispute.priority;
      if (priority) {
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
      }
    });

    return {
      success: true,
      data: stats
    };
  }

  // Validate supplier credentials
  async validateSupplier(email: string, supplierId: string): Promise<ApiResponse<boolean>> {
    const response = await this.getLoginCredentials();
    
    if (response.success && response.data) {
      const supplier = response.data.find(
        (cred: any) => cred.email === email && cred.supplierId === supplierId
      );
      
      return {
        success: true,
        data: !!supplier
      };
    }
    
    return {
      success: false,
      error: 'Unable to validate supplier credentials'
    };
  }

  // Get recent login activity
  async getRecentLoginActivity(limit: number = 10): Promise<ApiResponse<any[]>> {
    const response = await this.getLoginActivityData();
    
    if (response.success && response.data) {
      // Sort by timestamp (most recent first) and limit results
      const sortedActivity = response.data
        .sort((a: any, b: any) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime())
        .slice(0, limit);
      
      return {
        success: true,
        data: sortedActivity
      };
    }
    
    return response;
  }

  // Check system health (test connection)
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    try {
      const response = await this.getSheetData('Supplierview');
      
      if (response.success) {
        return {
          success: true,
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString()
          }
        };
      } else {
        return {
          success: false,
          error: 'Health check failed: ' + response.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Health check failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }
}

// Export singleton instance
export const googleSheetsAPI = new GoogleSheetsAPI();

// Dispute Type Definition
export interface Dispute {
  Timestamp: string;
  supplierName: string;
  supplierEmail: string;
  supplierId: string;
  disputeType: string;
  disputeDescription: string;
  orderNumber: string;
  disputeAmount: string;
  attachments?: string;
  priority: string;
  category: string;
  subcategory?: string;
  expectedResolution?: string;
  contactPhone?: string;
  preferredContactMethod?: string;
  Status: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected' | 'Under Review' | 'Fake Signatures' | 'Paid';
  [key: string]: any;
}

// Get all disputes
export async function getDisputes(supplierIdFilter?: string): Promise<Dispute[]> {
  const response = await googleSheetsAPI.getAdminPortalData();
  
  if (response.success && response.data) {
    let disputes = response.data.map((row: any) => ({
      Timestamp: row.Timestamp || row.submissionDate || '',
      supplierName: row.supplierName || row.Supplier || '',
      supplierEmail: row.supplierEmail || '',
      supplierId: row.supplierId || row.SupplierID || '',
      disputeType: row.disputeType || '',
      disputeDescription: row.disputeDescription || row.ReasonforDispute || '',
      orderNumber: row.orderNumber || row.OrderItemID || '',
      disputeAmount: row.disputeAmount || '',
      attachments: row.attachments || '',
      priority: row.priority || 'Medium',
      category: row.category || '',
      subcategory: row.subcategory || '',
      expectedResolution: row.expectedResolution || '',
      contactPhone: row.contactPhone || '',
      preferredContactMethod: row.preferredContactMethod || '',
      Status: row.Status || row.status || 'Pending',
    }));

    if (supplierIdFilter) {
      disputes = disputes.filter((d: Dispute) => d.supplierId === supplierIdFilter);
    }

    return disputes;
  }
  
  return [];
}

// Update dispute status
export async function updateDisputeStatus(disputeId: string, newStatus: Dispute['Status']): Promise<boolean> {
  // In production, this would make an API call to update the status
  console.log(`Updating dispute ${disputeId} to status: ${newStatus}`);
  return true;
}

// Send notification
export async function sendNotification(dispute: Dispute, newStatus: Dispute['Status']): Promise<void> {
  console.log(`Sending notification for dispute ${dispute.supplierId} with status: ${newStatus}`);
  // In production, this would send an email notification
}

// Calculate metrics from disputes
export function calculateMetrics(disputes: Dispute[]) {
  return {
    totalSubmitted: disputes.length,
    totalPending: disputes.filter(d => d.Status === 'Pending').length,
    totalInProgress: disputes.filter(d => d.Status === 'In Progress').length,
    totalResolved: disputes.filter(d => d.Status === 'Resolved').length,
    totalRejected: disputes.filter(d => d.Status === 'Rejected').length,
    totalFakeSignatures: disputes.filter(d => d.Status === 'Fake Signatures').length,
    totalPaid: disputes.filter(d => d.Status === 'Paid').length
  };
}

// Create a new dispute
export async function createDispute(disputeData: Partial<Dispute>): Promise<boolean> {
  const body = {
    action: 'createDispute',
    ...disputeData,
    Timestamp: new Date().toISOString(),
  };

  const response = await googleSheetsAPI.createDispute(body);
  return response.success;
}

// Utility functions
export const DisputeUtils = {
  // Format dispute data for display
  formatDisputeForDisplay: (dispute: any) => ({
    id: dispute.supplierId || 'N/A',
    supplierName: dispute.supplierName || 'Unknown',
    disputeType: dispute.disputeType || 'General',
    status: dispute.Status || 'Pending',
    amount: dispute.disputeAmount ? `$${dispute.disputeAmount}` : 'N/A',
    date: dispute.Timestamp ? new Date(dispute.Timestamp).toLocaleDateString() : 'N/A',
    priority: dispute.priority || 'Medium',
    orderNumber: dispute.orderNumber || 'N/A'
  }),

  // Validate dispute data before submission
  validateDisputeData: (data: DisputeData): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data.supplierName?.trim()) errors.push('Supplier name is required');
    if (!data.supplierEmail?.trim()) errors.push('Supplier email is required');
    if (!data.disputeDescription?.trim()) errors.push('Dispute description is required');
    if (!data.disputeType?.trim()) errors.push('Dispute type is required');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.supplierEmail && !emailRegex.test(data.supplierEmail)) {
      errors.push('Invalid email format');
    }
    
    // Validate amount if provided
    if (data.disputeAmount && isNaN(Number(data.disputeAmount))) {
      errors.push('Dispute amount must be a valid number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Generate unique dispute ID
  generateDisputeId: (): string => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `DSP-${timestamp}-${random}`;
  }
};
// Wrapper service export (to match imports in SupplierDashboard.tsx)
export const googleSheetsService = {
  getSheetData: googleSheetsAPI.getSheetData.bind(googleSheetsAPI),
  getSupplierViewData: googleSheetsAPI.getSupplierViewData.bind(googleSheetsAPI),
  getAdminPortalData: googleSheetsAPI.getAdminPortalData.bind(googleSheetsAPI),
  getNewFormData: googleSheetsAPI.getNewFormData.bind(googleSheetsAPI),
  getLoginActivityData: googleSheetsAPI.getLoginActivityData.bind(googleSheetsAPI),
  getLoginCredentials: googleSheetsAPI.getLoginCredentials.bind(googleSheetsAPI),
  createDispute: createDispute,
  loginSupplier: googleSheetsAPI.loginSupplier.bind(googleSheetsAPI),
  getDisputesBySupplierId: googleSheetsAPI.getDisputesBySupplierId.bind(googleSheetsAPI),
  getDisputesByStatus: googleSheetsAPI.getDisputesByStatus.bind(googleSheetsAPI),
  getDisputesByDateRange: googleSheetsAPI.getDisputesByDateRange.bind(googleSheetsAPI),
  searchDisputes: googleSheetsAPI.searchDisputes.bind(googleSheetsAPI),
  getDisputeStats: googleSheetsAPI.getDisputeStats.bind(googleSheetsAPI),
  validateSupplier: googleSheetsAPI.validateSupplier.bind(googleSheetsAPI),
  getRecentLoginActivity: googleSheetsAPI.getRecentLoginActivity.bind(googleSheetsAPI),
  healthCheck: googleSheetsAPI.healthCheck.bind(googleSheetsAPI),
  getDisputes: getDisputes,
  updateDisputeStatus: updateDisputeStatus,
  sendNotification: sendNotification,
  calculateMetrics: calculateMetrics
};


// Export default
export default googleSheetsAPI;