import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineEditorProps {
  value: string
  onSave: (value: string, reason?: string) => Promise<void>
  multiline?: boolean
  maxLength?: number
  className?: string
  placeholder?: string
  withReason?: boolean
  disabled?: boolean
}

export function InlineEditor({
  value,
  onSave,
  multiline = false,
  maxLength = 1000,
  className,
  placeholder,
  withReason = true,
  disabled = false,
}: InlineEditorProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    setDraft(value)
  }, [value])

  const handleSave = async () => {
    if (draft.trim() === value.trim()) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(draft.trim(), reason || undefined)
      setEditing(false)
      setReason('')
    } catch {
      // error handled by caller
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraft(value)
    setReason('')
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleCancel()
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSave()
    }
  }

  if (!editing) {
    return (
      <div className={cn('group flex items-start gap-2', className)}>
        <span className="flex-1 whitespace-pre-wrap">{value || <span className="text-zinc-500 italic">{placeholder || 'Vide'}</span>}</span>
        {!disabled && (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 shrink-0"
            title="Modifier"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          rows={3}
          disabled={saving}
          className="w-full bg-zinc-800 border border-zinc-600 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y disabled:opacity-50"
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          disabled={saving}
          className="w-full bg-zinc-800 border border-zinc-600 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        />
      )}
      {withReason && (
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Raison de la modification (optionnel)"
          disabled={saving}
          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
        />
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !draft.trim()}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="w-3 h-3" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50 transition-colors"
        >
          <X className="w-3 h-3" />
          Annuler
        </button>
        <span className="text-[10px] text-zinc-500 ml-auto">Ctrl+Enter pour sauvegarder</span>
      </div>
    </div>
  )
}
