import { TabsContent } from "@/components/ui/tabs";
import { BkReportUploader } from "@/components/bk/BkReportUploader";
import { BkReportView } from "@/components/bk/BkReportView";
import type { BKReport } from "@/components/bk/types";
import type { ReimportRequest } from "@/components/bk/uploader/types";

type Restaurant = { id: number; code: string; name: string };

type Props = {
  visible: boolean;
  restaurants: Restaurant[];
  canReplaceImport: boolean;
  pendingReimport: ReimportRequest | null;
  onPendingReimportHandled: () => void;
  onUploaded: (report: BKReport) => void;
  report: BKReport | null;
};

export function ImportsPage({
  visible,
  restaurants,
  canReplaceImport,
  pendingReimport,
  onPendingReimportHandled,
  onUploaded,
  report,
}: Props) {
  if (!visible) return null;

  return (
    <TabsContent value="data" className="space-y-4">
      <BkReportUploader
        restaurants={restaurants}
        canReplace={canReplaceImport}
        pendingReimport={pendingReimport}
        onPendingReimportHandled={onPendingReimportHandled}
        onUploaded={onUploaded}
      />

      <BkReportView report={report} />
    </TabsContent>
  );
}
