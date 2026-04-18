"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface UserEntry {
  id: string;
  email: string;
  name: string;
  role: "MASTER" | "ADMIN" | "VIEWER";
  createdAt: string;
  createdBy: { name: string } | null;
}

interface AuthUser {
  role: "MASTER" | "ADMIN" | "VIEWER";
}

const ROLE_BADGE: Record<string, string> = {
  MASTER: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
  ADMIN: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  VIEWER: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};

export default function UsersPage() {
  const t = useTranslations("Users");

  const [users, setUsers] = useState<UserEntry[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"MASTER" | "ADMIN" | "VIEWER">("VIEWER");

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const [usersRes, meRes] = await Promise.all([
        fetch("/api/auth/users"),
        fetch("/api/auth/me"),
      ]);
      const { users: list } = await usersRes.json();
      const { user: me } = await meRes.json();
      setUsers(list || []);
      setAuthUser(me || null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          password: newPassword,
          role: newRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("createError"));
        return;
      }

      toast.success(t("createSuccess"));
      setDialogOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("VIEWER");
      fetchUsers();
    } catch {
      toast.error(t("createError"));
    } finally {
      setIsSaving(false);
    }
  };

  console.log(authUser);

  const availableRoles =
    authUser?.role === "MASTER" ? ["ADMIN", "VIEWER"] : ["VIEWER"];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            {t("title")}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{t("description")}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t("addUser")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("newUser")}</DialogTitle>
              <DialogDescription>{t("newUserDescription")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">{t("name")}</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">{t("email")}</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("password")}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">{t("role")}</Label>
                <Select
                  value={newRole}
                  onValueChange={(v) => setNewRole(v as "ADMIN" | "VIEWER")}
                >
                  <SelectTrigger id="new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSaving} className="w-full gap-2">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t("createUser")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("userList")}</CardTitle>
          <CardDescription>
            {users.length} {t("totalUsers")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {u.createdBy && (
                    <span className="text-xs text-muted-foreground hidden md:block">
                      {t("createdBy")}: {u.createdBy.name}
                    </span>
                  )}
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${ROLE_BADGE[u.role]
                      }`}
                  >
                    {u.role}
                  </span>
                  {u.role !== "MASTER" && authUser?.role === "MASTER" && (
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title={t("removeUser")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
