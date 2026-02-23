'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Navigation } from '@/components/navigation'
import { IssueFormQuestionBuilder } from '@/components/issue-form-question-builder'
import { supabase } from '@/lib/supabase'
import type { IssueForm, IssueFormQuestion } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Trash2, Edit3, FileText } from 'lucide-react'

export default function IssueFormsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [issueForms, setIssueForms] = useState<IssueForm[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingForm, setEditingForm] = useState<IssueForm | null>(null)
  const [formName, setFormName] = useState('')
  const [questions, setQuestions] = useState<IssueFormQuestion[]>([])
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadForms = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/issue-forms', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await response.json() as { success?: boolean; issueForms?: IssueForm[] }
      if (data.success && data.issueForms) {
        setIssueForms(data.issueForms)
      }
    } catch (error) {
      console.error('Failed to load issue forms:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    loadForms()
  }, [user, authLoading, router, loadForms])

  const resetFormState = () => {
    setFormName('')
    setQuestions([])
    setEditingForm(null)
    setShowCreateForm(false)
    setMessage(null)
  }

  const createForm = async () => {
    if (!user || !formName.trim()) return
    setSubmitting(true)
    setMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/issue-forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name: formName.trim(), questions }),
      })
      const data = await response.json() as { success?: boolean; error?: string }
      if (!response.ok || !data.success) {
        setMessage({ type: 'error', text: data.error || 'Failed to create form.' })
      } else {
        setMessage({ type: 'success', text: 'Issue form created!' })
        resetFormState()
        await loadForms()
      }
    } catch (error) {
      console.error('Error creating form:', error)
      setMessage({ type: 'error', text: 'Failed to create form. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (form: IssueForm) => {
    setEditingForm(form)
    setFormName(form.name)
    setQuestions(form.questions)
    setShowCreateForm(false)
    setMessage(null)
  }

  const updateForm = async () => {
    if (!user || !editingForm || !formName.trim()) return
    setSubmitting(true)
    setMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/issue-forms/${editingForm.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name: formName.trim(), questions }),
      })
      const data = await response.json() as { success?: boolean; error?: string }
      if (!response.ok || !data.success) {
        setMessage({ type: 'error', text: data.error || 'Failed to update form.' })
      } else {
        setMessage({ type: 'success', text: 'Issue form updated!' })
        resetFormState()
        await loadForms()
      }
    } catch (error) {
      console.error('Error updating form:', error)
      setMessage({ type: 'error', text: 'Failed to update form. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this issue form? This action cannot be undone.')) {
      return
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/issue-forms/${formId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (!response.ok) {
        alert('Failed to delete issue form')
      } else {
        await loadForms()
      }
    } catch (error) {
      console.error('Error deleting form:', error)
      alert('Failed to delete issue form')
    }
  }

  if (authLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Loading...</div>
  }

  const isEditing = editingForm !== null
  const showForm = showCreateForm || isEditing

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Issue forms</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Create structured templates for issue submissions. Enable them on public views to guide users through reporting bugs, requesting features, and more.
            </p>
          </div>

          {!showForm && (
            <div className="text-center">
              <Button
                onClick={() => {
                  resetFormState()
                  setShowCreateForm(true)
                }}
                size="lg"
                className="h-12 px-8 font-semibold"
              >
                {issueForms.length === 0 ? 'Create your first issue form' : 'Create new form'}
              </Button>
            </div>
          )}
        </div>

        {message && (
          <div
            className={`mb-6 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-300'
                : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Create / Edit form */}
        {showForm && (
          <Card className="mb-8 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl">
                {isEditing ? 'Edit issue form' : 'Create a new issue form'}
              </CardTitle>
              <CardDescription className="text-base">
                Define questions that will be shown to users when they submit an issue via a public view.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Form name */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  Form name
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="form-name">Name *</Label>
                  <Input
                    id="form-name"
                    placeholder="e.g., Bug Report, Feature Request"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be shown to users in the issue creation dropdown.
                  </p>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  Questions
                </h3>
                <IssueFormQuestionBuilder
                  questions={questions}
                  onChange={setQuestions}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={isEditing ? updateForm : createForm}
                  disabled={submitting || !formName.trim()}
                >
                  {submitting
                    ? isEditing ? 'Saving...' : 'Creating...'
                    : isEditing ? 'Save changes' : 'Create form'}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetFormState}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing forms list */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading forms...</div>
        ) : issueForms.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your issue forms</h2>
            <div className="grid gap-4">
              {issueForms.map((form) => (
                <Card key={form.id} className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium truncate">{form.name}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {form.questions.length === 0
                              ? 'No questions'
                              : `${form.questions.length} question${form.questions.length !== 1 ? 's' : ''}`}
                          </p>
                          {form.questions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {form.questions.slice(0, 3).map((q) => (
                                <span
                                  key={q.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-accent text-accent-foreground"
                                >
                                  {q.label || `Untitled ${q.type}`}
                                </span>
                              ))}
                              {form.questions.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-accent text-muted-foreground">
                                  +{form.questions.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(form)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteForm(form.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : !showForm ? (
          <Card className="border-border/50 border-dashed bg-card/30">
            <CardContent className="pt-6 pb-8 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">No issue forms yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first issue form to start guiding users through structured issue submissions.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
