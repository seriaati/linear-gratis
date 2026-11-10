'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { publicFormSchema as formSchema, type PublicFormValues as FormValues } from '@/lib/public-form-schema'
import { Toaster, toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LinearMarkdownEditor } from '@/components/linear-markdown-editor'
import { useBrandingSettings, applyBrandingToPage, getBrandingStyles } from '@/hooks/use-branding'
import { cn } from '@/lib/utils'

const PUBLIC_FORM_TOASTER_ID = 'public-form-submit'
const PUBLIC_FORM_SUBMIT_TOAST_ID = 'public-form-submit-status'

type PublicFormConfig = {
  id: string
  user_id: string
  name: string
  slug: string
  project_name: string
  form_title: string
  description?: string
  is_active: boolean
}

export default function PublicFormPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const isEmbedded = searchParams?.get('embed') === '1'
  const requestedTheme = searchParams?.get('theme')
  const toastTheme =
    requestedTheme === 'dark' || requestedTheme === 'light' ? requestedTheme : 'system'

  const [formConfig, setFormConfig] = useState<PublicFormConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Load branding settings for this form's owner
  const { branding } = useBrandingSettings(
    !isEmbedded ? formConfig?.user_id || null : null,
    !isEmbedded && formConfig ? { type: 'form', slug: formConfig.slug } : null,
  )

  // Parse URL parameters for prefilling
  const getUrlPrefillData = useCallback((): Partial<FormValues> => {
    if (!searchParams) return {}

    return {
      customerName: searchParams.get('name') || '',
      customerEmail: searchParams.get('email') || '',
      externalId: searchParams.get('ref') || '',
      issueTitle: searchParams.get('title') || '',
      issueBody: searchParams.get('body') || '',
      attachmentUrl: searchParams.get('attachment') || '',
    }
  }, [searchParams])

  const prefillData = getUrlPrefillData()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: prefillData.customerName || '',
      customerEmail: prefillData.customerEmail || '',
      externalId: prefillData.externalId || '',
      issueTitle: prefillData.issueTitle || '',
      issueBody: prefillData.issueBody || '',
      attachmentUrl: prefillData.attachmentUrl || '',
    },
  })

  const loadFormConfig = useCallback(async () => {
    try {
      const response = await fetch(`/api/form/${encodeURIComponent(slug)}`)
      const data = (await response.json()) as {
        success?: boolean
        form?: PublicFormConfig
        error?: string
      }

      if (!response.ok || !data.success || !data.form) {
        console.error('Error loading form config:', data.error || response.statusText)
      } else {
        setFormConfig(data.form)
      }
    } catch (error) {
      console.error('Error loading form config:', error)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadFormConfig()
  }, [loadFormConfig])

  // Apply branding when it loads
  useEffect(() => {
    if (!isEmbedded && branding) {
      applyBrandingToPage(branding, formConfig?.form_title)
    }
  }, [branding, formConfig?.form_title, isEmbedded])

  const onFormSubmit = async (values: FormValues) => {
    if (!formConfig) return

    setSubmitting(true)

    try {
      const response = await fetch(`/api/form/${encodeURIComponent(slug)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = (await response.json()) as {
        success: boolean
        error?: string
        issues?: Array<{ path: Array<string | number>; message: string }>
        data?: {
          customer?: { id: string }
          request?: { id: string }
          issue?: { id: string; identifier: string }
        }
      }

      if (response.ok && data.success) {
        const issueIdentifier = data.data?.issue?.identifier

        toast.success('Request submitted', {
          id: PUBLIC_FORM_SUBMIT_TOAST_ID,
          toasterId: PUBLIC_FORM_TOASTER_ID,
          description: issueIdentifier
            ? `Created ${issueIdentifier}. We'll get back to you soon.`
            : 'We\'ll get back to you soon.',
          duration: 6000,
        })
        form.reset({
          customerName: '',
          customerEmail: '',
          externalId: '',
          issueTitle: '',
          issueBody: '',
          attachmentUrl: '',
        })
      } else {
        const validationMessages = data.issues?.flatMap((issue) => {
          const field = issue.path.at(0)
          if (typeof field !== 'string' || !(field in formSchema.shape)) return []
          const fieldName = field as keyof FormValues
          form.setError(fieldName, { type: 'server', message: issue.message })
          return [issue.message]
        })
        toast.error('Could not submit request', {
          id: PUBLIC_FORM_SUBMIT_TOAST_ID,
          toasterId: PUBLIC_FORM_TOASTER_ID,
          description: validationMessages?.length
            ? validationMessages.join(' ')
            : data.error || 'Failed to submit request. Please try again.',
          duration: 8000,
        })
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('Could not submit request', {
        id: PUBLIC_FORM_SUBMIT_TOAST_ID,
        toasterId: PUBLIC_FORM_TOASTER_ID,
        description: 'Network error. Please try again.',
        duration: 8000,
      })
    } finally {
      setSubmitting(false)
    }
  }


  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          isEmbedded ? 'min-h-[420px] bg-background' : 'min-h-screen',
        )}
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we load the form.</p>
        </div>
      </div>
    )
  }

  if (!formConfig) {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          isEmbedded ? 'min-h-[420px] bg-background px-4' : 'min-h-screen',
        )}
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Form not found</CardTitle>
            <CardDescription>
              The form you&apos;re looking for doesn&apos;t exist or has been deactivated.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div
      className={cn(
        isEmbedded ? 'min-h-full bg-background' : 'min-h-screen linear-gradient-bg py-8',
      )}
      style={isEmbedded ? undefined : getBrandingStyles(branding)}
    >
      <Toaster
        id={PUBLIC_FORM_TOASTER_ID}
        richColors
        closeButton={!isEmbedded}
        visibleToasts={1}
        theme={toastTheme}
        position={isEmbedded ? 'top-center' : 'bottom-right'}
        offset={isEmbedded ? 12 : 24}
        mobileOffset={isEmbedded ? 10 : 16}
        toastOptions={{
          classNames: {
            toast: 'max-w-[calc(100vw-20px)] shadow-lg',
            title: 'text-sm font-medium',
            description: 'text-sm leading-5',
          },
        }}
      />
      <div className={cn('max-w-2xl mx-auto', isEmbedded ? 'p-3 sm:p-4' : 'p-6')}>
        {/* Custom header with logo if branding is set */}
        {!isEmbedded && branding && (branding.logo_url || branding.brand_name) && (
          <div className="mb-6 text-center">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-provided URL, domain not known at build time
              <img
                src={branding.logo_url}
                alt={branding.brand_name || 'Logo'}
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxHeight: `${branding.logo_height || 40}px`,
                  objectFit: 'contain',
                }}
                className="mx-auto mb-4"
              />
            ) : branding.brand_name ? (
              <h1 className="text-2xl font-bold mb-2">{branding.brand_name}</h1>
            ) : null}
            {branding.tagline && (
              <p className="text-muted-foreground">{branding.tagline}</p>
            )}
          </div>
        )}

        <Card className={cn(isEmbedded && 'gap-4 rounded-none border-0 bg-background py-0 shadow-none')}>
          <CardHeader className={cn(isEmbedded && 'px-0')}>
            <CardTitle>{formConfig.form_title}</CardTitle>
            {formConfig.description && (
              <CardDescription>{formConfig.description}</CardDescription>
            )}
            {!isEmbedded && !branding?.brand_name && (
              <div className="text-sm text-gray-600">
                Project: {formConfig.project_name}
              </div>
            )}
          </CardHeader>
          <CardContent className={cn(isEmbedded && 'px-0')}>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onFormSubmit)}
                className={cn('space-y-6', isEmbedded && 'space-y-4')}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email address"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="externalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference ID (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Your internal reference ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issueTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue title</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of the issue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issueBody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <LinearMarkdownEditor
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          placeholder="Please provide a detailed description of your issue or request..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attachmentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attachment URL (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/screenshot.png"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Submitting...' : 'Submit request'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Custom footer — skip rendering when there's nothing to show. */}
        {!isEmbedded && (() => {
          const showPoweredBy = branding?.show_powered_by !== false
          if (!branding?.footer_text && !showPoweredBy) return null
          return (
            <div className="text-center mt-6 text-sm text-gray-500">
              {branding?.footer_text ? (
                <p className="whitespace-pre-wrap mb-2">{branding.footer_text}</p>
              ) : null}
              {showPoweredBy && (
                <p>
                  Powered by{' '}
                  <a
                    href="https://linear.gratis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    linear.gratis
                  </a>
                </p>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
