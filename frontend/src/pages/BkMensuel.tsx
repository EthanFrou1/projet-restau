import { TabsContent } from "@/components/ui/tabs";
import { BkMonthlyRecap } from "@/components/bk/BkMonthlyRecap";

type Restaurant = { id: number; code: string; name: string };

type Props = {
  visible: boolean;
  restaurants: Restaurant[];
};

export function MonthlyPage({ visible, restaurants }: Props) {
  if (!visible) return null;

  return (
    <TabsContent value="bk-monthly" className="space-y-4">
      <BkMonthlyRecap restaurants={restaurants} />
    </TabsContent>
  );
}
