import { TabsContent } from "@/components/ui/tabs";
import { DirectionExecutive } from "@/components/direction/DirectionExecutive";
import type { Restaurant } from "@/components/direction/types";

type Props = {
  visible: boolean;
  restaurants: Restaurant[];
};

export function DirectionPage({ visible, restaurants }: Props) {
  if (!visible) return null;

  return (
    <TabsContent value="executive" className="space-y-4">
      <DirectionExecutive restaurants={restaurants} />
    </TabsContent>
  );
}
