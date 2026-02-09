import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ImportModal } from "@/components/bk/uploader/ImportModal";
import { OverdueImportsCard } from "@/components/bk/uploader/OverdueImportsCard";
import { QuickStatsCard } from "@/components/bk/uploader/QuickStatsCard";
import { TodayImportsCard } from "@/components/bk/uploader/TodayImportsCard";
import type { BKReport } from "@/components/bk/types";
import type {
  FileSpec,
  OverdueGroup,
  OverdueRow,
  ReimportRequest,
  ReportListItem,
  Restaurant,
  TodayRow,
} from "@/components/bk/uploader/types";
import {
  diffDaysInclusive,
  emptyFileErrors,
  emptyFiles,
  FILE_SPECS,
  getErrorMessage,
  isExpectedFileName,
  listDatesInclusive,
  previousIsoDate,
  toIsoDate,
} from "@/components/bk/uploader/utils";

type Props = {
  restaurants: Restaurant[];
  onUploaded: (report: BKReport) => void;
  canReplace?: boolean;
  pendingReimport?: ReimportRequest | null;
  onPendingReimportHandled?: () => void;
};

export function BkReportUploader({
  restaurants,
  onUploaded,
  canReplace = false,
  pendingReimport = null,
  onPendingReimportHandled,
}: Props) {
  const today = useMemo(() => toIsoDate(new Date()), []);

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [yearlyMissing, setYearlyMissing] = useState(0);
  const [yearlyMissingLoading, setYearlyMissingLoading] = useState(false);
  const [overdueGroups, setOverdueGroups] = useState<OverdueGroup[]>([]);
  const [overdueLoading, setOverdueLoading] = useState(false);

  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reportsByCode, setReportsByCode] = useState<Record<string, ReportListItem>>({});

  // Modal state kept centralized here: components are pure UI.
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [modalDate, setModalDate] = useState(today);
  const [replaceMode, setReplaceMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [files, setFiles] = useState(emptyFiles());
  const [fileErrors, setFileErrors] = useState(emptyFileErrors());

  const [newestFirst, setNewestFirst] = useState(true);

  const fileCount = useMemo(() => Object.values(files).filter(Boolean).length, [files]);
  const totalSteps = FILE_SPECS.length;
  const progressPercent = Math.round((fileCount / totalSteps) * 100);
  const allFilesSelected = fileCount === totalSteps;

  const todayRows = useMemo<TodayRow[]>(() => {
    return restaurants
      .map((restaurant) => {
        const report = reportsByCode[restaurant.code];
        return { restaurant, report, isDone: Boolean(report) };
      })
      .sort((a, b) => a.restaurant.code.localeCompare(b.restaurant.code));
  }, [reportsByCode, restaurants]);

  const overdueRows = useMemo<OverdueRow[]>(() => {
    const flat = overdueGroups.flatMap((group) =>
      group.restaurants.map((restaurant) => ({ date: group.date, restaurant }))
    );
    return flat.sort((a, b) =>
      newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );
  }, [newestFirst, overdueGroups]);

  const doneCount = todayRows.filter((r) => r.isDone).length;
  const pendingCount = todayRows.filter((r) => !r.isDone).length;

  const selectedRestaurant = selectedCode
    ? restaurants.find((r) => r.code === selectedCode) ?? null
    : null;

  // Fetch today's report map to drive the "imports à faire aujourd'hui" table.
  const loadTodayStatus = useCallback(async () => {
    if (restaurants.length === 0) {
      setReportsByCode({});
      return;
    }

    setStatusLoading(true);
    setStatusError(null);
    try {
      const params = new URLSearchParams({ start_date: today, end_date: today });
      const data = await apiFetch<ReportListItem[]>(`/reports/bk?${params.toString()}`);
      const map: Record<string, ReportListItem> = {};
      data.forEach((row) => {
        map[row.restaurant_code] = row;
      });
      setReportsByCode(map);
    } catch (error: unknown) {
      setStatusError(getErrorMessage(error, "Erreur chargement statut import"));
    } finally {
      setStatusLoading(false);
    }
  }, [restaurants.length, today]);

  // Compute yearly missing count and the per-day overdue list in one pass.
  const loadYearlyAndOverdue = useCallback(async () => {
    if (restaurants.length === 0) {
      setYearlyMissing(0);
      setOverdueGroups([]);
      return;
    }

    setYearlyMissingLoading(true);
    setOverdueLoading(true);
    try {
      const yearStart = `${today.slice(0, 4)}-01-01`;
      const params = new URLSearchParams({ start_date: yearStart, end_date: today });
      const data = await apiFetch<ReportListItem[]>(`/reports/bk?${params.toString()}`);

      const assigned = new Set(restaurants.map((r) => r.code));
      const restaurantByCode = new Map(restaurants.map((r) => [r.code, r]));
      const importedByDay = new Set<string>();
      data.forEach((row) => {
        if (assigned.has(row.restaurant_code)) {
          importedByDay.add(`${row.report_date}|${row.restaurant_code}`);
        }
      });

      const expectedImports = diffDaysInclusive(yearStart, today) * restaurants.length;
      setYearlyMissing(Math.max(0, expectedImports - importedByDay.size));

      const dates = listDatesInclusive(yearStart, previousIsoDate(today));
      const groups: OverdueGroup[] = [];
      dates.forEach((date) => {
        const missingRestaurants: Restaurant[] = [];
        restaurants.forEach((r) => {
          if (!importedByDay.has(`${date}|${r.code}`)) {
            const full = restaurantByCode.get(r.code);
            if (full) missingRestaurants.push(full);
          }
        });
        if (missingRestaurants.length > 0) {
          groups.push({ date, restaurants: missingRestaurants });
        }
      });
      groups.sort((a, b) => b.date.localeCompare(a.date));
      setOverdueGroups(groups);
    } catch {
      setYearlyMissing(0);
      setOverdueGroups([]);
    } finally {
      setYearlyMissingLoading(false);
      setOverdueLoading(false);
    }
  }, [restaurants, today]);

  useEffect(() => {
    loadTodayStatus();
    loadYearlyAndOverdue();
  }, [loadTodayStatus, loadYearlyAndOverdue]);

  useEffect(() => {
    if (!pendingReimport) return;
    openImportModal(
      pendingReimport.restaurantCode,
      true,
      pendingReimport.reportDate,
      pendingReimport.reportId
    );
    onPendingReimportHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingReimport]);

  function openImportModal(
    code: string,
    forceReplace: boolean,
    dateValue = today,
    reportId: number | null = null
  ) {
    setSelectedCode(code);
    setSelectedReportId(reportId);
    setModalDate(dateValue);
    setReplaceMode(forceReplace);
    setCommentDraft("");
    setFiles(emptyFiles());
    setFileErrors(emptyFileErrors());
    setUploadMsg(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (uploading) return;
    setModalOpen(false);
    setSelectedCode(null);
    setSelectedReportId(null);
    setModalDate(today);
    setReplaceMode(false);
    setCommentDraft("");
    setFiles(emptyFiles());
    setFileErrors(emptyFileErrors());
  }

  function handleFileSelected(spec: FileSpec, selected: File | null) {
    if (!selected) {
      setFiles((prev) => ({ ...prev, [spec.id]: null }));
      setFileErrors((prev) => ({ ...prev, [spec.id]: null }));
      return;
    }

    if (!isExpectedFileName(selected.name, spec.label)) {
      setFiles((prev) => ({ ...prev, [spec.id]: null }));
      setFileErrors((prev) => ({
        ...prev,
        [spec.id]:
          `Nom invalide. Attendu : ${spec.label}. ` +
          `Tolère maj/min, espaces ou tirets. Exemple valide : ${spec.label}`,
      }));
      return;
    }

    setFiles((prev) => ({ ...prev, [spec.id]: selected }));
    setFileErrors((prev) => ({ ...prev, [spec.id]: null }));
  }

  async function submitImport() {
    if (!selectedCode || !allFilesSelected || modalDate > today) {
      setUploadMsg("Date invalide ou fichiers incomplets.");
      return;
    }

    const todayReport = modalDate === today ? reportsByCode[selectedCode] : undefined;
    if (todayReport && !replaceMode) {
      setUploadMsg("Import déjà fait pour ce restaurant. Utilise réimporter.");
      return;
    }
    if (replaceMode && !selectedReportId) {
      setUploadMsg("Réimport impossible: import existant introuvable.");
      return;
    }

    setUploading(true);
    setUploadMsg(null);
    try {
      if (replaceMode && selectedReportId) {
        await apiFetch<{ status: string }>(`/reports/bk/${selectedReportId}`, { method: "DELETE" });
      }

      const fd = new FormData();
      fd.append("report_date", modalDate);
      fd.append("restaurant_code", selectedCode);
      if (commentDraft.trim()) fd.append("comment", commentDraft.trim());
      if (replaceMode && selectedReportId) fd.append("is_reimport", "true");

      for (const spec of FILE_SPECS) {
        const file = files[spec.id];
        if (!file) throw new Error(`Fichier manquant: ${spec.label}`);
        fd.append(spec.formKey, file, spec.label);
      }

      const res = await apiFetch<{ report_id: number }>("/reports/bk/upload", {
        method: "POST",
        body: fd,
      });

      const data = await apiFetch<BKReport>(`/reports/bk/${res.report_id}`);
      onUploaded(data);
      await loadTodayStatus();
      await loadYearlyAndOverdue();
      setUploadMsg(replaceMode ? "Réimport terminé." : "Import terminé.");
      closeModal();
    } catch (error: unknown) {
      setUploadMsg(getErrorMessage(error, "Erreur import CSV"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <QuickStatsCard
        restaurants={restaurants}
        doneCount={doneCount}
        pendingCount={pendingCount}
        yearlyMissing={yearlyMissing}
        yearlyMissingLoading={yearlyMissingLoading}
      />

      <TodayImportsCard
        rows={todayRows}
        canReplace={canReplace}
        statusLoading={statusLoading}
        statusError={statusError}
        onImport={(code) => openImportModal(code, false, today)}
        onReimport={(code, reportId) => openImportModal(code, true, today, reportId)}
      />

      <OverdueImportsCard
        rows={overdueRows}
        loading={overdueLoading}
        newestFirst={newestFirst}
        onNewestFirstChange={setNewestFirst}
        onImport={(code, dateValue) => openImportModal(code, false, dateValue)}
      />

      {uploadMsg && <div className="text-sm whitespace-pre-wrap">{uploadMsg}</div>}

      <ImportModal
        open={modalOpen}
        selectedRestaurant={selectedRestaurant}
        modalDate={modalDate}
        replaceMode={replaceMode}
        uploading={uploading}
        fileCount={fileCount}
        totalSteps={totalSteps}
        progressPercent={progressPercent}
        files={files}
        fileErrors={fileErrors}
        fileSpecs={FILE_SPECS}
        commentDraft={commentDraft}
        onClose={closeModal}
        onSubmit={submitImport}
        onCommentChange={setCommentDraft}
        onFileSelect={handleFileSelected}
      />
    </>
  );
}
