import React, { useState, useEffect } from "react";
import {
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  AlertCircle,
  HelpCircle,
  Clock,
  History,
  TrendingUp,
} from "lucide-react";
import apiClient from "../services/apiClient";

export default function Wallet() {
  const [wallet, setWallet] = useState({ walletBalance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWalletData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/wallet");
      setWallet(response.data);
    } catch (err) {
      console.error("Fetch wallet error:", err);
      setError("Failed to retrieve your wallet balance and transactions.");
    } finally {
      setWallet((prev) => ({ ...prev }));
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/wallet");
        setWallet(response.data);
      } catch (err) {
        console.error("Fetch wallet error:", err);
        setError("Failed to retrieve your wallet balance and transactions.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-36">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-semibold">
          Accessing secure wallet...
        </p>
      </div>
    );
  }

  const { walletBalance = 0, transactions = [] } = wallet;

  // Compute stats
  const totalEarnings = transactions
    .filter((t) => ["PAYOUT", "COMPENSATION"].includes(t.type) && t.status === "SUCCESS")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRefunded = transactions
    .filter((t) => t.type === "REFUND" && t.status === "SUCCESS")
    .reduce((sum, t) => sum + t.amount, 0);

  const renderTransactionIcon = (type) => {
    switch (type) {
      case "PAYMENT":
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ArrowUpRight className="size-4.5" />
          </div>
        );
      case "PAYOUT":
      case "COMPENSATION":
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-mint/10 text-primary">
            <ArrowDownLeft className="size-4.5" />
          </div>
        );
      case "REFUND":
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
            <ArrowDownLeft className="size-4.5" />
          </div>
        );
      default:
        return (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <HelpCircle className="size-4.5" />
          </div>
        );
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case "PAYMENT":
        return "Ride Booking Payment";
      case "PAYOUT":
        return "Ride Completion Payout";
      case "COMPENSATION":
        return "Cancellation Compensation";
      case "REFUND":
        return "Ride Fare Refund";
      case "COMMISSION":
        return "Platform Commission";
      default:
        return type;
    }
  };

  const getAmountColor = (type) => {
    if (["PAYOUT", "COMPENSATION", "REFUND"].includes(type)) {
      return "text-primary font-bold";
    }
    return "text-foreground/80 font-semibold";
  };

  const getAmountPrefix = (type) => {
    if (["PAYOUT", "COMPENSATION", "REFUND"].includes(type)) {
      return "+";
    }
    return "-";
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 md:py-14">
      <div className="border-b border-border/30 pb-5">
        <h1 className="font-display text-3xl font-bold text-foreground">Rahi Pay Wallet</h1>
        <p className="mt-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Secure Escrow hold ledger, refunds, and driver payouts
        </p>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Dashboard */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {/* Wallet Balance Card */}
        <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-6 shadow-soft flex flex-col justify-between h-44 bg-gradient-to-br from-card/45 via-card/35 to-primary/5">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Current Balance
            </span>
            <div className="mt-2.5 flex items-center font-display text-3xl font-bold text-foreground">
              <IndianRupee className="size-6 mr-0.5 text-primary" strokeWidth={2.5} />
              {walletBalance.toFixed(2)}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-t border-border/20 pt-3">
            Payout status: Auto-Settled Instantly
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-6 shadow-soft flex flex-col justify-between h-44">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
              <TrendingUp className="size-4 text-primary" /> Net Driver Earnings
            </span>
            <div className="mt-2.5 flex items-center font-display text-3xl font-bold text-primary">
              <IndianRupee className="size-6 mr-0.5" strokeWidth={2.5} />
              {totalEarnings.toFixed(2)}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-t border-border/20 pt-3">
            Calculated from completed payout releases
          </div>
        </div>

        {/* Total Refunded Card */}
        <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-6 shadow-soft flex flex-col justify-between h-44">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Refunds Claimed
            </span>
            <div className="mt-2.5 flex items-center font-display text-3xl font-bold text-sky-500">
              <IndianRupee className="size-6 mr-0.5" strokeWidth={2.5} />
              {totalRefunded.toFixed(2)}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider border-t border-border/20 pt-3">
            Returned via cancellation refund policy
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="mt-10 rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-7 shadow-soft">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2 mb-6">
          <History className="size-5 text-primary" /> Wallet Statement & Audit Log
        </h2>

        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/40 bg-background/25 p-12 text-center text-muted-foreground text-sm italic">
            No transaction records found. Book a ride or offer one to see wallet statements.
          </div>
        ) : (
          <div className="divide-y divide-border/20 space-y-4">
            {transactions.map((t, i) => (
              <div
                key={t._id}
                className={`flex items-center justify-between gap-4 pt-4 ${i === 0 ? "pt-0" : ""}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {renderTransactionIcon(t.type)}
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-foreground block truncate">
                      {getTransactionLabel(t.type)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium block mt-0.5 truncate">
                      ID: {t.transactionId} · {t.description || "Processed successfully"}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-sm ${getAmountColor(t.type)} flex items-center justify-end`}
                  >
                    {getAmountPrefix(t.type)}
                    <IndianRupee className="size-3.5 mr-0.5" />
                    {t.amount.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center justify-end gap-1 mt-0.5">
                    <Clock className="size-3 text-muted-foreground/60" />
                    {new Date(t.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
