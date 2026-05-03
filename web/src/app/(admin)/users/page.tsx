"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import {
  JOB_TITLES,
  JOB_TITLE_LABELS,
  userInviteSchema,
  userUpdateSchema,
  type AdminUser,
  type UserInviteInput,
  type UserUpdateInput,
} from "@ats/shared";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CenteredLoading } from "@/components/common/loading-state";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import { formatDate, formatRelative } from "@/lib/format";

interface ListResponse {
  items: AdminUser[];
}

export default function UsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await api.get<ListResponse>("/api/users");
      setItems(res.items);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const inviteForm = useForm<UserInviteInput>({
    resolver: zodResolver(userInviteSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
      jobTitle: "HR_RECRUITMENT",
    },
  });

  const editForm = useForm<UserUpdateInput>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      displayName: "",
      jobTitle: "HR_RECRUITMENT",
      isActive: true,
    },
  });

  useEffect(() => {
    if (editing) {
      editForm.reset({
        displayName: editing.displayName,
        jobTitle: editing.jobTitle,
        isActive: editing.isActive,
      });
    }
  }, [editing, editForm]);

  async function handleInvite(values: UserInviteInput) {
    try {
      await api.post<AdminUser>("/api/users", values);
      toast.success("Admin invited.");
      setInviteOpen(false);
      inviteForm.reset();
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
    }
  }

  async function handleEditSubmit(values: UserUpdateInput) {
    if (!editing) return;
    try {
      await api.patch<{ user: AdminUser }>(`/api/users/${editing.uid}`, values);
      toast.success("Admin updated.");
      setEditing(null);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
    }
  }

  async function toggleActive(user: AdminUser, next: boolean) {
    try {
      await api.patch(`/api/users/${user.uid}`, { isActive: next });
      toast.success(next ? "User reactivated." : "User deactivated.");
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Admin users"
        description="Invite and manage HR Recruitment and HR Time Keeper accounts."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Invite admin
          </Button>
        }
      />

      {loading ? (
        <CenteredLoading />
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                    No admin users yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((u) => (
                  <TableRow key={u.uid}>
                    <TableCell className="font-medium">{u.displayName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge className="border-transparent bg-secondary text-secondary-foreground">
                        {JOB_TITLE_LABELS[u.jobTitle]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.lastLoginAt ? formatRelative(u.lastLoginAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.isActive}
                        onCheckedChange={(v) => void toggleActive(u, v)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(u)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite admin</DialogTitle>
            <DialogDescription>
              Creates a Firebase Auth account and grants admin access.
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="space-y-4">
              <FormField
                control={inviteForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporary password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job title</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JOB_TITLES.map((j) => (
                          <SelectItem key={j} value={j}>
                            {JOB_TITLE_LABELS[j]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteForm.formState.isSubmitting}>
                  {inviteForm.formState.isSubmitting ? "Inviting…" : "Send invite"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit admin</DialogTitle>
            <DialogDescription>
              Update display name, job title, and active state for this admin user.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input value={field.value ?? ""} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job title</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {JOB_TITLES.map((j) => (
                          <SelectItem key={j} value={j}>
                            {JOB_TITLE_LABELS[j]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Inactive admins cannot sign in.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editForm.formState.isSubmitting}>
                  {editForm.formState.isSubmitting ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
