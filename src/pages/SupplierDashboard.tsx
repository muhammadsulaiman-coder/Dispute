import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { DisputeTable } from '@/components/DisputeTable';
import { NewDisputeForm } from '@/components/NewDisputeForm';
import { useAuth } from '@/contexts/AuthContext';
import { googleSheetsService, Dispute } from '@/services/googleSheets';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  BarChart3,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export const SupplierDashboard: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  const { toast } = useToast();

  const loadDisputes = async () => {
    if (!user?.supplierId) return;
    
    setIsLoading(true);
    try {
      const data = await googleSheetsService.getDisputes(user.supplierId);
      setDisputes(data);
    } catch (error) {
      console.error('Error loading disputes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load disputes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, [user?.supplierId]);

  const handleStatusUpdate = async (disputeId: string, newStatus: Dispute['status']) => {
    try {
      await googleSheetsService.updateDisputeStatus(disputeId, newStatus);
      await loadDisputes(); // Refresh the data
      
      // Send notification
      const dispute = disputes.find(d => d.id === disputeId);
      if (dispute) {
        await googleSheetsService.sendNotification(dispute, newStatus);
      }
    } catch (error) {
      console.error('Error updating dispute status:', error);
      throw error;
    }
  };

  const handleNewDispute = async (disputeData: {
    orderItemId: string;
    trackingId: string;
    reason: string;
    supplierName: string;
    supplierEmail: string;
    supplierId?: string;
  }) => {
    try {
      await googleSheetsService.createDispute({
        ...disputeData,
        supplierCity: 'Not specified', // This could be fetched from supplier profile
        deliveryPartner: 'TBD', // This could be auto-filled from Redash API
        status: 'Pending'
      });
      await loadDisputes(); // Refresh the data
      setActiveTab('disputes'); // Switch to disputes tab to see the new dispute
    } catch (error) {
      console.error('Error creating dispute:', error);
      throw error;
    }
  };

  const metrics = googleSheetsService.calculateMetrics(disputes);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.supplierName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your return disputes and track their progress
            </p>
          </div>
          <Button 
            onClick={() => setActiveTab('new-dispute')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Dispute
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
          <MetricCard
            title="Total Submitted"
            value={metrics.totalSubmitted}
            icon={FileText}
            className="animate-scale-in"
          />
          <MetricCard
            title="Pending"
            value={metrics.totalPending}
            icon={Clock}
            className="animate-scale-in"
          />
          <MetricCard
            title="In Progress"
            value={metrics.totalInProgress}
            icon={AlertCircle}
            className="animate-scale-in"
          />
          <MetricCard
            title="Resolved"
            value={metrics.totalResolved}
            icon={CheckCircle}
            className="animate-scale-in"
          />
          <MetricCard
            title="Rejected"
            value={metrics.totalRejected}
            icon={XCircle}
            className="animate-scale-in"
          />
          <MetricCard
            title="Fake Signatures"
            value={metrics.totalFakeSignatures}
            icon={AlertTriangle}
            className="animate-scale-in"
          />
          <MetricCard
            title="Paid"
            value={metrics.totalPaid}
            icon={DollarSign}
            className="animate-scale-in"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/20">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My Disputes
            </TabsTrigger>
            <TabsTrigger value="new-dispute" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Dispute
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="bg-card border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates on your disputes</CardDescription>
                </CardHeader>
                <CardContent>
                  {disputes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No disputes submitted yet</p>
                      <p className="text-sm mt-2">Click "New Dispute" to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {disputes.slice(0, 5).map((dispute) => (
                        <div key={dispute.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                          <div>
                            <p className="font-medium text-foreground">{dispute.orderItemId}</p>
                            <p className="text-sm text-muted-foreground">{dispute.reason?.substring(0, 50)}...</p>
                          </div>
                          <div className={`status-badge ${
                            dispute.status === 'Pending' ? 'status-pending' :
                            dispute.status === 'In Progress' ? 'status-progress' :
                            dispute.status === 'Resolved' ? 'status-resolved' :
                            'status-rejected'
                          }`}>
                            {dispute.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-card border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('new-dispute')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Submit New Dispute
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('disputes')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View All Disputes
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={loadDisputes}
                    disabled={isLoading}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="disputes">
            <DisputeTable
              disputes={disputes}
              onStatusUpdate={handleStatusUpdate}
              isAdmin={false}
              isLoading={isLoading}
              onRefresh={loadDisputes}
            />
          </TabsContent>

          <TabsContent value="new-dispute">
            <NewDisputeForm 
              onSubmit={handleNewDispute}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};