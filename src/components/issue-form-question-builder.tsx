'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronUp, ChevronDown, Trash2, Plus, X } from 'lucide-react'
import type { IssueFormQuestion } from '@/lib/supabase'

interface QuestionBuilderProps {
  questions: IssueFormQuestion[]
  onChange: (questions: IssueFormQuestion[]) => void
}

export function IssueFormQuestionBuilder({ questions, onChange }: QuestionBuilderProps) {
  const addQuestion = () => {
    const newQuestion: IssueFormQuestion = {
      id: crypto.randomUUID(),
      type: 'short',
      label: '',
      required: false,
      options: [],
      order: questions.length,
    }
    onChange([...questions, newQuestion])
  }

  const updateQuestion = (id: string, updates: Partial<IssueFormQuestion>) => {
    onChange(questions.map(q => q.id === id ? { ...q, ...updates } : q))
  }

  const deleteQuestion = (id: string) => {
    const filtered = questions.filter(q => q.id !== id)
    onChange(filtered.map((q, i) => ({ ...q, order: i })))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const updated = [...questions]
    const temp = updated[index - 1]
    updated[index - 1] = { ...updated[index], order: index - 1 }
    updated[index] = { ...temp, order: index }
    onChange(updated)
  }

  const moveDown = (index: number) => {
    if (index === questions.length - 1) return
    const updated = [...questions]
    const temp = updated[index + 1]
    updated[index + 1] = { ...updated[index], order: index + 1 }
    updated[index] = { ...temp, order: index }
    onChange(updated)
  }

  const addOption = (questionId: string) => {
    const q = questions.find(q => q.id === questionId)
    if (!q) return
    updateQuestion(questionId, { options: [...q.options, ''] })
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const q = questions.find(q => q.id === questionId)
    if (!q) return
    const newOptions = [...q.options]
    newOptions[optionIndex] = value
    updateQuestion(questionId, { options: newOptions })
  }

  const deleteOption = (questionId: string, optionIndex: number) => {
    const q = questions.find(q => q.id === questionId)
    if (!q) return
    updateQuestion(questionId, { options: q.options.filter((_, i) => i !== optionIndex) })
  }

  const sorted = [...questions].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-3">
      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-md">
          No questions yet. Click &ldquo;Add question&rdquo; to get started.
        </p>
      )}

      {sorted.map((q, index) => (
        <div
          key={q.id}
          className="border border-border rounded-md p-4 space-y-3 bg-card/50"
        >
          {/* Question header row */}
          <div className="flex items-start gap-2">
            {/* Order controls */}
            <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                aria-label="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === sorted.length - 1}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                aria-label="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Label input */}
            <div className="flex-1 min-w-0">
              <Input
                placeholder="Question label"
                value={q.label}
                onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Type select */}
            <div className="flex-shrink-0 w-36">
              <Select
                value={q.type}
                onValueChange={(value: IssueFormQuestion['type']) => {
                  updateQuestion(q.id, {
                    type: value,
                    options: value === 'dropdown' ? (q.options.length ? q.options : ['']) : q.options,
                  })
                }}
              >
                <SelectTrigger className="text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short text</SelectItem>
                  <SelectItem value="long">Long text</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={() => deleteQuestion(q.id)}
              className="flex-shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Delete question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Required checkbox */}
          <div className="flex items-center gap-2 ml-6">
            <Checkbox
              checked={q.required}
              onChange={() => updateQuestion(q.id, { required: !q.required })}
            />
            <Label className="text-xs text-muted-foreground font-normal cursor-pointer">
              Required
            </Label>
          </div>

          {/* Placeholder input for short/long text */}
          {(q.type === 'short' || q.type === 'long') && (
            <div className="ml-6 space-y-1">
              <Label className="text-xs text-muted-foreground">Placeholder</Label>
              <Input
                placeholder="e.g., Describe the steps to reproduce..."
                value={q.placeholder || ''}
                onChange={(e) => updateQuestion(q.id, { placeholder: e.target.value })}
                className="text-sm h-8"
              />
            </div>
          )}

          {/* Dropdown options */}
          {q.type === 'dropdown' && (
            <div className="ml-6 space-y-2">
              <Label className="text-xs text-muted-foreground">Options</Label>
              {q.options.map((option, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${optIdx + 1}`}
                    value={option}
                    onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                    className="text-sm h-8"
                  />
                  <button
                    type="button"
                    onClick={() => deleteOption(q.id, optIdx)}
                    className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove option"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(q.id)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add option
              </button>
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addQuestion}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add question
      </Button>
    </div>
  )
}
