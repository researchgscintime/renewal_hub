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

interface DbRow {
  id: string;
  client_name: string;
  contract_amount: number;
  signed_date: string;
  updated_by: string;
  attachment_name: string;
  attachment_type: string;
  attachment_data_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

function toRecord(row: DbRow): ContractRecord {
  return {
    id: row.id,
    clientName: row.client_name,
    contractAmount: row.contract_amount,
    signedDate: row.signed_date,
    updatedBy: row.updated_by,
    attachmentName: row.attachment_name,
    attachmentType: row.attachment_type,
    attachmentDataUrl: row.attachment_data_url,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(record: ContractRecord): DbRow {
  return {
    id: record.id,
    client_name: record.clientName,
    contract_amount: record.contractAmount,
    signed_date: record.signedDate,
    updated_by: record.updatedBy,
    attachment_name: record.attachmentName,
    attachment_type: record.attachmentType,
    attachment_data_url: record.attachmentDataUrl,
    notes: record.notes,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export async function getAllRecords(): Promise<ContractRecord[]> {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .order("signed_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DbRow[]).map(toRecord);
}

export async function saveRecord(record: ContractRecord): Promise<boolean> {
  const { error } = await supabase.from("records").upsert(toRow(record));
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
