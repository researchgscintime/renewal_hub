import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Search, Upload, FileText, Download, Trash2, Pencil, Plus, Users,
  IndianRupee, CalendarDays, CheckCircle2, Shield, LogOut, Eye, FileDown,
} from "lucide-react";
import { USERS, DIRECTORS, type AppUser } from "@/lib/constants";
import { getAllRecords, saveRecord, deleteRecord, uploadAttachment, type ContractRecord } from "@/lib/db";
import { formatCurrency, formatDate, downloadDataUrl, openAttachment, exportToCSV } from "@/lib/helpers";

interface FormState {
  id: string | null;
  clientName: string;
  contractAmount: string;
  signedDate: string;
  updatedBy: string;
  attachmentName: string;
  attachmentType: string;
  attachmentDataUrl: string;
  notes: string;
  createdAt?: string;
}

const emptyForm: FormState = {
  id: null,
  clientName: "",
  contractAmount: "",
  signedDate: "",
  updatedBy: DIRECTORS[0],
  attachmentName: "",
  attachmentType: "",
  attachmentDataUrl: "",
  notes: "",
};

export default function ContractRenewalDashboard() {
  const [records, setRecords] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [directorFilter, setDirectorFilter] = useState("All");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState(USERS[0].email);
  const [userPin, setUserPin] = useState("");
  const [sessionUser, setSessionUser] = useState<AppUser | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileObjectRef = useRef<File | null>(null);

  useEffect(() => { loadRecords(); }, []);

  async function loadRecords() {
    setLoading(true);
    setError("");
    try {
      const data = await getAllRecords();
      const sorted = [...data].sort((a, b) => {
        const left = new Date(b.signedDate || b.updatedAt || 0).getTime();
        const right = new Date(a.signedDate || a.updatedAt || 0).getTime();
        return left - right;
      });
      setRecords(sorted);
    } catch {
      setError("Unable to load records from browser storage.");
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = sessionUser?.role === "admin";

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const found = USERS.find((u) => u.email === userEmail && u.pin === userPin);
    if (!found) {
      setError("Invalid demo credentials. Use one of the user IDs shown on screen.");
      return;
    }
    setSessionUser(found);
    setError("");
    setUserPin("");
  }

  function handleLogout() {
    setSessionUser(null);
    setSearch("");
    setDirectorFilter("All");
    setError("");
  }

  function resetForm() {
    setForm({ ...emptyForm, updatedBy: isAdmin ? DIRECTORS[0] : sessionUser?.name || DIRECTORS[0] });
    if (fileRef.current) fileRef.current.value = "";
    fileObjectRef.current = null;
  }

  function handleAddNew() {
    resetForm();
    setIsDialogOpen(true);
  }

  function canEditRecord(record: ContractRecord) {
    if (!sessionUser) return false;
    if (isAdmin) return true;
    return record.updatedBy === sessionUser.name;
  }

  function handleEdit(record: ContractRecord) {
    if (!canEditRecord(record)) return;
    setForm({
      id: record.id,
      clientName: record.clientName,
      contractAmount: String(record.contractAmount),
      signedDate: record.signedDate,
      updatedBy: record.updatedBy,
      attachmentName: record.attachmentName || "",
      attachmentType: record.attachmentType || "",
      attachmentDataUrl: record.attachmentDataUrl || "",
      notes: record.notes || "",
      createdAt: record.createdAt,
    });
    if (fileRef.current) fileRef.current.value = "";
    setIsDialogOpen(true);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("Please upload a file up to 8 MB.");
      return;
    }
    try {
      fileObjectRef.current = file;
      setForm((prev) => ({ ...prev, attachmentName: file.name, attachmentType: file.type }));
      setError("");
    } catch {
      setError("Unable to read the selected file.");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.clientName.trim()) { setError("Client name is required."); return; }
    if (!form.contractAmount || Number(form.contractAmount) <= 0) { setError("Please enter a valid renewal contract amount."); return; }
    if (!form.signedDate) { setError("Please select the date of signing."); return; }
    if (!sessionUser) { setError("Please sign in first."); return; }
    setSaving(true);
    try {
      const owner = isAdmin ? form.updatedBy : sessionUser.name;
      const recordId = form.id || crypto.randomUUID();
      let attachmentDataUrl = form.attachmentDataUrl;
      if (fileObjectRef.current) {
        attachmentDataUrl = await uploadAttachment(fileObjectRef.current, recordId);
        fileObjectRef.current = null;
      }
      const payload: ContractRecord = {
        id: recordId,
        clientName: form.clientName,
        contractAmount: Number(form.contractAmount),
        signedDate: form.signedDate,
        updatedBy: owner,
        attachmentName: form.attachmentName,
        attachmentType: form.attachmentType,
        attachmentDataUrl,
        notes: form.notes,
        createdAt: form.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveRecord(payload);
      await loadRecords();
      setIsDialogOpen(false);
      resetForm();
    } catch {
      setError("Unable to save the record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!isAdmin) return;
    const confirmed = window.confirm("Delete this renewal record?");
    if (!confirmed) return;
    try {
      await deleteRecord(id);
      await loadRecords();
    } catch {
      setError("Unable to delete the record.");
    }
  }

  const visibleRecords = useMemo(() => {
    if (!sessionUser) return [];
    if (isAdmin) return records;
    return records.filter((r) => r.updatedBy === sessionUser.name);
  }, [records, isAdmin, sessionUser]);

  const filteredRecords = useMemo(() => {
    return visibleRecords.filter((record) => {
      const text = [record.clientName, record.attachmentName, record.notes].join(" ").toLowerCase();
      const matchSearch = text.includes(search.toLowerCase());
      const matchDirector = directorFilter === "All" || record.updatedBy === directorFilter;
      return matchSearch && matchDirector;
    });
  }, [visibleRecords, search, directorFilter]);

  const totalValue = useMemo(() => filteredRecords.reduce((s, i) => s + Number(i.contractAmount || 0), 0), [filteredRecords]);

  const signedThisMonth = useMemo(() => {
    const now = new Date();
    return filteredRecords.filter((i) => {
      if (!i.signedDate) return false;
      const dt = new Date(i.signedDate);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    }).length;
  }, [filteredRecords]);

  const attachmentCoverage = useMemo(() => {
    if (!filteredRecords.length) return 0;
    return Math.round((filteredRecords.filter((r) => r.attachmentDataUrl).length / filteredRecords.length) * 100);
  }, [filteredRecords]);

  const directorBreakup = useMemo(() => {
    return DIRECTORS.map((name) => ({
      name,
      count: records.filter((r) => r.updatedBy === name).length,
      value: records.filter((r) => r.updatedBy === name).reduce((s, r) => s + Number(r.contractAmount || 0), 0),
    }));
  }, [records]);

  const latestRecordDate = useMemo(() => {
    if (!filteredRecords.length) return "—";
    const top = [...filteredRecords].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    return formatDate(top.updatedAt);
  }, [filteredRecords]);

  // ─── LOGIN SCREEN ───
  if (!sessionUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8">
          {/* Left: Info */}
          <div className="flex flex-col justify-center space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Renewal Contract Dashboard</h1>
              <p className="mt-2 text-muted-foreground">
                Shared online-style renewal tracker for Admin, Jayesh Gogri, Prerana Shah, and Prasanna Sudke.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Shield className="mx-auto h-6 w-6 text-primary mb-1" />
                  <p className="text-xs font-medium text-foreground">Role-based access</p>
                  <p className="text-xs text-muted-foreground">Admin + 3 Directors</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <FileText className="mx-auto h-6 w-6 text-primary mb-1" />
                  <p className="text-xs font-medium text-foreground">Files supported</p>
                  <p className="text-xs text-muted-foreground">PDF, Word, Images</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Users className="mx-auto h-6 w-6 text-primary mb-1" />
                  <p className="text-xs font-medium text-foreground">Dashboard view</p>
                  <p className="text-xs text-muted-foreground">Summary + Register</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Demo sign-in credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {USERS.map((u) => (
                  <div key={u.email} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      <p className="text-xs font-mono text-foreground">PIN: {u.pin}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: Login form */}
          <div className="flex items-center">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>Use any of the demo users to enter the app.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select value={userEmail} onValueChange={(v) => setUserEmail(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {USERS.map((u) => (
                          <SelectItem key={u.email} value={u.email}>
                            {u.name} — {u.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>PIN</Label>
                    <Input type="password" value={userPin} onChange={(e) => setUserPin(e.target.value)} placeholder="Enter PIN" />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full">Enter Dashboard</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ───
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Signed in as</p>
              <p className="text-base font-bold text-foreground">{sessionUser.name}</p>
              <p className="text-xs text-muted-foreground">
                <Badge variant="secondary" className="mr-1">{sessionUser.role}</Badge>
                {sessionUser.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredRecords)} className="gap-1">
              <FileDown className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={loadRecords}>Refresh</Button>
            <Button size="sm" onClick={handleAddNew} className="gap-1">
              <Plus className="h-4 w-4" /> Add Renewal
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <h1 className="text-2xl font-bold text-foreground">Renewal Contracts Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Admin can view, filter, edit, export, and delete all renewal records."
              : "Directors can maintain their own renewal records, upload signed contracts, and monitor current progress."}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Renewals", value: filteredRecords.length, icon: FileText },
            { label: "Total Value", value: formatCurrency(totalValue), icon: IndianRupee },
            { label: "Signed This Month", value: signedThisMonth, icon: CalendarDays },
            { label: "Attachment Coverage", value: `${attachmentCoverage}%`, icon: CheckCircle2, extra: <Progress value={attachmentCoverage} className="mt-2 h-1.5" /> },
            { label: "Last Update", value: latestRecordDate, icon: CalendarDays },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                {stat.extra}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            {isAdmin && <TabsTrigger value="directors">Director Summary</TabsTrigger>}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by client, file name, or notes" className="pl-9" />
              </div>
              {isAdmin ? (
                <Select value={directorFilter} onValueChange={setDirectorFilter}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Directors</SelectItem>
                    {DIRECTORS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground self-center">Viewing records for: {sessionUser.name}</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">Records shown: {filteredRecords.length}</p>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Renewal Register</CardTitle>
                <CardDescription>Track signed renewals, values, and supporting documents in one place.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading records...</p>
                ) : filteredRecords.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No renewal records available.</p>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client Name</TableHead>
                          <TableHead>Renewal Amount</TableHead>
                          <TableHead>Signed Date</TableHead>
                          {isAdmin && <TableHead>Updated By</TableHead>}
                          <TableHead>Attachment</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.clientName}</TableCell>
                            <TableCell>{formatCurrency(record.contractAmount)}</TableCell>
                            <TableCell>{formatDate(record.signedDate)}</TableCell>
                            {isAdmin && <TableCell><Badge variant="outline">{record.updatedBy}</Badge></TableCell>}
                            <TableCell>
                              {record.attachmentDataUrl ? (
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openAttachment(record.attachmentDataUrl)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => downloadDataUrl(record.attachmentDataUrl, record.attachmentName)} className="gap-1 text-xs">
                                    <Download className="h-3 w-3" />
                                    {record.attachmentName || "Download"}
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No file</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{record.notes || "—"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {canEditRecord(record) && (
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(record)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {isAdmin && (
                                  <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="directors">
              <div className="grid md:grid-cols-3 gap-4">
                {directorBreakup.map((item) => (
                  <Card key={item.name}>
                    <CardHeader>
                      <CardTitle className="text-base">{item.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Contracts renewed</p>
                        <p className="text-lg font-bold text-foreground">{item.count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Renewal value</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(item.value)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Renewal Record" : "Add Renewal Record"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Name of the client</Label>
              <Input value={form.clientName} onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))} placeholder="Enter client name" />
            </div>
            <div className="space-y-2">
              <Label>Amount of renewal contract</Label>
              <Input type="number" min={0} step="0.01" value={form.contractAmount} onChange={(e) => setForm((p) => ({ ...p, contractAmount: e.target.value }))} placeholder="Enter amount" />
            </div>
            <div className="space-y-2">
              <Label>Date when it got signed</Label>
              <Input type="date" value={form.signedDate} onChange={(e) => setForm((p) => ({ ...p, signedDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Director responsible</Label>
              {isAdmin ? (
                <Select value={form.updatedBy} onValueChange={(v) => setForm((p) => ({ ...p, updatedBy: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIRECTORS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={sessionUser.name} disabled />
              )}
            </div>
            <div className="space-y-2">
              <Label>Signed renewal contract</Label>
              <Input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp" onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground">Supported: PDF, Word, and image files. Max 8 MB.</p>
              {form.attachmentName && (
                <Badge variant="secondary" className="gap-1"><Upload className="h-3 w-3" />{form.attachmentName}</Badge>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes / remarks" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : form.id ? "Update Record" : "Save Record"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
