import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, RefreshCw, Download } from 'lucide-react';
import { Dispute } from '@/services/googleSheets';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface DisputeTableProps {
  disputes: Dispute[];
  onStatusUpdate: (disputeId: string, newStatus: Dispute['status']) => Promise<void>;
  isAdmin?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const getStatusVariant = (status: Dispute['status']) => {
  switch (status) {
    case 'Pending':
      return 'status-pending';
    case 'In Progress':
      return 'status-progress';
    case 'Resolved':
      return 'status-resolved';
    case 'Rejected':
      return 'status-rejected';
    case 'Fake Signatures':
      return 'status-warning';
    case 'Paid':
      return 'status-success';
    default:
      return 'default';
  }
};

export const DisputeTable: React.FC<DisputeTableProps> = ({
  disputes,
  onStatusUpdate,
  isAdmin = false,
  isLoading = false,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [updatingDisputes, setUpdatingDisputes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const getDaysPassedSinceSubmission = (submissionDate: string) => {
    const today = new Date();
    const submission = new Date(submissionDate);
    const diffTime = Math.abs(today.getTime() - submission.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const exportToExcel = () => {
    const exportData = filteredDisputes.map(dispute => ({
      'Order Item ID': dispute.orderItemId,
      'Tracking ID': dispute.trackingId,
      'City': dispute.supplierCity,
      'Delivery Partner': dispute.deliveryPartner,
      'Status': dispute.status,
      'Submission Date': dispute.submissionDate,
      'Days Since Submission': getDaysPassedSinceSubmission(dispute.submissionDate),
      'Last Update': dispute.lastUpdateDate,
      'Reason': dispute.reason || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Disputes');
    
    const fileName = `disputes_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: 'Export Successful',
      description: 'Disputes data has been downloaded as Excel file.',
    });
  };

  const filteredDisputes = useMemo(() => {
    return disputes.filter(dispute => {
      const matchesSearch = 
        dispute.orderItemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.supplierEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
      const matchesCity = cityFilter === 'all' || dispute.supplierCity === cityFilter;
      
      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [disputes, searchTerm, statusFilter, cityFilter]);

  const uniqueCities = useMemo(() => {
    return Array.from(new Set(disputes.map(d => d.supplierCity))).sort();
  }, [disputes]);

  const handleStatusChange = async (disputeId: string, newStatus: Dispute['status']) => {
    setUpdatingDisputes(prev => new Set(prev).add(disputeId));
    
    try {
      await onStatusUpdate(disputeId, newStatus);
      toast({
        title: 'Status Updated',
        description: `Dispute status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update dispute status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingDisputes(prev => {
        const newSet = new Set(prev);
        newSet.delete(disputeId);
        return newSet;
      });
    }
  };

  return (
    <Card className="bg-card border-border/50 shadow-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl font-semibold">
            Dispute Management ({filteredDisputes.length})
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Order ID, Tracking ID, Supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-input border-border">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Fake Signatures">Fake Signatures</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-32 bg-input border-border">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Cities</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead>Order Item ID</TableHead>
                <TableHead>Tracking ID</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Delivery Partner</TableHead>
                {isAdmin && <TableHead>Supplier</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Days Passed</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDisputes.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={isAdmin ? 9 : 8} 
                    className="text-center py-8 text-muted-foreground"
                  >
                    {isLoading ? 'Loading disputes...' : 'No disputes found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDisputes.map((dispute) => (
                  <TableRow key={dispute.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium">{dispute.orderItemId}</TableCell>
                    <TableCell>{dispute.trackingId}</TableCell>
                    <TableCell>{dispute.supplierCity}</TableCell>
                    <TableCell>{dispute.deliveryPartner}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div>
                          <div className="font-medium">{dispute.supplierName}</div>
                          <div className="text-sm text-muted-foreground">{dispute.supplierEmail}</div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge className={`status-badge ${getStatusVariant(dispute.status)}`}>
                        {dispute.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(dispute.submissionDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getDaysPassedSinceSubmission(dispute.submissionDate)} days
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(dispute.lastUpdateDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Select
                          value={dispute.status}
                          onValueChange={(value) => handleStatusChange(dispute.id, value as Dispute['status'])}
                          disabled={updatingDisputes.has(dispute.id)}
                        >
                          <SelectTrigger className="w-32 bg-input border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                            <SelectItem value="Fake Signatures">Fake Signatures</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-sm">
                          {dispute.status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};