import { useState } from "react";
import { ExternalLink, Loader2, Wand2, Copy, CheckCheck, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  prospectId: number;
  businessName: string;
  category: string;
  phone: string;
}

interface PreviewRecord {
  id: number;
  token: string;
  previewUrl: string;
  colorScheme: string;
  viewCount: number;
  createdAt: string;
}

const COLOR_OPTIONS = [
  { value: "indigo", label: "Indigo", color: "#4f46e5" },
  { value: "emerald", label: "Emerald", color: "#059669" },
  { value: "amber", label: "Amber", color: "#d97706" },
  { value: "rose", label: "Rose", color: "#e11d48" },
  { value: "violet", label: "Violet", color: "#7c3aed" },
  { value: "slate", label: "Slate", color: "#475569" },
];

export function PreviewGenerator({ prospectId, businessName, category, phone }: Props) {
  const { toast } = useToast();
  const [tagline, setTagline] = useState("");
  const [services, setServices] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [colorScheme, setColorScheme] = useState("indigo");
  const [generating, setGenerating] = useState(false);
  const [previews, setPreviews] = useState<PreviewRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadPreviews = async () => {
    const res = await fetch(`${BASE}/api/previews/prospect/${prospectId}`);
    if (res.ok) {
      const data = await res.json();
      setPreviews(data);
      setLoaded(true);
    }
  };

  if (!loaded) {
    loadPreviews();
  }

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${BASE}/api/previews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectId,
          tagline: tagline || undefined,
          colorScheme,
          services: services || undefined,
          aboutText: aboutText || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviews((prev) => [data, ...prev]);
      toast({ title: "Preview website berhasil dibuat!" });
    } catch (e: unknown) {
      toast({ title: "Gagal generate preview", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/preview/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Link preview disalin!" });
  };

  const openPreview = (token: string) => {
    window.open(`/preview/${token}`, "_blank");
  };

  const waShare = (token: string) => {
    const url = `${window.location.origin}/preview/${token}`;
    const msg = encodeURIComponent(
      `Halo! Saya sudah siapkan preview website gratis untuk ${businessName}.\n\nSilakan lihat di sini: ${url}\n\nBagaimana menurut Anda? Apakah ingin kita wujudkan websitenya?`
    );
    window.open(`https://wa.me/${phone.replace(/^0/, "62").replace(/\D/g, "")}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Generate Preview Website
          </CardTitle>
          <CardDescription className="text-xs">
            Buat preview website otomatis untuk {businessName} — share link-nya ke owner via WA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tagline (opsional)</Label>
            <Input
              placeholder={`Layanan terbaik untuk setiap kebutuhan ${category.toLowerCase()} Anda`}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Layanan (pisah dengan koma, opsional)</Label>
            <Input
              placeholder="Layanan 1, Layanan 2, Layanan 3"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tentang bisnis (opsional)</Label>
            <Textarea
              placeholder="Deskripsi singkat tentang bisnis..."
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Warna tema</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColorScheme(c.value)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                    colorScheme === c.value
                      ? "border-foreground shadow-sm font-semibold"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={generate} disabled={generating} className="w-full gap-2" size="sm">
            {generating
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating...</>
              : <><Wand2 className="h-3.5 w-3.5" />Generate Preview Website</>}
          </Button>
        </CardContent>
      </Card>

      {previews.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Preview yang sudah dibuat ({previews.length})
          </p>
          {previews.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: COLOR_OPTIONS.find((c) => c.value === p.colorScheme)?.color ?? "#4f46e5",
                    }}
                  />
                  <code className="text-xs text-muted-foreground font-mono">/preview/{p.token.slice(0, 8)}…</code>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Eye className="h-2.5 w-2.5" />{p.viewCount} views
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString("id-ID")}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs gap-1"
                  onClick={() => openPreview(p.token)}
                >
                  <ExternalLink className="h-3 w-3" />
                  Buka Preview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs gap-1"
                  onClick={() => copyLink(p.token)}
                >
                  {copied === p.token
                    ? <><CheckCheck className="h-3 w-3 text-green-600" />Disalin!</>
                    : <><Copy className="h-3 w-3" />Copy Link</>}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                  onClick={() => waShare(p.token)}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.557 4.12 1.532 5.848L.047 23.869c-.09.383.247.72.63.63l6.021-1.485A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.814 9.814 0 01-5.007-1.371l-.358-.213-3.716.917.935-3.618-.234-.372A9.817 9.817 0 012.182 12C2.182 6.565 6.565 2.182 12 2.182S21.818 6.565 21.818 12 17.435 21.818 12 21.818z"/>
                  </svg>
                  Kirim WA
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
