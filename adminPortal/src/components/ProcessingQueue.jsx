import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { fetchProcessingJobs } from "../api/client";

const statusToProgress = {
  queued: 5,
  downloading: 35,
  encoding: 70,
  completed: 100,
  failed: 0,
};

const statusBadgeVariant = {
  queued: "warning",
  downloading: "secondary",
  encoding: "secondary",
  completed: "default",
  failed: "destructive",
};

const statusIcons = {
  queued: Clock,
  downloading: Clock,
  encoding: Clock,
  completed: CheckCircle2,
  failed: XCircle,
};

const normalizeStatus = (status) => (status ?? "").toString().toLowerCase();

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const formatDuration = (start, end) => {
  if (!start || !end) {
    return "—";
  }

  const started = new Date(start);
  const finished = new Date(end);

  if (Number.isNaN(started.getTime()) || Number.isNaN(finished.getTime())) {
    return "—";
  }

  const diffMs = finished.getTime() - started.getTime();
  if (diffMs <= 0) {
    return "—";
  }

  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.round((diffMs % 60000) / 1000);

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
};

const computeStats = (summary, fallbackJobs = []) => {
  const totals = {
    queued: 0,
    downloading: 0,
    encoding: 0,
    completed: 0,
    failed: 0,
  };

  if (summary && typeof summary === "object") {
    Object.entries(summary).forEach(([statusKey, count]) => {
      const status = normalizeStatus(statusKey);
      if (status in totals) {
        totals[status] = Number(count ?? 0);
      }
    });
  } else {
    fallbackJobs.forEach((job) => {
      const status = normalizeStatus(job.status);
      if (status in totals) {
        totals[status] += 1;
      }
    });
  }

  return [
    { label: "Queued", value: totals.queued, icon: Clock, color: "text-slate-600" },
    { label: "Downloading", value: totals.downloading, icon: Clock, color: "text-blue-600" },
    { label: "Encoding", value: totals.encoding, icon: Clock, color: "text-indigo-600" },
    { label: "Completed", value: totals.completed, icon: CheckCircle2, color: "text-green-600" },
    { label: "Failed", value: totals.failed, icon: XCircle, color: "text-red-600" },
  ];
};

export function ProcessingQueue() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [statusSummary, setStatusSummary] = useState(null);

  const currentPageRef = useRef(1);
  const pageSizeRef = useRef(20);

  const loadJobs = useCallback(
    async ({ page, pageSize: pageSizeOverride, background = false, viaRefreshButton = false } = {}) => {
      const targetPage = Number.isFinite(page) && page > 0 ? page : currentPageRef.current;
      const targetPageSize =
        Number.isFinite(pageSizeOverride) && pageSizeOverride > 0 ? pageSizeOverride : pageSizeRef.current;

      if (viaRefreshButton) {
        setIsRefreshing(true);
      } else if (!background) {
        setLoading(true);
      }

      try {
        const response = await fetchProcessingJobs({
          page: targetPage,
          pageSize: targetPageSize,
        });

        const nextJobs = response.jobs ?? [];
        const resolvedPageSize =
          Number.isFinite(response?.pageSize) && response.pageSize > 0 ? response.pageSize : targetPageSize;
        const resolvedTotal = Number.isFinite(response?.totalCount) ? Number(response.totalCount) : (response?.count ?? nextJobs.length ?? 0);
        const resolvedPage =
          resolvedTotal === 0
            ? 0
            : Number.isFinite(response?.page) && response.page > 0
              ? response.page
              : targetPage;

        setJobs(nextJobs);
        setStatusSummary(response?.statusSummary ?? null);
        setTotalCount(resolvedTotal);
        setPageSize(resolvedPageSize);
        setCurrentPage(resolvedPage);
        currentPageRef.current = resolvedPage > 0 ? resolvedPage : 1;
        pageSizeRef.current = resolvedPageSize;
        setError(null);
      } catch (fetchError) {
        console.error("Failed to load processing queue", fetchError);
        setError(fetchError.message ?? "Unable to load processing queue.");
      } finally {
        if (viaRefreshButton) {
          setIsRefreshing(false);
        } else if (!background) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    currentPageRef.current = currentPage > 0 ? currentPage : 1;
  }, [currentPage]);

  useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  useEffect(() => {
    let isMounted = true;
    loadJobs({ page: 1 }).catch((initialError) => {
      console.error("Initial processing queue load failed", initialError);
    });

    const interval = setInterval(() => {
      if (isMounted) {
        loadJobs({ background: true }).catch((intervalError) => {
          console.error("Background processing queue refresh failed", intervalError);
        });
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadJobs]);

  const stats = useMemo(() => computeStats(statusSummary, jobs), [statusSummary, jobs]);

  const handleManualRefresh = useCallback(async () => {
    await loadJobs({ viaRefreshButton: true });
  }, [loadJobs]);

  const handleChangePageSize = useCallback(
    async (value) => {
      const nextSize = Number(value);
      if (!Number.isFinite(nextSize) || nextSize <= 0) {
        return;
      }
      await loadJobs({ page: 1, pageSize: nextSize });
    },
    [loadJobs],
  );

  const goToPage = useCallback(
    async (targetPage) => {
      if (!Number.isFinite(targetPage)) {
        return;
      }

      const totalPages = Math.ceil(totalCount / pageSizeRef.current);
      if (totalPages === 0) {
        return;
      }

      const clamped = Math.min(Math.max(targetPage, 1), totalPages);

      if (clamped === currentPageRef.current) {
        return;
      }

      await loadJobs({ page: clamped });
    },
    [loadJobs, totalCount],
  );

  const totalPages = useMemo(() => {
    if (totalCount === 0) {
      return 0;
    }
    return Math.max(Math.ceil(totalCount / pageSize), 1);
  }, [totalCount, pageSize]);

  const hasItems = totalCount > 0 && currentPage > 0;
  const startItem = hasItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = hasItems ? Math.min(startItem + jobs.length - 1, totalCount) : 0;
  const disablePrev = !hasItems || currentPage <= 1;
  const disableNext = !hasItems || currentPage >= totalPages;

  const renderTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="py-12 text-center text-slate-500">
            <span className="inline-flex items-center gap-2 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading processing queue...
            </span>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="py-12 text-center text-red-600">
            <span className="inline-flex items-center gap-2 justify-center">
              <AlertCircle className="w-4 h-4" />
              {error}
            </span>
          </TableCell>
        </TableRow>
      );
    }

    if (jobs.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="py-12 text-center text-slate-500">
            No media is currently queued for processing.
          </TableCell>
        </TableRow>
      );
    }

    return jobs.map((job) => {
      const status = normalizeStatus(job.status);
      const Icon = statusIcons[status] ?? Clock;
      const progressValue = statusToProgress[status] ?? 0;

      return (
        <TableRow key={job.id}>
          <TableCell>
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {job.media?.title ?? job.ref ?? "Untitled Media"}
                </p>
                <p className="text-xs text-slate-500">{job.ref}</p>
              </div>
            </div>
          </TableCell>
          <TableCell>
            {job.worker ? (
              <div className="flex flex-col">
                <span className="text-sm text-slate-700">
                  {job.worker.name ?? "Worker"}
                </span>
                <span className="text-xs text-slate-500 break-all">
                  {job.worker.baseUrl ?? job.worker.id ?? "—"}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">Default</span>
            )}
          </TableCell>
          <TableCell>
            {job.media?.extension ? <Badge variant="secondary">{job.media.extension}</Badge> : <span className="text-xs text-slate-500">—</span>}
          </TableCell>
          <TableCell>
            <Badge variant={statusBadgeVariant[status] ?? "outline"} className="capitalize">
              {status || "unknown"}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="min-w-[140px] space-y-1">
              <div className="flex items-center justify-between text-xs text-blue-600">
                <span>{progressValue}%</span>
                <span className="capitalize">{status}</span>
              </div>
              <Progress
                value={progressValue}
                className="h-1.5 bg-blue-100"
                indicatorClassName="bg-blue-500"
              />
            </div>
          </TableCell>
          <TableCell>
            {job.priority ? (
              <Badge variant="outline" className="capitalize">
                {job.priority}
              </Badge>
            ) : (
              <span className="text-xs text-slate-500">—</span>
            )}
          </TableCell>
          <TableCell className="text-sm text-slate-600">
            {status === "failed" ? job.error ?? job.progressMessage ?? "Failed" : job.progressMessage ?? "—"}
          </TableCell>
          <TableCell className="text-xs text-slate-500">{formatDateTime(job.updatedAt)}</TableCell>
          <TableCell className="text-xs text-slate-500">
            {job.completedAt ? formatDuration(job.startedAt ?? job.createdAt, job.completedAt) : "—"}
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardContent className="py-4">
          <div className="flex flex-nowrap items-center gap-4 overflow-x-auto pb-2" style={{ marginTop: 20 }}>
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-[180px] flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-semibold text-slate-900">{stat.value}</p>
                </div>
                <stat.icon className={`h-6 w-6 shrink-0 self-center ${stat.color}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Processing Queue</CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                <span className="uppercase tracking-wide text-[10px] text-slate-500">Showing</span>
                <span className="text-slate-900">{hasItems ? startItem : 0}</span>
                <span className="text-slate-500">-</span>
                <span className="text-slate-900">{hasItems ? endItem : 0}</span>
                <span className="text-slate-500">of</span>
                <span className="text-slate-900">{totalCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-slate-500">Rows per page</span>
                <Select value={String(pageSize)} onValueChange={handleChangePageSize}>
                  <SelectTrigger size="sm" className="w-[100px] text-xs">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 40, 80, 160].map((sizeOption) => (
                      <SelectItem key={sizeOption} value={String(sizeOption)}>
                        {sizeOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={loading || isRefreshing}
                className="inline-flex items-center gap-2"
              >
                {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Media</TableHead>
              <TableHead>Worker</TableHead>
              <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ marginTop: 16 }}>
            <div className="text-[11px] font-medium text-slate-600">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                <span className="uppercase tracking-wide text-[10px] text-slate-500">Page range</span>
                <span className="text-slate-900">{hasItems ? startItem : 0}</span>
                <span className="text-slate-500">-</span>
                <span className="text-slate-900">{hasItems ? endItem : 0}</span>
                <span className="text-slate-500">of</span>
                <span className="text-slate-900">{totalCount}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">
                Page {hasItems ? currentPage : 0} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(1)}
                  disabled={disablePrev}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={disablePrev}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={disableNext}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(totalPages)}
                  disabled={disableNext}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
