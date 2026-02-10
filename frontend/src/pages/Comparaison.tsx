import { TabsContent } from "@/components/ui/tabs";
import { BkComparison } from "@/components/bk/BkComparison";

type Restaurant = { id: number; code: string; name: string };

type Props = {
  visible: boolean;
  restaurants: Restaurant[];
};

export function ComparisonPage({ visible, restaurants }: Props) {
  if (!visible) return null;

  return (
    <TabsContent value="bk-compare" className="space-y-4">
      <BkComparison restaurants={restaurants} />
    </TabsContent>
  );
}
