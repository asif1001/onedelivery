import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  DownloadIcon, 
  TrashIcon,
  CalendarIcon,
  ImageIcon,
  AlertTriangleIcon,
  CheckIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { getAllTransactions, downloadPhotosInDateRange, deletePhotosInDateRange } from '@/lib/firebase';

interface PhotoManagementProps {
  onClose: () => void;
}

export function PhotoManagement({ onClose }: PhotoManagementProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Get transactions to show photo statistics
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: () => getAllTransactions(),
  });

  const handleDownloadPhotos = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Date Range Required",
        description: "Please select both start and end dates",
        variant: "destructive"
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid Date Range",
        description: "Start date must be before end date",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    try {
      console.log('🔽 Starting photo download for date range:', startDate, 'to', endDate);
      await downloadPhotosInDateRange(startDate, endDate);
      
      toast({
        title: "Download Started",
        description: "Photos are being prepared for download...",
        variant: "default"
      });
    } catch (error) {
      console.error('Photo download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download photos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeletePhotos = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Date Range Required",
        description: "Please select both start and end dates",
        variant: "destructive"
      });
      return;
    }

    if (deleteConfirmation !== 'DELETE PHOTOS') {
      toast({
        title: "Confirmation Required",
        description: "Please type 'DELETE PHOTOS' to confirm deletion",
        variant: "destructive"
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid Date Range",
        description: "Start date must be before end date",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      console.log('🗑️ Starting photo deletion for date range:', startDate, 'to', endDate);
      const deletedCount = await deletePhotosInDateRange(startDate, endDate);
      
      toast({
        title: "Photos Deleted",
        description: `Successfully deleted ${deletedCount} photos`,
        variant: "default"
      });
      
      setDeleteConfirmation('');
    } catch (error) {
      console.error('Photo deletion error:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete photos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate photo statistics for the selected date range
  const getPhotoStats = () => {
    if (!startDate || !endDate || !transactions.length) return { count: 0, transactions: 0 };

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end date

    const filteredTransactions = transactions.filter((t: any) => {
      const transactionDate = new Date(t.timestamp || t.actualDeliveryStartTime);
      return transactionDate >= start && transactionDate <= end;
    });

    const photoCount = filteredTransactions.reduce((count: number, transaction: any) => {
      const photos = transaction.photos || {};
      return count + Object.keys(photos).filter(key => photos[key]).length;
    }, 0);

    return {
      count: photoCount,
      transactions: filteredTransactions.length
    };
  };

  const stats = getPhotoStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <ImageIcon className="w-8 h-8" />
            <CardTitle className="text-2xl font-bold">Photo Management</CardTitle>
          </div>
          <p className="text-blue-100">Download or delete photos by date range</p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Start Date *
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2" />
                End Date *
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
                className="w-full"
              />
            </div>
          </div>

          {/* Photo Statistics */}
          {startDate && endDate && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Selected Date Range Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {stats.count}
                  </Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Photos</p>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {stats.transactions}
                  </Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Transactions</p>
                </div>
              </div>
            </div>
          )}

          {/* Download Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <DownloadIcon className="w-5 h-5 mr-2 text-blue-500" />
              Download Photos as ZIP
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Download all photos from the selected date range as a ZIP file. Photos will be organized by transaction.
            </p>
            <Button
              onClick={handleDownloadPhotos}
              disabled={!startDate || !endDate || isDownloading || stats.count === 0}
              className="w-full bg-blue-500 hover:bg-blue-600"
              data-testid="button-download-photos"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Preparing Download...
                </>
              ) : (
                <>
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Download {stats.count} Photos
                </>
              )}
            </Button>
          </div>

          {/* Delete Section */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold flex items-center text-red-600">
              <TrashIcon className="w-5 h-5 mr-2" />
              Delete Photos (Danger Zone)
            </h3>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    All photos in the selected date range will be permanently deleted from Firebase Storage
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deleteConfirmation">
                Type "DELETE PHOTOS" to confirm deletion *
              </Label>
              <Input
                id="deleteConfirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type DELETE PHOTOS to confirm"
                data-testid="input-delete-confirmation"
                className="border-red-300 focus:border-red-500"
              />
            </div>

            <Button
              onClick={handleDeletePhotos}
              disabled={
                !startDate || 
                !endDate || 
                isDeleting || 
                deleteConfirmation !== 'DELETE PHOTOS' ||
                stats.count === 0
              }
              variant="destructive"
              className="w-full"
              data-testid="button-delete-photos"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting Photos...
                </>
              ) : (
                <>
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete {stats.count} Photos
                </>
              )}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose} data-testid="button-close">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}