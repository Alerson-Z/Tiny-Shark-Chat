import { Paper, Box, Typography, IconButton, Tooltip, Snackbar, Alert } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css'; // Choose your preferred theme
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Message } from '../services/types'; // Import Message from types.ts

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isAssistant = message.role === 'assistant';
  const messageRef = useRef<HTMLDivElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const handleCopy = () => {
    // If content is MessagePart[], convert to string for copying
    const contentToCopy = typeof message.content === 'string' 
      ? message.content 
      : message.content.map(part => part.type === 'text' ? part.text : '').join(' ');

    navigator.clipboard.writeText(contentToCopy)
      .then(() => {
        setSnackbarMessage('Copied to clipboard!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      })
      .catch(() => {
        setSnackbarMessage('Failed to copy!');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      });
  };

  const handleDownloadPdf = async () => {
    if (messageRef.current) {
      try {
        const canvas = await html2canvas(messageRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`chat_message_${Date.now()}.pdf`);
        setSnackbarMessage('PDF downloaded!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Error generating PDF:', error);
        setSnackbarMessage('Failed to download PDF!');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    }
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{
      display: 'flex',
      justifyContent: isAssistant ? 'flex-start' : 'flex-end',
      mb: 2,
      position: 'relative', // Make this box the positioning context
      width: '100%', // Ensure it takes full width for positioning
    }}>
      <Paper elevation={1} sx={{
        p: 1.5,
        maxWidth: '80%',
        bgcolor: isAssistant ? '#424242' : '#1976d2',
        color: 'white',
        overflowX: 'auto', // Enable horizontal scroll for code blocks
        '& pre': {
          bgcolor: '#282c34', // Dark background for code blocks
          p: 1,
          borderRadius: '4px',
          overflowX: 'auto', // Ensure scroll within pre
        },
        '& code': {
          fontFamily: 'monospace', // Ensure monospace font
        }
      }} ref={messageRef}>
        <ReactMarkdown 
          rehypePlugins={[rehypeHighlight]}
          components={{
            p: ({node, ...props}) => <Typography variant="body1" {...props} />,
            code: ({node, ...props}) => <code {...props} />,
            pre: ({node, ...props}) => <pre {...props} />,
          }}
        >
          {typeof message.content === 'string' 
            ? message.content 
            : message.content.map(part => part.type === 'text' ? part.text : '').join(' ')
          }
        </ReactMarkdown>
      </Paper>
      {isAssistant && (
        <Box sx={{
          position: 'absolute',
          bottom: 0,
          right: isAssistant ? 'auto' : 0, // Position for user messages
          left: isAssistant ? 0 : 'auto', // Position for assistant messages
          transform: isAssistant ? 'translateY(100%)' : 'translateY(100%)', // Move below the bubble
          display: 'flex',
          p: 0.5,
          // No background color here, as it's outside the bubble
        }}>
          <Tooltip title="Copy as Markdown">
            <IconButton size="small" onClick={handleCopy} sx={{ color: 'white' }}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download as PDF">
            <IconButton size="small" onClick={handleDownloadPdf} sx={{ color: 'white' }}>
              <PictureAsPdfIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChatMessage;
