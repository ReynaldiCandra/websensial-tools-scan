import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Search, Upload, Users, KanbanSquare, MessageSquareText, FileText,
  Package, Settings, MonitorPlay, Workflow,
} from "lucide-react";

const step = (n: number, title: string, children: React.ReactNode) => ({ n, title, children });

export function Panduan() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panduan Penggunaan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Semua yang perlu Anda tahu untuk memakai Websensial CRM dari mencari prospek sampai invoice terbayar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" />
            Alur Kerja Harian (ringkasan)
          </CardTitle>
          <CardDescription>
            Cari bisnis → import → isi pipeline → kirim demo via WA → deal → invoice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            {[
              "1. Cari Prospek",
              "2. Import ke Pipeline",
              "3. Hubungi via WA",
              "4. Generate Demo",
              "5. Follow-up",
              "6. Deal + Invoice",
            ].map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 text-primary px-3 py-1.5">{s}</span>
                {i < 5 && <span className="text-muted-foreground">→</span>}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="prospek">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="prospek" className="gap-2"><Search className="h-4 w-4" /> Cari Prospek</TabsTrigger>
          <TabsTrigger value="manage" className="gap-2"><Users className="h-4 w-4" /> Kelola Prospek</TabsTrigger>
          <TabsTrigger value="wa" className="gap-2"><MessageSquareText className="h-4 w-4" /> Template WA</TabsTrigger>
          <TabsTrigger value="demo" className="gap-2"><MonitorPlay className="h-4 w-4" /> Demo Website</TabsTrigger>
          <TabsTrigger value="uang" className="gap-2"><FileText className="h-4 w-4" /> Invoice & Paket</TabsTrigger>
          <TabsTrigger value="setting" className="gap-2"><Settings className="h-4 w-4" /> Pengaturan</TabsTrigger>
        </TabsList>

        {/* ── CARI PROSPEK ── */}
        <TabsContent value="prospek" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Menu "Cari Prospek" — sumber lead Anda</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p><strong className="text-foreground">Cara A — Cari Otomatis (utama):</strong> pilih <em>Kota</em> + <em>Kategori Bisnis</em>, biarkan centang <em>Hanya yang belum punya website</em>, lalu klik <strong>Cari Sekarang</strong>. Data diambil dari Google Maps, jadi setiap baris berisi nama bisnis, rating + jumlah review, nomor HP, alamat, status website, tombol <strong>WA</strong>, dan link Maps untuk verifikasi.</p>
              <p><strong className="text-foreground">Cara B — Import CSV (cadangan):</strong> kalau Anda sudah punya export dari ekstensi Chrome seperti G Maps Leads Finder / GeoLeadScraper, paste di tab <em>Import CSV</em>. Kolom terdeteksi otomatis (Website, Rating, Reviews), duplikat dilewati. Baris <strong>tanpa website</strong> = target utama; baris ber-website tetap diimpor untuk penawaran redesign.</p>
              <p><strong className="text-foreground">20 hasil per pencarian.</strong> Untuk kota besar, ganti kategori atau ulangi dengan kategori terkait agar cakupannya lebih luas. Hasil terakhir tetap tersimpan saat Anda pindah menu — ada penanda "disimpan" beserta jamnya, jadi tidak perlu mencari ulang.</p>
              <p><strong className="text-foreground">Langkah setelah muncul hasil:</strong> centang bisnis yang layak → <strong>Import N ke Pipeline</strong>. Setelah itu lanjut ke menu <em>Pipeline</em> dan kirim WA dari kartu prospek.</p>
              <p><strong className="text-foreground">Kuota:</strong> panel <em>Kuota pencarian</em> di atas filter menampilkan sisa kredit. Akun Serper baru mendapat <strong>2.500 pencarian gratis</strong>; satu pencarian tanpa cache = 1 kredit, sedangkan kota+kategori yang sama dalam 24 jam diambil dari cache dan <strong>tidak</strong> memotong kredit. Kalau kredit habis, pencarian otomatis pindah ke OpenStreetMap (gratis, tapi rating dan nomor HP sering kosong). Saldo resmi selalu bisa dicek lewat tautan <em>Kredit resmi di Serper</em>.</p>
              <p><strong className="text-foreground">Target harian:</strong> 20–30 prospek baru/hari sudah cukup menyulap pipeline terisi konsisten.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── KELOLA PROSPEK & PIPELINE ── */}
        <TabsContent value="manage" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prospek & Pipeline — urutan statusnya</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>Setiap prospek punya status yang bisa dipindah sesuai perkembangan:</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {["Belum Dihubungi", "Dihubungi", "Demo", "Deal", "Invoice", "Selesai"].map((s, i) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className="rounded bg-muted px-2 py-1 font-medium text-foreground">{s}</span>
                    {i < 5 && <span className="text-muted-foreground">→</span>}
                  </span>
                ))}
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong className="text-foreground">Prospek</strong>: daftar semua lead + filter status/kategori + pencarian. Klik nama → detail bisnis, riwayat aktivitas, tombol WA, dan generate demo.</li>
                <li><strong className="text-foreground">Pipeline</strong>: tampilan kanban — geser kartu antar kolom untuk mengubah status.</li>
                <li>Setiap panggilan/chat WA dicatat sebagai <em>aktivitas</em> di kartu detail supaya tidak lupa konteks percakapan.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TEMPLATE WA ── */}
        <TabsContent value="wa" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template WA — pesan siap kirim</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>Ada 5 template default: <em>Awal, Follow-up, Demo, Proposal, Closing</em> — semua bisa Anda edit atau tambah sendiri. Gunakan variabel merge seperti <code className="bg-muted px-1 rounded">{"{businessName}"}</code> supaya nama bisnis otomatis terisi saat kirim.</p>
              <p>Urutan pemakaian: template <em>Awal</em> untuk kontak pertama → <em>Demo</em> setelah link preview dibuat → <em>Follow-up</em> kalau 2–3 hari tidak dibalas → <em>Proposal</em>/<em>Closing</em> saat berminat.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DEMO WEBSITE ── */}
        <TabsContent value="demo" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demo Website — jualan paling kuat lewat bukti</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>Buka detail seorang prospek → kartu <em>Generate Preview Website</em>. Isi tagline/layanan (opsional) pilih warna tema → Generate. Sistem membuat website demo 1 halaman untuk bisnis itu.</p>
              <p>Setelah jadi: tombol <strong>Kirim WA</strong> membuka WhatsApp dengan pesan berisi link demo; tombol <strong>Copy Link</strong> juga tersedia. Bisa buat beberapa variasi untuk bisnis yang sama.</p>
              <p>Link demo berbentuk <code className="bg-muted px-1 rounded">https://…/preview/[token]</code> — bisa dibuka siapa pun tanpa login.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── INVOICE & PAKET ── */}
        <TabsContent value="uang" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice & Paket — menutup deal</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p><strong className="text-foreground">Paket</strong>: daftar harga bawaan — Entry Rp 2,5jt, Mid Rp 4,5jt, Premium Rp 7,5jt — bisa diedit/ditambah sesuai penawaran Anda.</p>
              <p><strong className="text-foreground">Invoice</strong>: buat invoice dari paket + item tambahan, diskon, dan jatuh tempo. Status draft → terkirim → lunas. Revenue di Dashboard mengikuti invoice di sini.</p>
              <p><strong className="text-foreground">Tautan dengan Fase berikutnya</strong>: pembayaran via Midtrans (link pembayaran) akan dikirim bersama invoice — modul ini disiapkan untuk ditingkatkan ke automasi pembayaran di fase Fase 1 situs websensial.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PENGATURAN ── */}
        <TabsContent value="setting" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pengaturan</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>Nama agency yang tampil di header dashboard (saat ini "Websensial"). Tema terang/gelap bisa diganti dari tombol bulat di sidebar.</p>
              <Separator />
              <p className="text-xs">Deploy Production: Vercel — URL:{" "}
                <a href="https://websensial-tools-scan.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  websensial-tools-scan.vercel.app
                </a>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle /> Tips supaya cepat closing
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc pl-4 space-y-1.5">
            <li>Isi pipeline setiap pagi — 30 menit memilih 10 bisnis, kirim WA, catat statusnya.</li>
            <li>Selalu kirim <em>link demo unik</em>, bukan broadcast tanpa nama — balasan jauh lebih tinggi.</li>
            <li>Maksimal ~30 WA baru per hari; gunakanWA Business dan personalisasi dua-tiga kalimat pertama.</li>
            <li>Follow-up 2×: H+2 dan H+7. Setelah itu tandai "Dihubungi" dan kembali nanti.</li>
            <li>Deal → buat Invoice di hari yang sama, kirim link pembayaran, tandai status Invoice.</li>
            <li>Pantau panel <em>Kuota pencarian</em> sebelum sesi prospecting; ulangi kota+kategori yang sama dalam 24 jam agar tidak memakan kredit baru.</li>
            <li>Nomor di Google Maps adalah nomor telepon bisnis — cek dulu apakah aktif di WhatsApp sebelum kirim pesan panjang.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Sparkle() {
  return <span aria-hidden>✨</span>;
}
