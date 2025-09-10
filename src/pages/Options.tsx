import { useState, useEffect } from 'react';
import { 
  Box, Typography, Container, TextField, Button, Paper, Divider, 
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemText, 
  IconButton 
} from '@mui/material';
import ListIcon from '@mui/icons-material/List';

// Define a type for our settings for type safety
interface ApiConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

interface AllSettings {
  gemini: ApiConfig;
  openai: ApiConfig;
  cerebras: ApiConfig;
}

// Static list of common models, updated from modelName.txt
const commonModels = {
  cerebras: [
    'gpt-oss-120b',
    'qwen-3-coder-480b',
    'qwen-3-235b-a22b-instruct-2507',
    'qwen-3-235b-a22b-thinking-2507',
    'llama-4-maverick-17b-128e-instruct',
    'llama-4-scout-17b-16e-instruct',
    'llama3.1-8b',
    'llama-3.3-70b',
  ],
  openai: [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4-vision-preview',
    'gpt-4o',
    'gpt-4-all-tools',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-1106',
    'davinci-002',
  ],
  gemini: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite-preview',
    'gemini-2.5-flash-live-preview',
    'gemini-2.5-flash-preview-tts',
    'gemini-2.5-pro-preview-tts',
    'gemini-2.5-flash-preview-native-audio-dialog',
    'gemini-2.5-flash-exp-native-audio-thinking-dialog',
  ],
};

const Options = () => {
  const [settings, setSettings] = useState<AllSettings>({
    gemini: { apiKey: '', model: commonModels.gemini[0] || '' },
    openai: { apiKey: '', baseUrl: '', model: commonModels.openai[0] || '' },
    cerebras: { apiKey: '', baseUrl: 'https://api.cerebras.ai/v1', model: commonModels.cerebras[0] || '' },
  });

  const [modelListOpen, setModelListOpen] = useState(false);
  const [currentProviderForModelList, setCurrentProviderForModelList] = useState<keyof AllSettings | null>(null);

  // Load settings from chrome.storage when the component mounts
  useEffect(() => {
    chrome.storage.sync.get('apiSettings', (data) => {
      if (data.apiSettings) {
        // Merge saved settings with defaults to avoid errors if new settings are added
        setSettings(prevSettings => ({
          gemini: { ...prevSettings.gemini, ...data.apiSettings.gemini },
          openai: { ...prevSettings.openai, ...data.apiSettings.openai },
          cerebras: { ...prevSettings.cerebras, ...data.apiSettings.cerebras },
        }));
      }
    });
  }, []);

  const handleSave = () => {
    chrome.storage.sync.set({ apiSettings: settings }, () => {
      // Optionally, provide feedback to the user
      alert('Settings saved!');
    });
  };

  // Handle changes for nested state
  const handleChange = (provider: keyof AllSettings, field: keyof ApiConfig) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: event.target.value,
      },
    }));
  };

  const handleOpenModelList = (provider: keyof AllSettings) => {
    setCurrentProviderForModelList(provider);
    setModelListOpen(true);
  };

  const handleCloseModelList = () => {
    setModelListOpen(false);
    setCurrentProviderForModelList(null);
  };

  const handleSelectModel = (model: string) => {
    if (currentProviderForModelList) {
      setSettings(prev => ({
        ...prev,
        [currentProviderForModelList]: {
          ...prev[currentProviderForModelList],
          model: model,
        },
      }));
    }
    handleCloseModelList();
  };

  const renderModelField = (providerKey: keyof AllSettings) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', width: '100%' }}>
      <TextField
        label="Model"
        fullWidth
        margin="normal"
        value={settings[providerKey].model}
        onChange={handleChange(providerKey, 'model')}
      />
      <IconButton onClick={() => handleOpenModelList(providerKey)} sx={{ p: '10px' }}>
        <ListIcon />
      </IconButton>
    </Box>
  );

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Chat Settings
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">Gemini</Typography>
          <TextField
            label="API Key"
            fullWidth
            margin="normal"
            value={settings.gemini.apiKey}
            onChange={handleChange('gemini', 'apiKey')}
            type="password"
          />
          {renderModelField('gemini')}
        </Paper>

        <Divider sx={{ my: 3 }} />

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">OpenAI</Typography>
          <TextField
            label="API Key"
            fullWidth
            margin="normal"
            value={settings.openai.apiKey}
            onChange={handleChange('openai', 'apiKey')}
            type="password"
          />
          <TextField
            label="Base URL (Optional)"
            fullWidth
            margin="normal"
            value={settings.openai.baseUrl}
            onChange={handleChange('openai', 'baseUrl')}
            placeholder="e.g., https://api.openai.com/v1"
          />
          {renderModelField('openai')}
        </Paper>

        <Divider sx={{ my: 3 }} />

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6">Cerebras</Typography>
          <Typography variant="caption">Compatible with OpenAI's API structure.</Typography>
          <TextField
            label="API Key"
            fullWidth
            margin="normal"
            value={settings.cerebras.apiKey}
            onChange={handleChange('cerebras', 'apiKey')}
            type="password"
          />
          <TextField
            label="Base URL"
            fullWidth
            margin="normal"
            value={settings.cerebras.baseUrl}
            onChange={handleChange('cerebras', 'baseUrl')}
          />
          {renderModelField('cerebras')}
        </Paper>

        <Button variant="contained" color="primary" onClick={handleSave}>
          Save Settings
        </Button>
      </Box>

      {/* Model List Dialog */}
      <Dialog open={modelListOpen} onClose={handleCloseModelList}>
        <DialogTitle>Select a Model</DialogTitle>
        <DialogContent>
          <List>
            {currentProviderForModelList && commonModels[currentProviderForModelList].map((model) => (
              <ListItemButton key={model} onClick={() => handleSelectModel(model)}>
                <ListItemText primary={model} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default Options;