import { Badge } from "../../components/ui/badge";
import { CashDrawer } from "../../components/CashDrawer";
import { DrawerTestPanel } from "../../components/DrawerTestPanel";

interface CashTabProps {
  isDebugMode: boolean;
}

export function CashTab({ isDebugMode }: CashTabProps) {
  return (
    <div className="h-full overflow-y-auto">
      <CashDrawer />
      {isDebugMode && (
        <div className="mt-8">
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="font-semibold">🔧 Developer Mode Active</span>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-400">
                ?debug=true
              </Badge>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              API testing panel visible. Remove <code className="bg-amber-100 px-1 rounded">?debug=true</code> from URL to hide.
            </p>
          </div>
          <DrawerTestPanel />
        </div>
      )}
    </div>
  );
}
