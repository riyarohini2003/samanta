"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Props {
  investmentId: string;
  status: string;
}

export default function InvestmentActions({ investmentId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: "MATURED" | "WITHDRAWN") {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/investments/${investmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to update");
        return;
      }
      toast.success(`Investment marked as ${newStatus.toLowerCase()}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (status !== "ACTIVE") return null;

  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" disabled={loading} onClick={() => updateStatus("MATURED")}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mature"}
      </Button>
      <Button size="sm" variant="ghost" disabled={loading} onClick={() => updateStatus("WITHDRAWN")}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Withdraw"}
      </Button>
    </div>
  );
}
