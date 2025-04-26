import React, { useState, useEffect } from 'react';
import { Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAtomValue, useSetAtom } from 'jotai';
import { toastMsgAtom, clearCurrentToastMsgAtom } from '../state/atoms';

function Toast() {
	const toastMsg = useAtomValue(toastMsgAtom);
	const clearMsg = useSetAtom(clearCurrentToastMsgAtom);
	const [isOpen, setOpen] = useState(false);

    // Determine properties from the current message or use defaults
	const {
		delay = 5000, // Default delay 5 seconds
		message = '',
		onClose = () => {},
	} = toastMsg || {}; // Use empty object fallback if toastMsg is null

	useEffect(() => {
        // Open the Snackbar whenever there's a new message
		setOpen(!!toastMsg);
	}, [toastMsg]);

	function handleClose(_event?: React.SyntheticEvent | Event, reason?: string) {
        // Don't close on clickaway
        if (reason === 'clickaway') {
            return;
        }
		setOpen(false);
		onClose(); // Call the message-specific onClose if provided
        // Note: The actual clearing of the message from the queue happens in TransitionProps.onExited
	}

	return (
		<Snackbar
			open={isOpen}
			autoHideDuration={delay}
			onClose={handleClose}
            // Use onExited callback to clear the message *after* the transition
			TransitionProps={{ onExited: clearMsg }}
			message={message}
			// Add an action button to manually close
			action={ (
                <IconButton
                    size="small"
                    aria-label="close"
                    color="inherit"
                    onClick={handleClose}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            ) }
		/>
	);
}

export default Toast; 