import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  TextField,
  CircularProgress,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { fetchUsers, updateUserDisplayName } from "../api/client.ts";
import type { User } from "../api/types.ts";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ConfigDialog({ open, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<Record<number, "idle" | "loading" | "success" | "error">>({});

  useEffect(() => {
    if (!open) return;
    fetchUsers().then((u) => {
      setUsers(u);
      setDrafts(Object.fromEntries(u.map((user) => [user.id, user.display_name])));
      setSaving(Object.fromEntries(u.map((user) => [user.id, "idle"])));
    }).catch(() => {});
  }, [open]);

  async function handleSave(user: User) {
    const draft = drafts[user.id] ?? user.display_name;
    if (!draft.trim() || draft === user.display_name) return;
    setSaving((s) => ({ ...s, [user.id]: "loading" }));
    try {
      const updated = await updateUserDisplayName(user.id, draft);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSaving((s) => ({ ...s, [user.id]: "success" }));
      setTimeout(() => setSaving((s) => ({ ...s, [user.id]: "idle" })), 2000);
    } catch {
      setSaving((s) => ({ ...s, [user.id]: "error" }));
      setTimeout(() => setSaving((s) => ({ ...s, [user.id]: "idle" })), 2000);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        ⚙️ Configurações
        <IconButton onClick={onClose} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" color="text.secondary" mb={2}>
          Membros
        </Typography>
        {users.map((user) => (
          <Box key={user.id} sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {user.name}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
              <TextField
                size="small"
                label="Nome exibido"
                value={drafts[user.id] ?? user.display_name}
                onChange={(e) => setDrafts((d) => ({ ...d, [user.id]: e.target.value }))}
                fullWidth
              />
              <IconButton
                onClick={() => void handleSave(user)}
                disabled={saving[user.id] === "loading"}
                color={saving[user.id] === "success" ? "success" : saving[user.id] === "error" ? "error" : "default"}
                size="small"
              >
                {saving[user.id] === "loading" ? (
                  <CircularProgress size={18} />
                ) : (
                  <CheckRoundedIcon />
                )}
              </IconButton>
            </Box>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
