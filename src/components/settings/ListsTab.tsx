import { useState, useEffect, useCallback } from "react";
import { handleApiError } from "../../shared/utils/errorHandler";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner@2.0.3";
import {
  deleteFunction,
  getFunction,
  postFunction,
  putFunction,
} from "../../shared/api/client";
import { ApiListResponse, ApiListItemResponse } from "../../types/api";
import { CRUDList } from "./CRUDList";

interface ListItem {
  id: string;
  value: string;
}

const LIST_CONFIG = {
  categories: {
    endpoint: "categories",
    collectionKey: "categories",
    responseItemKey: "category",
    valueField: "category",
    singularLabel: "Category",
    pluralLabel: "categories",
    label: "Categories",
  },
  types: {
    endpoint: "subcategories",
    collectionKey: "subcategories",
    responseItemKey: "subcategory",
    valueField: "subcategory",
    singularLabel: "Type",
    pluralLabel: "types",
    label: "Type",
  },
  colors: {
    endpoint: "colors",
    collectionKey: "colors",
    responseItemKey: "color",
    valueField: "color",
    singularLabel: "Color",
    pluralLabel: "colors",
    label: "Colors",
  },
  brands: {
    endpoint: "brands",
    collectionKey: "brands",
    responseItemKey: "brand",
    valueField: "brand",
    singularLabel: "Brand",
    pluralLabel: "brands",
    label: "Brand",
  },
  names: {
    endpoint: "names",
    collectionKey: "names",
    responseItemKey: "name",
    valueField: "name",
    singularLabel: "Name",
    pluralLabel: "names",
    label: "Name",
  },
  paymentMethods: {
    endpoint: "payment-methods",
    collectionKey: "paymentMethods",
    responseItemKey: "paymentMethod",
    valueField: "payment_method",
    singularLabel: "Payment method",
    pluralLabel: "payment methods",
    label: "Payment Methods",
  },
} as const;

type ListKey = keyof typeof LIST_CONFIG;

const TAB_KEYS: ListKey[] = ["categories", "types", "colors", "brands", "names", "paymentMethods"];

export function ListsTab() {
  const [activeTab, setActiveTab] = useState<ListKey>("categories");
  const [lists, setLists] = useState<Record<ListKey, ListItem[]>>({
    categories: [],
    types: [],
    colors: [],
    brands: [],
    names: [],
    paymentMethods: [],
  });
  const [loading, setLoading] = useState<Record<ListKey, boolean>>({
    categories: false,
    types: false,
    colors: false,
    brands: false,
    names: false,
    paymentMethods: false,
  });

  const fetchList = useCallback(async (listKey: ListKey) => {
    const config = LIST_CONFIG[listKey];
    setLoading((prev) => ({ ...prev, [listKey]: true }));
    try {
      const data = await getFunction<ApiListResponse>(config.endpoint);
      const rawItems = Array.isArray(data?.[config.collectionKey]) ? data[config.collectionKey] : [];
      const formattedItems = (rawItems as unknown[]).map((item: unknown) => {
        const typedItem = item as Record<string, unknown>;
        return {
          id: typedItem.id as string,
          value: (typedItem[config.valueField] as string) ?? "",
        };
      });
      setLists((prev) => ({ ...prev, [listKey]: formattedItems }));
    } catch (error) {
      handleApiError(error, config.pluralLabel);
    } finally {
      setLoading((prev) => ({ ...prev, [listKey]: false }));
    }
  }, []);

  useEffect(() => {
    TAB_KEYS.forEach(fetchList);
  }, [fetchList]);

  const makeHandlers = (listKey: ListKey) => {
    const config = LIST_CONFIG[listKey];

    const onAdd = async (value: string) => {
      const data = await postFunction<ApiListResponse<ApiListItemResponse>>(config.endpoint, { value });
      const created = data?.[config.responseItemKey] as ApiListItemResponse | undefined;
      setLists((prev) => ({
        ...prev,
        [listKey]: [
          ...prev[listKey],
          {
            id: created?.id ?? Date.now().toString(),
            value: (created?.[config.valueField] as string) ?? value,
          },
        ],
      }));
      toast.success(`${config.singularLabel} added successfully!`);
    };

    const onEdit = async (id: string, value: string) => {
      const data = await putFunction<ApiListResponse<ApiListItemResponse>>(
        `${config.endpoint}/${id}`,
        { value },
      );
      const updated = data?.[config.responseItemKey] as ApiListItemResponse | undefined;
      setLists((prev) => ({
        ...prev,
        [listKey]: prev[listKey].map((item) =>
          item.id === id
            ? { id: updated?.id ?? item.id, value: (updated?.[config.valueField] as string) ?? value }
            : item,
        ),
      }));
      toast.success(`${config.singularLabel} updated successfully!`);
    };

    const onDelete = async (id: string) => {
      try {
        await deleteFunction(`${config.endpoint}/${id}`);
        setLists((prev) => ({
          ...prev,
          [listKey]: prev[listKey].filter((item) => item.id !== id),
        }));
        toast.success(`${config.singularLabel} deleted successfully!`);
      } catch (error) {
        handleApiError(error, config.singularLabel.toLowerCase(), `Failed to delete ${config.singularLabel.toLowerCase()}`);
      }
    };

    return { onAdd, onEdit, onDelete };
  };

  const wrapWithErrorHandling = (listKey: ListKey) => {
    const config = LIST_CONFIG[listKey];
    const { onAdd, onEdit, onDelete } = makeHandlers(listKey);

    return {
      onAdd: async (value: string) => {
        try {
          await onAdd(value);
        } catch (error) {
          handleApiError(error, config.singularLabel.toLowerCase(), `Failed to add ${config.singularLabel.toLowerCase()}`);
          throw error;
        }
      },
      onEdit: async (id: string, value: string) => {
        try {
          await onEdit(id, value);
        } catch (error) {
          handleApiError(error, config.singularLabel.toLowerCase(), `Failed to update ${config.singularLabel.toLowerCase()}`);
          throw error;
        }
      },
      onDelete,
    };
  };

  const renderCRUDList = (listKey: ListKey) => {
    const config = LIST_CONFIG[listKey];
    const handlers = wrapWithErrorHandling(listKey);

    return (
      <CRUDList
        title={config.label}
        items={lists[listKey]}
        loading={loading[listKey]}
        onAdd={handlers.onAdd}
        onEdit={handlers.onEdit}
        onDelete={handlers.onDelete}
        filterItem={
          listKey === "paymentMethods"
            ? (item) => !item.value.toLowerCase().startsWith("store credit")
            : undefined
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Mobile: Select Dropdown */}
      <div className="block lg:hidden">
        <Select value={activeTab} onValueChange={(value) => setActiveTab(value as ListKey)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAB_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {LIST_CONFIG[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-6">{renderCRUDList(activeTab)}</div>
      </div>

      {/* Desktop: Tabs */}
      <div className="hidden lg:block">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ListKey)} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            {TAB_KEYS.map((key) => (
              <TabsTrigger key={key} value={key}>
                {LIST_CONFIG[key].label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mt-6">
            {TAB_KEYS.map((key) => (
              <TabsContent key={key} value={key} className="mt-0">
                {renderCRUDList(key)}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
