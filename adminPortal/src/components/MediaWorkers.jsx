import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  fetchMediaWorkers,
  createMediaWorker,
  updateMediaWorker,
  deleteMediaWorker
} from "../api/client";
import { AlertCircle, Loader2, Power, RefreshCw, Trash2 } from "lucide-react";

const healthBadgeVariant = {
  ok: "default",
  inactive: "secondary",
  unreachable: "destructive",
  error: "destructive",
  unknown: "outline"
};

const healthLabelMap = {
  ok: "Healthy",
  inactive: "Inactive",
  unreachable: "Unreachable",
  error: "Error",
  unknown: "Unknown"
};

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

const defaultRuntimeState = {
  healthStatus: "unknown",
  healthPayload: null,
  config: null,
  error: null,
  checkedAt: null
};

export function MediaWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [concurrencyDrafts, setConcurrencyDrafts] = useState({});
  const [workerActions, setWorkerActions] = useState({});
  const [createForm, setCreateForm] = useState({
    name: "",
    baseUrl: "",
    concurrency: "1",
    isActive: true
  });
  const [creating, setCreating] = useState(false);

  const syncConcurrencyDrafts = (list) => {
    setConcurrencyDrafts(
      list.reduce((drafts, worker) => {
        drafts[worker.id] = worker.concurrency?.toString() ?? "";
        return drafts;
      }, {})
    );
  };

  const loadWorkers = async ({ background = false } = {}) => {
    if (background) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetchMediaWorkers();
      const nextWorkers = Array.isArray(response.workers) ? response.workers : [];
      setWorkers(nextWorkers);
      syncConcurrencyDrafts(nextWorkers);
      setError(null);
    } catch (fetchError) {
      console.error("Failed to load media workers", fetchError);
      setError(fetchError.message ?? "Unable to load media workers.");
    } finally {
      if (background) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadWorkers().catch((loadError) => {
      console.error("Initial media worker load failed", loadError);
    });
  }, []);

  const handleRefresh = async () => {
    await loadWorkers({ background: true });
  };

  const handleCreateWorker = async (event) => {
    event.preventDefault();

    if (!createForm.name.trim() || !createForm.baseUrl.trim()) {
      toast.error("Name and endpoint URL are required.");
      return;
    }

    const parsedConcurrency = Number(createForm.concurrency);
    if (!Number.isFinite(parsedConcurrency) || Number.isNaN(parsedConcurrency) || parsedConcurrency < 1) {
      toast.error("Concurrency must be a positive number.");
      return;
    }

    setCreating(true);
    try {
      await createMediaWorker({
        name: createForm.name.trim(),
        baseUrl: createForm.baseUrl.trim(),
        concurrency: Math.floor(parsedConcurrency),
        isActive: Boolean(createForm.isActive)
      });
      toast.success("Media worker registered.");
      setCreateForm({
        name: "",
        baseUrl: "",
        concurrency: "1",
        isActive: true
      });
      await loadWorkers();
    } catch (createError) {
      console.error("Failed to register media worker", createError);
      toast.error(createError.message ?? "Unable to register media worker.");
    } finally {
      setCreating(false);
    }
  };

  const updateConcurrencyDraft = (workerId, value) => {
    setConcurrencyDrafts((prev) => ({
      ...prev,
      [workerId]: value
    }));
  };

  const withWorkerAction = async (workerId, action) => {
    setWorkerActions((prev) => ({
      ...prev,
      [workerId]: true
    }));

    try {
      await action();
      await loadWorkers({ background: true });
    } finally {
      setWorkerActions((prev) => {
        const next = { ...prev };
        delete next[workerId];
        return next;
      });
    }
  };

  const handleToggleActive = async (worker) => {
    await withWorkerAction(worker.id, async () => {
      try {
        await updateMediaWorker(worker.id, { isActive: !worker.isActive });
        toast.success(`Worker "${worker.name}" ${worker.isActive ? "disabled" : "activated"}.`);
      } catch (toggleError) {
        console.error("Failed to toggle worker state", toggleError);
        toast.error(toggleError.message ?? "Unable to update worker state.");
      }
    });
  };

  const handleUpdateConcurrency = async (workerId) => {
    const draftValue = concurrencyDrafts[workerId];
    const parsedConcurrency = Number(draftValue);

    if (!Number.isFinite(parsedConcurrency) || Number.isNaN(parsedConcurrency) || parsedConcurrency < 1) {
      toast.error("Please enter a positive number for concurrency.");
      return;
    }

    await withWorkerAction(workerId, async () => {
      try {
        await updateMediaWorker(workerId, { concurrency: Math.floor(parsedConcurrency) });
        toast.success("Concurrency updated.");
      } catch (updateError) {
        console.error("Failed to update worker concurrency", updateError);
        toast.error(updateError.message ?? "Unable to update concurrency.");
      }
    });
  };

  const handleDeleteWorker = async (workerId) => {
    const targetWorker = workers.find((item) => item.id === workerId);
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            `Remove media worker${targetWorker?.name ? ` "${targetWorker.name}"` : ""}? This action cannot be undone.`
          );

    if (!confirmed) {
      return;
    }

    await withWorkerAction(workerId, async () => {
      try {
        await deleteMediaWorker(workerId);
        toast.success("Media worker removed.");
      } catch (deleteError) {
        console.error("Failed to delete worker", deleteError);
        toast.error(deleteError.message ?? "Unable to remove worker.");
      }
    });
  };

  const renderWorkersTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-12 text-center text-slate-500">
            <span className="inline-flex items-center gap-2 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading media workers...
            </span>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-12 text-center text-red-600">
            <span className="inline-flex items-center gap-2 justify-center">
              <AlertCircle className="w-4 h-4" />
              {error}
            </span>
          </TableCell>
        </TableRow>
      );
    }

    if (workers.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-12 text-center text-slate-500">
            No media workers have been registered yet.
          </TableCell>
        </TableRow>
      );
    }

    return workers.map((worker) => {
      const runtime = worker.runtime ?? defaultRuntimeState;
      const healthStatus = runtime.healthStatus ?? "unknown";
      const badgeVariant = healthBadgeVariant[healthStatus] ?? "outline";
      const healthLabel = healthLabelMap[healthStatus] ?? healthLabelMap.unknown;
      const isBusy = Boolean(workerActions[worker.id]);
      const concurrencyDraft = concurrencyDrafts[worker.id] ?? "";
      const remoteConcurrency = runtime.config?.concurrency ?? "—";
      const queueSize = runtime.config?.queueSize ?? null;
      const activeJobs = runtime.config?.activeJobs ?? null;

      return (
        <TableRow key={worker.id}>
          <TableCell>
            <div className="flex flex-col">
              <span className="font-medium text-slate-900">{worker.name}</span>
              <span className="text-xs text-slate-500 break-all">{worker.baseUrl}</span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant={worker.isActive ? "secondary" : "outline"}>
              {worker.isActive ? "Active" : "Disabled"}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={concurrencyDraft}
                  onChange={(event) => updateConcurrencyDraft(worker.id, event.target.value)}
                  className="w-20"
                  disabled={isBusy}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateConcurrency(worker.id)}
                  disabled={isBusy}
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              <span className="text-xs text-slate-500">
                Remote: {remoteConcurrency}
                {queueSize !== null || activeJobs !== null ? (
                  <span className="ml-1 text-slate-400">
                    ({activeJobs ?? "0"} active / {queueSize ?? "0"} in queue)
                  </span>
                ) : null}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant={badgeVariant}>{healthLabel}</Badge>
            <div className="text-xs text-slate-500 mt-1">
              {runtime.error
                ? runtime.error
                : runtime.healthPayload?.status ?? "—"}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Checked {formatDateTime(runtime.checkedAt)}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={worker.isActive ? "outline" : "secondary"}
                onClick={() => handleToggleActive(worker)}
                disabled={isBusy}
              >
                {isBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Power className="w-4 h-4 mr-2" />
                )}
                {worker.isActive ? "Disable" : "Enable"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-600"
                onClick={() => handleDeleteWorker(worker.id)}
                disabled={isBusy}
              >
                {isBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Remove
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Media Processing Workers</CardTitle>
            <CardDescription>Manage endpoints handling media encoding workloads.</CardDescription>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || loading}>
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Concurrency</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="w-[220px] text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderWorkersTableBody()}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Register Media Worker</CardTitle>
          <CardDescription>Provide the worker endpoint and desired concurrency.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateWorker} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="worker-name">Worker Name</Label>
              <Input
                id="worker-name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. Worker A"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="worker-base-url">Endpoint URL</Label>
              <Input
                id="worker-base-url"
                value={createForm.baseUrl}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, baseUrl: event.target.value }))
                }
                placeholder="https://processor.example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="worker-concurrency">Concurrency</Label>
              <Input
                id="worker-concurrency"
                type="number"
                min="1"
                value={createForm.concurrency}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, concurrency: event.target.value }))
                }
                required
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div>
                <Label htmlFor="worker-active" className="text-sm font-medium text-slate-700">
                  Active
                </Label>
                <p className="text-xs text-slate-500">Inactive workers stay registered but receive no jobs.</p>
              </div>
              <Switch
                id="worker-active"
                checked={createForm.isActive}
                onCheckedChange={(value) => setCreateForm((prev) => ({ ...prev, isActive: value }))}
              />
            </div>

            <Button type="submit" className="w-full" disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Register Worker
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
