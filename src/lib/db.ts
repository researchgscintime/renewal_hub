import { supabase } from "./supabase";

export interface ContractRecord {
  id: string;
  clientName: string;
  contractAmount: number;
  signedDate: string;
  updatedBy: string;
  attachmentName: string;
  attachmentType: string;
  attachmentDataUrl: string; // stores Supabase Storage public URL after save
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export async function getAllRecords(): Promise<ContractRecord[]> {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .order("signedDate", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveRecord(record: ContractRecord): Promise<boolean> {
  const { error } = await supabase.from("records").upsert(record);
  if (error) throw new Error(error.message);
  return true;
}

export async function deleteRecord(id: string): Promise<boolean> {
  const { error } = await supabase.from("records").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

export async function uploadAttachment(file: File, recordId: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${recordId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("attachments")
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("attachments").getPublicUrl(path);
  return data.publicUrl;
}
