import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DisputeChartsProps {
  statusData: Record<string, number>;
  ageData?: { days: string; count: number }[];
}

const COLORS = {
  'Pending': '#F59E0B', // status-pending
  'In Progress': '#3B82F6', // status-progress  
  'Resolved': '#10B981', // status-resolved
  'Rejected': '#EF4444', // status-rejected
};

export const DisputeCharts: React.FC<DisputeChartsProps> = ({
  statusData,
  ageData = []
}) => {
  const pieData = Object.entries(statusData).map(([status, count]) => ({
    name: status,
    value: count,
    color: COLORS[status as keyof typeof COLORS] || '#6B7280'
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    const percent = ((entry.value / Object.values(statusData).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
    return `${percent}%`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution Pie Chart */}
      <Card className="bg-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Disputes by Status</CardTitle>
          <CardDescription>
            Distribution of disputes across different statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {entry.name} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Age Distribution Bar Chart */}
      <Card className="bg-card border-border/50 shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Pending Disputes by Age</CardTitle>
          <CardDescription>
            Number of pending disputes by days since creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="days" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p>No pending disputes data available</p>
                  <p className="text-sm mt-2">Submit some disputes to see age distribution</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};