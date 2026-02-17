import { TabsContent } from "@/components/ui/tabs";
import { BkReportUploader } from "@/components/bk/BkReportUploader";
import type { BKReport } from "@/components/bk/types";
import type { ReimportRequest } from "@/components/bk/uploader/types";

type Restaurant = { id: number; code: string; name: string; can_import?: boolean };

type Props = {
  visible: boolean;
  restaurants: Restaurant[];
  canReplaceImport: boolean;
  showDebugHead?: boolean;
  pendingReimport: ReimportRequest | null;
  onPendingReimportHandled: () => void;
  onUploaded: (report: BKReport) => void;
};

export function ImportsPage({
  visible,
  restaurants,
  canReplaceImport,
  showDebugHead = false,
  pendingReimport,
  onPendingReimportHandled,
  onUploaded,
}: Props) {
  if (!visible) return null;

  return (
    <TabsContent value="data" className="space-y-4">
      <BkReportUploader
        restaurants={restaurants}
        canReplace={canReplaceImport}
        showDebugHead={showDebugHead}
        pendingReimport={pendingReimport}
        onPendingReimportHandled={onPendingReimportHandled}
        onUploaded={onUploaded}
      />
    </TabsContent>
  );
}
