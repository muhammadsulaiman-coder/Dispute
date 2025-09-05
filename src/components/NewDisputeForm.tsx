import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface NewDisputeFormProps {
  onSubmit: (dispute: {
    orderItemId: string;
    trackingId: string;
    reason: string;
    supplierName: string;
    supplierEmail: string;
    supplierId?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const NewDisputeForm: React.FC<NewDisputeFormProps> = ({
  onSubmit,
  isLoading = false
}) => {
  const [orderItemId, setOrderItemId] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!orderItemId.trim() || !trackingId.trim() || !reason.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        orderItemId: orderItemId.trim(),
        trackingId: trackingId.trim(),
        reason: reason.trim(),
        supplierName: user.supplierName || user.email,
        supplierEmail: user.email,
        supplierId: user.supplierId
      });

      // Reset form
      setOrderItemId('');
      setTrackingId('');
      setReason('');
      
      toast({
        title: 'Dispute Submitted',
        description: 'Your dispute has been successfully submitted for review.',
      });
    } catch (error) {
      console.error('Error submitting dispute:', error);
      setError('Failed to submit dispute. Please try again.');
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit dispute. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-card border-border/50 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Submit New Dispute
        </CardTitle>
        <CardDescription>
          Create a new return dispute for investigation
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderItemId">
                Order Item ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="orderItemId"
                type="text"
                placeholder="e.g., ORD12345"
                value={orderItemId}
                onChange={(e) => setOrderItemId(e.target.value)}
                className="bg-input border-border focus:ring-primary"
                disabled={isSubmitting || isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingId">
                Tracking ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="trackingId"
                type="text"
                placeholder="e.g., TRK12345"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="bg-input border-border focus:ring-primary"
                disabled={isSubmitting || isLoading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Dispute <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please describe the issue with this order/delivery..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-input border-border focus:ring-primary min-h-[100px]"
              disabled={isSubmitting || isLoading}
              required
            />
            <p className="text-sm text-muted-foreground">
              Provide detailed information about the issue to help us process your dispute faster.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="animate-slide-up">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t border-border">
            <Button
              type="submit"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Dispute
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};