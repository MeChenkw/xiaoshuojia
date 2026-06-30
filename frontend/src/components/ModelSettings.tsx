import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { t } from '../i18n';
import { getProviders, testApi } from '../api';
import { Provider } from '../types';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';

function ModelSettings() {
  const navigate = useNavigate();
  const { locale, apiConfig, setApiConfig } = useStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [formData, setFormData] = useState({
    provider: apiConfig.provider,
    apiKey: apiConfig.apiKey,
    baseUrl: apiConfig.baseUrl,
    model: apiConfig.model,
    customModel: '',
  });

  useEffect(() => {
    getProviders().then(setProviders).catch(console.error);
  }, []);

  useEffect(() => {
    setFormData({
      provider: apiConfig.provider,
      apiKey: apiConfig.apiKey,
      baseUrl: apiConfig.baseUrl,
      model: apiConfig.model,
      customModel: '',
    });
  }, [apiConfig]);

  const handleProviderSelect = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setFormData({
        ...formData,
        provider: providerId,
        baseUrl: provider.baseUrl,
        model: provider.defaultModel,
        customModel: '',
      });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testApi(formData.apiKey, formData.baseUrl, formData.model);
      setTestResult(result);
    } catch (e) {
      setTestResult({ success: false, message: (e as Error).message });
    }
    setTesting(false);
  };

  const handleSave = () => {
    setApiConfig({
      provider: formData.provider,
      apiKey: formData.apiKey,
      baseUrl: formData.baseUrl,
      model: formData.model,
    });
    alert(locale === 'zh' ? '设置已保存' : 'Settings saved');
  };

  const currentProvider = providers.find(p => p.id === formData.provider);
  const hasModels = currentProvider && currentProvider.models.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="vercel-btn-secondary flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          {t('home', locale)}
        </button>
        <h2 className="text-2xl font-semibold">{t('settingsPage.title', locale)}</h2>
        <div className="w-20"></div> {/* Placeholder for alignment */}
      </div>
      
      {/* Quick Select */}
      <div className="vercel-card p-6 mb-6">
        <h3 className="text-sm font-medium text-gray mb-4">{t('settingsPage.quickSelect', locale)}</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {providers.map(provider => (
            <button
              key={provider.id}
              onClick={() => handleProviderSelect(provider.id)}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                formData.provider === provider.id
                  ? 'border-primary bg-primary text-white'
                  : 'border-border hover:border-gray'
              }`}
            >
              {provider.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Form */}
      <div className="vercel-card p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('settingsPage.provider', locale)}</label>
            <select
              value={formData.provider}
              onChange={e => handleProviderSelect(e.target.value)}
              className="w-full p-2.5 border border-border rounded-lg bg-white"
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('settingsPage.apiKey', locale)}</label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full p-2.5 border border-border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('settingsPage.baseUrl', locale)}</label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full p-2.5 border border-border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('settingsPage.model', locale)}</label>
            {hasModels ? (
              <div className="space-y-2">
                <select
                  value={formData.model}
                  onChange={e => setFormData({ ...formData, model: e.target.value, customModel: '' })}
                  className="w-full p-2.5 border border-border rounded-lg bg-white"
                >
                  {currentProvider?.models.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                  <option value="custom">{locale === 'zh' ? '自定义模型' : 'Custom Model'}</option>
                </select>
                {formData.model === 'custom' && (
                  <input
                    type="text"
                    value={formData.customModel}
                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                    placeholder={locale === 'zh' ? '输入自定义模型名称' : 'Enter custom model name'}
                    className="w-full p-2.5 border border-border rounded-lg"
                  />
                )}
              </div>
            ) : (
              <input
                type="text"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
                placeholder={locale === 'zh' ? '输入模型名称' : 'Enter model name'}
                className="w-full p-2.5 border border-border rounded-lg"
              />
            )}
          </div>
          
          {/* Test Result */}
          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {testResult.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
              <span>{testResult.success ? t('settingsPage.connectionSuccess', locale) : testResult.message}</span>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleTest}
              disabled={testing || !formData.apiKey || !formData.baseUrl || !formData.model}
              className="vercel-btn-secondary flex items-center gap-2"
            >
              {testing && <Loader2 size={16} className="animate-spin" />}
              {t('settingsPage.testConnection', locale)}
            </button>
            <button
              onClick={handleSave}
              className="vercel-btn-primary"
            >
              {t('settingsPage.save', locale)}
            </button>
          </div>
          
          <p className="text-xs text-gray pt-2">{t('settingsPage.privacyNote', locale)}</p>
        </div>
      </div>
    </div>
  );
}

export default ModelSettings;
