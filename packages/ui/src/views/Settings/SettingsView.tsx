import React, { useEffect, useState } from 'react'
import { useEmpireStore } from '../../store/empireStore.js'
import {
  fetchLLMSettings,
  saveLLMSettings,
  testLLMSettings,
  type LLMProvider,
  type LLMSettingsInput,
} from '../../net/settingsClient.js'

const presets: Record<LLMProvider, { label: string; baseURL: string; model: string; fallbackModel: string }> = {
  lm_studio: {
    label: 'LM Studio',
    baseURL: 'http://127.0.0.1:1234/v1',
    model: 'local/gemma-4b',
    fallbackModel: 'openai/gpt-4o',
  },
  ollama: {
    label: 'Ollama',
    baseURL: 'http://127.0.0.1:11434/v1',
    model: 'local/llama3',
    fallbackModel: 'openai/gpt-4o',
  },
  litellm: {
    label: 'LiteLLM Proxy',
    baseURL: 'http://127.0.0.1:4000/v1',
    model: 'local/gemma-4b',
    fallbackModel: 'openai/gpt-4o',
  },
  openai: {
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    fallbackModel: 'gpt-4o-mini',
  },
  custom: {
    label: 'Custom',
    baseURL: 'http://127.0.0.1:1234/v1',
    model: 'local/custom',
    fallbackModel: 'local/custom',
  },
}

const emptySettings: LLMSettingsInput = {
  provider: 'lm_studio',
  baseURL: presets.lm_studio.baseURL,
  model: presets.lm_studio.model,
  fallbackModel: presets.lm_studio.fallbackModel,
  apiKey: '',
  timeoutMs: 30000,
}

export function SettingsView() {
  const setCurrentView = useEmpireStore((s) => s.setCurrentView)
  const [settings, setSettings] = useState<LLMSettingsInput>(emptySettings)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [status, setStatus] = useState('กำลังโหลดการตั้งค่า...')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void fetchLLMSettings()
      .then((loaded) => {
        setSettings({ ...loaded, apiKey: '' })
        setHasApiKey(loaded.hasApiKey)
        setStatus(`ใช้งานอยู่: ${presets[loaded.provider].label} · ${loaded.model}`)
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : String(error))
      })
  }, [])

  const update = (data: Partial<LLMSettingsInput>) => {
    setSettings((current) => ({ ...current, ...data }))
  }

  const applyPreset = (provider: LLMProvider) => {
    update({ provider, ...presets[provider], apiKey: '' })
  }

  const handleSave = async () => {
    setBusy(true)
    setStatus('กำลังบันทึก...')
    try {
      const saved = await saveLLMSettings(settings)
      setSettings({ ...saved, apiKey: '' })
      setHasApiKey(saved.hasApiKey)
      setStatus(`บันทึกแล้ว: ${presets[saved.provider].label} · ${saved.model}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const handleTest = async () => {
    setBusy(true)
    setStatus('กำลังทดสอบ LLM...')
    try {
      const reply = await testLLMSettings()
      setStatus(`LLM ตอบกลับ: ${reply}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="settings-view">
      <header>
        <button onClick={() => setCurrentView('empire_map')}>← กลับ</button>
        <div>
          <h2>ตั้งค่า AI Model</h2>
          <p>ทุก agent ใช้เส้นทาง LLM เดียวกันผ่าน backend</p>
        </div>
      </header>

      <section className="settings-section">
        <label>Provider</label>
        <div className="provider-grid">
          {(Object.keys(presets) as LLMProvider[]).map((provider) => (
            <button
              key={provider}
              className={settings.provider === provider ? 'active' : ''}
              onClick={() => applyPreset(provider)}
            >
              {presets[provider].label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section form">
        <label>Base URL</label>
        <input value={settings.baseURL} onChange={(e) => update({ baseURL: e.target.value })} />

        <label>Model</label>
        <input value={settings.model} onChange={(e) => update({ model: e.target.value })} />

        <label>Fallback Model</label>
        <input value={settings.fallbackModel} onChange={(e) => update({ fallbackModel: e.target.value })} />

        <label>API Key {hasApiKey ? '(มี key เดิมอยู่แล้ว)' : ''}</label>
        <input
          type="password"
          value={settings.apiKey ?? ''}
          onChange={(e) => update({ apiKey: e.target.value })}
          placeholder={hasApiKey ? 'เว้นว่างเพื่อใช้ key เดิม' : 'local ใช้ lm-studio หรือ ollama ได้'}
        />

        <label>Timeout (ms)</label>
        <input
          type="number"
          min={1000}
          step={1000}
          value={settings.timeoutMs}
          onChange={(e) => update({ timeoutMs: parseInt(e.target.value, 10) })}
        />
      </section>

      <div className="settings-actions">
        <button className="btn-send" onClick={handleSave} disabled={busy}>
          บันทึก
        </button>
        <button className="btn-secondary" onClick={handleTest} disabled={busy}>
          ทดสอบ
        </button>
      </div>

      <p className="settings-status">{status}</p>
    </div>
  )
}
