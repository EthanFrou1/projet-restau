import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ImportModal } from "@/components/bk/uploader/ImportModal";
import { ImportConfirmModal } from "@/components/bk/uploader/ImportConfirmModal";
import { ImportDebugHeadCard } from "@/components/bk/uploader/ImportDebugHeadCard";
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
  showDebugHead?: boolean;
  pendingReimport?: ReimportRequest | null;
  onPendingReimportHandled?: () => void;
};

export function BkReportUploader({
  restaurants,
  onUploaded,
  canReplace = false,
  showDebugHead = false,
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
  const [debugRows, setDebugRows] = useState<
    Array<{
      id: number;
      restaurant_code: string;
      report_date: string;
      created_at: string;
      comment?: string | null;
      is_reimport?: boolean | null;
      imported_by?: {
        id: number;
        email: string;
        first_name?: string | null;
        last_name?: string | null;
      } | null;
    }>
  >([]);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [debugRefreshTick, setDebugRefreshTick] = useState(0);
  const [debugStartDate, setDebugStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toIsoDate(d);
  });
  const [debugEndDate, setDebugEndDate] = useState(today);
  const [debugRestaurantCode, setDebugRestaurantCode] = useState("");
  const [selectedDebugReport, setSelectedDebugReport] = useState<BKReport | null>(null);
  const [selectedDebugId, setSelectedDebugId] = useState<number | null>(null);
  const [selectedDebugLoading, setSelectedDebugLoading] = useState(false);

  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reportsByCode, setReportsByCode] = useState<Record<string, ReportListItem>>({});

  // Modal state kept centralized here: components are pure UI.
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [modalDate, setModalDate] = useState(today);
  const [replaceMode, setReplaceMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const defaultCommentDraft = "";
  const defaultExtraKpiDraft = useMemo(
    () => ({
      heuresPersonnel: "",
      heuresTravail: "",
      tauxHoraire: "18,60",
      osat: "",
      google: "",
    }),
    []
  );
  const [commentN1, setCommentN1] = useState<string | null>(null);
  const [commentN1Loading, setCommentN1Loading] = useState(false);
  const [files, setFiles] = useState(emptyFiles());
  const [fileErrors, setFileErrors] = useState(emptyFileErrors());

  const [newestFirst, setNewestFirst] = useState(true);

  const fileCount = useMemo(() => Object.values(files).filter(Boolean).length, [files]);
  const totalSteps = FILE_SPECS.length;
  const progressPercent = Math.round((fileCount / totalSteps) * 100);
  const allFilesSelected = fileCount === totalSteps;

  const overdueRows = useMemo<OverdueRow[]>(() => {
    const flat = overdueGroups.flatMap((group) =>
      group.restaurants.map((restaurant) => ({ date: group.date, restaurant }))
    );
    return flat.sort((a, b) =>
      newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );
  }, [newestFirst, overdueGroups]);

  const selectedRestaurant = selectedCode
    ? restaurants.find((r) => r.code === selectedCode) ?? null
    : null;
  const actionableRestaurants = useMemo(
    () => restaurants.filter((restaurant) => restaurant.can_import),
    [restaurants]
  );
  const todayRows = useMemo<TodayRow[]>(() => {
    return actionableRestaurants
      .map((restaurant) => {
        const report = reportsByCode[restaurant.code];
        return { restaurant, report, isDone: Boolean(report) };
      })
      .sort((a, b) => a.restaurant.code.localeCompare(b.restaurant.code));
  }, [actionableRestaurants, reportsByCode]);
  const actionableDoneCount = todayRows.filter((r) => r.isDone).length;
  const actionablePendingCount = todayRows.filter((r) => !r.isDone).length;

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
    if (restaurants.length === 0 || actionableRestaurants.length === 0) {
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

      const assigned = new Set(actionableRestaurants.map((r) => r.code));
      const restaurantByCode = new Map(actionableRestaurants.map((r) => [r.code, r]));
      const importedByDay = new Set<string>();
      data.forEach((row) => {
        if (assigned.has(row.restaurant_code)) {
          importedByDay.add(`${row.report_date}|${row.restaurant_code}`);
        }
      });

      const expectedImports = diffDaysInclusive(yearStart, today) * actionableRestaurants.length;
      setYearlyMissing(Math.max(0, expectedImports - importedByDay.size));

      const dates = listDatesInclusive(yearStart, previousIsoDate(today));
      const groups: OverdueGroup[] = [];
      dates.forEach((date) => {
        const missingRestaurants: Restaurant[] = [];
        actionableRestaurants.forEach((r) => {
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
  }, [actionableRestaurants, restaurants.length, today]);

  useEffect(() => {
    loadTodayStatus();
    loadYearlyAndOverdue();
  }, [loadTodayStatus, loadYearlyAndOverdue]);

  useEffect(() => {
    if (!showDebugHead) {
      setDebugRows([]);
      setDebugLoading(false);
      setDebugError(null);
      setSelectedDebugId(null);
      setSelectedDebugReport(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDebugLoading(true);
      setDebugError(null);
      try {
        const params = new URLSearchParams({
          start_date: debugStartDate,
          end_date: debugEndDate,
        });
        if (debugRestaurantCode) params.set("restaurant_code", debugRestaurantCode);
        const rows = await apiFetch<
          Array<{
            id: number;
            restaurant_code: string;
            report_date: string;
            created_at: string;
            comment?: string | null;
            is_reimport?: boolean | null;
            imported_by?: {
              id: number;
              email: string;
              first_name?: string | null;
              last_name?: string | null;
            } | null;
          }>
        >(`/reports/bk?${params.toString()}`);
        if (cancelled) return;
        const sorted = [...rows]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 20);
        setDebugRows(sorted);
        setSelectedDebugId(null);
        setSelectedDebugReport(null);
      } catch (error: unknown) {
        if (cancelled) return;
        setDebugError(getErrorMessage(error, "Erreur chargement tete des imports"));
        setDebugRows([]);
      } finally {
        if (!cancelled) setDebugLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showDebugHead, debugRefreshTick, debugStartDate, debugEndDate, debugRestaurantCode]);

  async function loadDebugReport(reportId: number) {
    setSelectedDebugLoading(true);
    setSelectedDebugId(reportId);
    setSelectedDebugReport(null);
    try {
      const data = await apiFetch<BKReport>(`/reports/bk/${reportId}`);
      setSelectedDebugReport(data);
    } catch (error: unknown) {
      setDebugError(getErrorMessage(error, "Erreur chargement detail import"));
      setSelectedDebugReport(null);
    } finally {
      setSelectedDebugLoading(false);
    }
  }

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
    const restaurant = restaurants.find((r) => r.code === code);
    if (!restaurant?.can_import) {
      setUploadMsg("Action non autorisée pour ce restaurant.");
      return;
    }
    setSelectedCode(code);
    setSelectedReportId(reportId);
    setModalDate(dateValue);
    setReplaceMode(forceReplace);
    setFiles(emptyFiles());
    setFileErrors(emptyFileErrors());
    setUploadMsg(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (uploading) return;
    setModalOpen(false);
    setConfirmOpen(false);
    setSelectedCode(null);
    setSelectedReportId(null);
    setModalDate(today);
    setReplaceMode(false);
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

  function handleFolderSelected(list: FileList | null) {
    if (!list || list.length === 0) return;

    const nextFiles = emptyFiles();
    const nextErrors = emptyFileErrors();

    for (const file of Array.from(list)) {
      const spec = FILE_SPECS.find((candidate) => isExpectedFileName(file.name, candidate.label));
      if (!spec) continue;
      if (nextFiles[spec.id]) continue;
      nextFiles[spec.id] = file;
    }

    setFiles(nextFiles);
    setFileErrors(nextErrors);
    setUploadMsg(null);
  }

  function resetSelectedFiles() {
    setFiles(emptyFiles());
    setFileErrors(emptyFileErrors());
  }

  useEffect(() => {
    if (!modalOpen || !selectedCode || !modalDate) {
      setCommentN1(null);
      setCommentN1Loading(false);
      return;
    }

    const [yearStr, monthStr, dayStr] = modalDate.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!year || !month || !day) {
      setCommentN1(null);
      return;
    }

    const prevDate = new Date(Date.UTC(year - 1, month - 1, day));
    const isValidSameDay =
      prevDate.getUTCFullYear() === year - 1 &&
      prevDate.getUTCMonth() === month - 1 &&
      prevDate.getUTCDate() === day;

    if (!isValidSameDay) {
      setCommentN1(null);
      setCommentN1Loading(false);
      return;
    }

    const prevIso = prevDate.toISOString().slice(0, 10);
    let cancelled = false;

    (async () => {
      setCommentN1Loading(true);
      try {
        const params = new URLSearchParams({
          start_date: prevIso,
          end_date: prevIso,
          restaurant_code: selectedCode,
        });
        const rows = await apiFetch<Array<{ comment?: string | null }>>(`/reports/bk?${params.toString()}`);
        if (cancelled) return;
        setCommentN1(rows[0]?.comment?.trim() || null);
      } catch {
        if (!cancelled) setCommentN1(null);
      } finally {
        if (!cancelled) setCommentN1Loading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [modalDate, modalOpen, selectedCode]);

  function requestImportConfirmation() {
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
    setUploadMsg(null);
    setConfirmOpen(true);
  }

  async function submitImport(payload: {
    commentDraft: string;
    extraKpiDraft: {
      heuresPersonnel: string;
      heuresTravail: string;
      tauxHoraire: string;
      osat: string;
      google: string;
    };
  }) {
    if (!selectedCode) return;

    setUploading(true);
    try {
      if (replaceMode && selectedReportId) {
        await apiFetch<{ status: string }>(`/reports/bk/${selectedReportId}`, { method: "DELETE" });
      }

      const fd = new FormData();
      fd.append("report_date", modalDate);
      fd.append("restaurant_code", selectedCode);
      if (payload.commentDraft.trim()) fd.append("comment", payload.commentDraft.trim());
      if (payload.extraKpiDraft.heuresPersonnel.trim()) fd.append("heures_personnel", payload.extraKpiDraft.heuresPersonnel.trim());
      if (payload.extraKpiDraft.heuresTravail.trim()) fd.append("heures_travail", payload.extraKpiDraft.heuresTravail.trim());
      if (payload.extraKpiDraft.tauxHoraire.trim()) fd.append("taux_horaire", payload.extraKpiDraft.tauxHoraire.trim());
      if (payload.extraKpiDraft.osat.trim()) fd.append("osat_score", payload.extraKpiDraft.osat.trim());
      if (payload.extraKpiDraft.google.trim()) fd.append("google_score", payload.extraKpiDraft.google.trim());
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
      setDebugRefreshTick((tick) => tick + 1);
      setUploadMsg(replaceMode ? "Réimport terminé." : "Import terminé.");
      setConfirmOpen(false);
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
        assignedCount={actionableRestaurants.length}
        doneCount={actionableDoneCount}
        pendingCount={actionablePendingCount}
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

      {showDebugHead && (
        <ImportDebugHeadCard
          restaurants={restaurants}
          rows={debugRows}
          loading={debugLoading}
          error={debugError}
          startDate={debugStartDate}
          endDate={debugEndDate}
          restaurantCode={debugRestaurantCode}
          onStartDateChange={setDebugStartDate}
          onEndDateChange={setDebugEndDate}
          onRestaurantCodeChange={setDebugRestaurantCode}
          onView={loadDebugReport}
          selectedReport={selectedDebugReport}
          selectedId={selectedDebugId}
          selectedLoading={selectedDebugLoading}
        />
      )}

      <ImportModal
        open={modalOpen && !confirmOpen}
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
        onFolderSelect={handleFolderSelected}
        onResetFiles={resetSelectedFiles}
        onClose={closeModal}
        onSubmit={requestImportConfirmation}
        onFileSelect={handleFileSelected}
      />

      <ImportConfirmModal
        open={confirmOpen}
        uploading={uploading}
        commentN1={commentN1}
        commentN1Loading={commentN1Loading}
        initialCommentDraft={defaultCommentDraft}
        initialExtraKpiDraft={defaultExtraKpiDraft}
        onCancel={() => {
          if (uploading) return;
          setConfirmOpen(false);
        }}
        onConfirm={submitImport}
      />
    </>
  );
}
