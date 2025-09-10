import { useState, useRef, useEffect } from 'react';
import { 
  Box, TextField, Button, IconButton, Select, MenuItem, FormControl, InputLabel, 
  CircularProgress, Typography, Paper, Drawer, List, ListItem, ListItemText, ListItemButton, 
  Divider, Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle 
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ChatMessage from '../components/ChatMessage';
import { sendMessage } from '../services/api';
import type { ApiProvider, Message, MessagePart, Conversation, ConversationMetadata } from '../services/types';

const Popup = () => {
  const [provider, setProvider] = useState<ApiProvider>('gemini');
  const [messages, setMessages] = useState<Message[]>([]); // Explicitly type messages state
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // --- Storage Operations ---
  const saveConversation = async (conv: Conversation) => {
    const allConversations = await chrome.storage.sync.get('conversations');
    const existingConversations: Conversation[] = allConversations.conversations || [];

    const updatedConversations = existingConversations.map(c => c.id === conv.id ? conv : c);
    if (!existingConversations.some(c => c.id === conv.id)) {
      updatedConversations.push(conv);
    }
    await chrome.storage.sync.set({ conversations: updatedConversations });

    // Update metadata list
    setConversations(updatedConversations.map(c => ({ 
      id: c.id, 
      title: c.title, 
      lastUpdated: c.lastUpdated, 
      provider: c.provider 
    })));
  };

  const loadAllConversationsMetadata = async () => {
    const allConversations = await chrome.storage.sync.get('conversations');
    const loadedConversations: Conversation[] = allConversations.conversations || [];
    setConversations(loadedConversations.map(c => ({ 
      id: c.id, 
      title: c.title, 
      lastUpdated: c.lastUpdated, 
      provider: c.provider 
    })));

    // Load the last active conversation or start a new one
    const lastActiveId = (await chrome.storage.sync.get('lastActiveConversationId')).lastActiveConversationId;
    if (lastActiveId && loadedConversations.some(c => c.id === lastActiveId)) {
      loadConversation(lastActiveId);
    } else if (loadedConversations.length > 0) {
      loadConversation(loadedConversations[0].id); // Load the first one if no last active
    } else {
      handleNewChat(); // Start a new chat if no conversations exist
    }
  };

  const loadConversation = async (id: string) => {
    const allConversations = await chrome.storage.sync.get('conversations');
    const loadedConversations: Conversation[] = allConversations.conversations || [];
    const convToLoad = loadedConversations.find(c => c.id === id);
    if (convToLoad) {
      setMessages(convToLoad.messages); // Ensure messages are typed correctly here
      setCurrentConversationId(convToLoad.id);
      setProvider(convToLoad.provider);
      await chrome.storage.sync.set({ lastActiveConversationId: convToLoad.id });
    }
  };

  const deleteConversationFromStorage = async (id: string) => {
    const allConversations = await chrome.storage.sync.get('conversations');
    const existingConversations: Conversation[] = allConversations.conversations || [];
    const updatedConversations = existingConversations.filter(c => c.id !== id);
    await chrome.storage.sync.set({ conversations: updatedConversations });
    setConversations(updatedConversations.map(c => ({ 
      id: c.id, 
      title: c.title, 
      lastUpdated: c.lastUpdated, 
      provider: c.provider 
    })));

    if (currentConversationId === id) {
      handleNewChat(); // Start a new chat if current one is deleted
    }
  };

  // --- Effects ---
  useEffect(() => {
    loadAllConversationsMetadata();
  }, []);

  // Debounce saving messages to storage
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      const handler = setTimeout(() => {
        const currentConvMetadata = conversations.find(c => c.id === currentConversationId);
        if (currentConvMetadata) {
          saveConversation({ ...currentConvMetadata, messages: messages });
        }
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [messages, currentConversationId, conversations]);

  // --- Handlers ---
  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreviewUrl(null);
      }
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNewChat = async () => {
    const newId = Date.now().toString(); // Simple unique ID
    const newConv: Conversation = {
      id: newId,
      title: 'New Chat',
      lastUpdated: Date.now(),
      provider: provider,
      messages: [],
    };
    await saveConversation(newConv);
    setMessages([]);
    setCurrentConversationId(newId);
    await chrome.storage.sync.set({ lastActiveConversationId: newId });
    setDrawerOpen(false); // Close drawer after new chat
  };

  const handleLoadChat = (id: string) => {
    loadConversation(id);
    setDrawerOpen(false); // Close drawer after loading
  };

  const handleDeleteConfirmOpen = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirmClose = () => {
    setDeleteConfirmOpen(false);
  };

  const handleDeleteCurrentChat = async () => {
    if (currentConversationId) {
      await deleteConversationFromStorage(currentConversationId);
      handleDeleteConfirmClose();
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    let userMessageContent: string | MessagePart[];

    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        userMessageContent = [
          { type: 'text', text: input.trim() },
          { type: 'image', data: base64Data, mimeType: selectedFile.type },
        ];
        await sendActualMessage(userMessageContent);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      userMessageContent = input.trim();
      await sendActualMessage(userMessageContent);
    }
  };

  const sendActualMessage = async (content: string | MessagePart[]) => {
    const userMessage: Message = { role: 'user', content: content };
    const updatedMessages: Message[] = [...messages, userMessage]; 
    setMessages(updatedMessages);
    setInput('');
    handleClearFile(); // Clear file after sending
    setIsLoading(true);

    // Update conversation title if it's the first message
    if (currentConversationId && messages.length === 0) {
      const newTitle = typeof content === 'string' ? content.substring(0, 30) + (content.length > 30 ? '...' : '') : 'New Chat with Image';
      const currentConvMetadata = conversations.find(c => c.id === currentConversationId);
      if (currentConvMetadata) {
        const updatedConv = { ...currentConvMetadata, title: newTitle, messages: updatedMessages, lastUpdated: Date.now() };
        await saveConversation(updatedConv);
      }
    }

    try {
      const responseContent = await sendMessage(provider, updatedMessages);
      const assistantMessage: Message = { role: 'assistant', content: responseContent };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentConversationTitle = currentConversationId 
    ? (conversations.find(c => c.id === currentConversationId)?.title || 'New Chat') 
    : 'New Chat';

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#212121' }}>
      {/* Header */}
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #444' }}>
        <IconButton onClick={() => setDrawerOpen(true)}>
          <MenuIcon />
        </IconButton>
        {/* Provider Selector */}
        <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
          <InputLabel>Provider</InputLabel>
          <Select
            value={provider}
            label="Provider"
            onChange={(e) => setProvider(e.target.value as ApiProvider)}
          >
            <MenuItem value={'gemini'}>Gemini</MenuItem>
            <MenuItem value={'openai'}>OpenAI</MenuItem>
            <MenuItem value={'cerebras'}>Cerebras</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
          {currentConversationTitle}
        </Typography>
        <IconButton onClick={handleDeleteConfirmOpen} disabled={!currentConversationId}>
          <DeleteIcon />
        </IconButton>
        <IconButton onClick={handleOpenOptions}>
          <SettingsIcon />
        </IconButton>
      </Box>
      
      {/* Conversation Drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 280, bgcolor: '#333', color: 'white' } }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Conversations</Typography>
          <IconButton onClick={handleNewChat} size="small">
            <AddIcon />
          </IconButton>
        </Box>
        <Divider sx={{ bgcolor: '#555' }} />
        <List>
          {conversations.sort((a, b) => b.lastUpdated - a.lastUpdated).map((conv) => (
            <ListItemButton 
              key={conv.id} 
              onClick={() => handleLoadChat(conv.id)}
              selected={conv.id === currentConversationId}
              sx={{ 
                bgcolor: conv.id === currentConversationId ? '#555' : 'inherit',
                '&:hover': { bgcolor: '#444' }
              }}
            >
              <ListItemText 
                primary={conv.title}
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {new Date(conv.lastUpdated).toLocaleString()} ({conv.provider})
                  </Typography>
                }
                primaryTypographyProps={{ color: 'white' }}
              />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* Chat Messages Area */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        {messages.length === 0 && (
            <Typography variant="body1" sx={{textAlign: 'center', color: 'grey.500'}}>No messages yet. Start the conversation!</Typography>
        )}
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        {isLoading && <CircularProgress sx={{ display: 'block', margin: 'auto' }} />}
      </Box>

      {/* Image Preview */}
      {imagePreviewUrl && (
        <Paper sx={{ p: 1, m: 1, display: 'flex', alignItems: 'center', bgcolor: '#333' }}>
          <img src={imagePreviewUrl} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', marginRight: '10px' }} />
          <Typography variant="body2" sx={{ flexGrow: 1, color: 'white' }}>{selectedFile?.name}</Typography>
          <IconButton size="small" onClick={handleClearFile} sx={{ color: 'white' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

      {/* Input Area */}
      <Box sx={{ p: 2, display: 'flex', borderTop: '1px solid #444' }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept="image/*" // Only accept image files for now
        />
        <IconButton color="primary" component="span" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
          <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
          sx={{ ml: 1 }}
        />
        <Button variant="contained" color="primary" sx={{ ml: 1 }} onClick={handleSend} disabled={isLoading || (!input.trim() && !selectedFile)}>
          <SendIcon />
        </Button>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteConfirmClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Delete Conversation?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this conversation? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteConfirmClose}>Cancel</Button>
          <Button onClick={handleDeleteCurrentChat} autoFocus color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Popup;
