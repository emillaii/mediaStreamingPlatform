import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Eye,
  ExternalLink,
  Loader2,
  FileText,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { fetchMediaLibrary, importMediaMetadata, refreshMediaDownloadUrl } from "../api/client";

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

const getAccessBadgeVariant = (access) => {
  if (!access) return "outline";

  const normalized = access.toLowerCase();

  if (normalized.includes("open")) return "default";
  if (normalized.includes("restricted") || normalized.includes("internal")) return "secondary";

  return "outline";
};

const buildSearchHaystack = (item) => {
  return [
    item.title,
    item.resourceId,
    item.ref,
    item.access,
    item.contributedBy,
    item.oleCourseCode,
    item.oleTermCode,
    ...(item.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

const getMediaReference = (item) => {
  const rawRef = item?.ref ?? item?.resourceId;
  if (rawRef === undefined || rawRef === null) {
    return "";
  }
  return String(rawRef).trim();
};

export function ProcessingQueueOne() {
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
  const [linkLoadingRef, setLinkLoadingRef] = useState(null);

  useEffect(() => {
    const loadMedia = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchMediaLibrary();
        setMediaItems(response.media ?? []);
      } catch (loadError) {
        setError(loadError.message ?? "Failed to load media library");
      } finally {
        setLoading(false);
      }
    };

    loadMedia();
  }, []);

  const filteredMedia = useMemo(() => {
    if (!searchQuery.trim()) {
      return mediaItems;
    }

    const query = searchQuery.toLowerCase();
    return mediaItems.filter((item) => buildSearchHaystack(item).includes(query));
  }, [mediaItems, searchQuery]);

  const totalPages = useMemo(() => {
    const pages = Math.ceil(filteredMedia.length / pageSize);
    return pages > 0 ? pages : 1;
  }, [filteredMedia.length, pageSize]);

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev > totalPages) return totalPages;
      if (prev < 1) return 1;
      return prev;
    });
  }, [totalPages]);

  const paginatedMedia = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMedia.slice(start, start + pageSize);
  }, [filteredMedia, currentPage, pageSize]);

  const startItem = filteredMedia.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = filteredMedia.length === 0 ? 0 : Math.min(filteredMedia.length, currentPage * pageSize);

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
      handleUploadDialogChange(false);
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

  const openPrimaryLink = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenMedia = async (mediaItem) => {
    const ref = getMediaReference(mediaItem);

    if (!ref) {
      window.alert("This media item is missing a reference ID and cannot be opened.");
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
      window.alert(linkError.message ?? "Unable to open this media item right now.");
    } finally {
      setLinkLoadingRef(null);
    }
  };
  const renderTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="py-10 text-center text-slate-500">
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
          <TableCell colSpan={5} className="py-10 text-center text-red-600">
            {error}
          </TableCell>
        </TableRow>
      );
    }

    if (filteredMedia.length === 0) {
      const trimmedQuery = searchQuery.trim();
      return (
        <TableRow>
          <TableCell colSpan={5} className="py-10 text-center text-slate-500">
            {trimmedQuery ? `No media items match “${trimmedQuery}”.` : "No media items available."}
          </TableCell>
        </TableRow>
      );
    }

    return paginatedMedia.map((item) => {
      const refValue = getMediaReference(item);
      const isLinkLoading = refValue && linkLoadingRef === refValue;

      return (
        <TableRow key={item.id}>
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
                <p className="text-xs text-slate-500 line-clamp-2">{item.keywords.join(" / ")}</p>
              ) : null}
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="outline">{item.extension ?? "Unknown"}</Badge>
          </TableCell>
          <TableCell>
            <Badge variant={getAccessBadgeVariant(item.access)}>{item.access ?? "Unspecified"}</Badge>
          </TableCell>
          <TableCell className="text-sm text-slate-600">{item.contributedBy ?? "—"}</TableCell>
          <TableCell className="w-[60px] text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedMedia(item)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {refValue ? (
                  <DropdownMenuItem disabled={Boolean(isLinkLoading)} onClick={() => handleOpenMedia(item)}>
                    {isLinkLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    {isLinkLoading ? "Fetching link..." : "Open Media"}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      );
    });
  };

  const stats = [
    { label: "In Queue", value: "2", icon: Clock, color: "text-slate-600" },
    { label: "Processing", value: "3", icon: Clock, color: "text-orange-600" },
    { label: "Completed", value: "1", icon: CheckCircle2, color: "text-green-600" },
    { label: "Failed", value: "1", icon: XCircle, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">{stat.label}</p>
                  <p className="text-slate-900 mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Process Queue 1</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-xs">
              <Input
                placeholder="Search by title, resource ID, contributor, or keyword..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="h-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 md:justify-end text-xs text-slate-600">
              <span className="whitespace-nowrap">
                Showing <strong>{loading ? 0 : paginatedMedia.length}</strong> of{" "}
                <strong>{loading ? 0 : filteredMedia.length}</strong> matching results
              </span>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    const nextSize = Number(value);
                    setPageSize(nextSize);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger size="sm" className="w-24 text-xs">
                    <SelectValue placeholder="Rows" />
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
            <Table className="min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Title & Identifiers</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Contributor</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-600">
              {filteredMedia.length > 0 ? (
                <span>
                  Showing <strong>{startItem}</strong> - <strong>{endItem}</strong> of{" "}
                  <strong>{filteredMedia.length}</strong>
                </span>
              ) : (
                <span>Showing 0 of 0</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">
                Page {filteredMedia.length === 0 ? 0 : currentPage} of {filteredMedia.length === 0 ? 0 : totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1 || filteredMedia.length === 0}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage <= 1 || filteredMedia.length === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages || filteredMedia.length === 0}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages || filteredMedia.length === 0}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedMedia)} onOpenChange={(open) => setSelectedMedia(open ? selectedMedia : null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedMedia ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMedia.title}</DialogTitle>
                <DialogDescription>
                  Detailed metadata for resource {selectedMedia.resourceId ?? selectedMedia.ref ?? selectedMedia.id}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {selectedMediaRef ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Primary Video URL</p>
                    <Button
                      variant="link"
                      className="px-0 h-auto text-blue-600 hover:text-blue-700"
                      onClick={() => handleOpenMedia(selectedMedia)}
                      disabled={isSelectedMediaLinkLoading}
                    >
                      {isSelectedMediaLinkLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Fetching link...
                        </span>
                      ) : (
                        selectedMedia.primaryVideoUrl ?? "Open media"
                      )}
                    </Button>
                  </div>
                ) : null}

                {selectedMedia.videoUrls?.length ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Available Video URLs</p>
                    <div className="space-y-2">
                      {selectedMedia.videoUrls.map((url) => (
                        <Button
                          key={url}
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          onClick={() => openPrimaryLink(url)}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {url}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedMedia.keywords?.length ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedMedia.keywords.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedMedia.rawMetadata?.length ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">Metadata Fields</p>
                    <div className="border rounded-lg divide-y">
                      {selectedMedia.rawMetadata.map((field) => (
                        <div key={field.label} className="p-3">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{field.label}</p>
                          <p className="text-sm text-slate-900 mt-1">{field.values.join(", ") || "—"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadDialogChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Metadata JSON</DialogTitle>
            <DialogDescription>
              Import additional media entries using the same JSON structure as{" "}
              <code className="px-1 py-0.5 rounded bg-slate-100 text-xs">latest-video-metadata-page-001.json</code>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="media-upload-input" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Metadata File
              </Label>
              <Input
                id="media-upload-input"
                type="file"
                accept="application/json"
                onChange={handleFileChange}
                required
              />
              <p className="text-[11px] text-slate-500">
                The file should contain an array of metadata entries. Existing resources will be updated if duplicates are found.
              </p>
              {uploadFile ? (
                <p className="text-xs text-slate-600 truncate">Selected file: {uploadFile.name}</p>
              ) : null}
              {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleUploadDialogChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !uploadFile}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-70"
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  "Import Metadata"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
