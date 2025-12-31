"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AuditLog } from "@prisma/client";
import { Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type DownloadAuditLogsProps = {
  logs: AuditLog[];
};

export function DownloadAuditLogs({ logs }: DownloadAuditLogsProps) {
  const t = useTranslations("settingsPage.admin.audit-log.download");
  const [isDownloading, setIsDownloading] = useState(false);

  function convertToCSV(logs: AuditLog[]) {
    // Define CSV headers
    const headers = [
      "User Email",
      "Action",
      "Target",
      "Details",
      "Timestamp (UTC)",
    ];

    // Convert logs to CSV rows
    const rows = logs.map((log) => {
      return [
        log.userEmail,
        log.action,
        log.target,
        // Escape quotes in details to prevent CSV formatting issues
        `"${log.details.replace(/"/g, '""')}"`,
        // Use ISO string for consistent UTC timestamp
        new Date(log.createdAt).toISOString(),
      ];
    });

    // Combine headers and rows
    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  }

  function handleDownload() {
    setIsDownloading(true);
    try {
      const csv = convertToCSV(logs);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        t("filename", { date: new Date().toISOString().split("T")[0] })
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        t("error", {
          error: error instanceof Error ? error.message : t("unknown-error"),
        })
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading || logs.length === 0}
          className="flex items-center gap-2"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isDownloading ? t("downloading") : t("button")}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t("tooltip")}</p>
      </TooltipContent>
    </Tooltip>
  );
}
