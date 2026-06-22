import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Settings() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your agency preferences and profile.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agency Profile</CardTitle>
          <CardDescription>Update your agency details used in invoices and outreach.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Agency Name</Label>
            <Input defaultValue="My Digital Agency" />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input defaultValue="hello@agency.com" type="email" />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp Number</Label>
            <Input defaultValue="081234567890" />
          </div>
          <Button className="mt-4">Save Changes</Button>
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
            <Input defaultValue="IDR" disabled />
            <p className="text-xs text-muted-foreground">Currently only IDR is supported.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
