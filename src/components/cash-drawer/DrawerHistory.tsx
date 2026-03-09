import React from "react";
import { DollarSign, Lock, Wallet, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { formatCurrency, formatDateTime, isCashOutTransaction, DrawerHistoryItem, DrawerTransaction, DrawerSummary } from "./useCashDrawer";
import { getPrimaryTypeLabel, getSecondaryBadgeLabel, getDescriptionDisplay, getNotesDisplay } from "./TransactionTable";

interface DrawerHistoryProps {
  drawerHistory: DrawerHistoryItem[];
  expandedDrawerId: string | null;
  drawerDetails: Record<string, { transactions: DrawerTransaction[]; summary: DrawerSummary & { countedCash: number | null; difference: number | null } }>;
  loadingDetail: string | null;
  toggleDrawerExpansion: (drawerId: string) => void;
}

export function DrawerHistory({
  drawerHistory,
  expandedDrawerId,
  drawerDetails,
  loadingDetail,
  toggleDrawerExpansion,
}: DrawerHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Drawer History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Opened By</TableHead>
              <TableHead>Closed By</TableHead>
              <TableHead className="text-right">Opening</TableHead>
              <TableHead className="text-right">Counted</TableHead>
              <TableHead className="text-right">Diff</TableHead>
              <TableHead className="text-center">Opening Alert</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drawerHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No history available
                </TableCell>
              </TableRow>
            ) : (
              drawerHistory.flatMap((d: any) => {
                const isExpanded = expandedDrawerId === d.drawerId;
                const detail = drawerDetails[d.drawerId];
                const isLoadingThis = loadingDetail === d.drawerId;
                const rows = [
                  <TableRow
                    key={d.drawerId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleDrawerExpansion(d.drawerId)}
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {d.businessDate || 'Invalid Date'}
                      <div className="text-xs text-muted-foreground font-normal">
                        {d.openedAt ? formatDateTime(d.openedAt).split(',')[0] : '-'}
                      </div>
                    </TableCell>
                    <TableCell>{d.openedBy || '-'}</TableCell>
                    <TableCell>{d.closedBy || '-'}</TableCell>
                    <TableCell className="text-right">${formatCurrency(d.openingCash)}</TableCell>
                    <TableCell className="text-right">
                      {d.countedCash !== null && d.countedCash !== undefined ? `$${formatCurrency(d.countedCash)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {d.difference !== null && d.difference !== undefined ? (
                        <span className={d.difference === 0 ? 'text-green-600' : 'text-red-600 font-medium'}>
                          {d.difference > 0 ? '+' : ''}${formatCurrency(Math.abs(d.difference))}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {d.openingMismatch !== null && d.openingMismatch !== undefined ? (
                        <span className="text-white text-[10px] px-2 py-0.5 rounded-full font-medium opacity-90 inline-block" style={{ backgroundColor: '#ef4444' }}>
                          {d.openingMismatch > 0 ? '+' : ''}${formatCurrency(Math.abs(d.openingMismatch))}
                        </span>
                      ) : (
                        <span className="text-green-600 text-xl">✓</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 w-[40px]">
                      <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        {isLoadingThis ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ];
                if (isExpanded) {
                  rows.push(
                    <TableRow key={`${d.drawerId}-detail`}>
                      <TableCell colSpan={8} className="p-0 bg-muted/30">
                        {isLoadingThis && !detail ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
                            <span className="text-sm text-muted-foreground">Loading transactions...</span>
                          </div>
                        ) : detail ? (
                          <div className="px-6 py-4 space-y-3">
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                              <div className="flex items-center gap-1.5">
                                <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Opening:</span>
                                <span className="font-medium">${formatCurrency(detail.summary.openingCash)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-muted-foreground">Cash In:</span>
                                <span className="font-medium text-green-600">${formatCurrency(detail.summary.totalCashIn)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                                <span className="text-muted-foreground">Cash Out:</span>
                                <span className="font-medium text-red-600">${formatCurrency(detail.summary.totalCashOut)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Expected:</span>
                                <span className="font-medium">${formatCurrency(detail.summary.expectedBalance)}</span>
                              </div>
                              {detail.summary.countedCash !== null && (
                                <div className="flex items-center gap-1.5">
                                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">Counted:</span>
                                  <span className="font-medium">${formatCurrency(detail.summary.countedCash)}</span>
                                </div>
                              )}
                            </div>

                            {(() => {
                              const cashTransactions = detail.transactions.filter((t: DrawerTransaction) => t.isCash !== false);
                              return cashTransactions.length > 0 ? (
                              <div className="border rounded-md overflow-hidden bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/40">
                                      <TableHead className="text-xs py-2">Time</TableHead>
                                      <TableHead className="text-xs py-2">Type</TableHead>
                                      <TableHead className="text-xs py-2">Description</TableHead>
                                      <TableHead className="text-xs py-2">Notes</TableHead>
                                      <TableHead className="text-xs py-2 text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {cashTransactions.map((t: DrawerTransaction) => (
                                      <TableRow key={t.transactionId} className="text-sm">
                                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap py-2">
                                          {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell className="py-2">
                                          <div className="flex items-center gap-1.5">
                                            <Badge variant="outline" className="capitalize font-normal text-[11px] px-1.5 py-0">
                                              {getPrimaryTypeLabel(t)}
                                            </Badge>
                                            {getSecondaryBadgeLabel(t) != null && (
                                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                                {getSecondaryBadgeLabel(t)}
                                              </Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate py-2 text-xs">
                                          {getDescriptionDisplay(t)}
                                        </TableCell>
                                        <TableCell className="max-w-[250px] truncate py-2 text-xs text-muted-foreground">
                                          {getNotesDisplay(t)}
                                        </TableCell>
                                        <TableCell className={`text-right font-medium py-2 ${isCashOutTransaction(t) ? 'text-red-600' : t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {!isCashOutTransaction(t) && t.amount > 0 ? '+' : ''}${formatCurrency(Math.abs(t.amount))}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">No cash transactions recorded</p>
                            );
                            })()}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                }
                return rows;
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
