import { useState } from "react";
import { 
  useListPackages, 
  useCreatePackage, 
  useUpdatePackage, 
  useDeletePackage,
  getListPackagesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, CheckCircle2, X } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  features: z.array(z.object({ value: z.string().min(1, "Required") })).min(1, "At least one feature is required"),
  isActive: z.boolean().default(true),
});

export function Packages() {
  const { data: packages, isLoading } = useListPackages();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      features: [{ value: "" }],
      isActive: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "features"
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      features: values.features.map(f => f.value)
    };

    if (editingId) {
      updatePackage.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          toast({ title: "Package updated successfully" });
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
          handleCloseDialog();
        }
      });
    } else {
      createPackage.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Package created successfully" });
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
          handleCloseDialog();
        }
      });
    }
  };

  const handleEdit = (pkg: any) => {
    setEditingId(pkg.id);
    form.reset({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      features: pkg.features.map((f: string) => ({ value: f })),
      isActive: pkg.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this package?")) {
      deletePackage.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Package deleted" });
          queryClient.invalidateQueries({ queryKey: getListPackagesQueryKey() });
        }
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    form.reset({ name: "", description: "", price: 0, features: [{ value: "" }], isActive: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Packages</h1>
          <p className="text-muted-foreground mt-1">Kelola paket layanan dan harga standar agensi Anda.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) handleCloseDialog();
          else setIsDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Package
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Package" : "Create Package"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama paket</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Basic Website" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (IDR)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Short description..." className="h-20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <FormLabel className="mb-2 block">Features</FormLabel>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-2">
                        <FormField
                          control={form.control}
                          name={`features.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-1 space-y-0">
                              <FormControl>
                                <Input placeholder="Feature description..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 text-xs" 
                    onClick={() => append({ value: "" })}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Feature
                  </Button>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
                  <Button type="submit" disabled={createPackage.isPending || updatePackage.isPending}>
                    {createPackage.isPending || updatePackage.isPending ? "Saving..." : "Save Package"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-1/2 mb-2"/><Skeleton className="h-8 w-1/3"/></CardHeader>
              <CardContent><Skeleton className="h-32 w-full"/></CardContent>
            </Card>
          ))
        ) : packages?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground border rounded-lg bg-card border-dashed">
            No packages defined. Create your first service package.
          </div>
        ) : (
          packages?.map((pkg) => (
            <Card key={pkg.id} className={`flex flex-col h-full ${!pkg.isActive && 'opacity-60'}`}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <div className="text-2xl font-bold text-primary mt-2">
                      Rp {pkg.price.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(pkg)}>
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(pkg.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {pkg.description && (
                  <CardDescription className="mt-2 text-sm">{pkg.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {pkg.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
