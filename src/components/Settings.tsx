import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { PricesTab } from "./settings/PricesTab";
import { ListsTab } from "./settings/ListsTab";
import { ConfigurationsTab } from "./settings/ConfigurationsTab";
import { UsersTab } from "./settings/UsersTab";
import { useAuth } from "../providers/AuthProvider";

interface SettingsProps {
  onSave?: () => void;
}

export function Settings({ onSave }: SettingsProps) {
  const { role } = useAuth();
  const showUsers = role === "admin" || role === "owner";
  const colCount = showUsers ? 4 : 3;

  return (
    <div className="h-full overflow-y-auto">
      <Tabs defaultValue="prices" className="w-full">
        <TabsList
          className="grid w-full max-w-2xl mx-auto"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          <TabsTrigger value="prices">Prices</TabsTrigger>
          <TabsTrigger value="lists">Lists</TabsTrigger>
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
          {showUsers && <TabsTrigger value="users">Users</TabsTrigger>}
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

        {showUsers && (
          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
