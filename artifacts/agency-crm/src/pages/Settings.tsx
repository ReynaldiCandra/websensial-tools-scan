import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();

  const [form, setForm] = useState({
    agencyName: "",
    contactEmail: "",
    whatsappNumber: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        agencyName: settings.agencyName,
        contactEmail: settings.contactEmail,
        whatsappNumber: settings.whatsappNumber,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(
      { data: form },
      {
        onSuccess: () => toast({ title: "Settings saved" }),
        onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <p className="ws-eyebrow">Workspace</p>
        <h1 className="ws-page-heading-title mt-1 text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">Pengaturan</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">Kelola preferensi dan profil agensi Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agency Profile</CardTitle>
          <CardDescription>Perbarui detail agensi yang digunakan pada invoice dan komunikasi prospek.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Agency Name</Label>
                <Input
                  value={form.agencyName}
                  onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input
                  value={form.whatsappNumber}
                  onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                />
              </div>
              <Button className="mt-4" onClick={handleSave} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize the CRM behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Input defaultValue={settings?.defaultCurrency ?? "IDR"} disabled />
            <p className="text-xs text-muted-foreground">Currently only IDR is supported.</p>
          </div>
          <div className="space-y-2">
            <Label>Appearance</Label>
            <p className="text-xs text-muted-foreground">
              Use the theme toggle in the sidebar to switch between light and dark mode.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
