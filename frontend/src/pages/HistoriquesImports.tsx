import { TabsContent } from "@/components/ui/tabs";
import { BkReportBrowser } from "@/components/bk/BkReportBrowser";
import type { ReimportRequest } from "@/components/bk/uploader/types";

type Restaurant = { id: number; code: string; name: string };

type Props = {
  visible: boolean;
  restaurants: Restaurant[];
  canReimportFromHistory: boolean;
  onReimportRequest: (request: ReimportRequest) => void;
};

export function HistoryPage({
  visible,
  restaurants,
  canReimportFromHistory,
  onReimportRequest,
}: Props) {
  if (!visible) return null;

  return (
    <TabsContent value="bk-global" className="space-y-4">
      <BkReportBrowser
        restaurants={restaurants}
        canReimport={canReimportFromHistory}
        onReimportRequest={onReimportRequest}
      />
    </TabsContent>
  );
}
