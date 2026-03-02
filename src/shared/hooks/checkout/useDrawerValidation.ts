import { useState, useEffect, useCallback } from "react";
import { DRAWER_STATUS } from "../../constants/status";

interface DrawerData {
  drawer?: {
    status: string;
    businessDate?: string;
  } | null;
}

export function useDrawerValidation(drawerData: DrawerData | null, drawerError?: string | null) {
  const [drawerStatus, setDrawerStatus] = useState<'open' | 'closed' | 'loading'>('loading');
  const [drawerBusinessDate, setDrawerBusinessDate] = useState<string | null>(null);
  const [showDrawerAlert, setShowDrawerAlert] = useState(false);
  const [drawerAlertMessage, setDrawerAlertMessage] = useState<string>('');

  useEffect(() => {
    if (!drawerData) {
      setDrawerStatus('loading');
      return;
    }
    if (drawerData.drawer?.status === DRAWER_STATUS.OPEN) {
      setDrawerStatus('open');
      setDrawerBusinessDate(drawerData.drawer.businessDate ?? null);
    } else {
      setDrawerStatus('closed');
      setDrawerBusinessDate(null);
    }
  }, [drawerData]);

  useEffect(() => {
    if (drawerError) {
      setDrawerAlertMessage(drawerError);
      setShowDrawerAlert(true);
    }
  }, [drawerError]);

  const showDrawerRequiredAlert = useCallback(() => {
    setDrawerAlertMessage(
      'You must open a cash drawer before processing any checkout. Please go to the Cash Drawer tab and open a drawer for today.'
    );
    setShowDrawerAlert(true);
  }, []);

  const showDrawerErrorAlert = useCallback((message: string) => {
    setDrawerAlertMessage(message);
    setShowDrawerAlert(true);
  }, []);

  const resetDrawer = useCallback(() => {
    setDrawerStatus('loading');
    setDrawerBusinessDate(null);
    setShowDrawerAlert(false);
    setDrawerAlertMessage('');
  }, []);

  return {
    drawerStatus,
    setDrawerStatus,
    drawerBusinessDate,
    showDrawerAlert,
    setShowDrawerAlert,
    drawerAlertMessage,
    showDrawerRequiredAlert,
    showDrawerErrorAlert,
    resetDrawer,
  };
}
