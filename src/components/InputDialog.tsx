import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button
} from '@mui/material';

interface InputDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  label: string;
  defaultValue?: string;
}

function InputDialog({
  open,
  onClose,
  onSubmit,
  title,
  label,
  defaultValue = '',
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);

  // Reset value when dialog opens
  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);

  const handleSubmit = useCallback(() => {
    if (value.trim()) { // Ensure value is not just whitespace
      onSubmit(value.trim());
      onClose(); // Close after submit
    }
    // Optional: Add validation/error message if value is empty
  }, [value, onSubmit, onClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
          handleSubmit();
      }
  }, [handleSubmit]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="input-dialog-field"
          label={label}
          type="text"
          fullWidth
          variant="standard"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown} // Allow submitting with Enter key
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!value.trim()}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
}

export default InputDialog; 