import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { DisputeTable } from '@/components/DisputeTable';
import DisputeCharts from '@/components/ui/DisputeCharts';
import { googleSheetsService, Dispute } from '@/services/googleSheets';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Users,
  TrendingUp,
  BarChart3,
  Shield,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export const AdminDashboard: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const loadDisputes = async () => {
    setIsLoading(true);
    try {
      // Admin sees all disputes (no supplier filter)
      const data = await googleSheetsService.getDisputes();
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
  }, []);

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

  const metrics = googleSheetsService.calculateMetrics(disputes);
  const uniqueSuppliers = new Set(disputes.map(d => d.supplierEmail)).size;

  // Prepare chart data
  const statusData = {
    'Pending': metrics.totalPending,
    'In Progress': metrics.totalInProgress,
    'Resolved': metrics.totalResolved,
    'Rejected': metrics.totalRejected,
    'Fake Signatures': metrics.totalFakeSignatures,
    'Paid': metrics.totalPaid
  };

  // Calculate age distribution for pending disputes
  const pendingDisputes = disputes.filter(d => d.status === 'Pending');
  const ageData = [
    { days: '0-3 days', count: pendingDisputes.filter(d => getDaysOld(d.submissionDate) <= 3).length },
    { days: '4-7 days', count: pendingDisputes.filter(d => getDaysOld(d.submissionDate) > 3 && getDaysOld(d.submissionDate) <= 7).length },
    { days: '8-14 days', count: pendingDisputes.filter(d => getDaysOld(d.submissionDate) > 7 && getDaysOld(d.submissionDate) <= 14).length },
    { days: '15+ days', count: pendingDisputes.filter(d => getDaysOld(d.submissionDate) > 14).length }
  ];

  function getDaysOld(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Admin Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage all supplier return disputes
            </p>
          </div>
          <Button 
            onClick={loadDisputes}
            variant="outline"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <TrendingUp className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-4">
          <MetricCard
            title="Total Disputes"
            value={metrics.totalSubmitted}
            icon={FileText}
            className="animate-scale-in"
          />
          <MetricCard
            title="Active Suppliers"
            value={uniqueSuppliers}
            icon={Users}
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
              All Disputes
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Overview */}
              <Card className="bg-card border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle>System Overview</CardTitle>
                  <CardDescription>Key metrics and system health</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{metrics.totalSubmitted}</div>
                      <div className="text-sm text-muted-foreground">Total Disputes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{uniqueSuppliers}</div>
                      <div className="text-sm text-muted-foreground">Active Suppliers</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Resolution Rate</span>
                      <span className="text-success">
                        {metrics.totalSubmitted > 0 
                          ? Math.round((metrics.totalResolved / metrics.totalSubmitted) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ 
                          width: `${metrics.totalSubmitted > 0 
                            ? (metrics.totalResolved / metrics.totalSubmitted) * 100
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activities */}
              <Card className="bg-card border-border/50 shadow-card">
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                  <CardDescription>Latest dispute submissions and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  {disputes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No disputes in the system</p>
                      <p className="text-sm mt-2">Disputes will appear here once submitted</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {disputes.slice(0, 5).map((dispute) => (
                        <div key={dispute.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                          <div>
                            <p className="font-medium text-foreground">{dispute.orderItemId}</p>
                            <p className="text-sm text-muted-foreground">
                              {dispute.supplierName} • {dispute.supplierCity}
                            </p>
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
            </div>
          </TabsContent>

          <TabsContent value="disputes">
            <DisputeTable
              disputes={disputes}
              onStatusUpdate={handleStatusUpdate}
              isAdmin={true}
              isLoading={isLoading}
              onRefresh={loadDisputes}
            />
          </TabsContent>

            <TabsContent value="analytics">
            <DisputeCharts 
            statusData={statusData}
              ageData={ageData}
            />
            </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};
