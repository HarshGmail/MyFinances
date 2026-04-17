import { EpfTimelineSummary } from '@/api/dataInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EpfContributionTimelineProps {
  timelineData: EpfTimelineSummary;
}

export function EpfContributionTimeline({ timelineData }: EpfContributionTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contribution Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your EPF contribution history based on job changes
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Organization</th>
                <th className="text-left p-2">Monthly Contribution</th>
                <th className="text-left p-2">Start Date</th>
                <th className="text-left p-2">End Date</th>
                <th className="text-left p-2">Total Contribution</th>
              </tr>
            </thead>
            <tbody>
              {timelineData.timeline.map((row, index) => {
                if (row.type === 'contribution') {
                  return (
                    <tr key={`contribution-${index}`} className="border-b">
                      <td className="p-2 font-medium">{row.organization}</td>
                      <td className="p-2">₹{row.monthlyContribution?.toLocaleString('en-IN')}</td>
                      <td className="p-2">{row.startDate}</td>
                      <td className="p-2">{row.endDate}</td>
                      <td className="p-2">₹{row.totalContribution.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                }
                return (
                  <tr key={`interest-${index}`} className="border-b text-muted-foreground italic">
                    <td className="p-2 font-medium">Interest for {row.financialYear}</td>
                    <td className="p-2">—</td>
                    <td className="p-2">—</td>
                    <td className="p-2">{row.interestCreditDate}</td>
                    <td className="p-2">₹{row.totalContribution.toLocaleString('en-IN')}</td>
                  </tr>
                );
              })}

              <tr className="font-semibold bg-muted/40 border-t">
                <td className="p-2" colSpan={4}>
                  Total Current Balance
                </td>
                <td className="p-2 text-green-600">
                  ₹{timelineData.totalCurrentBalance.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
