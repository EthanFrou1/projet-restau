import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getMyRhisRestaurantLaborSummary } from "@/lib/restaurants";
import { ImportModal } from "@/components/bk/uploader/ImportModal";
import { ImportConfirmModal } from "@/components/bk/uploader/ImportConfirmModal";
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
  const importTargetDate = useMemo(() => previousIsoDate(today), [today]);

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [yearlyMissing, setYearlyMissing] = useState(0);
  const [yearlyMissingLoading, setYearlyMissingLoading] = useState(false);
  const [overdueGroups, setOverdueGroups] = useState<OverdueGroup[]>([]);
  const [overdueLoading, setOverdueLoading] = useState(false);

  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [laborAutofillLoading, setLaborAutofillLoading] = useState(false);
  const [laborAutofillError, setLaborAutofillError] = useState<string | null>(null);
  const [reportsByCode, setReportsByCode] = useState<Record<string, ReportListItem>>({});

  // Modal state kept centralized here: components are pure UI.
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [modalDate, setModalDate] = useState(importTargetDate);
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
  const [autoLaborDraft, setAutoLaborDraft] = useState(defaultExtraKpiDraft);
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

  // Fetch the previous day's report map to drive the main daily import table.
  const loadTodayStatus = useCallback(async () => {
    if (restaurants.length === 0) {
      setReportsByCode({});
      return;
    }

    setStatusLoading(true);
    setStatusError(null);
    try {
      const params = new URLSearchParams({ start_date: importTargetDate, end_date: importTargetDate });
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
  }, [importTargetDate, restaurants.length]);

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
      const params = new URLSearchParams({ start_date: yearStart, end_date: importTargetDate });
      const data = await apiFetch<ReportListItem[]>(`/reports/bk?${params.toString()}`);

      const assigned = new Set(actionableRestaurants.map((r) => r.code));
      const restaurantByCode = new Map(actionableRestaurants.map((r) => [r.code, r]));
      const importedByDay = new Set<string>();
      data.forEach((row) => {
        if (assigned.has(row.restaurant_code)) {
          importedByDay.add(`${row.report_date}|${row.restaurant_code}`);
        }
      });

      const expectedImports = diffDaysInclusive(yearStart, importTargetDate) * actionableRestaurants.length;
      setYearlyMissing(Math.max(0, expectedImports - importedByDay.size));

      const dates = listDatesInclusive(yearStart, importTargetDate);
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
  }, [actionableRestaurants, importTargetDate, restaurants.length, today]);

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

  useEffect(() => {
    if (!confirmOpen || !selectedRestaurant?.myrhis_id || !modalDate) {
      setLaborAutofillLoading(false);
      setLaborAutofillError(null);
      setAutoLaborDraft(defaultExtraKpiDraft);
      return;
    }

    let cancelled = false;
    (async () => {
      setLaborAutofillLoading(true);
      setLaborAutofillError(null);
      try {
        const summary = await getMyRhisRestaurantLaborSummary(selectedRestaurant.myrhis_id!, modalDate);
        if (cancelled) return;
        setAutoLaborDraft({
          heuresPersonnel: summary.actualHours.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(".", ","),
          heuresTravail: summary.plannedHours.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(".", ","),
          tauxHoraire: "18,60",
          osat: "",
          google: "",
        });
      } catch (error: unknown) {
        if (cancelled) return;
        setLaborAutofillError(getErrorMessage(error, "Erreur chargement RH MyRHIS"));
      } finally {
        if (!cancelled) setLaborAutofillLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [confirmOpen, defaultExtraKpiDraft, modalDate, selectedRestaurant]);

  function openImportModal(
    code: string,
    forceReplace: boolean,
    dateValue = importTargetDate,
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
    setModalDate(importTargetDate);
    setReplaceMode(false);
    setLaborAutofillLoading(false);
    setLaborAutofillError(null);
    setAutoLaborDraft(defaultExtraKpiDraft);
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

    const targetReport = modalDate === importTargetDate ? reportsByCode[selectedCode] : undefined;
    if (targetReport && !replaceMode) {
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
        onImport={(code) => openImportModal(code, false, importTargetDate)}
        onReimport={(code, reportId) => openImportModal(code, true, importTargetDate, reportId)}
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
        laborAutofillLoading={laborAutofillLoading}
        laborAutofillError={laborAutofillError}
        autoLaborFieldsLocked={Boolean(selectedRestaurant?.myrhis_id)}
        initialCommentDraft={defaultCommentDraft}
        initialExtraKpiDraft={selectedRestaurant?.myrhis_id ? autoLaborDraft : defaultExtraKpiDraft}
        onCancel={() => {
          if (uploading) return;
          setConfirmOpen(false);
        }}
        onConfirm={submitImport}
      />
    </>
  );
}
