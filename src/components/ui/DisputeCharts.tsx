import React from "react";

interface DisputeChartsProps {
  statusData: Record<string, number>;
  ageData: { days: string; count: number }[];
}

const DisputeCharts: React.FC<DisputeChartsProps> = ({ statusData, ageData }) => {
  return (
    <div>
      <pre>Status Data: {JSON.stringify(statusData, null, 2)}</pre>
      <pre>Age Data: {JSON.stringify(ageData, null, 2)}</pre>
    </div>
  );
};

export default DisputeCharts;
