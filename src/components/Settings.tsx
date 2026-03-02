import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { PricesTab } from "./settings/PricesTab";
import { ListsTab } from "./settings/ListsTab";
import { ConfigurationsTab } from "./settings/ConfigurationsTab";

interface SettingsProps {
  onSave?: () => void;
}

export function Settings({ onSave }: SettingsProps) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/449c6984-1ec0-466d-b72a-98a32a359bcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hypothesisId:'H3',location:'Settings.tsx:entry',message:'Settings rendering',data:{},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return (
    <div className="h-full overflow-y-auto">
      <Tabs defaultValue="prices" className="w-full">
        <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
          <TabsTrigger value="prices">Prices</TabsTrigger>
          <TabsTrigger value="lists">Lists</TabsTrigger>
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="mt-6">
          <PricesTab />
        </TabsContent>

        <TabsContent value="lists" className="mt-6">
          <ListsTab />
        </TabsContent>

        <TabsContent value="configurations" className="mt-6">
          <ConfigurationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
