import { useState } from "react";
import { 
  useListTemplates, 
  useCreateTemplate, 
  useUpdateTemplate, 
  useDeleteTemplate,
  getListTemplatesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, MessageSquareText } from "lucide-react";

const TEMPLATE_TYPES = [
  { value: "initial", label: "Initial Outreach" },
  { value: "follow_up", label: "Follow Up" },
  { value: "demo", label: "Demo" },
  { value: "proposal", label: "Proposal" },
  { value: "closing", label: "Closing" }
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  content: z.string().min(1, "Content is required"),
});

export function Templates() {
  const { data: templates, isLoading } = useListTemplates();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "initial",
      content: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingId) {
      updateTemplate.mutate({ id: editingId, data: values }, {
        onSuccess: () => {
          toast({ title: "Template updated successfully" });
          queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
          handleCloseDialog();
        }
      });
    } else {
      createTemplate.mutate({ data: values }, {
        onSuccess: () => {
          toast({ title: "Template created successfully" });
          queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
          handleCloseDialog();
        }
      });
    }
  };

  const handleEdit = (template: any) => {
    setEditingId(template.id);
    form.reset({
      name: template.name,
      type: template.type,
      content: template.content
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplate.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Template deleted" });
          queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        }
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    form.reset({ name: "", type: "initial", content: "" });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WA Templates</h1>
          <p className="text-muted-foreground mt-1">Manage your WhatsApp outreach messages.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          else setIsDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Template" : "Create Template"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Cold Outreach v1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEMPLATE_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Content</FormLabel>
                      <CardDescription className="mb-2">
                        Variables: {"{{businessName}}"}, {"{{ownerName}}"}, {"{{category}}"}
                      </CardDescription>
                      <FormControl>
                        <Textarea 
                          placeholder="Halo {{ownerName}} dari {{businessName}}..." 
                          className="min-h-[200px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                    {createTemplate.isPending || updateTemplate.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
          ))
        ) : templates?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg bg-card border-dashed">
            No templates found. Create your first WA template.
          </div>
        ) : (
          templates?.map((template) => (
            <Card key={template.id} className="flex flex-col h-full hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
                  <CardDescription className="capitalize mt-1 font-medium text-xs bg-muted px-2 py-0.5 rounded-full inline-block">
                    {template.type.replace('_', ' ')}
                  </CardDescription>
                </div>
                <div className="flex gap-1 bg-background rounded-md shadow-sm border p-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(template)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(template.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="bg-slate-50 border rounded-md p-3 text-sm text-slate-700 whitespace-pre-wrap h-full max-h-[200px] overflow-y-auto">
                  {template.content}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
