import express from "express";
import { supabase } from "../supabaseClient.js";

const router = express.Router();

// utilities
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// get active contract templates
router.get("/templates", async (_, res) => {
  try {
    const { data, error } = await supabase
      .from("ContractTemplate")
      .select("id, name, body")
      .eq("active", true);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching contract templates:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// get active contract template by template_id
router.get("/templates/:id", async (req, res) => {
  const { id: template_id } = req.params;

  try {
    const { data, error } = await supabase
      .from("ContractTemplate")
      .select("id, name, body")
      .eq("id",template_id)
      .eq("active", true)
      .maybeSingle();

    if (error) throw error;
    res.status(200).json(data ?? null);
  } catch (error) {
    console.error("Error fetching contract template:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// get basic contract
router.post("", async (req, res) => {
  const { user_id, session_id } = req.body;
  const now = new Date().toISOString();

  try {
    if (session_id) {
      // select Contract table entry
      const { data: contractData, error: contractError } = await supabase
        .from("Contract")
        .select()
        .eq("assigned_user_id", user_id)
        .eq("session_id", session_id)
        .eq("is_active", false)
        .single();

      if (contractError) throw contractError;
      res.status(200).json(contractData);
    } else {
      // delete all current, inactive user contract entries
      await supabase
        .from("Contract")
        .delete()
        .eq("assigned_user_id", user_id)
        .eq("is_active", false);

      // create new Contract table entry
      const { data: contractData, error: contractError } = await supabase
        .from("Contract")
        .insert({ assigned_user_id: user_id, status: "Draft", created_at: now, updated_at: now, is_active: false })
        .select()
        .single();

      if (contractError) throw contractError;
      res.status(200).json(contractData);
    }
  } catch (error) {
    console.error("Error obtaining contract:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//admin contract view - get contract by contract id
router.get("/admin/contracts/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("Contract")
      .select(`
        id,
        template_id,
        status,
        created_at,
        updated_at,
        signed_at,
        signed_pdf_url
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching admin contract:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// fetch all contracts for specified user
router.get("/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    const { data, error } = await supabase
      .from("Contract")
      .select("id, status, assigned_user_id, created_at, updated_at, signed_at, ContractTemplate ( name, body )")
      .eq("assigned_user_id", user_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data ?? null);
  } catch (error) {
    console.error("Error fetching contracts:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// fetch specific contract by contract_id and user_id
router.post("/:id", async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  try {
    const { data, error } = await supabase
      .from("Contract")
      .select("id, template_id, status, created_at, updated_at, signed_pdf_url, template_id")
      .eq("id", id)
      .eq("assigned_user_id", user_id)
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching contract:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// update contract details
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  const updates = { ...req.body, updated_at: now };

  try {
    const { data, error } = await supabase
      .from("Contract")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error("Error updating contract:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// update contract details
router.post("/:id/sign", async (req, res) => {
  const { file_path, data_url } = req.body;
  const blob = dataUrlToBlob(data_url);

  try {
    const { error } = await supabase
      .storage
      .from("Signed-contracts")
      .upload(file_path, blob, { upsert: true });

    if (error) throw error;
    
    const { data, error: urlError } = await supabase.storage.from("Signed-contracts").getPublicUrl(file_path);
    
    if (urlError) throw urlError;
    
    res.status(200).json(data);
  } catch (error) {
    console.error("Error uploading signature:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;