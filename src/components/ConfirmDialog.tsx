import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button
} from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode; // Content/description of the confirmation
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
}: ConfirmDialogProps) {

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body1">{children}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} color="error">Confirm</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmDialog; 