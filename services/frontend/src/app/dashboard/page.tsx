import { getCurrentUser } from "@/lib/auth";
import { listContainers, listBlobsPaginated } from "@/actions/blob-actions";
import { listReports } from "@/actions/report-actions";
import { listData } from "@/actions/data-actions";
import { getMessageCount } from "@/actions/message-actions";
import { getWeekShiftCount } from "@/actions/calendar-actions";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { BlobStorageChart } from "@/components/dashboard/charts/blob-storage-chart";
import { ReportStatusChart } from "@/components/dashboard/charts/report-status-chart";
import { DataActivityChart } from "@/components/dashboard/charts/data-activity-chart";
import { SystemHealthChart } from "@/components/dashboard/charts/system-health-chart";
import type { Report } from "@/types/api";

function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Fetch all metrics in parallel
  const [containersResult, blobsResult, reportsResult, dataResult, messagesResult, shiftsResult] =
    await Promise.allSettled([
      listContainers(),
      listBlobsPaginated(0, 1),
      listReports(),
      listData(0, 1),
      getMessageCount(),
      getWeekShiftCount(getCurrentWeekMonday()),
    ]);

  const containers =
    containersResult.status === "fulfilled" ? containersResult.value : [];
  const blobCount =
    blobsResult.status === "fulfilled" ? blobsResult.value.totalElements : 0;
  const reports =
    reportsResult.status === "fulfilled" ? reportsResult.value : [];
  const dataRecordCount =
    dataResult.status === "fulfilled" ? dataResult.value.totalElements : 0;
  const messageCount =
    messagesResult.status === "fulfilled" ? messagesResult.value : 0;
  const shiftCount =
    shiftsResult.status === "fulfilled" ? shiftsResult.value : 0;

  // Build chart data: blob counts per container
  let blobChartData: { container: string; count: number }[] = [];
  if (containers.length > 0) {
    const perContainerResults = await Promise.allSettled(
      containers.map((c) => listBlobsPaginated(0, 1, "lastModified", "desc", c))
    );
    blobChartData = containers.map((c, i) => ({
      container: c,
      count:
        perContainerResults[i].status === "fulfilled"
          ? perContainerResults[i].value.totalElements
          : 0,
    }));
  }

  // Build chart data: report status distribution
  const statusCounts: Record<string, number> = {};
  reports.forEach((r: Report) => {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  });
  const reportChartData = Object.entries(statusCounts).map(
    ([status, count]) => ({ status, count })
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Welcome back, {user?.username ?? "User"}
        </h2>
        <p className="mt-1 text-sm text-blue-200">
          Data & Engineering Team Dashboard
        </p>
      </div>

      <MetricsCards
        blobCount={blobCount}
        containerCount={containers.length}
        reportCount={reports.length}
        dataRecordCount={dataRecordCount}
        messageCount={messageCount}
        shiftCount={shiftCount}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BlobStorageChart data={blobChartData} />
        <ReportStatusChart
          data={
            reportChartData.length > 0
              ? reportChartData
              : [{ status: "PENDING", count: 0 }]
          }
        />
        <DataActivityChart totalRecords={dataRecordCount} />
        <SystemHealthChart />
      </div>
    </div>
  );
}
