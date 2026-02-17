import { TabsContent } from "@/components/ui/tabs";
import { DirectionExecutive } from "@/components/direction/DirectionExecutive";
import type { Restaurant } from "@/components/direction/types";

type Props = {
  visible: boolean;
  restaurants: Restaurant[];
  openExportSignal?: number;
};

export function DirectionPage({ visible, restaurants, openExportSignal = 0 }: Props) {
  if (!visible) return null;

  return (
    <TabsContent value="executive" className="space-y-4">
      <DirectionExecutive restaurants={restaurants} openExportSignal={openExportSignal} />
    </TabsContent>
  );
}
