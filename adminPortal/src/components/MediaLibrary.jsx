import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Eye, ExternalLink, Loader2, FileText, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import { fetchMediaLibrary, importMediaMetadata, refreshMediaDownloadUrl, enqueueProcessingJob } from "../api/client";

const formatMetadataDate = (value) => {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return value;
};

const MEDIA_ASSET_BASE_URL = "http://localhost:8081";
const HLS_STREAM_BASE_URL = MEDIA_ASSET_BASE_URL;

const loadShakaPlayer = (() => {
  let loaderPromise = null;

  return () => {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Shaka player is only available in the browser."));
    }

    if (window.shaka) {
      return Promise.resolve(window.shaka);
    }

    if (!loaderPromise) {
      loaderPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector("script[data-shaka-player]");

        const handleLoad = () => {
          if (window.shaka) {
            resolve(window.shaka);
          } else {
            reject(new Error("Shaka player script loaded without exposing shaka global."));
          }
        };

        const handleError = () => {
          reject(new Error("Failed to load Shaka player script."));
        };

        if (existingScript) {
          existingScript.addEventListener("load", handleLoad, { once: true });
          existingScript.addEventListener("error", handleError, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.9.6/shaka-player.compiled.min.js";
        script.async = true;
        script.defer = true;
        script.dataset.shakaPlayer = "true";
        script.addEventListener("load", handleLoad, { once: true });
        script.addEventListener("error", handleError, { once: true });
        document.head.appendChild(script);
      }).catch((error) => {
        loaderPromise = null;
        throw error;
      });
    }

    return loaderPromise;
  };
})();

const getMediaStatusMeta = (status) => {
  const normalized = (status ?? "open").toLowerCase();

  if (normalized === "ingested") {
    return {
      label: "Ingested",
      className: "bg-green-100 text-green-700 border-green-200",
    };
  }

  if (normalized === "enqueued") {
    return {
      label: "Enqueued",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    };
  }

  if (normalized === "processing") {
    return {
      label: "Processing",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    };
  }

  if (normalized === "failed") {
    return {
      label: "Failed",
      className: "bg-red-100 text-red-700 border-red-200",
    };
  }

  return {
    label: "Open",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };
};

const getMediaReference = (item) => {
  const rawRef = item?.ref ?? item?.resourceId;
  if (rawRef === undefined || rawRef === null) {
    return "";
  }
  return String(rawRef).trim();
};

export function MediaLibrary() {
  const [mediaItems, setMediaItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [linkLoadingRef, setLinkLoadingRef] = useState(null);
  const [enqueueingRef, setEnqueueingRef] = useState(null);
  const videoRef = useRef(null);
  const shakaPlayerRef = useRef(null);
  const playerErrorHandlerRef = useRef(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState(null);

  const loadMedia = useCallback(
    async ({ showSpinner = true, page, size, query } = {}) => {
      const targetPage = page ?? currentPage;
      const targetSize = size ?? pageSize;
      const targetQuery = (query ?? searchQuery)?.trim?.() ?? "";

      if (showSpinner) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetchMediaLibrary({
          search: targetQuery,
          page: targetPage,
          pageSize: targetSize,
        });
        setMediaItems(response.media ?? []);
        setTotalItems(Number(response.total ?? 0));
        if (typeof response.page === "number" && !Number.isNaN(response.page)) {
          setCurrentPage(response.page);
        }
        if (typeof response.pageSize === "number" && !Number.isNaN(response.pageSize)) {
          setPageSize(response.pageSize);
        }
      } catch (loadError) {
        setError(loadError.message ?? "Failed to load media library");
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [currentPage, pageSize, searchQuery],
  );

  useEffect(() => {
    loadMedia({ page: currentPage, size: pageSize, query: searchQuery });
  }, [currentPage, pageSize, searchQuery, loadMedia]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadMedia({ showSpinner: false, page: currentPage, size: pageSize, query: searchQuery }).catch((error) => {
        console.error("Background media refresh failed", error);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [loadMedia, currentPage, pageSize, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const rawStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const startItem = totalItems === 0 ? 0 : Math.min(rawStart, totalItems);
  const endItem = totalItems === 0 ? 0 : Math.min(totalItems, startItem + Math.max(mediaItems.length - 1, 0));

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  const handleUploadDialogChange = (open) => {
    setIsUploadDialogOpen(open);
    if (!open) {
      setUploadFile(null);
      setUploadError(null);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setUploadFile(file);
    setUploadError(null);
  };

  const handleUploadSubmit = async (event) => {
    event.preventDefault();

    if (!uploadFile) {
      setUploadError("Please select a metadata JSON file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileContents = await uploadFile.text();
      const parsed = JSON.parse(fileContents);
      const response = await importMediaMetadata(parsed);
      setMediaItems(response.media ?? []);
      setTotalItems(Number(response.total ?? (response.media?.length ?? 0)));
      if (typeof response.page === "number" && !Number.isNaN(response.page)) {
        setCurrentPage(response.page);
      } else {
        setCurrentPage(1);
      }
      if (typeof response.pageSize === "number" && !Number.isNaN(response.pageSize)) {
        setPageSize(response.pageSize);
      }
      handleUploadDialogChange(false);
      await loadMedia({ showSpinner: false, page: response.page ?? 1, size: response.pageSize ?? pageSize, query: searchQuery });
    } catch (uploadException) {
      const message =
        uploadException instanceof SyntaxError
          ? "Selected file is not valid JSON."
          : uploadException.message ?? "Failed to upload metadata.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const selectedMediaRef = getMediaReference(selectedMedia);
  const isSelectedMediaLinkLoading = Boolean(selectedMediaRef && linkLoadingRef === selectedMediaRef);
  const hlsUrl = selectedMediaRef ? `${HLS_STREAM_BASE_URL}/${selectedMediaRef}/hls/master.m3u8` : null;
  const canShowHls = selectedMedia?.mediaStatus === "ingested" && Boolean(hlsUrl);
  const selectedMediaThumbnailUrl =
    selectedMediaRef && selectedMedia?.mediaStatus === "ingested"
      ? `${MEDIA_ASSET_BASE_URL}/${encodeURIComponent(selectedMediaRef)}/thumbnail.jpg`
      : null;

  useEffect(() => {
    const cleanupPlayer = async () => {
      if (shakaPlayerRef.current) {
        try {
          if (playerErrorHandlerRef.current) {
            shakaPlayerRef.current.removeEventListener("error", playerErrorHandlerRef.current);
            playerErrorHandlerRef.current = null;
          }
          await shakaPlayerRef.current.destroy();
        } catch (destroyError) {
          console.warn("Failed to destroy Shaka player", destroyError);
        } finally {
          shakaPlayerRef.current = null;
        }
      }
    };

    if (!selectedMedia || !canShowHls) {
      cleanupPlayer();
      setIsPlayerLoading(false);
      setPlayerError(null);
      return;
    }

    let isMounted = true;
    setIsPlayerLoading(true);
    setPlayerError(null);

    loadShakaPlayer()
      .then((shaka) => {
        if (!isMounted) {
          return;
        }

        if (!shaka?.Player?.isBrowserSupported?.()) {
          setPlayerError("Current browser does not support Shaka player.");
          setIsPlayerLoading(false);
          return;
        }

        try {
          shaka?.polyfill?.installAll?.();
        } catch (polyfillError) {
          console.warn("Failed to install Shaka polyfills", polyfillError);
        }

        const videoElement = videoRef.current;
        if (!videoElement) {
          setIsPlayerLoading(false);
          return;
        }

        const player = new shaka.Player(videoElement);
        shakaPlayerRef.current = player;

        const handlePlayerError = (event) => {
          const detailMessage = event?.detail?.message || event?.detail || "Playback error";
          setPlayerError(detailMessage);
        };

        playerErrorHandlerRef.current = handlePlayerError;
        player.addEventListener("error", handlePlayerError);

        player.load(hlsUrl)
          .then(() => {
            if (!isMounted) {
              return;
            }
            setIsPlayerLoading(false);
          })
          .catch((loadError) => {
            console.error("Failed to load HLS stream", loadError);
            if (!isMounted) {
              return;
            }
            setPlayerError(loadError?.message ?? "Failed to load stream");
            setIsPlayerLoading(false);
          });
      })
      .catch((playerError) => {
        console.error("Failed to load Shaka player", playerError);
        if (!isMounted) {
          return;
        }
        setPlayerError(playerError?.message ?? "Unable to initialise player");
        setIsPlayerLoading(false);
      });

    return () => {
      isMounted = false;
      cleanupPlayer();
    };
  }, [selectedMedia, canShowHls, hlsUrl]);

  useEffect(() => {
    return () => {
      if (shakaPlayerRef.current) {
        if (playerErrorHandlerRef.current) {
          shakaPlayerRef.current.removeEventListener("error", playerErrorHandlerRef.current);
          playerErrorHandlerRef.current = null;
        }
        shakaPlayerRef.current.destroy().catch(() => {});
        shakaPlayerRef.current = null;
      }
    };
  }, []);
  const selectedMediaStatusMeta = getMediaStatusMeta(selectedMedia?.mediaStatus);

  const openPrimaryLink = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenMedia = async (mediaItem) => {
    const ref = getMediaReference(mediaItem);

    if (!ref) {
      toast.error("This media item is missing a reference ID and cannot be opened.");
      return;
    }

    setLinkLoadingRef(ref);
    try {
      const response = await refreshMediaDownloadUrl(ref);
      const downloadUrl = response?.downloadUrl;

      if (!downloadUrl) {
        throw new Error("The media service did not return a valid download URL.");
      }

      openPrimaryLink(downloadUrl);
    } catch (linkError) {
      console.error("Failed to resolve media download URL", linkError);
      toast.error(linkError.message ?? "Unable to open this media item right now.");
    } finally {
      setLinkLoadingRef(null);
    }
  };

  const handleEnqueueMedia = async (mediaItem) => {
    if (!mediaItem) {
      return;
    }

    const ref = getMediaReference(mediaItem);

    if (!ref) {
      toast.error("Cannot enqueue this media item because it does not have a reference ID.");
      return;
    }

    setEnqueueingRef(ref);

    try {
      await enqueueProcessingJob({ mediaId: mediaItem.id, ref });
      toast.success(`"${mediaItem.title ?? mediaItem.id}" has been added to the processing queue.`);
      setMediaItems((prev) =>
        prev.map((item) =>
          item.id === mediaItem.id
            ? {
                ...item,
                mediaStatus: "enqueued",
                processingStatus: "queued",
              }
            : item,
        ),
      );
      await loadMedia({ showSpinner: false, page: currentPage, size: pageSize, query: searchQuery });
    } catch (enqueueError) {
      console.error("Failed to enqueue media for processing", enqueueError);
      toast.error(enqueueError.message ?? "Unable to enqueue this media item right now.");
    } finally {
      setEnqueueingRef(null);
    }
  };

  const handleCopyToClipboard = async (value) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard.");
    } catch (copyError) {
      console.error("Failed to copy to clipboard", copyError);
      toast.error("Unable to copy to clipboard.");
    }
  };

  const renderTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-10 text-center text-slate-500">
            <span className="inline-flex items-center gap-2 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading media items...
            </span>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-10 text-center text-red-600">
            {error}
          </TableCell>
        </TableRow>
      );
    }

    if (mediaItems.length === 0) {
      const trimmedQuery = searchQuery.trim();
      let message = "No media items available.";

      if (totalItems > 0) {
        message = "No media items found on this page.";
      }

      if (trimmedQuery && totalItems === 0) {
        message = `No media items match “${trimmedQuery}”.`;
      }

      return (
        <TableRow>
          <TableCell colSpan={6} className="py-10 text-center text-slate-500">
            {message}
          </TableCell>
        </TableRow>
      );
    }

    return mediaItems.map((item) => {
      const refValue = getMediaReference(item);
      const isLinkLoading = refValue && linkLoadingRef === refValue;
      const isEnqueueing = refValue && enqueueingRef === refValue;
      const statusMeta = getMediaStatusMeta(item.mediaStatus);
      const normalizedStatus = (item.mediaStatus ?? '').toLowerCase();
      const thumbnailUrl =
        refValue && normalizedStatus === 'ingested'
          ? `${MEDIA_ASSET_BASE_URL}/${encodeURIComponent(refValue)}/thumbnail.jpg`
          : null;

      return (
        <TableRow key={item.id}>
          <TableCell className="w-[120px]">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={`${item.title ?? refValue ?? 'Media'} thumbnail`}
                className="h-16 w-28 rounded-md border border-slate-200 object-cover shadow-sm"
                loading="lazy"
              />
            ) : (
              <div className="flex h-16 w-28 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[11px] text-slate-400">
                No preview
              </div>
            )}
          </TableCell>
          <TableCell>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900 leading-tight">{item.title}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.resourceId ? <Badge variant="outline">#{item.resourceId}</Badge> : null}
                    {item.ref && item.ref !== item.resourceId ? (
                      <Badge variant="outline" className="text-slate-500">
                        Ref {item.ref}
                      </Badge>
                    ) : null}
                    {item.oleCourseCode ? (
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                        {item.oleCourseCode}
                      </Badge>
                    ) : null}
                    {item.oleTermCode ? (
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100">
                        {item.oleTermCode}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {refValue ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => handleOpenMedia(item)}
                    disabled={Boolean(isLinkLoading)}
                  >
                    {isLinkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  </Button>
                ) : null}
              </div>
              {item.keywords?.length ? (
                <p className="text-xs text-slate-500 break-words whitespace-normal">{item.keywords.join(" / ")}</p>
              ) : null}
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="secondary">{item.extension ?? "Unknown"}</Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className={`capitalize ${statusMeta.className}`}>
              {statusMeta.label}
            </Badge>
          </TableCell>
          <TableCell className="text-sm text-slate-600">{item.contributedBy ?? "—"}</TableCell>
          <TableCell className="w-[200px] text-right">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" size="sm" className="min-w-[110px]" onClick={() => handleEnqueueMedia(item)} disabled={Boolean(isEnqueueing)}>
                {isEnqueueing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enqueueing...
                  </span>
                ) : (
                  "Enqueue"
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="min-w-[80px]"
                onClick={() => setSelectedMedia(item)}
              >
                More
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Media Library</CardTitle>
              <CardDescription>Catalog of media assets sourced from the latest metadata export.</CardDescription>
            </div>
            <Button
              onClick={() => setIsUploadDialogOpen(true)}
              size="sm"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4"
            >
              Upload Media
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-xs">
              <Input
                placeholder="Search by title, resource ID, contributor, or keyword..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="h-10"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-medium text-slate-600 md:justify-end md:gap-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                <span className="uppercase tracking-wide text-[10px] text-slate-500">Results</span>
                <span className="text-slate-900">{mediaItems.length}</span>
                <span className="text-slate-500">of</span>
                <span className="text-slate-900">{totalItems}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap text-slate-500">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    const nextSize = Number(value);
                    setPageSize(nextSize);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger size="sm" className="w-24 text-xs">
                    <SelectValue placeholder="Rows" className="text-xs" />
                  </SelectTrigger>
                  <SelectContent>
                    {[20, 40, 100, 240].map((sizeOption) => (
                      <SelectItem key={sizeOption} value={String(sizeOption)}>
                        {sizeOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table className="min-w-[1040px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Thumbnail</TableHead>
                  <TableHead>Title & Identifiers</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contributor</TableHead>
                  <TableHead className="w-[200px]" />
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] font-medium text-slate-600" style={{ marginTop: "9px" }}>
              {totalItems > 0 ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  <span className="uppercase tracking-wide text-[10px] text-slate-500">Page range</span>
                  <span className="text-slate-900">{startItem}</span>
                  <span className="text-slate-500">-</span>
                  <span className="text-slate-900">{endItem}</span>
                  <span className="text-slate-500">of</span>
                  <span className="text-slate-900">{totalItems}</span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  <span className="uppercase tracking-wide text-[10px] text-slate-500">Page range</span>
                  <span className="text-slate-900">0</span>
                  <span className="text-slate-500">of</span>
                  <span className="text-slate-900">0</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">
                Page {totalItems === 0 ? 0 : currentPage} of {totalItems === 0 ? 0 : totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1 || totalItems === 0}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1 || totalItems === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages || totalItems === 0}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages || totalItems === 0}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedMedia)} onOpenChange={(open) => setSelectedMedia(open ? selectedMedia : null)}>
        <DialogContent
          className="sm:max-w-none lg:max-w-none w-[90vw] max-w-5xl overflow-hidden"
          style={{ height: "70vh" }}
        >
          {selectedMedia ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMedia.title}</DialogTitle>
                <DialogDescription>
                  Detailed metadata for resource {selectedMedia.resourceId ?? selectedMedia.ref ?? selectedMedia.id}.
                </DialogDescription>
                <div className="mt-2">
                  <Badge variant="outline" className={`capitalize ${selectedMediaStatusMeta.className}`}>
                    {selectedMediaStatusMeta.label}
                  </Badge>
                </div>
              </DialogHeader>
              <div className="space-y-6 overflow-y-auto pr-1 flex-1">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Resource ID</p>
                      <p className="text-sm text-slate-900">{selectedMedia.resourceId ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Reference</p>
                      <p className="text-sm text-slate-900">{selectedMedia.ref ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Format</p>
                      <p className="text-sm text-slate-900">{selectedMedia.extension ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Access</p>
                      <p className="text-sm text-slate-900">{selectedMedia.access ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Contributor</p>
                      <p className="text-sm text-slate-900">{selectedMedia.contributedBy ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Page Placement</p>
                      <p className="text-sm text-slate-900">
                        {typeof selectedMedia.page === "number" ? `Page ${selectedMedia.page}` : "—"}
                        {typeof selectedMedia.positionOnPage === "number" ? ` · Position ${selectedMedia.positionOnPage}` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Listed Date</p>
                      <p className="text-sm text-slate-900">{formatMetadataDate(selectedMedia.listDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Effective Date</p>
                      <p className="text-sm text-slate-900">{formatMetadataDate(selectedMedia.effectiveDate)}</p>
                    </div>
                  </div>

                  {selectedMedia.keywords?.length ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMedia.keywords.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="secondary"
                            className="bg-slate-100 text-slate-700 border-slate-200 whitespace-normal break-words"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                      {canShowHls ? (
                        <div className="relative aspect-video">
                          <video
                            ref={videoRef}
                            className="h-full w-full bg-black object-contain"
                            controls
                            playsInline
                            poster={selectedMediaThumbnailUrl ?? undefined}
                            crossOrigin="anonymous"
                          />
                          {isPlayerLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-xs font-medium text-slate-100">
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Preparing stream...</span>
                            </div>
                          ) : null}
                          {playerError ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-4 text-center text-sm text-red-400">
                              {playerError}
                            </div>
                          ) : null}
                        </div>
                      ) : selectedMediaThumbnailUrl ? (
                        <div className="relative aspect-video bg-black">
                          <img
                            src={selectedMediaThumbnailUrl}
                            alt={`${selectedMedia.title ?? selectedMediaRef ?? "Media"} thumbnail`}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/70 p-3 text-center text-xs text-slate-100">
                            Stream preview becomes available once this item is fully ingested.
                          </div>
                        </div>
                      ) : (
                        <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-slate-100 text-center text-xs text-slate-500">
                          <Eye className="h-5 w-5" />
                          <span>No preview available</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">HLS Stream</p>
                        {hlsUrl ? (
                          <>
                            <code className="mt-2 block max-h-32 overflow-y-auto break-all rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                              {hlsUrl}
                            </code>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleCopyToClipboard(hlsUrl)}>
                                Copy URL
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => openPrimaryLink(hlsUrl)}>
                                Open
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            A manifest URL will appear once this media item finishes processing.
                          </p>
                        )}
                      </div>

                      {playerError && canShowHls ? (
                        <p className="text-xs text-red-600">
                          Playback error: {playerError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadDialogChange}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-6 py-5">
            <DialogHeader className="text-white space-y-2">
              <DialogTitle className="text-white text-lg">Update Metadata Library</DialogTitle>
              <DialogDescription className="text-white/80">
                Upload a JSON export of your media items. We will merge new entries and update existing ones.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleUploadSubmit} className="px-6 pb-6 pt-0 space-y-5">
            <div className="grid gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <div className="bg-white rounded-lg shadow-sm p-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-1.5 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">Metadata Requirements</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-500">
                    <li>Provide a JSON array of metadata entries.</li>
                    <li>Existing resources will update when IDs match.</li>
                    <li>Include a `metadata` object for detailed fields.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="media-upload-input" className="text-slate-600">
                  Select metadata file
                </Label>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-5 shadow-sm flex flex-col gap-4">
                  <Input
                    id="media-upload-input"
                    type="file"
                    accept="application/json"
                    onChange={handleFileChange}
                    required
                    className="file:mr-3 file:rounded-md file:border file:border-slate-200 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Need a template? Export your current library to reuse its structure, or consult the API docs for field
                    definitions.
                  </p>
                  {uploadFile ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{uploadFile.name}</span>
                    </div>
                  ) : null}
                  {uploadError ? (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{uploadError}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500">
                Large uploads may take a few seconds to process. Please keep the window open until the upload completes.
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => handleUploadDialogChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-70 min-w-[140px]"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    <span>Import Metadata</span>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
