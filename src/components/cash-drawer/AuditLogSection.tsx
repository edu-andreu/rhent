import React from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "../ui/badge";
import { AuditEntry } from "./useCashDrawer";

interface AuditLogSectionProps {
  auditLog: AuditEntry[];
  showAuditLog: boolean;
  setShowAuditLog: (show: boolean) => void;
  formatAuditEntry: (entry: AuditEntry) => string;
}

export function AuditLogSection({
  auditLog,
  showAuditLog,
  setShowAuditLog,
  formatAuditEntry,
}: AuditLogSectionProps) {
  if (auditLog.length === 0) return null;

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setShowAuditLog(!showAuditLog)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" />
          <span>Edit History ({auditLog.length})</span>
        </div>
        {showAuditLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showAuditLog && (
        <div className="border-t px-4 py-3 space-y-2">
          {auditLog.map((entry) => (
            <div key={entry.audit_id} className="flex items-start gap-3 text-sm py-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize shrink-0">
                {entry.action.replace(/_/g, ' ').replace('edit ', '').replace('delete ', 'del ')}
              </Badge>
              <span className="text-muted-foreground">{formatAuditEntry(entry)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
