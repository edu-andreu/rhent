import { Settings } from "../../components/Settings";

export function SettingsTab() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/449c6984-1ec0-466d-b72a-98a32a359bcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hypothesisId:'H2',location:'SettingsTab.tsx:entry',message:'SettingsTab rendering',data:{},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return (
    <div className="h-full">
      <Settings />
    </div>
  );
}
