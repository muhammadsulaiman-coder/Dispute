import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

// Updated interface to match Google Sheets data structure
interface Dispute {
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
  Status: "Pending" | "In Progress" | "Resolved" | "Rejected" | "Under Review";
  [key: string]: any;
}

interface DisputeTableProps {
  disputes: Dispute[];
  onStatusUpdate: (
    disputeId: string,
    newStatus: Dispute["Status"]
  ) => Promise<void>;
  isAdmin?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const getStatusVariant = (status: Dispute["Status"]) => {
  switch (status) {
    case "Pending":
      return "status-pending";
    case "In Progress":
      return "status-progress";
    case "Resolved":
      return "status-resolved";
    case "Rejected":
      return "status-rejected";
    case "Under Review":
      return "status-warning";
    default:
      return "default";
  }
};

const getPriorityVariant = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "outline";
  }
};

export const DisputeTable: React.FC<DisputeTableProps> = ({
  disputes,
  onStatusUpdate,
  isAdmin = false,
  isLoading = false,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [updatingDisputes, setUpdatingDisputes] = useState<Set<string>>(
    new Set()
  );
  const { toast } = useToast();

  const getDaysPassedSinceSubmission = (submissionDate: string) => {
    const today = new Date();
    const submission = new Date(submissionDate);
    const diffTime = Math.abs(today.getTime() - submission.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const exportToExcel = () => {
    const exportData = filteredDisputes.map((dispute) => ({
      "Supplier ID": dispute.supplierId,
      "Supplier Name": dispute.supplierName,
      "Supplier Email": dispute.supplierEmail,
      "Order Number": dispute.orderNumber,
      "Dispute Type": dispute.disputeType,
      "Category": dispute.category,
      "Priority": dispute.priority,
      "Amount": dispute.disputeAmount,
      "Status": dispute.Status,
      "Description": dispute.disputeDescription,
      "Submission Date": dispute.Timestamp,
      "Days Since Submission": getDaysPassedSinceSubmission(dispute.Timestamp),
      "Contact Phone": dispute.contactPhone || "",
      "Expected Resolution": dispute.expectedResolution || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Disputes");

    const fileName = `disputes_export_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Export Successful",
      description: "Disputes data has been downloaded as Excel file.",
    });
  };

  const filteredDisputes = useMemo(() => {
    return disputes.filter((dispute) => {
      const matchesSearch =
        dispute.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.supplierEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.supplierId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.disputeDescription?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || dispute.Status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || dispute.priority === priorityFilter;
      const matchesType =
        typeFilter === "all" || dispute.disputeType === typeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesType;
    });
  }, [disputes, searchTerm, statusFilter, priorityFilter, typeFilter]);

  const uniquePriorities = useMemo(() => {
    return Array.from(new Set(disputes.map((d) => d.priority).filter(Boolean))).sort();
  }, [disputes]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(disputes.map((d) => d.disputeType).filter(Boolean))).sort();
  }, [disputes]);

  const handleStatusChange = async (
    disputeId: string,
    newStatus: Dispute["Status"]
  ) => {
    setUpdatingDisputes((prev) => new Set(prev).add(disputeId));

    try {
      await onStatusUpdate(disputeId, newStatus);
      toast({
        title: "Status Updated",
        description: `Dispute status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update dispute status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingDisputes((prev) => {
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
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
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
              placeholder="Search by Order Number, Supplier Name, Email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-input border-border">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32 bg-input border-border">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Priority</SelectItem>
                {uniquePriorities.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 bg-input border-border">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="min-w-[120px]">Order Number</TableHead>
                  <TableHead className="min-w-[150px]">Supplier</TableHead>
                  <TableHead className="min-w-[120px]">Type</TableHead>
                  <TableHead className="min-w-[100px]">Priority</TableHead>
                  <TableHead className="min-w-[100px]">Amount</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">Submission Date</TableHead>
                  <TableHead className="min-w-[100px]">Days Passed</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  {isAdmin && <TableHead className="min-w-[130px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDisputes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 10 : 9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {isLoading ? "Loading disputes..." : "No disputes found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDisputes.map((dispute, index) => (
                    <TableRow key={dispute.supplierId + index} className="hover:bg-muted/10">
                      <TableCell className="font-medium">
                        {dispute.orderNumber || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">
                            {dispute.supplierName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dispute.supplierEmail}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {dispute.supplierId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{dispute.disputeType}</div>
                        {dispute.category && (
                          <div className="text-xs text-muted-foreground">
                            {dispute.category}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getPriorityVariant(dispute.priority)}
                          className="text-xs"
                        >
                          {dispute.priority || "Medium"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {dispute.disputeAmount ? `$${dispute.disputeAmount}` : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`status-badge ${getStatusVariant(
                            dispute.Status
                          )}`}
                        >
                          {dispute.Status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dispute.Timestamp 
                          ? new Date(dispute.Timestamp).toLocaleDateString()
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dispute.Timestamp
                          ? `${getDaysPassedSinceSubmission(dispute.Timestamp)} days`
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-[200px] truncate" title={dispute.disputeDescription}>
                          {dispute.disputeDescription}
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Select
                            value={dispute.Status}
                            onValueChange={(value) =>
                              handleStatusChange(
                                dispute.supplierId + index,
                                value as Dispute["Status"]
                              )
                            }
                            disabled={updatingDisputes.has(dispute.supplierId + index)}
                          >
                            <SelectTrigger className="w-32 bg-input border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="In Progress">
                                In Progress
                              </SelectItem>
                              <SelectItem value="Resolved">Resolved</SelectItem>
                              <SelectItem value="Rejected">Rejected</SelectItem>
                              <SelectItem value="Under Review">
                                Under Review
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};